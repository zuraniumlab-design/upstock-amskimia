import { supabase } from './supabase';
import { getActor } from './actor';

/* ───────── Baca data ───────── */

export async function fetchProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, shortcode, grade, category, kind, skus(id, sku_code, label, qty, is_bulk)')
    .order('name');
  if (error) throw error;
  return data;
}

export async function findSku(skuCode) {
  const { data, error } = await supabase
    .from('skus')
    .select('id, qty, sku_code, product_id')
    .eq('sku_code', skuCode.trim().toUpperCase())
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchMovements() {
  const { data, error } = await supabase
    .from('stock_movements')
    .select('id, qty, type, note, created_at, qty_before, qty_after, actor, skus(sku_code, products(name, kind))')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return data;
}

/* ───────── Helper internal ───────── */

async function readQty(skuId) {
  const { data, error } = await supabase.from('skus').select('qty').eq('id', skuId).single();
  if (error) throw error;
  return Number(data.qty ?? 0);
}

// Update qty hanya jika qty di DB masih sama seperti yang tadi dibaca.
// Kalau orang lain mengubahnya di antara itu, update ditolak (anti-selisih).
async function commitQty(skuId, before, after) {
  const { data, error } = await supabase
    .from('skus')
    .update({ qty: after })
    .eq('id', skuId)
    .eq('qty', before)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('Stok baru saja berubah (mungkin diedit orang lain). Data sudah dimuat ulang, silakan coba lagi.');
  }
}

async function writeLog({ skuId, qty, type, note, before, after, timestamp }) {
  const row = {
    sku_id: skuId, qty, type, note,
    qty_before: before, qty_after: after,
    actor: getActor(),
  };
  if (timestamp) row.created_at = timestamp;
  const { error } = await supabase.from('stock_movements').insert(row);
  if (error) throw new Error('Stok sudah berubah tapi gagal mencatat riwayat: ' + error.message);
}

/* ───────── Pergerakan stock ───────── */

// Penjualan (out) / barang masuk (in). Dipakai Input Resi & Barang Masuk.
export async function recordMovement({ skuId, qty, type, note, timestamp }) {
  const before = await readQty(skuId);
  const delta  = type === 'out' ? -Math.abs(qty) : Math.abs(qty);
  const after  = Math.max(0, before + delta);
  await commitQty(skuId, before, after);
  await writeLog({ skuId, qty: Math.abs(qty), type, note, before, after, timestamp });
  return after;
}

// Koreksi manual dari tombol +/- (delta) atau ketik angka (newQty). Selalu tercatat.
export async function adjustQty({ skuId, delta, newQty, note }) {
  const before = await readQty(skuId);
  const target = newQty !== undefined ? newQty : before + delta;
  const after  = Math.max(0, Math.round(target));
  if (after === before) return before;
  await commitQty(skuId, before, after);
  await writeLog({
    skuId,
    qty: Math.abs(after - before),
    type: 'adjust',
    note: note ?? (newQty !== undefined
      ? 'Koreksi manual (ketik angka)'
      : `Koreksi manual (tombol ${delta > 0 ? '+' : ''}${delta})`),
    before, after,
  });
  return after;
}

export async function addBarangMasuk({ skuId, qty, note }) {
  return recordMovement({ skuId, qty, type: 'in', note });
}

export async function transferBulkToRetail({ bulkSkuId, retailSkuId, qty, note }) {
  const bulkQty = await readQty(bulkSkuId);
  if (Math.abs(qty) > bulkQty) {
    throw new Error(`Stok bulk tidak cukup (tersisa ${bulkQty}, diminta ${qty}).`);
  }
  await recordMovement({ skuId: bulkSkuId,   qty, type: 'out', note: `Transfer ke retail: ${note}` });
  await recordMovement({ skuId: retailSkuId, qty, type: 'in',  note: `Transfer dari bulk: ${note}` });
}

/* ───────── Kelola produk & SKU dari web ───────── */

export async function addProduct({ name, shortcode, grade, category, kind }) {
  const { data, error } = await supabase
    .from('products')
    .insert({ name, shortcode, grade, category: category || null, kind })
    .select('id, name')
    .single();
  if (error) throw error;
  return data;
}

export async function addSku({ productId, skuCode, label, qty, isBulk }) {
  const { data, error } = await supabase
    .from('skus')
    .insert({ product_id: productId, sku_code: skuCode, label, qty, is_bulk: isBulk })
    .select('id')
    .single();
  if (error) throw error;

  if (qty > 0) {
    await writeLog({
      skuId: data.id, qty, type: 'in',
      note: 'Stok awal (SKU baru)', before: 0, after: qty,
    });
  }
  return data;
}
