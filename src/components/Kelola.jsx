import { useMemo, useState } from 'react';
import { addProduct, addSku } from '../lib/api';

const GRADES = [
  ['IND', 'IND — Industrial'], ['FOOD', 'FOOD — Food Grade'], ['COS', 'COS — Cosmetic'],
  ['FEED', 'FEED — Pakan'], ['AGRI', 'AGRI — Pertanian'], ['BTL', 'BTL — Botol / Kemasan'],
];
const QUICK_SIZES = ['100G', '250G', '500G', '1KG', '5KG', '20KG', '20L', 'BULK'];

function normSize(raw) {
  return raw
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/KILOGRAM|KILO/g, 'KG')
    .replace(/GRAM|GR\b/g, 'G')
    .replace(/LITER|LTR/g, 'L')
    .replace(/[.,]/g, 'P')
    .replace(/[^A-Z0-9]/g, '');
}

function labelFromSize(code, raw) {
  if (code === 'BULK') return 'Bulk';
  const m = code.match(/^(\d+)(G|KG|ML|L)$/);
  if (m) {
    const [, n, u] = m;
    return u === 'G' ? `${n}g` : u === 'KG' ? `${n} Kg` : u === 'ML' ? `${n}ml` : `${n} L`;
  }
  return raw.trim();
}

// Ambil prefix dari SKU yang sudah ada, mis. IND-KAPB-1KG → IND-KAPB
function derivePrefix(product) {
  if (!product) return '';
  const first = product.skus?.[0]?.sku_code;
  if (first && first.includes('-')) return first.slice(0, first.lastIndexOf('-'));
  return `${product.grade}-${(product.shortcode || '').replace(/-/g, '')}`;
}

