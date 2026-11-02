import { prisma } from "./prisma";

export interface AgingBucket {
  kategori: "lancar" | "perhatian" | "kurang_lancar" | "diragukan" | "macet";
  label: string;
  rentangHari: string;
  jumlahTagihan: number;
  jumlahPelanggan: number;
  totalNominal: number;
  persenCkpn: number;
  nilaiCkpn: number;
}

export interface UnitEconomics {
  totalTonase: number;
  totalVolumeM3: number;
  totalRitase: number;
  muatanPerRitaseTon: number;
  biayaBbmPerTon: number;
  biayaPerawatanPerTon: number;
  biayaGajiPerTon: number;
  biayaTpaPerTon: number;
  totalCostPerTon: number;
  revenuePerTon: number;
  marginPerTon: number;
  marginPersen: number;
  arpu: number;
  costToServePerUser: number;
  netMarginPerUser: number;
}

export interface CashAccrualBridge {
  realizedCashInflow: number;
  currentBilledCollected: number;
  pastArrearsCollected: number;
  prepaidFutureCollected: number; // Deferred revenue / titipan masa depan
  prepaidPastRecognized: number;  // Tagihan bulan ini yg dibayar di bulan lalu
  accruedUncollected: number;     // Piutang baru berjalan bulan ini
  earnedAccrualRevenue: number;   // Hak Pendapatan Murni Berjalan (PSAK 72)
  accrualOperatingExpenses: number;
  accrualOperatingProfit: number;
  accrualMarginPersen: number;
  netCashFlow: number;
}

/**
 * Modul laporan eksekutif & audit — agregasi keuangan, arus kas, piutang, dan unit economics (server-only).
 * Dipakai bersama oleh halaman admin (/laporan), halaman cetak (/laporan-cetak), dan ekspor (/api/laporan/export).
 */
