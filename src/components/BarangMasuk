import { useMemo, useState } from 'react';
import { addBarangMasuk, transferBulkToRetail } from '../lib/api';

export default function BarangMasuk({ products, onRefresh }) {
  const [mode,        setMode]        = useState('beli');   // 'beli' | 'transfer'
  const [selectedSku, setSelectedSku] = useState('');
  const [bulkSku,     setBulkSku]     = useState('');
  const [retailSku,   setRetailSku]   = useState('');
  const [qty,         setQty]         = useState('');
  const [note,        setNote]        = useState('');
  const [saving,      setSaving]      = useState(false);
  const [msg,         setMsg]         = useState(null);   // { type: 'ok'|'err', text }

  // Flatten semua SKU
  const allSkus = useMemo(() =>
    products.flatMap(p =>
      p.skus.map(s => ({
        ...s,
        productName: p.name,
        display: `${p.name} — ${s.sku_code} (${s.label}) · stok: ${s.qty ?? 0}`,
      }))
    ), [products]);

  const bulkSkus   = allSkus.filter(s => s.is_bulk);
  const retailSkus = allSkus.filter(s => !s.is_bulk);

  const handleSubmit = async () => {
    if (!qty || parseFloat(qty) <= 0) { alert('Isi qty dulu ya.'); return; }
    setSaving(true); setMsg(null);
    try {
      if (mode === 'beli') {
        if (!selectedSku) { alert('Pilih SKU dulu.'); return; }
        const sku = allSkus.find(s => s.sku_code === selectedSku);
        await addBarangMasuk({
          skuId: sku.id,
          qty:   parseFloat(qty),
          note:  note || `Restock / Pembelian baru: ${selectedSku}`,
        });
        setMsg({ type: 'ok', text: `✅ Stock ${selectedSku} berhasil ditambah ${qty} unit.` });
      } else {
        if (!bulkSku || !retailSku) { alert('Pilih bulk dan retail SKU dulu.'); return; }
        const bSku = allSkus.find(s => s.sku_code === bulkSku);
        const rSku = allSkus.find(s => s.sku_code === retailSku);
        await transferBulkToRetail({
          bulkSkuId:   bSku.id,
          retailSkuId: rSku.id,
          qty:         parseFloat(qty),
          note:        note || `Transfer ${bulkSku} → ${retailSku}`,
        });
        setMsg({ type: 'ok', text: `✅ Transfer ${qty} dari ${bulkSku} → ${retailSku} berhasil.` });
      }
      setQty(''); setNote(''); setSelectedSku(''); setBulkSku(''); setRetailSku('');
      onRefresh();
    } catch (e) {
      setMsg({ type: 'err', text: `❌ Gagal: ${e.message}` });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="panel">
      <h2>📥 Barang Masuk</h2>

      <div className="mode-toggle">
        <button
          className={mode === 'beli' ? 'active' : ''}
          onClick={() => { setMode('beli'); setMsg(null); }}
        >
          🛒 Pembelian / Restock Baru
        </button>
        <button
          className={mode === 'transfer' ? 'active' : ''}
          onClick={() => { setMode('transfer'); setMsg(null); }}
        >
          🔄 Transfer Bulk → Retail
        </button>
      </div>

      {msg && (
        <div className={msg.type === 'ok' ? 'banner-success' : 'banner-error'}>
          {msg.text}
        </div>
      )}

      {mode === 'beli' ? (
        <div className="form-grid">
          <label>
            SKU yang mau ditambah
            <select value={selectedSku} onChange={e => setSelectedSku(e.target.value)}>
              <option value="">— Pilih SKU —</option>
              {allSkus.map(s => (
                <option key={s.id} value={s.sku_code}>{s.display}</option>
              ))}
            </select>
          </label>
          <label>
            Jumlah yang masuk
            <input
              type="number" min={0} step="0.5"
              value={qty} onChange={e => setQty(e.target.value)}
              placeholder="contoh: 10"
            />
          </label>
          <label>
            Catatan (opsional)
            <input
              type="text"
              value={note} onChange={e => setNote(e.target.value)}
              placeholder="contoh: Beli 1 drum dari supplier X"
            />
          </label>
        </div>
      ) : (
        <div className="form-grid">
          <div className="transfer-info">
            <p>Gunakan ini kalau kamu ambil stock dari bulk (drum/pail) lalu packaging ke ukuran kecil.</p>
            <p>Qty yang dimasukkan akan <strong>dikurangi dari bulk</strong> dan <strong>ditambah ke retail</strong>.</p>
          </div>
          <label>
            Dari Bulk SKU
            <select value={bulkSku} onChange={e => setBulkSku(e.target.value)}>
              <option value="">— Pilih SKU Bulk —</option>
              {bulkSkus.map(s => (
                <option key={s.id} value={s.sku_code}>{s.display}</option>
              ))}
            </select>
          </label>
          <label>
            Ke Retail SKU
            <select value={retailSku} onChange={e => setRetailSku(e.target.value)}>
              <option value="">— Pilih SKU Retail —</option>
              {retailSkus.map(s => (
                <option key={s.id} value={s.sku_code}>{s.display}</option>
              ))}
            </select>
          </label>
          <label>
            Jumlah (unit retail)
            <input
              type="number" min={0} step="1"
              value={qty} onChange={e => setQty(e.target.value)}
              placeholder="contoh: 5 (berarti 5 botol)"
            />
          </label>
          <label>
            Catatan (opsional)
            <input
              type="text"
              value={note} onChange={e => setNote(e.target.value)}
              placeholder="contoh: Packing sesi siang"
            />
          </label>
        </div>
      )}

      <button
        className="btn-primary"
        onClick={handleSubmit}
        disabled={saving}
        style={{ marginTop: 16 }}
      >
        {saving ? 'Menyimpan...' : '💾 Simpan'}
      </button>
    </div>
  );
}
