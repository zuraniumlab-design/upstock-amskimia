import { supabase } from './supabase';

/** Ambil semua produk + SKU, diurutkan */
export async function fetchProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, shortcode, grade, category, skus(id, sku_code, label, qty, is_bulk)')
    .order('name');
  if (error) throw error;
  return data;
}

/** Update qty satu SKU langsung (dari inline edit) */
export async function updateQty(skuId, newQty) {
  const { error } = await supabase
    .from('skus').update({ qty: newQty }).eq('id', skuId);
  if (error) throw error;
}

/** Cari SKU by kode (case-insensitive) */
export async function findSku(skuCode) {
  const { data, error } = await supabase
    .from('skus')
    .select('id, qty, sku_code, product_id')
    .eq('sku_code', skuCode.trim().toUpperCase())
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Catat pergerakan stock dengan opsional timestamp kustom.
 * Dipakai untuk resi WhatsApp supaya waktunya sesuai timestamp WA.
 */
export async function recordMovement({ skuId, qty, type, note, timestamp }) {
  const { data: sku, error: e1 } = await supabase
    .from('skus').select('qty').eq('id', skuId).single();
  if (e1) throw e1;

  const delta  = type === 'out' ? -Math.abs(qty) : Math.abs(qty);
  const newQty = Math.max(0, (sku.qty ?? 0) + delta);

  const { error: e2 } = await supabase
    .from('skus').update({ qty: newQty }).eq('id', skuId);
  if (e2) throw e2;

  const record = { sku_id: skuId, qty, type, note };
  if (timestamp) record.created_at = timestamp; // custom WA timestamp

  const { error: e3 } = await supabase
    .from('stock_movements').insert(record);
  if (e3) throw e3;

  return newQty;
}

/**
 * Transfer Bulk → Retail
 * Kurangi bulkSkuId, tambah retailSkuId sebesar qty.
 */
export async function transferBulkToRetail({ bulkSkuId, retailSkuId, qty, note }) {
  // Kurangi bulk
  await recordMovement({ skuId: bulkSkuId, qty, type: 'out', note: `Transfer ke retail: ${note}` });
  // Tambah retail
  await recordMovement({ skuId: retailSkuId, qty, type: 'in', note: `Transfer dari bulk: ${note}` });
}

/**
 * Barang masuk baru (beli stok baru / restock dari supplier)
 */
export async function addBarangMasuk({ skuId, qty, note }) {
  return recordMovement({ skuId, qty, type: 'in', note });
}

/** Log pergerakan 100 terakhir */
export async function fetchMovements() {
  const { data, error } = await supabase
    .from('stock_movements')
    .select('id, qty, type, note, created_at, skus(sku_code, products(name))')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data;
}
