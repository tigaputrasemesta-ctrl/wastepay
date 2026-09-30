import { prisma } from "@/lib/prisma";
import { formatRupiah } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

const NAMA_BULAN = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

async function getStats() {
  const now = new Date();
  const bulanIni = now.getMonth(); 
  const tahunIni = now.getFullYear();

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
    totalPelanggan: 0,
    pelangganAktif: 0,
    tagihanBulanIni: 0,
    totalTagihanBulanIni: 0,
    totalPembayaranBulanIni: 0,
    komplainBaru: 0,
    totalPetugas: 0,
    bulanLabels,
    pemasukanTren: [0, 0, 0, 0, 0, 0],
    pengeluaranTren: [0, 0, 0, 0, 0, 0],
    maxTren: 1,
    topTunggakan: [] as { nama: string; kode: string; wilayah: string; total: number; jumlahTagihan: number }[],
  };

  try {
    const [totalPelanggan, pelangganAktif, tagihanBulanIni, totalTagihanBulanIni, totalPembayaranBulanIni, komplainBaru, totalPetugas] = await Promise.all([
      prisma.pelanggan.count({ where: { deletedAt: null } }),
      prisma.pelanggan.count({ where: { status: "aktif", deletedAt: null } }),
      prisma.tagihan.count({
        where: {
          bulan: bulanIni + 1,
          tahun: tahunIni,
          status: { in: ["belum_bayar", "tunggakan"] },
          deletedAt: null,
        },
      }),
      prisma.tagihan.aggregate({
        where: {
          bulan: bulanIni + 1,
          tahun: tahunIni,
          deletedAt: null,
        },
        _sum: { jumlah: true },
      }),
      prisma.pembayaran.aggregate({
        where: {
          createdAt: {
            gte: new Date(tahunIni, bulanIni, 1),
          },
          status: "terverifikasi",
        },
        _sum: { jumlah: true },
      }),
      prisma.komplain.count({ where: { status: "baru" } }),
      prisma.petugas.count({ where: { aktif: true, deletedAt: null } }),
    ]);

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
            .filter(
              (r) => r.tanggal.getMonth() + 1 === m.bulan && r.tanggal.getFullYear() === m.tahun
            )
            .reduce((s, r) => s + r.jumlah, 0)
        )
      );
    const pemasukanTren = sumPerBulan(pembayaranTren);
    const pengeluaranTrenArr = sumPerBulan(pengeluaranTren);
    const maxTren = Math.max(1, ...pemasukanTren, ...pengeluaranTrenArr);

    const tunggakanRows = await prisma.tagihan.findMany({
      where: { deletedAt: null, status: { in: ["belum_bayar", "tunggakan"] } },
      select: {
        pelangganId: true,
        jumlah: true,
        denda: true,
        pelanggan: {
          select: {
            nama: true,
            kodePelanggan: true,
            kelurahan: { select: { nama: true } },
          },
        },
      },
      take: 20,
    });
    const tunggakanMap = new Map<
      number,
      { nama: string; kode: string; wilayah: string; total: number; jumlahTagihan: number }
    >();
    for (const t of tunggakanRows) {
      const ada = tunggakanMap.get(t.pelangganId);
      const total = t.jumlah + (t.denda ?? 0);
      if (ada) {
        ada.total += total;
        ada.jumlahTagihan += 1;
      } else {
        tunggakanMap.set(t.pelangganId, {
          nama: t.pelanggan.nama,
          kode: t.pelanggan.kodePelanggan,
          wilayah: t.pelanggan.kelurahan?.nama ?? "—",
          total,
          jumlahTagihan: 1,
        });
      }
    }
    const topTunggakan = [...tunggakanMap.values()]
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return {
      totalPelanggan,
      pelangganAktif,
      tagihanBulanIni,
      totalTagihanBulanIni: totalTagihanBulanIni._sum.jumlah || 0,
      totalPembayaranBulanIni: totalPembayaranBulanIni._sum.jumlah || 0,
      komplainBaru,
      totalPetugas,
      bulanLabels,
      pemasukanTren,
      pengeluaranTren: pengeluaranTrenArr,
      maxTren,
      topTunggakan,
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
  const persenTerkumpul =
    tagihanBulanIni > 0 ? Math.round((terkumpul / tagihanBulanIni) * 100) : 0;

  const cards = [
    {
      no: "01",
      label: "Total Pelanggan",
      value: String(stats.totalPelanggan),
      sub: `${stats.pelangganAktif} pelanggan aktif`,
      iconBg: "bg-blue-50 text-blue-600 border-blue-100",
      badgeBg: "bg-blue-50 text-blue-700",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      no: "02",
      label: "Tagihan Bulan Ini",
      value: formatRupiah(tagihanBulanIni),
      sub: `${stats.tagihanBulanIni} tagihan tertunda`,
      iconBg: "bg-amber-50 text-amber-700 border-amber-100",
      badgeBg: "bg-amber-50 text-amber-700",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      no: "03",
      label: "Terkumpul Bulan Ini",
      value: formatRupiah(terkumpul),
      sub: `${persenTerkumpul}% dari target tagihan`,
      iconBg: "bg-emerald-50 text-emerald-700 border-emerald-100",
      badgeBg: "bg-emerald-50 text-emerald-700",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      no: "04",
      label: "Komplain Baru",
      value: String(stats.komplainBaru),
      sub: stats.komplainBaru > 0 ? "Perlu segera ditindak" : "Semua terselesaikan",
      iconBg: stats.komplainBaru > 0 ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-slate-50 text-slate-600 border-slate-100",
      badgeBg: stats.komplainBaru > 0 ? "bg-rose-50 text-rose-700" : "bg-slate-50 text-slate-600",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      ),
    },
  ];

  const quickActions = [
    {
      label: "Registrasi Pelanggan",
      desc: "Daftarkan warga atau rute baru",
      href: "/pelanggan",
      icon: "👤",
    },
    {
      label: "Generate Tagihan",
      desc: `Terbitkan tagihan ${bulan} ${tahun}`,
      href: "/tagihan",
      icon: "📄",
    },
    {
      label: "Kelola Komplain",
      desc: stats.komplainBaru > 0 ? `${stats.komplainBaru} aduan menunggu tindak lanjut` : "Tidak ada komplain aktif",
      href: "/komplain",
      icon: "💬",
    },
    {
      label: "Laporan Keuangan",
      desc: "Rekap arus kas & neraca retribusi",
      href: "/laporan",
      icon: "📊",
    },
  ];

  const infoRows = [
    { k: "Petugas Lapangan Aktif", v: `${stats.totalPetugas} Petugas` },
    { k: "Pelanggan Terdaftar Aktif", v: `${stats.pelangganAktif} Warga` },
    { k: "Tagihan Belum Dibayar", v: `${stats.tagihanBulanIni} Tagihan` },
    { k: "Total Pembayaran Masuk", v: formatRupiah(terkumpul) },
  ];

  return (
    <div className="p-4 sm:p-6 pb-12 space-y-8 w-full">
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
          <Link
            href="/tagihan"
            className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
          >
            + Kelola Tagihan
          </Link>
          <Link
            href="/laporan"
            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-sm transition-all"
          >
            Unduh Laporan
          </Link>
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {cards.map((c) => (
          <div
            key={c.no}
            className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {c.label}
              </span>
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${c.iconBg}`}>
                {c.icon}
              </div>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight tabular-nums">
                {c.value}
              </p>
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">{c.sub}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${c.badgeBg}`}>
                  {c.no}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Collection Progress */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Realisasi Penagihan Retribusi Bulan Ini
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Rasio perolehan kas pembayaran terhadap tagihan yang diterbitkan
            </p>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-emerald-700 tabular-nums">{persenTerkumpul}%</span>
            <span className="text-xs font-semibold text-slate-600">terkumpul</span>
          </div>
        </div>

        <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden p-0.5">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-1000"
            style={{ width: `${Math.min(100, persenTerkumpul)}%` }}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5 pt-4 border-t border-slate-100 text-xs">
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
          <div className="flex items-center gap-2 sm:justify-end">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
            <div>
              <span className="text-slate-600 block text-[11px] font-medium">Target Tagihan Terbit</span>
              <span className="font-bold text-slate-800 text-sm">{formatRupiah(tagihanBulanIni)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tren & Tunggakan */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Trend Bar Chart */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm lg:col-span-3 flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Tren Pemasukan vs Pengeluaran
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Historis arus kas 6 bulan terakhir</p>
            </div>
            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
              Semester Ini
            </span>
          </div>

          <div className="flex-1 flex items-end gap-2 sm:gap-4 h-52 border-b border-slate-100 pb-3">
            {bulanLabels.map((m, i) => {
              const masuk = pemasukanTren[i];
              const keluar = pengeluaranTren[i];
              const hMasuk = Math.max(4, Math.round((masuk / maxTren) * 100));
              const hKeluar = Math.max(4, Math.round((keluar / maxTren) * 100));
              return (
                <div key={m.label} className="flex-1 flex flex-col items-center h-full group">
                  <div
                    className="flex-1 w-full flex items-end justify-center gap-1 sm:gap-2"
                    title={`${m.label} — Pemasukan ${formatRupiah(masuk)} · Pengeluaran ${formatRupiah(keluar)}`}
                  >
                    <div
                      className="w-3.5 sm:w-5 bg-emerald-500 rounded-t-md transition-all group-hover:bg-emerald-600"
                      style={{ height: `${hMasuk}%` }}
                    />
                    <div
                      className="w-3.5 sm:w-5 bg-rose-400 rounded-t-md transition-all group-hover:bg-rose-500"
                      style={{ height: `${hKeluar}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2 sm:gap-4 mt-2">
            {bulanLabels.map((m) => (
              <span key={m.label} className="flex-1 text-center text-[11px] font-medium text-slate-500 pt-1">
                {m.label}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-6 mt-6 pt-4 border-t border-slate-100 text-xs font-medium text-slate-600">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-emerald-500" /> Pemasukan Retribusi
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-rose-400" /> Biaya Operasional
            </span>
            <span className="ml-auto text-slate-600 text-[11px]">
              Skala Max: {formatRupiah(maxTren)}
            </span>
          </div>
        </div>

        {/* Top Tunggakan */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden lg:col-span-2 flex flex-col">
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
                <div
                  key={t.kode}
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/70 border border-slate-100 hover:border-slate-200 hover:bg-white transition-all"
                >
                  <span className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-700 shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{t.nama}</p>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">
                      {t.kode} · {t.wilayah || "—"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-rose-600">{formatRupiah(t.total)}</p>
                    <span className="text-[10px] text-slate-600 block font-medium">
                      {t.jumlahTagihan} bulan
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions & System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 tracking-tight mb-1">Menu Akses Cepat</h2>
          <p className="text-xs text-slate-500 mb-4">Pintasan operasional harian dinas</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {quickActions.map((a) => (
              <Link
                key={a.href + a.label}
                href={a.href}
                className="group p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/60 hover:bg-white hover:border-emerald-400 hover:shadow-sm transition-all flex items-start gap-3"
              >
                <span className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-base shrink-0 group-hover:scale-105 transition-transform">
                  {a.icon}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                    {a.label}
                  </span>
                  <span className="block text-[11px] text-slate-500 mt-0.5 truncate">
                    {a.desc}
                  </span>
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
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Aktif Normal
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
              <span className={`text-sm font-bold tabular-nums ${sisa > 0 ? "text-rose-600" : "text-emerald-700"}`}>
                {formatRupiah(sisa)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

