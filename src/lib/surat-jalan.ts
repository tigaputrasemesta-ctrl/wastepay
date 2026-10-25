import { prisma } from "./prisma";
import { urutkanItemRute } from "./geo";

/**
 * Modul surat jalan / manifest pengangkutan — server-only (import prisma).
 * Dipakai halaman /surat-jalan untuk mencetak daftar pickup harian petugas.
 */

/** Ambil daftar tugas pengangkutan untuk satu tanggal (opsional per armada / petugas). */
export async function getManifestPengangkutan(opts: {
  tanggal: Date;
  kendaraanId?: number;
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

  const rawTasks = await prisma.pengangkutan.findMany({
    where: {
      deletedAt: null,
      tanggal: { gte: start, lt: end },
      ...(opts.kendaraanId ? { kendaraanId: opts.kendaraanId } : {}),
      ...(opts.petugasId && !opts.kendaraanId ? { petugasId: opts.petugasId } : {}),
    },
    include: {
      pelanggan: {
        select: {
          nama: true,
          alamat: true,
          kodePelanggan: true,
          patokanLokasi: true,
          noTelepon: true,
          latitude: true,
          longitude: true,
        },
      },
      petugas: { select: { nama: true } },
      kendaraan: { select: { nama: true, platNomor: true, jenis: true } },
      zona: { select: { id: true, nama: true } },
    },
    orderBy: [
      { kendaraanId: "asc" },
      { petugasId: "asc" },
      { pelanggan: { nama: "asc" } },
    ],
  });

  // Urutkan manifest secara logis spasial (Nearest Neighbor TSP) searah jalur jalan fisik
  type ManifestTask = (typeof rawTasks)[number];
  return urutkanItemRute<ManifestTask>(
    rawTasks,
    (t: ManifestTask) =>
      t.pelanggan.latitude && t.pelanggan.longitude
        ? [t.pelanggan.latitude, t.pelanggan.longitude]
        : null,
    (t: ManifestTask) => t.zonaId
  );
}

/** Info armada kendaraan + driver + rute aktif pada hari tertentu (untuk kepala surat jalan berbasis armada). */
export async function getSuratJalanHeaderArmada(kendaraanId: number, hari: string) {
  const kendaraan = await prisma.kendaraan.findUnique({
    where: { id: kendaraanId, deletedAt: null },
    select: {
      id: true,
      nama: true,
      platNomor: true,
      jenis: true,
      kapasitas: true,
      petugas: {
        select: {
          id: true,
          nama: true,
          noTelepon: true,
        },
      },
      rute: {
        where: { aktif: true, hari: { contains: hari } },
        select: { nama: true },
        orderBy: { nama: "asc" },
      },
    },
  });

  if (!kendaraan) return null;

  return {
    ...kendaraan,
    ruteNama: kendaraan.rute.map((r) => r.nama),
  };
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
