import { useMemo, useState } from 'react';
import { updateQty } from '../lib/api';

const GRADE_COLOR = {
  IND:  '#818cf8',
  FOOD: '#34d399',
  COS:  '#f472b6',
  FEED: '#fb923c',
  AGRI: '#4ade80',
};

/** Konversi sku_code suffix → angka gram, untuk sorting ukuran kecil → besar */
function skuToGrams(skuCode) {
  if (!skuCode) return 0;
  if (skuCode.endsWith('BULK')) return 9_999_999;
  const m = skuCode.match(/(\d+)(G|KG|ML|L)$/i);
  if (!m) return 0;
  const n = parseInt(m[1]);
  const u = m[2].toUpperCase();
  return ['KG', 'L'].includes(u) ? n * 1000 : n;
}

/** Inline qty editor: klik angka → input teks, Enter/blur → save */
function QtyCell({ sku, onSave, busy }) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState('');

  const commit = () => {
    setEditing(false);
    const n = parseInt(draft);
    if (!isNaN(n) && n !== sku.qty) onSave(sku.id, Math.max(0, n));
  };

  if (editing) {
    return (
      <input
        className="qty-input-edit"
        type="number"
        min={0}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
        autoFocus
      />
    );
  }

  return (
    <div className="qty-control">
      <button
        disabled={busy}
        onClick={() => onSave(sku.id, Math.max(0, (sku.qty ?? 0) - 1))}
      >−</button>
      <span
        className={(sku.qty ?? 0) <= 0 ? 'qty-val zero' : 'qty-val'}
        title="Klik untuk ketik angka langsung"
        onClick={() => { setDraft(String(sku.qty ?? 0)); setEditing(true); }}
      >
        {sku.qty ?? 0}
      </span>
      <button
        disabled={busy}
        onClick={() => onSave(sku.id, (sku.qty ?? 0) + 1)}
      >+</button>
    </div>
  );
}

export default function ProductGrid({ products, loading, onRefresh }) {
  const [search,      setSearch]  = useState('');
  const [filterGrade, setGrade]   = useState('ALL');
  const [busyId,      setBusyId]  = useState(null);

  const grades = ['ALL', 'IND', 'FOOD', 'COS', 'FEED', 'AGRI'];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products
      .filter(p => filterGrade === 'ALL' || p.grade === filterGrade)
      .map(p => ({
        ...p,
        // Sort SKUs: ukuran kecil → besar, BULK paling bawah
        skus: [...p.skus]
          .sort((a, b) => skuToGrams(a.sku_code) - skuToGrams(b.sku_code))
          .filter(s => !q || p.name.toLowerCase().includes(q) || s.sku_code.toLowerCase().includes(q)),
      }))
      .filter(p => !q || p.name.toLowerCase().includes(q) || p.skus.length > 0);
  }, [products, search, filterGrade]);

  const handleSave = async (skuId, newQty) => {
    setBusyId(skuId);
    try {
      await updateQty(skuId, newQty);
      onRefresh();
    } catch (e) {
      alert('Gagal update: ' + e.message);
    } finally {
      setBusyId(null);
    }
  };

  const handlePrint = () => window.print();

  return (
    <section>
      <div className="toolbar">
        <input
          className="search"
          type="text"
          placeholder="🔍  Cari nama produk atau kode SKU..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="grade-tabs">
          {grades.map(g => (
            <button
              key={g}
              className={`gtab ${filterGrade === g ? 'active' : ''}`}
              style={filterGrade === g && g !== 'ALL'
                ? { borderColor: GRADE_COLOR[g], color: GRADE_COLOR[g] } : {}}
              onClick={() => setGrade(g)}
            >
              {g}
            </button>
          ))}
        </div>
        <button className="btn-print" onClick={handlePrint} title="Cetak daftar stock">
          🖨️ Cetak
        </button>
      </div>

      {loading && <p className="muted">Memuat data stock...</p>}
      {!loading && filtered.length === 0 && <p className="muted">Tidak ada produk cocok.</p>}

      {/* Print header — hanya muncul saat print */}
      <div className="print-header">
        <h2>Laporan Stock Opname — Aba Mandiri Sejahtera Kimia</h2>
        <p>Dicetak: {new Date().toLocaleString('id-ID')}</p>
      </div>

      <div className="products-grid">
        {filtered.map(p => (
          <div key={p.id} className="product-card">
            <div className="card-header">
              <h3>{p.name}</h3>
              <span
                className="badge"
                style={{
                  color: GRADE_COLOR[p.grade] ?? '#818cf8',
                  borderColor: GRADE_COLOR[p.grade] ?? '#818cf8',
                }}
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
                  <QtyCell sku={sku} onSave={handleSave} busy={busyId === sku.id} />
                </div>
                {/* Di print: tampilkan qty sebagai teks */}
                <span className="print-only qty-print">{sku.qty ?? 0}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
