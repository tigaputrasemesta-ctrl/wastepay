/**
 * Logika murni pendaftaran mandiri (daftar-online) — dipakai route
 * `/api/publik/daftar` dan diuji di `tests/`.
 */

/** Normalisasi nomor telepon: buang karakter selain digit & "+". */
export function normalisasiTelepon(t: string): string {
  return t.replace(/[^\d+]/g, "");
}

/** Format RT/RW konsisten dengan sistem: "RT 01 / RW 03". */
export function formatRtRw(rt?: string, rw?: string): string {
  const rtT = rt?.trim();
  const rwT = rw?.trim();
  if (rtT && rwT) return `RT ${rtT} / RW ${rwT}`;
  if (rtT) return `RT ${rtT}`;
  if (rwT) return `RW ${rwT}`;
  return "";
}

/** Validasi nomor telepon Indonesia (08xx… atau 628xx…), 9–15 digit. */
export function teleponValid(t: string): boolean {
  const n = normalisasiTelepon(t).replace(/^\+/, "");
  if (n.length < 9 || n.length > 15) return false;
  return /^(0|62)\d+$/.test(n);
}
