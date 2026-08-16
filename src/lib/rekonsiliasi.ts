import { prisma } from "./prisma";

/**
 * Modul berita acara rekonsiliasi — server-only (import prisma).
 * Dipakai halaman /rekonsiliasi-cetak/[id] untuk mencetak berita acara kas harian.
 */

/** Format nomor berita acara: BA-RKL-000123 */
export function formatNoBeritaAcara(id: number): string {
  return `BA-RKL-${String(id).padStart(6, "0")}`;
}

/** Ambil rekonsiliasi lengkap + nama pembuat untuk berita acara. */
export async function getRekonsiliasiById(id: number) {
  return prisma.rekonsiliasi.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, nama: true } },
    },
  });
}
