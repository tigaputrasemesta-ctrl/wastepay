/**
 * Helper format invoice — murni (tanpa import server-only seperti prisma/pg),
 * aman dipakai dari komponen client ("use client").
 *
 * Fungsi yang butuh database (getTagihanByNoInvoice dkk) tetap ada di
 * src/lib/invoice.ts dan hanya aman dipakai dari Server Components.
 */
import { duitkuChannelLabel } from "./duitku-channels";

/** Persen PPN yang dipakai saat menampilkan rincian invoice */
export const PPN_RATE = 11;

/**
 * Info perusahaan pada invoice — diatur via env (default: contoh).
 *   COMPANY_NAME / COMPANY_ADDRESS / COMPANY_WHATSAPP / COMPANY_EMAIL
 */
export function companyInfo() {
  return {
    nama: process.env.COMPANY_NAME?.trim() || "O2W HERO ZERO WASTE",
    alamat: process.env.COMPANY_ADDRESS?.trim() || "Jl. Contoh No. 1, Jakarta",
    whatsapp: process.env.COMPANY_WHATSAPP?.trim() || "08xx-xxxx-xxxx",
    email: process.env.COMPANY_EMAIL?.trim() || "info.herozerowaste@gmail.com",
  };
}

export const BULAN_INDO = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/** Kunci periode: YYYYMM (mis. Juni 2026 → "202606") */
export function bulanTahunKey(bulan: number, tahun: number): string {
  return `${tahun}${String(bulan).padStart(2, "0")}`;
}

/** Sanitasi kode pelanggan untuk nomor invoice (huruf/angka saja, uppercase) */
export function sanitasiKodePelanggan(kode: string): string {
  return kode.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

/** Generate nomor invoice: INV/{kodePelanggan}/{YYYYMM} */
export function generateNoInvoice(kodePelanggan: string, bulan: number, tahun: number): string {
  return `INV/${sanitasiKodePelanggan(kodePelanggan)}/${bulanTahunKey(bulan, tahun)}`;
}

/** Format rupiah ala skylite: Rp123.200,- (titik ribuan, koma, strip) */
export function formatRupiahSkylite(amount: number): string {
  const rounded = Math.round(amount);
  const str = String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `Rp${str},-`;
}

/** Format tanggal ala skylite: "25 Juni 2026" */
export function formatTanggalIndo(date: Date | string): string {
  const d = new Date(date);
  return `${d.getDate()} ${BULAN_INDO[d.getMonth()]} ${d.getFullYear()}`;
}

/** Format tanggal + jam: "28 Juni 2026 | 00:00" */
export function formatTanggalWaktuIndo(date: Date | string): string {
  const d = new Date(date);
  const jam = String(d.getHours()).padStart(2, "0");
  const menit = String(d.getMinutes()).padStart(2, "0");
  return `${formatTanggalIndo(d)} | ${jam}:${menit}`;
}

/**
 * Hitung rincian nominal invoice.
 * Denda (tunggakan) dikenakan terpisah di luar PPN, seperti total yang harus dibayar.
 */
export function hitungRincian(jumlah: number, denda?: number | null) {
  const base = jumlah;
  const ppn = Math.round((base * PPN_RATE) / 100);
  const subTotalPpn = base + ppn;
  const total = subTotalPpn + (denda || 0);
  return { base, ppn, subTotalPpn, denda: denda || 0, total };
}

/** Label metode pembayaran (O2W + Duitku) */
export function labelMetodePembayaran(metode?: string | null): string {
  if (!metode) return "-";
  const base = metode.replace(/^duitku\s*[:|-]?\s*/i, "");
  const map: Record<string, string> = {
    tunai: "Tunai",
    transfer: "Transfer Bank",
    ewallet: "E-Wallet",
    qris: "QRIS",
    virtual_account: "Virtual Account",
    duitku: "Payment Gateway",
  };
  return map[base] || map[metode] || duitkuChannelLabel(base);
}
