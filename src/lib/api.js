import { supabase } from './supabase';

/** Ambil semua produk + SKU */
export async function fetchProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, shortcode, grade, category, skus(id, sku_code, label, qty, is_bulk)')
    .order('name');
  if (error) throw error;
  return data;
}

/** Update qty satu SKU (dari tombol +/-) */
export async function updateQty(skuId, newQty) {
  const { error } = await supabase
    .from('skus')
    .update({ qty: newQty })
    .eq('id', skuId);
  if (error) throw error;
}

/** Cari SKU by kode */
export async function findSku(skuCode) {
  const { data, error } = await supabase
    .from('skus')
    .select('id, qty, sku_code')
    .eq('sku_code', skuCode.trim().toUpperCase())
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Catat pergerakan stock (penjualan = type:'out', restock = type:'in')
 * Sekaligus update qty di tabel skus.
 */
export async function recordMovement({ skuId, qty, type, note }) {
  // Ambil qty sekarang
  const { data: sku, error: e1 } = await supabase
    .from('skus').select('qty').eq('id', skuId).single();
  if (e1) throw e1;

  const delta  = type === 'out' ? -Math.abs(qty) : Math.abs(qty);
  const newQty = Math.max(0, (sku.qty ?? 0) + delta);

  // Update qty
  const { error: e2 } = await supabase
    .from('skus').update({ qty: newQty }).eq('id', skuId);
  if (e2) throw e2;

  // Simpan log
  const { error: e3 } = await supabase
    .from('stock_movements').insert({ sku_id: skuId, qty, type, note });
  if (e3) throw e3;

  return newQty;
}

/** Ambil 50 log pergerakan stock terbaru (untuk halaman Riwayat) */
export async function fetchMovements() {
  const { data, error } = await supabase
    .from('stock_movements')
    .select('id, qty, type, note, created_at, skus(sku_code, products(name))')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data;
}
