import { prisma } from "./prisma";

/**
 * Modul rekap absensi — server-only (import prisma).
 * Dipakai halaman /absensi-cetak untuk mencetak rekap kehadiran petugas bulanan.
 */

/** Ambil seluruh absensi satu periode (bulan/tahun) beserta data petugas. */
export async function getRekapAbsensi(bulan: number, tahun: number) {
  const start = new Date(tahun, bulan - 1, 1);
  const end = new Date(tahun, bulan, 1);

  return prisma.absensi.findMany({
    where: { waktuMasuk: { gte: start, lt: end } },
    include: {
      petugas: {
        select: { id: true, nama: true, jabatan: true, noTelepon: true },
      },
    },
    orderBy: [{ petugas: { nama: "asc" } }, { waktuMasuk: "asc" }],
  });
}
