import { useState } from 'react';
import { findSku, recordMovement } from '../lib/api';

/**
 * Format resi yang diterima (case-insensitive, spasi fleksibel):
 *
 *   Product: White Oil
 *   SKU: COS-WOIL-250G
 *   Qty: 3
 *
 * Bisa multi-item: pisahkan dengan baris kosong atau langsung tulis berurutan.
 */
function parseResi(raw) {
  const items = [];
  let cur = {};
  raw.split('\n').forEach(line => {
    line = line.trim();
    if (!line) return;
    if (/^product\s*:/i.test(line))  cur.product = line.replace(/^product\s*:/i, '').trim();
    else if (/^sku\s*:/i.test(line)) cur.sku     = line.replace(/^sku\s*:/i, '').trim();
    else if (/^qty\s*:/i.test(line)) {
      cur.qty = parseFloat(line.replace(/^qty\s*:/i, '').trim());
      if (cur.sku && cur.qty > 0) { items.push({ ...cur }); cur = {}; }
    }
  });
  return items;
}

function buildCaption(items) {
  const lines = ['=== RESI PRODUK AMS KIMIA ==='];
  items.forEach((it, i) => {
    lines.push(`${i + 1}. ${it.product}`);
    lines.push(`   SKU : ${it.sku}`);
    lines.push(`   Qty : ${it.qty}`);
  });
  lines.push('=============================');
  return lines.join('\n');
}

export default function ResiInput({ onRefresh }) {
  const [text, setText]       = useState('');
  const [items, setItems]     = useState([]);
  const [caption, setCaption] = useState('');
  const [saving, setSaving]   = useState(false);
  const [warns, setWarns]     = useState([]);
  const [done, setDone]       = useState(false);

  const handleParse = () => {
    const parsed = parseResi(text);
    setItems(parsed);
    setCaption(buildCaption(parsed));
    setWarns([]);
    setDone(false);
    if (!parsed.length) alert('Tidak ada item yang terbaca. Cek lagi formatnya ya (Product / SKU / Qty).');
  };

  const handleSimpan = async () => {
    if (!items.length) return;
    setSaving(true);
    const w = [];
    for (const it of items) {
      try {
        const sku = await findSku(it.sku);
        if (!sku) { w.push(`⚠️  SKU "${it.sku}" tidak ditemukan — pastikan kode SKU sudah benar.`); continue; }
        await recordMovement({ skuId: sku.id, qty: it.qty, type: 'out', note: `Resi: ${it.product} x${it.qty}` });
      } catch (e) {
        w.push(`❌  Gagal simpan "${it.sku}": ${e.message}`);
      }
    }
    setWarns(w);
    setSaving(false);
    if (!w.length) {
      setDone(true);
      setText('');
      setItems([]);
      onRefresh();
    }
  };

  const copyCaption = () => navigator.clipboard.writeText(caption)
    .then(() => alert('Caption disalin! Tempel di deskripsi pengiriman / chat pembeli.'))
    .catch(() => alert('Gagal auto-copy, select manual teksnya ya.'));

  const reset = () => { setText(''); setItems([]); setCaption(''); setWarns([]); setDone(false); };

  return (
    <div className="resi-section">
      <h2>📦  Input Resi Penjualan</h2>

      {done && (
        <div className="success-banner">
          ✅ Stock berhasil diperbarui! Semua item dari resi sudah terpotong di database.
          <button className="btn-sm" onClick={reset}>Input Resi Baru</button>
        </div>
      )}

      {!done && (
        <>
          <textarea
            rows={8}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={
              'Paste resi di sini...\n\nContoh:\nProduct: Nitric Acid\nSKU: IND-NA-1KG\nQty: 2\n\nProduct: White Oil\nSKU: COS-WOIL-250G\nQty: 1'
            }
          />
          <div className="resi-actions">
            <button onClick={handleParse}>🔄  Parse / Convert</button>
            <button className="btn-primary" onClick={handleSimpan} disabled={!items.length || saving}>
              {saving ? 'Menyimpan...' : '💾  Simpan & Potong Stock'}
            </button>
          </div>

          {warns.length > 0 && (
            <ul className="warn-list">
              {warns.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          )}

          {items.length > 0 && (
            <div className="preview-box">
              <h3>Preview Item</h3>
              <table>
                <thead><tr><th>Produk</th><th>SKU</th><th>Qty</th></tr></thead>
                <tbody>
                  {items.map((it, i) => (
                    <tr key={i}><td>{it.product}</td><td>{it.sku}</td><td>{it.qty}</td></tr>
                  ))}
                </tbody>
              </table>

              <h3>Caption Label Paket (otomatis)</h3>
              <textarea rows={items.length * 3 + 2} readOnly value={caption} />
              <button onClick={copyCaption}>📋  Copy Caption</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
