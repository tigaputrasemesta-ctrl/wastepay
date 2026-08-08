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
  { value: "rumah_tangga", label: "Rumah Tangga" },
  { value: "bisnis", label: "Bisnis / Toko" },
  { value: "kost", label: "Kost / Kontrakan" },
  { value: "sekolah", label: "Sekolah" },
  { value: "rm_makan", label: "Rumah Makan" },
  { value: "perkantoran", label: "Perkantoran" },
  { value: "industri", label: "Industri" },
  { value: "lainnya", label: "Lainnya" },
];
