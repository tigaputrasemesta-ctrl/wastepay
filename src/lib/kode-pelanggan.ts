import { prisma } from "@/lib/prisma";

/**
 * Generate kode pelanggan per zona (wilayah) — format acak ala "kode internet":
 *
 *   {KODE-WILAYAH}-{TOKEN ACak}   contoh "KAL-8F3K2P"
 *
 *   - Prefix zona (KAL) diambil dari Wilayah.kode → petugas langsung tahu zonanya.
 *   - Token acak 6 karakter (charset tanpa huruf ambigu I/O/0/1) → kode tidak bisa
 *     ditebak/dienumerasi, sehingga noInvoice (INV/{kode}/{bulan}) ikut aman.
 *   - Kode bersifat permanen: saat pelanggan pindah wilayah, kode TIDAK berubah
 *     (barcode & invoice historis tetap valid) — zona aktif dilacak via wilayahId.
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

export async function generateKodePelanggan(wilayahId: number): Promise<string> {
  const wilayah = await prisma.wilayah.findUnique({
    where: { id: wilayahId },
    select: { kode: true },
  });
  const kodeWilayah = (wilayah?.kode || "").trim().toUpperCase();
  if (!kodeWilayah) {
    throw new Error(`Wilayah ${wilayahId} belum punya kode zona (Wilayah.kode kosong)`);
  }

  return `${kodeWilayah}-${randomToken()}`;
}

/** Normalisasi kode zona (uppercase, tanpa spasi/karakter aneh) — contoh "kalibaru-a" → "KALIBARUA". */
export function normalisasiKodeWilayah(kode: string | undefined | null): string {
  return (kode || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
}