export default function Kelola({ products, onRefresh }) {
  const [mode, setMode]   = useState('sku'); // 'sku' | 'produk'
  const [msg, setMsg]     = useState(null);
  const [saving, setSaving] = useState(false);

  // form produk baru
  const [pName, setPName]   = useState('');
  const [pCode, setPCode]   = useState('');
  const [pKind, setPKind]   = useState('chemical');
  const [pGrade, setPGrade] = useState('IND');
  const [pCat, setPCat]     = useState('');

  // form SKU baru
  const [productId, setProductId] = useState('');
  const [sizeRaw, setSizeRaw]     = useState('');
  const [codeOverride, setCodeOverride] = useState(null);
  const [initQty, setInitQty]     = useState('0');

  const product = useMemo(
    () => products.find(p => String(p.id) === String(productId)),
    [products, productId]
  );
  const sizeCode = normSize(sizeRaw);
  const autoCode = product && sizeCode ? `${derivePrefix(product)}-${sizeCode}` : '';
  const finalCode = (codeOverride ?? autoCode).toUpperCase();
  const isBulk = sizeCode === 'BULK';

  const chemicals = products.filter(p => (p.kind ?? 'chemical') === 'chemical');
  const bottles   = products.filter(p => p.kind === 'bottle');

  const fail = text => setMsg({ type: 'err', text });

  const handleAddProduct = async () => {
    setMsg(null);
    const name = pName.trim();
    const code = pCode.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
    if (!name || !code) return fail('Nama produk dan kode singkat wajib diisi.');
    if (products.some(p => (p.shortcode || '').toUpperCase() === code)) {
      return fail(`Kode singkat "${code}" sudah dipakai produk lain.`);
    }
    setSaving(true);
    try {
      const row = await addProduct({ name, shortcode: code, grade: pGrade, category: pCat.trim(), kind: pKind });
      await onRefresh();
      setProductId(String(row.id));
      setPName(''); setPCode(''); setPCat('');
      setMode('sku');
      setMsg({ type: 'ok', text: `✅ Produk "${row.name}" dibuat. Sekarang tambahkan SKU/ukurannya di bawah.` });
    } catch (e) {
      fail('Gagal membuat produk: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddSku = async () => {
    setMsg(null);
    if (!product) return fail('Pilih produk dulu.');
    if (!sizeCode) return fail('Isi ukuran dulu (contoh: 1kg, 500g, 20L, bulk).');
    if (!/^[A-Z0-9-]+$/.test(finalCode)) return fail('Kode SKU hanya boleh huruf kapital, angka, dan tanda "-".');
    const qty = parseInt(initQty || '0', 10);
    if (Number.isNaN(qty) || qty < 0) return fail('Stok awal harus angka bulat ≥ 0.');

    setSaving(true);
    try {
      await addSku({
        productId: product.id,
        skuCode: finalCode,
        label: labelFromSize(sizeCode, sizeRaw),
        qty,
        isBulk,
      });
      await onRefresh();
      setMsg({ type: 'ok', text: `✅ SKU ${finalCode} ditambahkan ke "${product.name}" (stok awal ${qty}).` });
      setSizeRaw(''); setCodeOverride(null); setInitQty('0');
    } catch (e) {
      fail(e.code === '23505'
        ? `Kode SKU "${finalCode}" sudah ada. Ganti kodenya.`
        : 'Gagal menambah SKU: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="panel">
      <h2>🛠️ Kelola Produk & SKU</h2>
      <p className="hint-text">Tambah produk atau ukuran baru langsung dari sini — tidak perlu buka Supabase lagi.</p>

      <div className="mode-toggle">
        <button className={mode === 'sku' ? 'active' : ''} onClick={() => { setMode('sku'); setMsg(null); }}>
          ➕ SKU / Ukuran Baru
        </button>
        <button className={mode === 'produk' ? 'active' : ''} onClick={() => { setMode('produk'); setMsg(null); }}>
          🧪 Produk Baru
        </button>
      </div>

      {msg && <div className={msg.type === 'ok' ? 'banner-success' : 'banner-error'}>{msg.text}</div>}

      {mode === 'sku' ? (
        <div className="form-grid">
          <label>
            Produk
            <select value={productId} onChange={e => { setProductId(e.target.value); setCodeOverride(null); }}>
              <option value="">— Pilih produk —</option>
              <optgroup label="Kimia">
                {chemicals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </optgroup>
              {bottles.length > 0 && (
                <optgroup label="Botol">
                  {bottles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </optgroup>
              )}
            </select>
          </label>

          {product && (
            <div className="existing-skus">
              SKU yang sudah ada:{' '}
              {product.skus.length === 0 ? <em>belum ada</em> :
                product.skus.map(s => <code key={s.id}>{s.sku_code}</code>)}
            </div>
          )}

          <label>
            Ukuran
            <input
              type="text"
              value={sizeRaw}
              onChange={e => { setSizeRaw(e.target.value); setCodeOverride(null); }}
              placeholder="contoh: 1kg, 500g, 20L, bulk"
            />
          </label>
          <div className="chips">
            {QUICK_SIZES.map(s => (
              <button key={s} className="chip" onClick={() => { setSizeRaw(s); setCodeOverride(null); }}>{s}</button>
            ))}
          </div>

          <label>
            Kode SKU (otomatis, boleh diedit)
            <input
              type="text"
              value={codeOverride ?? autoCode}
              onChange={e => setCodeOverride(e.target.value.toUpperCase().replace(/\s/g, ''))}
              placeholder="terisi otomatis setelah pilih produk + ukuran"
            />
          </label>

          <label>
            Stok awal
            <input type="number" min={0} step={1} value={initQty} onChange={e => setInitQty(e.target.value)} />
          </label>

          <button className="btn-primary" onClick={handleAddSku} disabled={saving}>
            {saving ? 'Menyimpan...' : '💾 Simpan SKU'}
          </button>
        </div>
      ) : (
        <div className="form-grid">
          <label>
            Jenis
            <select value={pKind} onChange={e => { setPKind(e.target.value); setPGrade(e.target.value === 'bottle' ? 'BTL' : 'IND'); }}>
              <option value="chemical">Produk Kimia</option>
              <option value="bottle">Botol / Kemasan</option>
            </select>
          </label>
          <label>
            Nama produk
            <input type="text" value={pName} onChange={e => setPName(e.target.value)} placeholder="contoh: Pupuk Kompos" />
          </label>
          <label>
            Kode singkat (unik, huruf kapital)
            <input type="text" value={pCode} onChange={e => setPCode(e.target.value.toUpperCase())} placeholder="contoh: KOMPOS" />
          </label>
          <label>
            Grade / kategori kode
            <select value={pGrade} onChange={e => setPGrade(e.target.value)}>
              {GRADES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <label>
            Deskripsi kategori (opsional)
            <input type="text" value={pCat} onChange={e => setPCat(e.target.value)} placeholder="contoh: Solid Granular (Agricultural Grade)" />
          </label>
          <button className="btn-primary" onClick={handleAddProduct} disabled={saving}>
            {saving ? 'Menyimpan...' : '💾 Simpan Produk'}
          </button>
        </div>
      )}
    </div>
  );
}
