import { useState } from 'react';
import { parseInput, buildCaption } from '../lib/waParser';
import { findSku, recordMovement } from '../lib/api';

export default function ResiInput({ onRefresh }) {
  const [text,    setText]    = useState('');
  const [items,   setItems]   = useState([]);
  const [caption, setCaption] = useState('');
  const [saving,  setSaving]  = useState(false);
  const [warns,   setWarns]   = useState([]);
  const [done,    setDone]    = useState(false);
  const [mode,    setMode]    = useState(null); // 'wa' | 'standard' | null

  const handleParse = () => {
    const parsed = parseInput(text);
    setItems(parsed);
    setCaption(buildCaption(parsed.filter(it => !it.error)));
    setWarns([]);
    setDone(false);

    if (parsed.length === 0) {
      alert('Tidak ada item yang terbaca.\n\nFormat WA:\n[7/1, 1:41 PM] nama: produk 1kg\n\nFormat Standard:\nProduct: ...\nSKU: ...\nQty: ...');
      return;
    }
    setMode(parsed[0].isWA ? 'wa' : 'standard');
  };

  const handleSimpan = async () => {
    if (!items.length) return;
    setSaving(true);
    const w = [];

    for (const it of items) {
      if (it.error) { w.push(`⚠️  Dilewati — ${it.error}`); continue; }
      if (!it.skuCode) { w.push(`⚠️  SKU kosong untuk: "${it.product}"`); continue; }
      try {
        const sku = await findSku(it.skuCode);
        if (!sku) {
          w.push(`❌  SKU "${it.skuCode}" tidak ada di database — cek kode SKU-nya.`);
          continue;
        }
        await recordMovement({
          skuId:     sku.id,
          qty:       it.qty,
          type:      'out',
          note:      it.note ?? `Penjualan: ${it.product} x${it.qty}`,
          timestamp: it.timestamp,
        });
      } catch (e) {
        w.push(`❌  Error "${it.skuCode}": ${e.message}`);
      }
    }

    setWarns(w);
    setSaving(false);

    if (w.length === 0) {
      setDone(true);
      setText(''); setItems([]); setCaption('');
      onRefresh();
    }
  };

  const copyCaption = () =>
    navigator.clipboard.writeText(caption)
      .then(() => alert('Caption disalin!'))
      .catch(() => alert('Gagal auto-copy, select manual ya.'));

  const reset = () => {
    setText(''); setItems([]); setCaption(''); setWarns([]); setDone(false); setMode(null);
  };

  return (
    <div className="panel">
      <h2>📝 Input Resi Penjualan</h2>

      <div className="format-hint">
        <details>
          <summary>Format yang didukung ↓</summary>
          <div className="hint-body">
            <strong>Format WhatsApp (copy-paste langsung dari chat):</strong>
            <pre>{`[7/1, 1:41 PM] dimas x-tp: nitric 1kg\n[7/1, 2:05 PM] budi shopee: gandapura 250g x2\n[7/1, 3:10 PM] rina tiktok: white oil 100g`}</pre>
            <strong>Format Resi Standard:</strong>
            <pre>{`Product: Nitric Acid\nSKU: IND-NA-1KG\nQty: 2\n\nProduct: White Oil\nSKU: COS-WOIL-250G\nQty: 1`}</pre>
          </div>
        </details>
      </div>

      {done ? (
        <div className="banner-success">
          ✅ Stock berhasil diperbarui! Semua item sudah terpotong di database.
          <button className="btn-sm" onClick={reset}>Input Resi Baru</button>
        </div>
      ) : (
        <>
          <textarea
            rows={8}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Paste resi di sini (format WA atau standard)..."
          />
          {mode && (
            <div className="mode-badge">
              {mode === 'wa' ? '📱 Terdeteksi: Format WhatsApp' : '📄 Terdeteksi: Format Resi Standard'}
            </div>
          )}
          <div className="row-actions">
            <button onClick={handleParse}>🔄 Parse / Convert</button>
            <button
              className="btn-primary"
              onClick={handleSimpan}
              disabled={!items.length || saving || items.every(it => it.error)}
            >
              {saving ? 'Menyimpan...' : '💾 Simpan & Potong Stock'}
            </button>
          </div>

          {warns.length > 0 && (
            <ul className="warn-list">{warns.map((w, i) => <li key={i}>{w}</li>)}</ul>
          )}

          {items.length > 0 && (
            <div className="preview">
              <h3>Preview</h3>
              <table>
                <thead>
                  <tr>
                    <th>Produk / Konten</th>
                    <th>SKU</th>
                    <th>Qty</th>
                    {mode === 'wa' && <><th>Waktu</th><th>Pengirim</th></>}
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, i) => (
                    <tr key={i} className={it.error ? 'row-warn' : ''}>
                      <td>{it.product}</td>
                      <td><code>{it.skuCode ?? '—'}</code></td>
                      <td style={{ textAlign: 'center' }}>{it.qty}</td>
                      {mode === 'wa' && (
                        <>
                          <td style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                            {it.timestamp
                              ? new Date(it.timestamp).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                              : '—'}
                          </td>
                          <td style={{ fontSize: '0.78rem' }}>{it.sender ?? '—'}</td>
                        </>
                      )}
                      <td>{it.error
                        ? <span style={{ color: '#f87171', fontSize: '0.78rem' }}>⚠️ {it.error}</span>
                        : <span style={{ color: '#34d399', fontSize: '0.78rem' }}>✓ OK</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {caption && (
                <>
                  <h3>Caption Label Paket</h3>
                  <textarea rows={items.length * 3 + 2} readOnly value={caption} />
                  <button onClick={copyCaption}>📋 Copy Caption</button>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
