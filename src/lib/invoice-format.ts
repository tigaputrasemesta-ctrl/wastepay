/**
 * Helper format invoice — murni (tanpa import server-only seperti prisma/pg),
 * aman dipakai dari komponen client ("use client").
 *
 * Fungsi yang butuh database (getTagihanByNoInvoice dkk) tetap ada di
 * src/lib/invoice.ts dan hanya aman dipakai dari Server Components.
 */
import { duitkuChannelLabel } from "./duitku-channels";

/** Persen Pajak Daerah (default 0, bisa diatur di Pengaturan) */
export const PAJAK_DAERAH_RATE_DEFAULT = 0;

/**
 * Info perusahaan pada invoice — diatur via env (default: contoh).
 *   COMPANY_NAME / COMPANY_ADDRESS / COMPANY_WHATSAPP / COMPANY_EMAIL
 */
export function companyInfo() {
  return {
    nama: process.env.COMPANY_NAME?.trim() || "UPS HERU",
    unit: "Unit Pengelolaan & Retribusi Kebersihan (TPS 3R)",
    alamat:
      process.env.COMPANY_ADDRESS?.trim() ||
      "Jl. Kandang Ayam, Kalibaru, Kec. Cilodong, Kota Depok, Jawa Barat 16414",
    whatsapp: process.env.COMPANY_WHATSAPP?.trim() || "+62 814-0078-2617",
    email: process.env.COMPANY_EMAIL?.trim() || "cv.herozerowaste@gmail.com",
    kota: "Kota Depok, Jawa Barat 16414",
    latitude: -6.424838,
    longitude: 106.832667,
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
 * Denda (tunggakan) dikenakan terpisah di luar pajak, seperti total yang harus dibayar.
 */
export function hitungRincian(jumlah: number, denda?: number | null, pajakRate: number = 0) {
  const base = jumlah;
  const ppn = Math.round((base * pajakRate) / 100); // Sekarang merepresentasikan pajak daerah
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

/**
 * Konversi angka nominal rupiah ke ejaan terbilang bahasa Indonesia.
 * Contoh: 22200 -> "Dua Puluh Dua Ribu Dua Ratus"
 */
export function terbilang(angka: number): string {
  const nominal = Math.abs(Math.round(angka));
  const huruf = [
    "", "Satu", "Dua", "Tiga", "Empat", "Lima",
    "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"
  ];
  if (nominal < 12) return huruf[nominal];
  if (nominal < 20) return `${terbilang(nominal - 10)} Belas`;
  if (nominal < 100) return `${terbilang(Math.floor(nominal / 10))} Puluh ${terbilang(nominal % 10)}`.trim();
  if (nominal < 200) return `Seratus ${terbilang(nominal - 100)}`.trim();
  if (nominal < 1000) return `${terbilang(Math.floor(nominal / 100))} Ratus ${terbilang(nominal % 100)}`.trim();
  if (nominal < 2000) return `Seribu ${terbilang(nominal - 1000)}`.trim();
  if (nominal < 1000000) return `${terbilang(Math.floor(nominal / 1000))} Ribu ${terbilang(nominal % 1000)}`.trim();
  if (nominal < 1000000000) return `${terbilang(Math.floor(nominal / 1000000))} Juta ${terbilang(nominal % 1000000)}`.trim();
  if (nominal < 1000000000000) return `${terbilang(Math.floor(nominal / 1000000000))} Milyar ${terbilang(nominal % 1000000000)}`.trim();
  return String(nominal);
}

/**
 * Ejaan nominal rupiah lengkap: e.g. "Dua Puluh Dua Ribu Dua Ratus Rupiah"
 */
export function terbilangRupiah(amount: number): string {
  if (amount === 0) return "Nol Rupiah";
  return `${terbilang(amount)} Rupiah`;
}

