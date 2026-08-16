import { prisma } from "./prisma";

/**
 * Modul surat jalan / manifest pengangkutan — server-only (import prisma).
 * Dipakai halaman /surat-jalan untuk mencetak daftar pickup harian petugas.
 */

/** Ambil daftar tugas pengangkutan untuk satu tanggal (opsional per petugas). */
export async function getManifestPengangkutan(opts: {
  tanggal: Date;
  petugasId?: number;
}) {
  const start = new Date(
    opts.tanggal.getFullYear(),
    opts.tanggal.getMonth(),
    opts.tanggal.getDate()
  );
  const end = new Date(
    opts.tanggal.getFullYear(),
    opts.tanggal.getMonth(),
    opts.tanggal.getDate() + 1
  );

  return prisma.pengangkutan.findMany({
    where: {
      deletedAt: null,
      tanggal: { gte: start, lt: end },
      ...(opts.petugasId ? { petugasId: opts.petugasId } : {}),
    },
    include: {
      pelanggan: {
        select: {
          nama: true,
          alamat: true,
          kodePelanggan: true,
          patokanLokasi: true,
          noTelepon: true,
        },
      },
      petugas: { select: { nama: true } },
      kendaraan: { select: { nama: true, platNomor: true } },
    },
    orderBy: [{ petugasId: "asc" }, { pelanggan: { nama: "asc" } }],
  });
}

/** Info petugas + kendaraan utama + rute aktif pada hari tertentu (untuk kepala surat jalan). */
export async function getSuratJalanHeader(petugasId: number, hari: string) {
  const petugas = await prisma.petugas.findUnique({
    where: { id: petugasId, deletedAt: null },
    select: {
      id: true,
      nama: true,
      noTelepon: true,
      kendaraan: {
        where: { aktif: true, deletedAt: null },
        select: { nama: true, platNomor: true, jenis: true },
        take: 1,
      },
    },
  });

  if (!petugas) return null;

  const rutes = await prisma.rute.findMany({
    where: { petugasId, aktif: true, hari: { contains: hari } },
    select: { nama: true },
    orderBy: { nama: "asc" },
  });

  return { ...petugas, ruteNama: rutes.map((r) => r.nama) };
}

/** Daftar petugas angkut aktif (untuk dropdown filter surat jalan di admin). */
export async function getPetugasAngkutList() {
  return prisma.petugas.findMany({
    where: { deletedAt: null, aktif: true },
    select: { id: true, nama: true, jabatan: true },
    orderBy: { nama: "asc" },
  });
}
