import { prisma } from "./prisma";

/**
 * Modul laporan — agregasi bulanan keuangan & operasional (server-only).
 * Dipakai bersama oleh halaman admin (/laporan) dan halaman cetak (/laporan-cetak).
 */
export async function getLaporan(bulanIni: number, tahunIni: number) {
  const awalBulan = new Date(tahunIni, bulanIni - 1, 1);
  const akhirBulan = new Date(tahunIni, bulanIni, 1);

  // Pendapatan bulan ini
  const pemasukanBulanIni = await prisma.pembayaran.aggregate({
    where: {
      status: "terverifikasi",
      createdAt: { gte: awalBulan, lt: akhirBulan },
    },
    _sum: { jumlah: true },
  });

  // Pengeluaran bulan ini
  const pengeluaranBulanIni = await prisma.pengeluaran.aggregate({
    where: {
      tanggal: { gte: awalBulan, lt: akhirBulan },
    },
    _sum: { jumlah: true },
  });

  // Total tagihan bulan ini
  const totalTagihanBulanIni = await prisma.tagihan.aggregate({
    where: { bulan: bulanIni, tahun: tahunIni },
    _sum: { jumlah: true },
  });

  // Tagihan lunas bulan ini
  const tagihanLunas = await prisma.tagihan.aggregate({
    where: { bulan: bulanIni, tahun: tahunIni, status: "lunas" },
    _sum: { jumlah: true },
  });

  // Data per kategori pengeluaran
  const pengeluaranByKategori = await prisma.pengeluaran.groupBy({
    by: ["kategori"],
    where: {
      tanggal: { gte: awalBulan, lt: akhirBulan },
    },
    _sum: { jumlah: true },
  });

  // Volume sampah bulan ini
  const volumeAgg = await prisma.pengangkutan.aggregate({
    where: {
      tanggal: { gte: awalBulan, lt: akhirBulan },
      status: "diambil",
    },
    _sum: { volume: true, berat: true },
  });

  // Sampah per jenis
  const sampahByJenis = await prisma.pengangkutan.groupBy({
    by: ["jenisSampah"],
    where: {
      tanggal: { gte: awalBulan, lt: akhirBulan },
      status: "diambil",
      jenisSampah: { not: null },
    },
    _sum: { volume: true, berat: true },
    _count: true,
  });

  // Sampah per TPA
  const sampahByTpa = await prisma.pengangkutan.groupBy({
    by: ["tpaId"],
    where: {
      tanggal: { gte: awalBulan, lt: akhirBulan },
      status: "diambil",
      tpaId: { not: null },
    },
    _sum: { volume: true, berat: true },
    _count: true,
  });

  // Get TPA names
  const tpaIds = sampahByTpa.map((s) => s.tpaId).filter(Boolean) as number[];
  const tpaList = tpaIds.length > 0
    ? await prisma.tpa.findMany({
        where: { id: { in: tpaIds } },
        select: { id: true, nama: true },
      })
    : [];

  // Data pelanggan menunggak
  const tagihanMenunggak = await prisma.tagihan.findMany({
    where: {
      status: "belum_bayar",
      OR: [
        { tahun: { lt: tahunIni } },
        { tahun: tahunIni, bulan: { lt: bulanIni } },
      ],
    },
    include: {
      pelanggan: { select: { id: true, nama: true, noTelepon: true, alamat: true } },
    },
    orderBy: [{ tahun: "asc" }, { bulan: "asc" }],
    take: 50,
  });

  const totalPelanggan = await prisma.pelanggan.count({ where: { status: "aktif" } });
  const totalBelumBayar = await prisma.tagihan.count({
    where: { bulan: bulanIni, tahun: tahunIni, status: "belum_bayar" },
  });

  // Total pengangkutan
  const totalPengangkutan = await prisma.pengangkutan.count({
    where: {
      tanggal: { gte: awalBulan, lt: akhirBulan },
    },
  });

  const totalDiambil = await prisma.pengangkutan.count({
    where: {
      tanggal: { gte: awalBulan, lt: akhirBulan },
      status: "diambil",
    },
  });

  const totalPemasukan = pemasukanBulanIni._sum.jumlah || 0;
  const totalPengeluaran = pengeluaranBulanIni._sum.jumlah || 0;

  // Rekapitulasi Pelanggan per Referal
  const referalAgg = await prisma.pelanggan.groupBy({
    by: ["referal"],
    where: {
      referal: { not: null },
    },
    _count: true,
  });

  const rekapReferral = referalAgg
    .filter((r) => r.referal && r.referal.trim())
    .map((r) => ({
      referal: r.referal as string,
      total: r._count,
    }))
    .sort((a, b) => b.total - a.total);

  return {
    bulanIni,
    tahunIni,
    totalPemasukan,
    totalPengeluaran,
    saldo: totalPemasukan - totalPengeluaran,
    totalTagihan: totalTagihanBulanIni._sum.jumlah || 0,
    tagihanTerkumpul: tagihanLunas._sum.jumlah || 0,
    tagihanSisa: (totalTagihanBulanIni._sum.jumlah || 0) - (tagihanLunas._sum.jumlah || 0),
    pengeluaranByKategori,
    tagihanMenunggak,
    totalPelanggan,
    totalBelumBayar,
    totalVolume: volumeAgg._sum.volume || 0,
    totalBerat: volumeAgg._sum.berat || 0,
    sampahByJenis,
    sampahByTpa: sampahByTpa.map((s) => ({
      tpaId: s.tpaId,
      nama: tpaList.find((t) => t.id === s.tpaId)?.nama || `TPA #${s.tpaId}`,
      volume: s._sum.volume || 0,
      berat: s._sum.berat || 0,
      count: s._count,
    })),
    totalPengangkutan,
    totalDiambil,
    rekapReferral,
  };
}

/** Label kategori pengeluaran (dipakai admin + cetak). */
export function labelKategoriPengeluaran(kategori: string): string {
  const map: Record<string, string> = {
    bbm: "BBM",
    gaji_petugas: "Gaji Petugas",
    perawatan: "Perawatan",
    operasional: "Operasional",
  };
  return map[kategori] || "Lainnya";
}

/** Label jenis sampah. */
export function labelJenisSampah(jenis: string): string {
  const map: Record<string, string> = {
    organik: "Organik",
    anorganik: "Anorganik",
    b3: "B3",
    campuran: "Campuran",
  };
  return map[jenis] || jenis || "-";
}
