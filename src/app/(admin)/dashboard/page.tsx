import { prisma } from "@/lib/prisma";
import { formatRupiah, KATEGORI_PENGELUARAN } from "@/lib/utils";
import Link from "next/link";
import { Fragment } from "react";

export const dynamic = "force-dynamic";

const NAMA_BULAN = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

async function getStats() {
  const now = new Date();
  const bulanIni = now.getMonth(); 
  const tahunIni = now.getFullYear();

  const todayStart = new Date(tahunIni, bulanIni, now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  const tujuhHariLalu = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const bulanIniStart = new Date(tahunIni, bulanIni, 1);

  const bulanLabels: { bulan: number; tahun: number; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(tahunIni, bulanIni - i, 1);
    bulanLabels.push({
      bulan: d.getMonth() + 1,
      tahun: d.getFullYear(),
      label: `${NAMA_BULAN[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`,
    });
  }

  const fallback = {
    totalPelanggan: 0, pelangganAktif: 0, tagihanBulanIni: 0,
    totalTagihanBulanIni: 0, totalPembayaranBulanIni: 0,
    komplainBaru: 0, totalPetugas: 0, bulanLabels,
    pemasukanTren: [0,0,0,0,0,0], pengeluaranTren: [0,0,0,0,0,0],
    maxTren: 1, topTunggakan: [] as any[],
    pembayaranPending: 0, totalPendingNominal: 0,
    klaimMenunggu: 0, totalKlaimNominal: 0,
    chatBelumDibaca: 0, tidakDiangkut: 0, notifGagal: 0,
    pickupTotal: 0, pickupSelesai: 0, pickupVolume: 0, pickupBerat: 0,
    petugasHadir: 0, petugasBertugas: 0, pengeluaranBulanIni: 0,
    armadaAktif: 0, armadaTotal: 0, gatewayPending: 0, notifSent: 0, notifTotal: 0,
    rekonHariIni: null as any, armadaPerJenis: [] as any[], totalDendaBulanIni: 0,
    pengeluaranPerKategori: [] as any[], pengumumanPenting: null as any,
    topReferral: [] as any[], komposisiSampah: [] as any[], performaKelurahan: [] as any[]
  };

  try {
    const [
      totalPelanggan, pelangganAktif, tagihanBulanIni, totalTagihanBulanIni, totalPembayaranBulanIni,
      komplainBaru, totalPetugas, 
      pembayaranPending, totalPendingNominal,
      klaimMenunggu, totalKlaimNominal,
      chatBelumDibaca, tidakDiangkut, notifGagal,
      pickupTotal, pickupSelesai, pickupVolumeBerat,
      petugasHadir, petugasBertugas,
      pengeluaranBulanIniResult,
      armadaAktif, armadaTotal, gatewayPending, notifSent, notifTotal,
      rekonHariIni,
      armadaPerJenis,
      totalDendaBulanIniResult,
      pengeluaranPerKategori,
      pengumumanPenting,
      topReferral,
      komposisiSampah
    ] = await Promise.all([
      prisma.pelanggan.count({ where: { deletedAt: null } }),
      prisma.pelanggan.count({ where: { status: "aktif", deletedAt: null } }),
      prisma.tagihan.count({
        where: { bulan: bulanIni + 1, tahun: tahunIni, status: { in: ["belum_bayar", "tunggakan"] }, deletedAt: null },
      }),
      prisma.tagihan.aggregate({
        where: { bulan: bulanIni + 1, tahun: tahunIni, deletedAt: null },
        _sum: { jumlah: true },
      }),
      prisma.pembayaran.aggregate({
        where: { createdAt: { gte: bulanIniStart }, status: "terverifikasi" },
        _sum: { jumlah: true },
      }),
      prisma.komplain.count({ where: { status: "baru" } }),
      prisma.petugas.count({ where: { aktif: true, deletedAt: null } }),
      
      prisma.pembayaran.count({ where: { status: "pending" } }),
      prisma.pembayaran.aggregate({ where: { status: "pending" }, _sum: { jumlah: true } }),
      
      prisma.klaimPetugas.count({ where: { status: "menunggu" } }),
      prisma.klaimPetugas.aggregate({ where: { status: "menunggu" }, _sum: { nominal: true } }),
      
      prisma.chatPesan.count({ where: { dariPetugas: true, dibaca: false } }),
      prisma.pengangkutan.count({ where: { tanggal: { gte: todayStart, lt: todayEnd }, status: "tidak_diangkut", deletedAt: null } }),
      prisma.notifikasi.count({ where: { status: "gagal" } }),
      
      prisma.pengangkutan.count({ where: { tanggal: { gte: todayStart, lt: todayEnd }, deletedAt: null } }),
      prisma.pengangkutan.count({ where: { tanggal: { gte: todayStart, lt: todayEnd }, status: "diambil", deletedAt: null } }),
      prisma.pengangkutan.aggregate({ where: { tanggal: { gte: todayStart, lt: todayEnd }, status: "diambil", deletedAt: null }, _sum: { volume: true, berat: true } }),
      
      prisma.absensi.count({ where: { waktuMasuk: { gte: todayStart }, status: "hadir" } }),
      prisma.absensi.count({ where: { waktuMasuk: { gte: todayStart }, waktuSelesai: null, status: "hadir" } }),
      
      prisma.pengeluaran.aggregate({ where: { tanggal: { gte: bulanIniStart } }, _sum: { jumlah: true } }),
      
      prisma.kendaraan.count({ where: { aktif: true, deletedAt: null } }),
      prisma.kendaraan.count({ where: { deletedAt: null } }),
      prisma.duitkuTransaction.count({ where: { statusCode: "01" } }),
      prisma.notifikasi.count({ where: { status: "terkirim", createdAt: { gte: bulanIniStart } } }),
      prisma.notifikasi.count({ where: { createdAt: { gte: bulanIniStart } } }),
      
      prisma.rekonsiliasi.findFirst({ where: { tanggal: { gte: todayStart } }, orderBy: { tanggal: "desc" }, select: { selisih: true, totalTunaiSistem: true, totalTunaiFisik: true } }),
      
      prisma.kendaraan.groupBy({ by: ["jenis"], where: { aktif: true, deletedAt: null }, _count: { id: true } }),
      
      prisma.tagihan.aggregate({ where: { bulan: bulanIni + 1, tahun: tahunIni, deletedAt: null, denda: { not: null } }, _sum: { denda: true } }),
      
      prisma.pengeluaran.groupBy({ by: ["kategori"], where: { tanggal: { gte: bulanIniStart } }, _sum: { jumlah: true }, orderBy: { _sum: { jumlah: "desc" } } }),
      
      prisma.pengumuman.findFirst({ where: { penting: true, createdAt: { gte: tujuhHariLalu } }, orderBy: { createdAt: "desc" }, select: { judul: true, isi: true, createdAt: true } }),
      
      prisma.pelanggan.groupBy({ by: ["referal"], where: { referal: { not: null }, deletedAt: null }, _count: { id: true }, orderBy: { _count: { id: "desc" } }, take: 5 }),
      
      prisma.pengangkutan.groupBy({ by: ["jenisSampah"], where: { tanggal: { gte: bulanIniStart }, status: "diambil", jenisSampah: { not: null }, deletedAt: null }, _sum: { volume: true, berat: true }, _count: { id: true } })
    ]);

    const performaKelurahanRaw = await prisma.$queryRaw<any[]>`
      SELECT
        k.nama AS kelurahan,
        COUNT(t.id) AS total_tagihan,
        COUNT(CASE WHEN t.status = 'lunas' THEN 1 END) AS lunas,
        ROUND(
          COUNT(CASE WHEN t.status = 'lunas' THEN 1 END) * 100.0
          / NULLIF(COUNT(t.id), 0)
        ) AS persen_lunas
      FROM "Tagihan" t
      JOIN "Pelanggan" p ON t."pelangganId" = p.id
      LEFT JOIN "Kelurahan" k ON p."kelurahanId" = k.id
      WHERE t.bulan = ${bulanIni + 1}
        AND t.tahun = ${tahunIni}
        AND t."deletedAt" IS NULL
        AND p."deletedAt" IS NULL
      GROUP BY k.nama
      ORDER BY persen_lunas ASC
      LIMIT 8
    `;

    const performaKelurahan = performaKelurahanRaw.map(row => ({
      kelurahan: row.kelurahan || "Belum Ditentukan",
      total_tagihan: Number(row.total_tagihan),
      lunas: Number(row.lunas),
      persen_lunas: Number(row.persen_lunas || 0)
    }));

    const startTren = new Date(tahunIni, bulanIni - 5, 1);
    const [pembayaranTren, pengeluaranTren] = await Promise.all([
      prisma.pembayaran.findMany({
        where: { status: "terverifikasi", tanggal: { gte: startTren } },
        select: { tanggal: true, jumlah: true },
      }),
      prisma.pengeluaran.findMany({
        where: { tanggal: { gte: startTren } },
        select: { tanggal: true, jumlah: true },
      }),
    ]);

    const sumPerBulan = (rows: { tanggal: Date; jumlah: number }[]) =>
      bulanLabels.map((m) =>
        Math.round(
          rows
            .filter((r) => r.tanggal.getMonth() + 1 === m.bulan && r.tanggal.getFullYear() === m.tahun)
            .reduce((s, r) => s + r.jumlah, 0)
        )
      );
    const pemasukanTren = sumPerBulan(pembayaranTren);
    const pengeluaranTrenArr = sumPerBulan(pengeluaranTren);
    const maxTren = Math.max(1, ...pemasukanTren, ...pengeluaranTrenArr);

    const tunggakanRows = await prisma.tagihan.findMany({
      where: { deletedAt: null, status: { in: ["belum_bayar", "tunggakan"] } },
      select: {
        pelangganId: true, jumlah: true, denda: true,
        pelanggan: { select: { nama: true, kodePelanggan: true, kelurahan: { select: { nama: true } } } },
      },
      take: 20,
    });
    
    const tunggakanMap = new Map<number, { nama: string; kode: string; wilayah: string; total: number; jumlahTagihan: number }>();
    for (const t of tunggakanRows) {
      const ada = tunggakanMap.get(t.pelangganId);
      const total = t.jumlah + (t.denda ?? 0);
      if (ada) {
        ada.total += total;
        ada.jumlahTagihan += 1;
      } else {
        tunggakanMap.set(t.pelangganId, {
          nama: t.pelanggan.nama, kode: t.pelanggan.kodePelanggan, wilayah: t.pelanggan.kelurahan?.nama ?? "—",
          total, jumlahTagihan: 1,
        });
      }
    }
    const topTunggakan = [...tunggakanMap.values()].sort((a, b) => b.total - a.total).slice(0, 5);

    return {
      totalPelanggan, pelangganAktif, tagihanBulanIni,
      totalTagihanBulanIni: totalTagihanBulanIni._sum.jumlah || 0,
      totalPembayaranBulanIni: totalPembayaranBulanIni._sum.jumlah || 0,
      komplainBaru, totalPetugas, bulanLabels, pemasukanTren,
      pengeluaranTren: pengeluaranTrenArr, maxTren, topTunggakan,
      pembayaranPending, totalPendingNominal: totalPendingNominal._sum.jumlah || 0,
      klaimMenunggu, totalKlaimNominal: totalKlaimNominal._sum.nominal || 0,
      chatBelumDibaca, tidakDiangkut, notifGagal,
      pickupTotal, pickupSelesai, 
      pickupVolume: pickupVolumeBerat._sum.volume || 0, 
      pickupBerat: pickupVolumeBerat._sum.berat || 0,
      petugasHadir, petugasBertugas,
      pengeluaranBulanIni: pengeluaranBulanIniResult._sum.jumlah || 0,
      armadaAktif, armadaTotal, gatewayPending, notifSent, notifTotal,
      rekonHariIni, armadaPerJenis,
      totalDendaBulanIni: totalDendaBulanIniResult._sum.denda || 0,
      pengeluaranPerKategori, pengumumanPenting, topReferral, komposisiSampah, performaKelurahan
    };
  } catch (err) {
    console.error("getStats dashboard error:", err);
    return fallback;
  }
}

export default async function DashboardPage() {
  const stats = await getStats();
  const { bulanLabels, pemasukanTren, pengeluaranTren, maxTren, topTunggakan } = stats;
  const now = new Date();
  const bulan = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ][now.getMonth()];
  const tahun = now.getFullYear();

  const tagihanBulanIni = stats.totalTagihanBulanIni;
  const terkumpul = stats.totalPembayaranBulanIni;
  const sisa = Math.max(0, tagihanBulanIni - terkumpul);
  const persenTerkumpul = tagihanBulanIni > 0 ? Math.round((terkumpul / tagihanBulanIni) * 100) : 0;

  // Additional Calcs
  const pickupPersen = stats.pickupTotal > 0 ? Math.round((stats.pickupSelesai / stats.pickupTotal) * 100) : 0;
  const saldoBersih = terkumpul - stats.pengeluaranBulanIni;
  const deliveryRate = stats.notifTotal > 0 ? Math.round((stats.notifSent / stats.notifTotal) * 100) : 100;
  
  let systemBadge = { label: "Aktif Normal", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500", ping: "bg-emerald-400" };
  if (stats.armadaTotal > 0 && stats.armadaAktif < stats.armadaTotal / 2) {
    systemBadge = { label: "Ada Gangguan", bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", dot: "bg-rose-500", ping: "bg-rose-400" };
  } else if (stats.gatewayPending > 0 || deliveryRate < 80) {
    systemBadge = { label: "Perlu Perhatian", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-500", ping: "bg-amber-400" };
  }

  const cards = [
    {
      no: "01", label: "Total Pelanggan", value: String(stats.totalPelanggan),
      sub: `${stats.pelangganAktif} pelanggan aktif`,
      iconBg: "bg-blue-50 text-blue-600 border-blue-100", badgeBg: "bg-blue-50 text-blue-700",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
    },
    {
      no: "02", label: "Tagihan Bulan Ini", value: formatRupiah(tagihanBulanIni),
      sub: `${stats.tagihanBulanIni} tagihan tertunda`,
      iconBg: "bg-amber-50 text-amber-700 border-amber-100", badgeBg: "bg-amber-50 text-amber-700",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
    },
    {
      no: "03", label: "Terkumpul Bulan Ini", value: formatRupiah(terkumpul),
      sub: `${persenTerkumpul}% dari target tagihan`,
      iconBg: "bg-emerald-50 text-emerald-700 border-emerald-100", badgeBg: "bg-emerald-50 text-emerald-700",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    },
    {
      no: "04", label: "Komplain Baru", value: String(stats.komplainBaru),
      sub: stats.komplainBaru > 0 ? "Perlu segera ditindak" : "Semua terselesaikan",
      iconBg: stats.komplainBaru > 0 ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-slate-50 text-slate-600 border-slate-100", badgeBg: stats.komplainBaru > 0 ? "bg-rose-50 text-rose-700" : "bg-slate-50 text-slate-600",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>,
    },
    {
      no: "05", label: "Pengangkutan Hari Ini", value: `${stats.pickupSelesai}/${stats.pickupTotal}`,
      sub: stats.pickupTotal === 0 ? "Tidak ada jadwal hari ini" : `${stats.pickupVolume}m³ • ${stats.pickupBerat}kg`,
      iconBg: "bg-teal-50 text-teal-700 border-teal-100", badgeBg: "bg-teal-50 text-teal-700",
      icon: <span className="text-xl">🚛</span>,
      progress: pickupPersen,
    },
    {
      no: "06", label: "Petugas Lapangan", value: `${stats.petugasHadir}`,
      sub: `dari ${stats.totalPetugas} petugas terdaftar`,
      iconBg: "bg-indigo-50 text-indigo-700 border-indigo-100", badgeBg: "bg-indigo-50 text-indigo-700",
      icon: <span className="text-xl">👷</span>,
      badgeText: `🟢 ${stats.petugasBertugas} di lapangan`,
    },
    {
      no: "07", label: "Saldo Bersih Bulan Ini", value: (saldoBersih >= 0 ? "+" : "") + formatRupiah(saldoBersih),
      sub: `Masuk ${formatRupiah(terkumpul)} • Keluar ${formatRupiah(stats.pengeluaranBulanIni)}`,
      iconBg: saldoBersih >= 0 ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-rose-50 text-rose-700 border-rose-100",
      badgeBg: saldoBersih >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700",
      icon: <span className="text-xl">💰</span>,
    },
    {
      no: "08", label: "Rekonsiliasi Kas", 
      value: !stats.rekonHariIni ? "Belum" : (stats.rekonHariIni.selisih === 0 || !stats.rekonHariIni.selisih ? "Nihil Selisih" : formatRupiah(stats.rekonHariIni.selisih)),
      sub: !stats.rekonHariIni ? "Kas hari ini belum diaudit" : (stats.rekonHariIni.selisih === 0 || !stats.rekonHariIni.selisih ? "Kas fisik = kas sistem" : `Sistem ${formatRupiah(stats.rekonHariIni.totalTunaiSistem)} • Fisik ${formatRupiah(stats.rekonHariIni.totalTunaiFisik || 0)}`),
      iconBg: !stats.rekonHariIni ? "bg-slate-50 text-slate-600 border-slate-100" : ((stats.rekonHariIni.selisih || 0) === 0 ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-amber-50 text-amber-700 border-amber-100"),
      badgeBg: !stats.rekonHariIni ? "bg-slate-50 text-slate-600" : ((stats.rekonHariIni.selisih || 0) === 0 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"),
      icon: <span className="text-xl">🏦</span>,
    }
  ];

  const quickActions = [
    { label: "Verifikasi Pembayaran", desc: stats.pembayaranPending > 0 ? `${stats.pembayaranPending} pembayaran menunggu review` : "Tidak ada pembayaran pending", href: "/tagihan", icon: "🔍" },
    { label: "Generate Tagihan", desc: `Terbitkan tagihan ${bulan} ${tahun}`, href: "/tagihan", icon: "📄" },
    { label: "Rekonsiliasi Kas", desc: stats.rekonHariIni ? "Sudah dilakukan hari ini" : "Belum audit kas hari ini", href: "/rekonsiliasi", icon: "🏦" },
    { label: "Setujui Klaim Petugas", desc: stats.klaimMenunggu > 0 ? `${stats.klaimMenunggu} klaim menunggu persetujuan` : "Tidak ada klaim pending", href: "/klaim", icon: "💰" },
    { label: "Registrasi Pelanggan", desc: "Daftarkan warga atau rute baru", href: "/pelanggan", icon: "👤" },
    { label: "Peta Realtime", desc: "Pantau lokasi petugas & armada", href: "/peta", icon: "🗺️" },
    { label: "Rekap Absensi", desc: `${stats.petugasHadir} petugas hadir hari ini`, href: "/absensi", icon: "📋" },
    { label: "Kelola Komplain", desc: stats.komplainBaru > 0 ? `${stats.komplainBaru} aduan menunggu` : "Tidak ada komplain aktif", href: "/komplain", icon: "💬" },
  ];

  const armadaMap = {
    dump_truck: { e: "🚛" },
    pickup: { e: "🛺" },
    gerobak: { e: "🛞" },
  };

  const armadaStr = stats.armadaPerJenis.length > 0 ? stats.armadaPerJenis.map(a => `${(armadaMap as any)[a.jenis]?.e || "🚗"} ${a._count.id}`).join(" • ") : "Tidak ada armada aktif";

  const infoRows = [
    { k: "Armada Siap Operasi", v: `${stats.armadaAktif} / ${stats.armadaTotal} Kendaraan` },
    { k: "Jenis Armada Beroperasi", v: armadaStr },
    { k: "Gateway Pembayaran", v: stats.gatewayPending > 0 ? `⚠️ ${stats.gatewayPending} transaksi pending` : "✅ OK (0 stalled)" },
    { k: "Delivery WA (Bulan Ini)", v: `${deliveryRate}% terkirim` },
  ];

  return (
    <div className="p-4 sm:p-6 pb-12 space-y-8 w-full">
      {/* Pengumuman Penting Banner */}
      {stats.pengumumanPenting && (
        <div className="bg-yellow-50 border border-yellow-300 text-yellow-900 px-4 py-3 rounded-xl flex items-start sm:items-center justify-between gap-4 shadow-sm relative">
          <div className="flex items-start gap-3">
            <span className="text-xl">📢</span>
            <div>
              <strong className="font-bold">PENGUMUMAN PENTING: {stats.pengumumanPenting.judul}</strong>
              <p className="text-sm mt-0.5">{stats.pengumumanPenting.isi}</p>
            </div>
          </div>
          <button className="text-yellow-700 hover:text-yellow-900 text-sm font-semibold whitespace-nowrap self-start sm:self-center" onClick={() => {}} disabled>
            [Tutup ✕]
          </button>
        </div>
      )}

      {/* Action Inbox Alerts */}
      <div className="space-y-3">
        {stats.pembayaranPending > 0 && (
          <div className="bg-amber-50 border border-amber-300 text-amber-800 px-4 py-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-xl">⚠️</span>
              <div>
                <strong className="font-bold">{stats.pembayaranPending} Pembayaran Menunggu Verifikasi ({formatRupiah(stats.totalPendingNominal)})</strong>
                <p className="text-sm mt-0.5">Pelanggan sudah upload bukti transfer.</p>
              </div>
            </div>
            <Link href="/tagihan" className="text-amber-900 bg-amber-200/50 hover:bg-amber-200 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors shrink-0 text-center">
              Verifikasi Sekarang &rarr;
            </Link>
          </div>
        )}
        
        {stats.klaimMenunggu > 0 && (
          <div className="bg-orange-50 border border-orange-300 text-orange-800 px-4 py-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-xl">📝</span>
              <div>
                <strong className="font-bold">{stats.klaimMenunggu} Klaim Dana Petugas Menunggu ({formatRupiah(stats.totalKlaimNominal)})</strong>
                <p className="text-sm mt-0.5">BBM & perawatan kendaraan perlu persetujuan.</p>
              </div>
            </div>
            <Link href="/klaim" className="text-orange-900 bg-orange-200/50 hover:bg-orange-200 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors shrink-0 text-center">
              Review Klaim &rarr;
            </Link>
          </div>
        )}

        {stats.chatBelumDibaca > 0 && (
          <div className="bg-blue-50 border border-blue-300 text-blue-800 px-4 py-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-xl">💬</span>
              <div>
                <strong className="font-bold">{stats.chatBelumDibaca} Pesan Petugas Belum Dibaca</strong>
                <p className="text-sm mt-0.5">Ada laporan dari lapangan yang perlu ditanggapi.</p>
              </div>
            </div>
            <Link href="/pesan" className="text-blue-900 bg-blue-200/50 hover:bg-blue-200 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors shrink-0 text-center">
              Buka Chat &rarr;
            </Link>
          </div>
        )}

        {stats.tidakDiangkut > 0 && (
          <div className="bg-rose-50 border border-rose-300 text-rose-800 px-4 py-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-xl">🚨</span>
              <div>
                <strong className="font-bold">{stats.tidakDiangkut} Titik Sampah Tidak Diangkut Hari Ini</strong>
                <p className="text-sm mt-0.5">Perlu dispatch ulang atau investigasi.</p>
              </div>
            </div>
            <Link href="/pengangkutan?status=tidak_diangkut" className="text-rose-900 bg-rose-200/50 hover:bg-rose-200 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors shrink-0 text-center">
              Lihat Detail &rarr;
            </Link>
          </div>
        )}

        {stats.notifGagal > 0 && (
          <div className="bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-xl">📵</span>
              <div>
                <strong className="font-bold">{stats.notifGagal} Notifikasi WA Gagal Terkirim</strong>
                <p className="text-sm mt-0.5">Pengingat tagihan tidak sampai ke pelanggan.</p>
              </div>
            </div>
            <Link href="/notifikasi?tab=riwayat" className="text-red-900 bg-red-200/50 hover:bg-red-200 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors shrink-0 text-center">
              Cek Riwayat &rarr;
            </Link>
          </div>
        )}
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-700 animate-pulse" />
            Live Operation & Dashboard Dispatch
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Ringkasan Operasional — {bulan} {tahun}
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Pantauan retribusi, tren penagihan, dan status operasional armada UPS HERU Kota Depok
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <Link href="/tagihan" className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5">
            + Kelola Tagihan
          </Link>
          <Link href="/laporan" className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-sm transition-all">
            Unduh Laporan
          </Link>
        </div>
      </div>

      {/* Stat Cards Grid (2 rows x 4 cols) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {cards.map((c) => (
          <div key={c.no} className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider z-10">{c.label}</span>
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center z-10 ${c.iconBg}`}>
                {c.icon}
              </div>
            </div>
            <div className="z-10">
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight tabular-nums">
                {c.value}
              </p>
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">
                  {c.badgeText ? <span className="mr-1">{c.badgeText}</span> : null}
                  {c.sub}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${c.badgeBg}`}>
                  {c.no}
                </span>
              </div>
            </div>
            {c.progress !== undefined && (
              <div className="absolute bottom-0 left-0 h-1 bg-teal-500" style={{ width: `${c.progress}%` }} />
            )}
          </div>
        ))}
      </div>

      {/* Collection Progress & Denda */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">Realisasi Penagihan Retribusi Bulan Ini</h2>
            <p className="text-xs text-slate-500 mt-0.5">Rasio perolehan kas pembayaran terhadap tagihan yang diterbitkan</p>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-emerald-700 tabular-nums">{persenTerkumpul}%</span>
            <span className="text-xs font-semibold text-slate-600">terkumpul</span>
          </div>
        </div>

        <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden p-0.5">
          <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, persenTerkumpul)}%` }} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-5 pt-4 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <div>
              <span className="text-slate-600 block text-[11px] font-medium">Dana Terkumpul</span>
              <span className="font-bold text-slate-800 text-sm">{formatRupiah(terkumpul)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <div>
              <span className="text-slate-600 block text-[11px] font-medium">Sisa Belum Terbayar</span>
              <span className="font-bold text-slate-800 text-sm">{formatRupiah(sisa)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
            <div>
              <span className="text-slate-600 block text-[11px] font-medium">Target Tagihan Terbit</span>
              <span className="font-bold text-slate-800 text-sm">{formatRupiah(tagihanBulanIni)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:justify-end">
            <span className={`w-2.5 h-2.5 rounded-full ${stats.totalDendaBulanIni > 0 ? "bg-amber-500" : "bg-emerald-500"}`} />
            <div>
              <span className="text-slate-600 block text-[11px] font-medium">🟡 Denda Terakumulasi</span>
              <span className={`font-bold text-sm ${stats.totalDendaBulanIni > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                {formatRupiah(stats.totalDendaBulanIni)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tren & Tunggakan & Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
        {/* Trend Bar Chart */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm lg:col-span-3 flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">Tren Pemasukan vs Pengeluaran</h2>
              <p className="text-xs text-slate-500 mt-0.5">Historis arus kas 6 bulan terakhir</p>
            </div>
            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">Semester Ini</span>
          </div>

          <div className="flex-1 flex items-end gap-2 sm:gap-4 h-52 border-b border-slate-100 pb-3">
            {bulanLabels.map((m, i) => {
              const masuk = pemasukanTren[i];
              const keluar = pengeluaranTren[i];
              const hMasuk = Math.max(4, Math.round((masuk / maxTren) * 100));
              const hKeluar = Math.max(4, Math.round((keluar / maxTren) * 100));
              return (
                <div key={m.label} className="flex-1 flex flex-col items-center h-full group">
                  <div className="flex-1 w-full flex items-end justify-center gap-1 sm:gap-2" title={`${m.label} — Pemasukan ${formatRupiah(masuk)} · Pengeluaran ${formatRupiah(keluar)}`}>
                    <div className="w-3.5 sm:w-5 bg-emerald-500 rounded-t-md transition-all group-hover:bg-emerald-600" style={{ height: `${hMasuk}%` }} />
                    <div className="w-3.5 sm:w-5 bg-rose-400 rounded-t-md transition-all group-hover:bg-rose-500" style={{ height: `${hKeluar}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2 sm:gap-4 mt-2">
            {bulanLabels.map((m) => <span key={m.label} className="flex-1 text-center text-[11px] font-medium text-slate-500 pt-1">{m.label}</span>)}
          </div>
        </div>

        {/* Breakdown Pengeluaran */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm lg:col-span-3 flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">Breakdown Pengeluaran Bulan Ini</h2>
              <p className="text-xs text-slate-500 mt-0.5">Proporsi biaya operasional per kategori</p>
            </div>
            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">Bulan Ini</span>
          </div>

          <div className="flex-1 space-y-4">
            {stats.pengeluaranPerKategori.length === 0 ? (
               <div className="text-center py-10 text-slate-500 text-sm">Belum ada data pengeluaran</div>
            ) : stats.pengeluaranPerKategori.map((k, i) => {
               const catMap: Record<string, { label: string, color: string }> = {
                 bbm: { label: "BBM", color: "bg-amber-500" },
                 gaji_petugas: { label: "Gaji Petugas", color: "bg-blue-500" },
                 perawatan: { label: "Perawatan", color: "bg-orange-500" },
                 operasional: { label: "Operasional", color: "bg-slate-500" },
                 lainnya: { label: "Lainnya", color: "bg-gray-400" },
               };
               const mapping = catMap[k.kategori] || { label: k.kategori, color: "bg-slate-400" };
               const width = stats.pengeluaranBulanIni > 0 ? (k._sum.jumlah / stats.pengeluaranBulanIni) * 100 : 0;
               return (
                 <div key={k.kategori}>
                   <div className="flex justify-between text-xs mb-1">
                     <span className="font-semibold text-slate-700">{mapping.label}</span>
                     <span className="text-slate-600 font-medium">{formatRupiah(k._sum.jumlah || 0)}</span>
                   </div>
                   <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                     <div className={`h-full ${mapping.color} rounded-full`} style={{ width: `${width}%` }}></div>
                   </div>
                 </div>
               )
            })}
          </div>
          
          <div className="mt-4 pt-4 border-t border-slate-100 text-right">
            <span className="text-xs font-semibold text-slate-600">Total Pengeluaran: </span>
            <span className="text-sm font-bold text-slate-800">{formatRupiah(stats.pengeluaranBulanIni)}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
        {/* Top Tunggakan */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden lg:col-span-3 flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/60">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">Tunggakan Terbesar</h2>
              <p className="text-xs text-slate-500 mt-0.5">Daftar pelanggan perlu tindak lanjut tagihan</p>
            </div>
            <span className="w-2 h-2 rounded-full bg-amber-500" />
          </div>

          <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
            {topTunggakan.length === 0 ? (
              <div className="text-center py-10">
                <span className="text-2xl mb-1 block">🎉</span>
                <p className="text-xs font-semibold text-emerald-700">Nihil Tunggakan Kritis</p>
                <p className="text-[11px] text-slate-600 mt-0.5">Semua pelanggan tertib bayar tepat waktu</p>
              </div>
            ) : (
              topTunggakan.map((t, i) => (
                <div key={t.kode} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/70 border border-slate-100 hover:border-slate-200 hover:bg-white transition-all">
                  <span className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-700 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{t.nama}</p>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">{t.kode} · {t.wilayah || "—"}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-rose-600">{formatRupiah(t.total)}</p>
                    <span className="text-[10px] text-slate-600 block font-medium">{t.jumlahTagihan} bulan</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Performa Kelurahan */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden lg:col-span-3 flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/60">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">Performa Penagihan per Kelurahan</h2>
              <p className="text-xs text-slate-500 mt-0.5">Rasio tagihan lunas bulan ini per wilayah</p>
            </div>
            <span className="w-2 h-2 rounded-full bg-blue-500" />
          </div>
          <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
            {stats.performaKelurahan.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-sm">Belum ada data performa kelurahan</div>
            ) : stats.performaKelurahan.map((k, i) => (
              <div key={k.kelurahan} className="flex items-center gap-3">
                <div className="w-24 shrink-0 truncate text-xs font-semibold text-slate-700">{i+1}. {k.kelurahan}</div>
                <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${k.persen_lunas}%` }}></div>
                </div>
                <div className="w-12 text-right text-xs font-bold text-slate-800">{k.persen_lunas}%</div>
                <div className="w-5 shrink-0 text-center text-xs">
                  {k.persen_lunas < 70 ? "⚠️" : (k.persen_lunas > 90 ? "✅" : "")}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
        {/* Referral Leaderboard */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden lg:col-span-2 flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/60">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">🏆 Top Referral Akuisisi</h2>
              <p className="text-xs text-slate-500 mt-0.5">Petugas paling aktif rekrut warga baru</p>
            </div>
          </div>
          <div className="p-4 flex-1 flex flex-col space-y-3">
            {stats.topReferral.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-sm">Belum ada data referral</div>
            ) : stats.topReferral.map((r, i) => (
              <div key={r.referal} className="flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-800">
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : <span className="inline-block w-5 text-center text-slate-400">{i+1}.</span>} {r.referal}
                </span>
                <span className="text-slate-600 text-xs font-medium">{r._count.id} pelanggan</span>
              </div>
            ))}
          </div>
        </div>

        {/* Komposisi Sampah */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden lg:col-span-4 flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/60">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">Komposisi Sampah Bulan Ini</h2>
              <p className="text-xs text-slate-500 mt-0.5">Breakdown jenis sampah yang diangkut</p>
            </div>
          </div>
          <div className="p-4 flex-1 flex flex-col space-y-4 justify-center">
            {stats.komposisiSampah.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-sm">Belum ada data pengangkutan sampah</div>
            ) : stats.komposisiSampah.map(k => {
              const catMap: Record<string, { label: string, color: string, icon: string }> = {
                campuran: { label: "Campuran", color: "bg-stone-500", icon: "🟤" },
                organik: { label: "Organik", color: "bg-green-500", icon: "🟢" },
                anorganik: { label: "Anorganik", color: "bg-blue-500", icon: "🔵" },
                b3: { label: "B3", color: "bg-red-500", icon: "🔴" },
              };
              const map = catMap[k.jenisSampah] || { label: k.jenisSampah, color: "bg-slate-400", icon: "⚫" };
              const pct = stats.pickupVolume > 0 ? ((k._sum.volume || 0) / stats.pickupVolume) * 100 : 0;
              return (
                <div key={k.jenisSampah} className="flex items-center gap-3">
                  <div className="w-28 shrink-0 text-xs font-semibold text-slate-700">{map.icon} {map.label}</div>
                  <div className="flex-1 bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div className={`h-full ${map.color} rounded-full`} style={{ width: `${pct}%` }}></div>
                  </div>
                  <div className="w-32 text-right text-xs text-slate-600 font-medium">
                    {k._sum.volume || 0} m³ ({Math.round(pct)}%)
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick Actions & System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 tracking-tight mb-1">Menu Akses Cepat</h2>
          <p className="text-xs text-slate-500 mb-4">Pintasan operasional harian dinas</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-3">
            {quickActions.map((a) => (
              <Link key={a.href + a.label} href={a.href} className="group p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/60 hover:bg-white hover:border-emerald-400 hover:shadow-sm transition-all flex items-start gap-3">
                <span className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-base shrink-0 group-hover:scale-105 transition-transform">{a.icon}</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">{a.label}</span>
                  <span className="block text-[11px] text-slate-500 mt-0.5 truncate">{a.desc}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* System Status */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">Status Operasional Sistem</h2>
              <p className="text-xs text-slate-500 mt-0.5">Kondisi gateway transaksi & armada lapangan</p>
            </div>
            <div className={`flex items-center gap-2 px-2.5 py-1 rounded-full ${systemBadge.bg} ${systemBadge.text} border ${systemBadge.border} text-xs font-medium`}>
              <span className={`w-2 h-2 rounded-full ${systemBadge.dot} animate-pulse`} />
              {systemBadge.label}
            </div>
          </div>
          <div className="space-y-3 divide-y divide-slate-100">
            {infoRows.map((r) => (
              <div key={r.k} className="flex items-center justify-between pt-2.5 first:pt-0">
                <span className="text-xs text-slate-500 font-medium">{r.k}</span>
                <span className="text-xs font-bold text-slate-800">{r.v}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-semibold text-slate-700">Piutang Retribusi Belum Masuk</span>
              <span className={`text-sm font-bold tabular-nums ${sisa > 0 ? "text-rose-600" : "text-emerald-700"}`}>{formatRupiah(sisa)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
