/**
 * Mendukung 2 format input (auto-detect):
 *
 * FORMAT A — Copy-paste langsung dari WhatsApp (bisa masif, banyak pesan):
 *
 *   [7/1, 1:41 PM] dimas hartono x-tp: Product: Nitric Acid
 *   SKU: IND-NA-1KG
 *   Qty: 1
 *
 *   [7/1, 2:05 PM] budi shopee: Product: White Oil
 *   SKU: COS-WOIL-250G
 *   Qty: 2
 *
 * FORMAT B — Resi standard tanpa header WA:
 *
 *   Product: Nitric Acid
 *   SKU: IND-NA-1KG
 *   Qty: 2
 *
 * CATATAN: Qty HARUS angka bulat. Sistem tidak menerima 0.5 atau 0,5.
 */

// Parse timestamp dari bracket WA: "7/1, 1:41 PM" atau "7/1/2025, 13:41"
function parseWATimestamp(bracket) {
  const m = bracket.match(/(\d+)\/(\d+)(?:\/(\d{4}))?,\s*(\d+):(\d+)\s*(AM|PM)?/i);
  if (!m) return new Date().toISOString();

  const month = parseInt(m[1]) - 1;
  const day   = parseInt(m[2]);
  const year  = m[3] ? parseInt(m[3]) : new Date().getFullYear();
  let   hour  = parseInt(m[4]);
  const min   = parseInt(m[5]);
  const ampm  = m[6];

  if (ampm && ampm.toUpperCase() === 'PM' && hour < 12) hour += 12;
  if (ampm && ampm.toUpperCase() === 'AM' && hour === 12) hour = 0;

  return new Date(year, month, day, hour, min).toISOString();
}

/**
 * Parse teks baris per baris menjadi item Product/SKU/Qty.
 * Mengembalikan array of { product, skuCode, qty }.
 */
function parseStandardLines(lines) {
  const results = [];
  let cur = {};

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    if (/^product\s*:/i.test(line)) {
      cur = { product: line.replace(/^product\s*:/i, '').trim() };
    } else if (/^sku\s*:/i.test(line)) {
      cur.skuCode = line.replace(/^sku\s*:/i, '').trim().toUpperCase();
    } else if (/^qty\s*:/i.test(line)) {
      // Qty wajib integer — tolak desimal
      const raw_qty = line.replace(/^qty\s*:/i, '').trim().replace(',', '.');
      const qty = parseInt(raw_qty, 10);

      if (isNaN(qty) || qty <= 0) {
        if (cur.product) {
          results.push({ ...cur, qty: 0, error: `Qty tidak valid: "${raw_qty}" — harus angka bulat > 0` });
          cur = {};
        }
        continue;
      }

      if (cur.product && cur.skuCode) {
        results.push({ ...cur, qty });
        cur = {};
      }
    }
  }

  return results;
}

/**
 * Main parser — auto-detect format WA vs standard.
 * Return array of:
 * { product, skuCode, qty, timestamp, sender, note, isWA, error? }
 */
export function parseInput(rawText) {
  const hasWAHeader = /\[\d+\/\d+[^\]]*\]/.test(rawText);

  if (hasWAHeader) {
    return parseWABulk(rawText);
  } else {
    return parseStandardLines(rawText.split('\n')).map(item => ({
      ...item,
      timestamp: new Date().toISOString(),
      sender:    null,
      isWA:      false,
      note:      item.error ?? `Resi: ${item.product} x${item.qty}`,
    }));
  }
}

/**
 * Parse satu atau banyak pesan WA sekaligus.
 * Setiap pesan dimulai dengan [timestamp] nama: ...
 */
function parseWABulk(rawText) {
  const results = [];

  // Pecah berdasarkan pola header WA — [tanggal, jam] nama:
  // Kita split tapi JAGA header-nya dengan positive lookahead
  const blocks = rawText.split(/(?=\[\d+\/\d+[^\]]*\]\s*[^:\n]+:)/);

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    // Ambil header: [7/1, 1:41 PM] dimas x-tp:
    const headerMatch = trimmed.match(/^\[([^\]]+)\]\s*([^:\n]+):\s*([\s\S]*)$/);
    if (!headerMatch) {
      // Tidak ada header WA — parse sebagai standard kalau ada Product/SKU/Qty
      const items = parseStandardLines(trimmed.split('\n'));
      items.forEach(it => {
        results.push({
          ...it,
          timestamp: new Date().toISOString(),
          sender: null,
          isWA: false,
          note: it.error ?? `Resi: ${it.product} x${it.qty}`,
        });
      });
      continue;
    }

    const timestamp = parseWATimestamp(headerMatch[1]);
    const sender    = headerMatch[2].trim();
    const body      = headerMatch[3];

    // Parse body sebagai Product/SKU/Qty standard
    const items = parseStandardLines(body.split('\n'));

    if (items.length === 0) {
      // Pesan WA ini tidak mengandung resi — skip
      continue;
    }

    items.forEach(item => {
      results.push({
        ...item,
        timestamp,
        sender,
        isWA: true,
        note: item.error ?? `WA [${sender}]: ${item.product} x${item.qty}`,
      });
    });
  }

  return results;
}

/** Caption label paket dari items yang valid */
export function buildCaption(items) {
  const valid = items.filter(it => !it.error && it.qty > 0);
  if (!valid.length) return '';

  const lines = ['=== RESI PRODUK AMS KIMIA ==='];
  valid.forEach((it, i) => {
    lines.push(`${i + 1}. ${it.product}`);
    lines.push(`   SKU  : ${it.skuCode}`);
    lines.push(`   Qty  : ${it.qty}`);
    if (it.sender) lines.push(`   Dari : ${it.sender}`);
  });
  lines.push('=============================');
  return lines.join('\n');
}
