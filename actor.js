// Nama operator disimpan di browser masing-masing (bukan di database).
// Dipakai untuk mencatat "siapa" yang mengubah stock di Riwayat.
const KEY = 'ams_actor';

export function getActor() {
  try { return localStorage.getItem(KEY) || null; } catch { return null; }
}

export function setActor(name) {
  try { localStorage.setItem(KEY, (name || '').trim()); } catch { /* abaikan */ }
}
