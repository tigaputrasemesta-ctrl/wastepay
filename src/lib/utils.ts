import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Koersi boolean toleran: true/"true"/1/"1" → true, sisanya false. */
export function toBoolean(v: unknown): boolean {
  return v === true || v === "true" || v === 1 || v === "1";
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export const HARI = [
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
  "Minggu",
];

/**
 * Tanggal lokal dalam format YYYY-MM-DD (BUKAN UTC).
 * `new Date().toISOString().split("T")[0]` memakai zona UTC sehingga di
 * Indonesia (UTC+7) antara 00:00–06:59 hasilnya kemarin, bukan hari ini.
 */
export function todayLocalISO(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Nama hari Indonesia (Senin..Minggu) untuk sebuah tanggal. */
export function namaHari(d: Date = new Date()): string {
  return HARI[(d.getDay() + 6) % 7];
}

export const METODE_PEMBAYARAN = [
  { value: "transfer", label: "Transfer Bank" },
  { value: "ewallet", label: "E-Wallet" },
  { value: "qris", label: "QRIS" },
  { value: "virtual_account", label: "Virtual Account" },
  { value: "tunai", label: "Tunai" },
];

export const KATEGORI_PENGELUARAN = [
  { value: "bbm", label: "BBM" },
  { value: "gaji_petugas", label: "Gaji Petugas" },
  { value: "perawatan", label: "Perawatan" },
  { value: "operasional", label: "Operasional" },
  { value: "lainnya", label: "Lainnya" },
];

export const KATEGORI_PELANGGAN = [
  { value: "level_1", label: "Level 1 — Volume Sangat Kecil" },
  { value: "level_2", label: "Level 2 — Volume Kecil–Sedang" },
  { value: "level_3", label: "Level 3 — Volume Sedang" },
  { value: "level_4", label: "Level 4 — Volume Sedang–Besar" },
  { value: "level_5", label: "Level 5 — Volume Besar" },
  { value: "level_6", label: "Level 6 — Volume Sangat Besar" },
];
