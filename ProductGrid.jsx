import { useMemo, useRef, useState } from 'react';
import { adjustQty } from '../lib/api';

const GRADE_COLOR = {
  IND: '#818cf8', FOOD: '#34d399', COS: '#f472b6',
  FEED: '#fb923c', AGRI: '#4ade80', BTL: '#22d3ee',
};

/** Urutan ukuran kecil → besar, BULK paling bawah (posisi SKU selalu konsisten) */
function skuToGrams(skuCode) {
  if (!skuCode) return 0;
  if (skuCode.endsWith('BULK')) return 9_999_999;
  const m = skuCode.match(/(\d+)(G|KG|ML|L)$/i);
  if (!m) return 0;
  const n = parseInt(m[1], 10);
  return ['KG', 'L'].includes(m[2].toUpperCase()) ? n * 1000 : n;
}

function QtyCell({ sku, onChange, busy }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const done = useRef(false); // cegah commit ganda (Enter + blur)

  const start = () => {
    done.current = false;
    setDraft(String(sku.qty ?? 0));
    setEditing(true);
  };
  const commit = () => {
    if (done.current) return;
    done.current = true;
    setEditing(false);
    const n = parseInt(draft, 10);
    if (!Number.isNaN(n) && n >= 0 && n !== Number(sku.qty ?? 0)) {
      onChange(sku.id, { newQty: n });
    }
  };
  const cancel = () => { done.current = true; setEditing(false); };

  if (editing) {
    return (
      <input
        className="qty-input-edit"
        type="number"
        inputMode="numeric"
        min={0}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') cancel();
        }}
        autoFocus
      />
    );
  }

  const qty = Number(sku.qty ?? 0);
  return (
    <div className="qty-control">
      <button disabled={busy} onClick={() => onChange(sku.id, { delta: -1 })}>−</button>
      <span
        className={qty <= 0 ? 'qty-val zero' : 'qty-val'}
        title="Klik untuk ketik angka langsung"
        onClick={start}
      >
        {qty}
      </span>
      <button disabled={busy} onClick={() => onChange(sku.id, { delta: 1 })}>+</button>
    </div>
  );
}

export default function ProductGrid({ products, loading, onRefresh, kind = 'chemical' }) {
  const [search, setSearch] = useState('');
  const [grade, setGrade]   = useState('ALL');
  const [busyId, setBusyId] = useState(null);

  const isBottle = kind === 'bottle';
  const grades = ['ALL', 'IND', 'FOOD', 'COS', 'FEED', 'AGRI'];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products
      .filter(p => (p.kind ?? 'chemical') === kind)
      .filter(p => isBottle || grade === 'ALL' || p.grade === grade)
      .map(p => ({
        ...p,
        skus: [...p.skus]
          .sort((a, b) => skuToGrams(a.sku_code) - skuToGrams(b.sku_code))
          .filter(s => !q || p.name.toLowerCase().includes(q) || s.sku_code.toLowerCase().includes(q)),
      }))
      .filter(p => !q || p.name.toLowerCase().includes(q) || p.skus.length > 0);
  }, [products, search, grade, kind, isBottle]);

  const handleChange = async (skuId, opts) => {
    setBusyId(skuId);
    try {
      await adjustQty({ skuId, ...opts });
    } catch (e) {
      alert(e.message);
    } finally {
      await onRefresh();
      setBusyId(null);
    }
  };

  return (
    <section>
      <div className="toolbar">
        <input
          className="search"
          type="text"
          placeholder={isBottle ? '🔍  Cari botol...' : '🔍  Cari nama produk atau kode SKU...'}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {!isBottle && (
          <div className="grade-tabs">
            {grades.map(g => (
              <button
                key={g}
                className={`gtab ${grade === g ? 'active' : ''}`}
                style={grade === g && g !== 'ALL' ? { borderColor: GRADE_COLOR[g], color: GRADE_COLOR[g] } : {}}
                onClick={() => setGrade(g)}
              >
                {g}
              </button>
            ))}
          </div>
        )}
        <button className="btn-print" onClick={() => window.print()} title="Cetak daftar stock">
          🖨️ Cetak
        </button>
      </div>

      {loading && <p className="muted">Memuat data stock...</p>}
      {!loading && filtered.length === 0 && <p className="muted">Tidak ada data yang cocok.</p>}

      <div className="print-header">
        <h2>{isBottle ? 'Laporan Stock Botol' : 'Laporan Stock Opname'} — Aba Mandiri Sejahtera Kimia</h2>
        <p>Dicetak: {new Date().toLocaleString('id-ID')}</p>
      </div>

      <div className="products-grid">
        {filtered.map(p => (
          <div key={p.id} className="product-card">
            <div className="card-header">
              <h3>{p.name}</h3>
              <span
                className="badge"
                style={{ color: GRADE_COLOR[p.grade] ?? '#818cf8', borderColor: GRADE_COLOR[p.grade] ?? '#818cf8' }}
              >
                {p.grade}
              </span>
            </div>
            {p.skus.map(sku => (
              <div key={sku.id} className={`sku-row ${sku.is_bulk ? 'bulk-row' : ''}`}>
                <div className="sku-info">
                  <span className="sku-code">{sku.sku_code}</span>
                  <span className="sku-label">{sku.label}</span>
                </div>
                <div className="no-print">
                  <QtyCell sku={sku} onChange={handleChange} busy={busyId === sku.id} />
                </div>
                <span className="print-only qty-print">{Number(sku.qty ?? 0)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
