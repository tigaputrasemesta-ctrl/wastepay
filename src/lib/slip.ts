import { prisma } from "./prisma";

/**
 * Modul slip (klaim petugas & pengeluaran) — server-only (import prisma).
 * Dipakai halaman /klaim-cetak/[id] dan /pengeluaran-cetak/[id].
 */

/** Format nomor slip: SLIP-KLM-000123 / SLIP-PNG-000123 */
export function formatNoSlip(kind: "klaim" | "pengeluaran", id: number): string {
  const prefix = kind === "klaim" ? "KLM" : "PNG";
  return `SLIP-${prefix}-${String(id).padStart(6, "0")}`;
}

/** Ambil klaim petugas lengkap untuk slip. */
export async function getKlaimById(id: number) {
  return prisma.klaimPetugas.findUnique({
    where: { id },
    include: {
      petugas: { select: { id: true, nama: true, jabatan: true } },
      diperiksaBy: { select: { nama: true } },
    },
  });
}

/** Ambil pengeluaran lengkap untuk slip. */
export async function getPengeluaranById(id: number) {
  return prisma.pengeluaran.findUnique({
    where: { id },
    include: {
      dicatatBy: { select: { id: true, nama: true } },
    },
  });
}
