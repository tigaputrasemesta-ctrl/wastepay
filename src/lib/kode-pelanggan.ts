import { prisma } from "@/lib/prisma";

/**
 * Generate kode pelanggan per kelurahan — format acak ala "kode internet":
 *
 *   {KODE-KELURAHAN}-{TOKEN ACak}   contoh "KAL-8F3K2P"
 *
 *   - Prefix (KAL) diambil dari Kelurahan.kode → petugas langsung tahu areanya.
 *   - Token acak 6 karakter (charset tanpa huruf ambigu I/O/0/1) → kode tidak bisa
 *     ditebak/dienumerasi, sehingga noInvoice (INV/{kode}/{bulan}) ikut aman.
 *   - Kode bersifat permanen: saat pelanggan pindah kelurahan, kode TIDAK berubah
 *     (barcode & invoice historis tetap valid).
 *
 * Caller (route create) diharapkan menangani Prisma P2002 (bentrok sangat jarang,
 * peluang ±1/1 miliar per token) dengan retry + generate ulang.
 */

// Charset tanpa karakter ambigu: tanpa 0/O, 1/I/L
const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const PANJANG_TOKEN = 6;

export function randomToken(panjang: number = PANJANG_TOKEN): string {
  const buf = new Uint32Array(panjang);
  crypto.getRandomValues(buf);
  let s = "";
  for (let i = 0; i < panjang; i++) s += CHARSET[buf[i] % CHARSET.length];
  return s;
}

export async function generateKodePelanggan(kelurahanId: number): Promise<string> {
  const kelurahan = await prisma.kelurahan.findUnique({
    where: { id: kelurahanId },
    select: { kode: true },
  });
  const kodeKelurahan = (kelurahan?.kode || "").trim().toUpperCase();
  if (!kodeKelurahan) {
    throw new Error(`Kelurahan ${kelurahanId} belum punya kode (Kelurahan.kode kosong)`);
  }

  return `${kodeKelurahan}-${randomToken()}`;
}

/** Normalisasi kode zona (uppercase, tanpa spasi/karakter aneh) — contoh "kalibaru-a" → "KALIBARUA". */
export function normalisasiKodeWilayah(kode: string | undefined | null): string {
  return (kode || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
}