export async function getLaporan(bulanIni: number, tahunIni: number) {
  const awalBulan = new Date(tahunIni, bulanIni - 1, 1, 0, 0, 0, 0);
  const akhirBulan = new Date(tahunIni, bulanIni, 1, 0, 0, 0, 0);
  const now = new Date();

  // Kueri paralel multi-domain
  const [
    semuaPembayaranBulanIni,
    pemasukanByMetodeRaw,
    pengeluaranListBulanIni,
    tagihanBulanIniRaw,
    volumeAgg,
    sampahByJenis,
    sampahByTpa,
    pelangganAktifCount,
    pelangganTotalCount,
    pelangganBaruBulanIniCount,
    liburSementaraBulanIniCount,
    semuaTagihanMenunggakRaw,
    referalAgg,
  ] = await Promise.all([
    // 1. Semua pembayaran terverifikasi kas riil bulan ini
    prisma.pembayaran.findMany({
      where: {
        status: "terverifikasi",
        tanggal: { gte: awalBulan, lt: akhirBulan },
      },
      include: {
        pelanggan: { select: { id: true, nama: true, noTelepon: true, kodePelanggan: true } },
        tagihan: { select: { id: true, bulan: true, tahun: true, jumlah: true } },
      },
    }),

    // 2. Pemasukan per metode
    prisma.pembayaran.groupBy({
      by: ["metode"],
      where: {
        status: "terverifikasi",
        tanggal: { gte: awalBulan, lt: akhirBulan },
      },
      _sum: { jumlah: true },
    }),

    // 3. Pengeluaran kas riil bulan ini
    prisma.pengeluaran.findMany({
      where: {
        tanggal: { gte: awalBulan, lt: akhirBulan },
      },
      orderBy: { tanggal: "desc" },
    }),

    // 4. Tagihan yang diterbitkan untuk periode berjalan
    prisma.tagihan.findMany({
      where: { bulan: bulanIni, tahun: tahunIni, deletedAt: null },
      select: { id: true, jumlah: true, denda: true, status: true, tanggalLunas: true },
    }),

    // 5. Volume dan tonase sampah bulan ini
    prisma.pengangkutan.aggregate({
      where: {
        tanggal: { gte: awalBulan, lt: akhirBulan },
        status: "diambil",
      },
      _sum: { volume: true, berat: true },
      _count: true,
    }),

    // 6. Sampah per jenis
    prisma.pengangkutan.groupBy({
      by: ["jenisSampah"],
      where: {
        tanggal: { gte: awalBulan, lt: akhirBulan },
        status: "diambil",
        jenisSampah: { not: null },
      },
      _sum: { volume: true, berat: true },
      _count: true,
    }),

    // 7. Sampah per TPA
    prisma.pengangkutan.groupBy({
      by: ["tpaId"],
      where: {
        tanggal: { gte: awalBulan, lt: akhirBulan },
        status: "diambil",
        tpaId: { not: null },
      },
      _sum: { volume: true, berat: true },
      _count: true,
    }),

    // 8. Jumlah pelanggan
    prisma.pelanggan.count({ where: { status: "aktif", deletedAt: null } }),
    prisma.pelanggan.count({ where: { deletedAt: null } }),
    prisma.pelanggan.count({
      where: {
        createdAt: { gte: awalBulan, lt: akhirBulan },
        deletedAt: null,
      },
    }),
    prisma.liburSementara.count({
      where: {
        tanggalMulai: { lt: akhirBulan },
        tanggalSelesai: { gte: awalBulan },
      },
    }),

    // 9. SELURUH Piutang Tertunggak (Tanpa LIMIT 50 agar akurat secara audit)
    prisma.tagihan.findMany({
      where: {
        status: { in: ["belum_bayar", "tunggakan"] },
        deletedAt: null,
        OR: [
          { tahun: { lt: tahunIni } },
          { tahun: tahunIni, bulan: { lt: bulanIni } },
        ],
      },
      include: {
        pelanggan: {
          select: {
            id: true,
            nama: true,
            noTelepon: true,
            alamat: true,
            kodePelanggan: true,
            kelurahan: { select: { nama: true } },
          },
        },
      },
      orderBy: [{ tahun: "asc" }, { bulan: "asc" }],
    }),

    // 10. Rekapitulasi Referral Pelanggan
    prisma.pelanggan.groupBy({
      by: ["referal"],
      where: { referal: { not: null }, deletedAt: null },
      _count: true,
    }),
  ]);

  // Lookup nama TPA
  const tpaIds = sampahByTpa.map((s) => s.tpaId).filter(Boolean) as number[];
  const tpaList = tpaIds.length > 0
    ? await prisma.tpa.findMany({
        where: { id: { in: tpaIds } },
        select: { id: true, nama: true },
      })
    : [];

  // 11. Tagihan periode ini yang telah dibayar di muka pada bulan-bulan sebelumnya
  const tagihanBulanIniIds = tagihanBulanIniRaw.map((t) => t.id);
  const tagihanDibayarDiMuka = tagihanBulanIniIds.length > 0
    ? await prisma.pembayaran.findMany({
        where: {
          tagihanId: { in: tagihanBulanIniIds },
          status: "terverifikasi",
          tanggal: { lt: awalBulan },
        },
        include: {
          pelanggan: { select: { id: true, nama: true, noTelepon: true, kodePelanggan: true } },
          tagihan: { select: { id: true, bulan: true, tahun: true, jumlah: true, denda: true } },
        },
        orderBy: { tanggal: "desc" },
      })
    : [];

  const totalDibayarDiMuka = tagihanDibayarDiMuka.reduce((sum, p) => sum + p.jumlah, 0);

  // 12. Arus kas masuk bulan ini yang dialokasikan untuk tagihan periode masa depan (Deferred Revenue)
  const penerimaanUangDiMuka = semuaPembayaranBulanIni.filter((p) => {
    const t = p.tagihan;
    return t.tahun > tahunIni || (t.tahun === tahunIni && t.bulan > bulanIni);
  });
  const totalPenerimaanUangDiMuka = penerimaanUangDiMuka.reduce((sum, p) => sum + p.jumlah, 0);

  // 13. Analisa Komponen Kas Masuk Riil Bulan Ini
  let totalPemasukan = 0;
  let currentBilledCollected = 0;
  let pastArrearsCollected = 0;
  let prepaidFutureCollected = 0;

  for (const bayar of semuaPembayaranBulanIni) {
    totalPemasukan += bayar.jumlah;
    const tBulan = bayar.tagihan.bulan;
    const tTahun = bayar.tagihan.tahun;

    if (tTahun === tahunIni && tBulan === bulanIni) {
      currentBilledCollected += bayar.jumlah;
    } else if (tTahun < tahunIni || (tTahun === tahunIni && tBulan < bulanIni)) {
      pastArrearsCollected += bayar.jumlah;
    } else {
      prepaidFutureCollected += bayar.jumlah;
    }
  }

  // 14. Analisa Komponen Tagihan & Akrual
  const totalTagihan = tagihanBulanIniRaw.reduce((sum, t) => sum + t.jumlah, 0);
  const tagihanLunasList = tagihanBulanIniRaw.filter((t) => t.status === "lunas");
  const tagihanLunasCurrent = tagihanLunasList.reduce((sum, t) => sum + t.jumlah, 0);
  const tagihanSisa = totalTagihan - tagihanLunasCurrent;
  const tagihanBelumLunasList = tagihanBulanIniRaw.filter((t) => t.status !== "lunas");
  const accruedUncollected = tagihanBelumLunasList.reduce((sum, t) => sum + t.jumlah, 0);

  // 15. Analisa Pengeluaran per Kategori
  const pengeluaranByKategoriMap: Record<string, number> = {};
  let totalPengeluaran = 0;
  for (const exp of pengeluaranListBulanIni) {
    totalPengeluaran += exp.jumlah;
    pengeluaranByKategoriMap[exp.kategori] = (pengeluaranByKategoriMap[exp.kategori] || 0) + exp.jumlah;
  }
  const pengeluaranByKategori = Object.entries(pengeluaranByKategoriMap).map(([kategori, jumlah]) => ({
    kategori,
    _sum: { jumlah },
  }));

  // 16. PSAK 72 & Cash-to-Accrual Bridge
  const earnedAccrualRevenue = totalTagihan; // Model langganan flat rate bulanan
  const accrualOperatingProfit = earnedAccrualRevenue - totalPengeluaran;
  const accrualMarginPersen = earnedAccrualRevenue > 0 ? (accrualOperatingProfit / earnedAccrualRevenue) * 100 : 0;
  const netCashFlow = totalPemasukan - totalPengeluaran;

  const bridge: CashAccrualBridge = {
    realizedCashInflow: totalPemasukan,
    currentBilledCollected,
    pastArrearsCollected,
    prepaidFutureCollected,
    prepaidPastRecognized: totalDibayarDiMuka,
    accruedUncollected,
    earnedAccrualRevenue,
    accrualOperatingExpenses: totalPengeluaran,
    accrualOperatingProfit,
    accrualMarginPersen,
    netCashFlow,
  };

  // 17. Konstruksi Aging Schedule Piutang 5 Jenjang & Model CKPN (PSAK 71)
  const bucketsConfig: {
    key: AgingBucket["kategori"];
    label: string;
    rentang: string;
    minHari: number;
    maxHari: number;
    rate: number;
  }[] = [
    { key: "lancar", label: "Lancar", rentang: "0 - 30 Hari", minHari: 0, maxHari: 30, rate: 0.01 },
    { key: "perhatian", label: "Dalam Perhatian Khusus", rentang: "31 - 60 Hari", minHari: 31, maxHari: 60, rate: 0.05 },
    { key: "kurang_lancar", label: "Kurang Lancar", rentang: "61 - 90 Hari", minHari: 61, maxHari: 90, rate: 0.20 },
    { key: "diragukan", label: "Diragukan", rentang: "91 - 180 Hari", minHari: 91, maxHari: 180, rate: 0.50 },
    { key: "macet", label: "Macet / Default", rentang: "> 180 Hari", minHari: 181, maxHari: 99999, rate: 1.00 },
  ];

  const agingBuckets: AgingBucket[] = bucketsConfig.map((cfg) => ({
    kategori: cfg.key,
    label: cfg.label,
    rentangHari: cfg.rentang,
    jumlahTagihan: 0,
    jumlahPelanggan: 0,
    totalNominal: 0,
    persenCkpn: cfg.rate * 100,
    nilaiCkpn: 0,
  }));

  const customerDaysMap = new Map<number, number>();
  for (const t of semuaTagihanMenunggakRaw) {
    const jatuhTempo = new Date(t.jatuhTempo);
    const diffMs = now.getTime() - jatuhTempo.getTime();
    const daysOverdue = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

    let bucketIdx = bucketsConfig.findIndex((b) => daysOverdue >= b.minHari && daysOverdue <= b.maxHari);
    if (bucketIdx === -1) bucketIdx = bucketsConfig.length - 1;

    agingBuckets[bucketIdx].jumlahTagihan++;
    agingBuckets[bucketIdx].totalNominal += t.jumlah;
    customerDaysMap.set(t.pelangganId, Math.max(customerDaysMap.get(t.pelangganId) || 0, daysOverdue));
  }

  // Hitung jumlah debitur unik per bucket
  for (const [, days] of customerDaysMap) {
    let idx = bucketsConfig.findIndex((b) => days >= b.minHari && days <= b.maxHari);
    if (idx === -1) idx = bucketsConfig.length - 1;
    agingBuckets[idx].jumlahPelanggan++;
  }

  let totalPiutangGross = 0;
  let totalNilaiCkpn = 0;
  for (const b of agingBuckets) {
    b.nilaiCkpn = Math.round(b.totalNominal * (b.persenCkpn / 100));
    totalPiutangGross += b.totalNominal;
    totalNilaiCkpn += b.nilaiCkpn;
  }
  const netCarryingValuePiutang = totalPiutangGross - totalNilaiCkpn;

  // 18. Perhitungan Unit Economics Sampah Terpadu
  const totalBeratTon = (volumeAgg._sum.berat || 0) / 1000;
  const totalVolumeM3 = volumeAgg._sum.volume || 0;
  const totalRitase = volumeAgg._count || 0;

  const biayaBbm = pengeluaranByKategoriMap["bbm"] || 0;
  const biayaPerawatan = pengeluaranByKategoriMap["perawatan"] || 0;
  const biayaGaji = pengeluaranByKategoriMap["gaji_petugas"] || 0;
  const biayaOperasionalLain = (pengeluaranByKategoriMap["operasional"] || 0) + (pengeluaranByKategoriMap["lainnya"] || 0);

  // Jika berat belum ditimbang (0), jangan gunakan fallback 1 ton agar tidak menghasilkan metrik absurd Rp 48jt/ton
  const safeTonase = totalBeratTon > 0 ? totalBeratTon : 0;
  const unitEconomics: UnitEconomics = {
    totalTonase: totalBeratTon,
    totalVolumeM3,
    totalRitase,
    muatanPerRitaseTon: totalRitase > 0 && totalBeratTon > 0 ? totalBeratTon / totalRitase : 0,
    biayaBbmPerTon: safeTonase > 0 ? biayaBbm / safeTonase : 0,
    biayaPerawatanPerTon: safeTonase > 0 ? biayaPerawatan / safeTonase : 0,
    biayaGajiPerTon: safeTonase > 0 ? biayaGaji / safeTonase : 0,
    biayaTpaPerTon: safeTonase > 0 ? biayaOperasionalLain / safeTonase : 0,
    totalCostPerTon: safeTonase > 0 ? totalPengeluaran / safeTonase : 0,
    revenuePerTon: safeTonase > 0 ? totalTagihan / safeTonase : 0,
    marginPerTon: safeTonase > 0 ? (totalTagihan - totalPengeluaran) / safeTonase : 0,
    marginPersen: totalTagihan > 0 ? ((totalTagihan - totalPengeluaran) / totalTagihan) * 100 : 0,
    arpu: pelangganAktifCount > 0 ? totalTagihan / pelangganAktifCount : 0,
    costToServePerUser: pelangganAktifCount > 0 ? totalPengeluaran / pelangganAktifCount : 0,
    netMarginPerUser: pelangganAktifCount > 0 ? (totalTagihan - totalPengeluaran) / pelangganAktifCount : 0,
  };

  // 19. Days Sales Outstanding (DSO) & Collection Rate
  const grossCollectionRate = totalTagihan > 0 ? (currentBilledCollected / totalTagihan) * 100 : 0;
  const dsoHari = totalTagihan > 0 ? Math.round((totalPiutangGross / totalTagihan) * 30) : 0;

  // 20. Rekapitulasi Referral
  const rekapReferral = referalAgg
    .filter((r) => r.referal && r.referal.trim())
    .map((r) => ({
      referal: r.referal as string,
      total: r._count,
    }))
    .sort((a, b) => b.total - a.total);

  return {
    // Parameter Waktu
    bulanIni,
    tahunIni,

    // Arus Kas Riil & Saldo Kas
    totalPemasukan,
    totalPengeluaran,
    saldo: netCashFlow,
    pemasukanByMetode: pemasukanByMetodeRaw.map((m) => ({
      metode: m.metode,
      jumlah: m._sum.jumlah || 0,
    })),
    pengeluaranByKategori,

    // Kinerja Tagihan Periode Berjalan
    totalTagihan,
    tagihanTerkumpul: tagihanLunasCurrent,
    tagihanSisa,
    totalPelanggan: pelangganAktifCount,
    totalBelumBayar: tagihanBelumLunasList.length,

    // Tagihan Menunggak (LENGKAP tanpa limit)
    tagihanMenunggak: semuaTagihanMenunggakRaw,

    // Pembayaran di Muka (Prepaid)
    tagihanDibayarDiMuka,
    totalDibayarDiMuka,
    penerimaanUangDiMuka,
    totalPenerimaanUangDiMuka,

    // Metrik Lingkungan & TPA
    totalVolume: totalVolumeM3,
    totalBerat: volumeAgg._sum.berat || 0,
    sampahByJenis,
    sampahByTpa: sampahByTpa.map((s) => ({
      tpaId: s.tpaId,
      nama: tpaList.find((t) => t.id === s.tpaId)?.nama || `TPA #${s.tpaId}`,
      volume: s._sum.volume || 0,
      berat: s._sum.berat || 0,
      count: s._count,
    })),
    totalPengangkutan: volumeAgg._count || 0,
    totalDiambil: volumeAgg._count || 0,

    // Referral
    rekapReferral,

    // ── STRUKTUR INOVASI LAPORAN EKSEKUTIF & AUDIT ──
    kpi: {
      grossBilledCurrent: totalTagihan,
      earnedAccrualRevenue,
      totalRealizedCash: totalPemasukan,
      totalPengeluaran,
      accrualOperatingProfit,
      accrualMarginPersen,
      netCashFlow,
      grossCollectionRate,
      dsoHari,
      pelangganAktifCount,
      pelangganTotalCount,
      tagihanLunasCount: tagihanLunasList.length,
      tagihanBelumLunasCount: tagihanBelumLunasList.length,
    },
    bridge,
    agingSchedule: {
      buckets: agingBuckets,
      totalPiutangGross,
      totalNilaiCkpn,
      netCarryingValuePiutang,
      totalDebiturUnik: customerDaysMap.size,
    },
    unitEconomics,
    cohort: {
      totalPelanggan: pelangganTotalCount,
      pelangganAktif: pelangganAktifCount,
      pelangganBaruBulanIni: pelangganBaruBulanIniCount,
      pelangganLiburBulanIni: liburSementaraBulanIniCount,
    },
  };
}

/** Label kategori pengeluaran (dipakai admin + cetak). */
export function labelKategoriPengeluaran(kategori: string): string {
  const map: Record<string, string> = {
    bbm: "BBM & Pelumas",
    gaji_petugas: "Gaji & Upah Petugas",
    perawatan: "Perawatan & Servis Armada",
    operasional: "Operasional TPS 3R & TPA",
    lainnya: "Lain-Lain",
  };
  return map[kategori] || "Lainnya";
}

/** Label jenis sampah. */
export function labelJenisSampah(jenis: string): string {
  const map: Record<string, string> = {
    organik: "Organik (Sisa Makanan/Daun)",
    anorganik: "Anorganik (Plastik/Kertas)",
    b3: "B3 / Residu Khusus",
    campuran: "Campuran Rumah Tangga",
  };
  return map[jenis] || jenis || "-";
}
