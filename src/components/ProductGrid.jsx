import { useMemo, useState } from 'react';
import { updateQty } from '../lib/api';

const GRADE_COLOR = {
  IND:  '#89b4fa',
  FOOD: '#a6e3a1',
  COS:  '#f5c2e7',
  FEED: '#fab387',
  AGRI: '#a6e3a1',
};

export default function ProductGrid({ products, loading, onRefresh }) {
  const [search, setSearch]     = useState('');
  const [busyId, setBusyId]     = useState(null);
  const [filterGrade, setGrade] = useState('ALL');

  const grades = ['ALL', 'IND', 'FOOD', 'COS', 'FEED', 'AGRI'];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products
      .filter(p => filterGrade === 'ALL' || p.grade === filterGrade)
      .map(p => ({
        ...p,
        skus: p.skus.filter(s =>
          !q ||
          p.name.toLowerCase().includes(q) ||
          s.sku_code.toLowerCase().includes(q)
        ),
      }))
      .filter(p => !q || p.name.toLowerCase().includes(q) || p.skus.length > 0);
  }, [products, search, filterGrade]);

  const step = async (sku, dir) => {
    setBusyId(sku.id);
    try {
      await updateQty(sku.id, Math.max(0, (sku.qty ?? 0) + dir));
      onRefresh();
    } catch (e) {
      alert('Gagal update: ' + e.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section>
      <div className="toolbar">
        <input
          className="search"
          type="text"
          placeholder="🔍  Cari nama produk atau SKU..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="grade-tabs">
          {grades.map(g => (
            <button
              key={g}
              className={`tab ${filterGrade === g ? 'active' : ''}`}
              style={filterGrade === g && g !== 'ALL' ? { borderColor: GRADE_COLOR[g], color: GRADE_COLOR[g] } : {}}
              onClick={() => setGrade(g)}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {loading && <p className="muted">Memuat data stock...</p>}
      {!loading && filtered.length === 0 && <p className="muted">Tidak ada produk cocok.</p>}

      <div className="products-grid">
        {filtered.map(p => (
          <div key={p.id} className="product-card">
            <div className="card-header">
              <h3>{p.name}</h3>
              <span
                className="badge"
                style={{ color: GRADE_COLOR[p.grade] ?? '#cdd6f4', borderColor: GRADE_COLOR[p.grade] ?? '#45475a' }}
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
                <div className="qty-control">
                  <button disabled={busyId === sku.id} onClick={() => step(sku, -1)}>−</button>
                  <span className={(sku.qty ?? 0) <= 0 ? 'qty-zero' : 'qty-val'}>
                    {sku.qty ?? 0}
                  </span>
                  <button disabled={busyId === sku.id} onClick={() => step(sku, 1)}>+</button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
