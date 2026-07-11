import { useEffect, useState } from 'react';
import { fetchMovements } from '../lib/api';

export default function Riwayat() {
  const [logs,    setLogs]    = useState([]);
  const [busy,    setBusy]    = useState(true);
  const [filter,  setFilter]  = useState('all'); // 'all' | 'in' | 'out'

  const load = () => {
    setBusy(true);
    fetchMovements().then(setLogs).finally(() => setBusy(false));
  };

  useEffect(() => { load(); }, []);

  const displayed = filter === 'all' ? logs : logs.filter(l => l.type === filter);

  const fmt = iso => new Date(iso).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="panel">
      <div className="panel-topbar">
        <h2>📋 Riwayat Pergerakan Stock</h2>
        <div className="row-actions">
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            style={{ width: 'auto' }}
          >
            <option value="all">Semua</option>
            <option value="out">Keluar (Penjualan)</option>
            <option value="in">Masuk (Restock)</option>
          </select>
          <button onClick={load}>🔄 Refresh</button>
        </div>
      </div>

      {busy && <p className="muted">Memuat log...</p>}
      {!busy && displayed.length === 0 && <p className="muted">Belum ada data.</p>}
      {!busy && displayed.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Waktu Aktual</th>
                <th>Produk</th>
                <th>SKU</th>
                <th style={{ textAlign: 'center' }}>Qty</th>
                <th>Tipe</th>
                <th>Catatan</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map(l => (
                <tr key={l.id}>
                  <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>{fmt(l.created_at)}</td>
                  <td>{l.skus?.products?.name ?? '—'}</td>
                  <td><code>{l.skus?.sku_code ?? '—'}</code></td>
                  <td style={{ textAlign: 'center', fontWeight: 600 }}>{l.qty}</td>
                  <td>
                    <span className={l.type === 'out' ? 'pill-out' : 'pill-in'}>
                      {l.type === 'out' ? '↑ Keluar' : '↓ Masuk'}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{l.note ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted" style={{ marginTop: 10 }}>Menampilkan {displayed.length} entri terbaru.</p>
        </div>
      )}
    </div>
  );
}
