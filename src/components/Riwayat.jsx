import { useEffect, useState } from 'react';
import { fetchMovements } from '../lib/api';

const FILTERS = [
  ['all', 'Semua'],
  ['out', 'Keluar (Penjualan)'],
  ['in', 'Masuk (Restock)'],
  ['adjust', 'Koreksi Manual (+/−)'],
];

// Perubahan stok sebenarnya (pakai before/after kalau ada)
function change(l) {
  if (l.qty_before != null && l.qty_after != null) return Number(l.qty_after) - Number(l.qty_before);
  if (l.type === 'out') return -Number(l.qty);
  if (l.type === 'in') return Number(l.qty);
  return null;
}

const PILL = {
  out:    ['pill-out', '↑ Keluar'],
  in:     ['pill-in', '↓ Masuk'],
  adjust: ['pill-adjust', '✎ Koreksi'],
};

export default function Riwayat() {
  const [logs, setLogs]     = useState([]);
  const [busy, setBusy]     = useState(true);
  const [error, setError]   = useState('');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const load = () => {
    setBusy(true); setError('');
    fetchMovements()
      .then(setLogs)
      .catch(e => setError(e.message))
      .finally(() => setBusy(false));
  };
  useEffect(() => { load(); }, []);

  const q = search.trim().toLowerCase();
  const displayed = logs
    .filter(l => filter === 'all' || l.type === filter)
    .filter(l => !q ||
      (l.skus?.sku_code ?? '').toLowerCase().includes(q) ||
      (l.skus?.products?.name ?? '').toLowerCase().includes(q) ||
      (l.actor ?? '').toLowerCase().includes(q));

  const fmt = iso => new Date(iso).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="panel">
      <div className="panel-topbar">
        <h2>📋 Riwayat Pergerakan Stock</h2>
        <div className="row-actions" style={{ margin: 0 }}>
          <select value={filter} onChange={e => setFilter(e.target.value)} style={{ width: 'auto' }}>
            {FILTERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <button onClick={load}>🔄 Refresh</button>
        </div>
      </div>

      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="🔍  Cari produk, SKU, atau nama operator..."
        style={{ marginBottom: 14 }}
      />

      {error && <div className="banner-error">Gagal memuat riwayat: {error}</div>}
      {busy && <p className="muted">Memuat log...</p>}
      {!busy && !error && displayed.length === 0 && <p className="muted">Belum ada data.</p>}

      {!busy && displayed.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Produk</th>
                <th>SKU</th>
                <th style={{ textAlign: 'center' }}>Perubahan</th>
                <th style={{ textAlign: 'center' }}>Stok</th>
                <th>Tipe</th>
                <th>Oleh</th>
                <th>Catatan</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map(l => {
                const d = change(l);
                const [cls, label] = PILL[l.type] ?? ['', l.type];
                return (
                  <tr key={l.id}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>{fmt(l.created_at)}</td>
                    <td>{l.skus?.products?.name ?? '—'}</td>
                    <td><code>{l.skus?.sku_code ?? '—'}</code></td>
                    <td style={{ textAlign: 'center', fontWeight: 700 }}
                        className={d == null ? '' : d < 0 ? 'delta-neg' : 'delta-pos'}>
                      {d == null ? l.qty : d > 0 ? `+${d}` : d}
                    </td>
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                      {l.qty_before != null && l.qty_after != null
                        ? `${Number(l.qty_before)} → ${Number(l.qty_after)}` : '—'}
                    </td>
                    <td><span className={cls}>{label}</span></td>
                    <td style={{ fontSize: '0.8rem' }}>{l.actor ?? '—'}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{l.note ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="muted" style={{ marginTop: 10 }}>Menampilkan {displayed.length} entri terbaru (maks. 200).</p>
        </div>
      )}
    </div>
  );
}
