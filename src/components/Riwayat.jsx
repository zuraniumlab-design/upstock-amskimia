import { useEffect, useState } from 'react';
import { fetchMovements } from '../lib/api';

export default function Riwayat() {
  const [logs, setLogs]   = useState([]);
  const [busy, setBusy]   = useState(true);

  useEffect(() => {
    fetchMovements()
      .then(setLogs)
      .finally(() => setBusy(false));
  }, []);

  const fmt = iso => new Date(iso).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="resi-section">
      <h2>📋  Riwayat Pergerakan Stock (50 Terakhir)</h2>
      {busy && <p className="muted">Memuat log...</p>}
      {!busy && logs.length === 0 && <p className="muted">Belum ada pergerakan stock.</p>}
      {!busy && logs.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Waktu</th>
              <th>Produk</th>
              <th>SKU</th>
              <th>Qty</th>
              <th>Tipe</th>
              <th>Catatan</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(l => (
              <tr key={l.id}>
                <td style={{ whiteSpace: 'nowrap' }}>{fmt(l.created_at)}</td>
                <td>{l.skus?.products?.name ?? '-'}</td>
                <td>{l.skus?.sku_code ?? '-'}</td>
                <td style={{ textAlign: 'center' }}>{l.qty}</td>
                <td>
                  <span className={l.type === 'out' ? 'badge-out' : 'badge-in'}>
                    {l.type === 'out' ? 'Keluar' : 'Masuk'}
                  </span>
                </td>
                <td>{l.note ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
