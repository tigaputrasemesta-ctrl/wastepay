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

  const [
    totalPelanggan,
    pelangganAktif,
    tagihanBulanIni,
    totalTagihanBulanIni,
    totalPembayaranBulanIni,
    komplainBaru,
    totalPetugas,
  ] = await Promise.all([
    prisma.pelanggan.count(),
    prisma.pelanggan.count({ where: { status: "aktif" } }),
    prisma.tagihan.count({
      where: {
        bulan: bulanIni + 1,
        tahun: tahunIni,
        status: "belum_bayar",
      },
    }),
    prisma.tagihan.aggregate({
      where: {
        bulan: bulanIni + 1,
        tahun: tahunIni,
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
    prisma.petugas.count({ where: { aktif: true } }),
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

  const bulanLabels: { bulan: number; tahun: number; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(tahunIni, bulanIni - i, 1);
    bulanLabels.push({
      bulan: d.getMonth() + 1,
      tahun: d.getFullYear(),
      label: `${NAMA_BULAN[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`,
    });
  }
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
      sub: `${stats.pelangganAktif} aktif`,
      bg: "bg-white",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="square" strokeLinejoin="miter" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      no: "02",
      label: "Tagihan Bulan Ini",
      value: formatRupiah(tagihanBulanIni),
      sub: `${stats.tagihanBulanIni} tagihan blm bayar`,
      bg: "bg-yellow-300",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="square" strokeLinejoin="miter" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      no: "03",
      label: "Terkumpul Bulan Ini",
      value: formatRupiah(terkumpul),
      sub: `${persenTerkumpul}% dari tagihan`,
      bg: "bg-green-300",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="square" strokeLinejoin="miter" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      no: "04",
      label: "Komplain Baru",
      value: String(stats.komplainBaru),
      sub: stats.komplainBaru > 0 ? "Perlu tindakan!" : "Aman",
      bg: stats.komplainBaru > 0 ? "bg-red-400 text-white" : "bg-white",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="square" strokeLinejoin="miter" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      ),
    },
  ];

  const quickActions = [
    {
      label: "Tambah Pelanggan Baru",
      desc: "Registrasi warga / unit baru",
      href: "/pelanggan",
      code: "+",
      bg: "bg-blue-100"
    },
    {
      label: "Generate Tagihan",
      desc: `Terbitkan tagihan ${bulan.toLowerCase()} ${tahun}`,
      href: "/tagihan",
      code: "BIL",
      bg: "bg-yellow-100"
    },
    {
      label: "Lihat Komplain",
      desc: stats.komplainBaru > 0 ? `${stats.komplainBaru} blm tertangani` : "Tidak ada komplain",
      href: "/komplain",
      code: "KPL",
      bg: "bg-red-100"
    },
    {
      label: "Laporan Keuangan",
      desc: "Rekap penerimaan & pengeluaran",
      href: "/laporan",
      code: "RPT",
      bg: "bg-green-100"
    },
  ];

  const infoRows = [
    { k: "Petugas Aktif", v: String(stats.totalPetugas) },
    { k: "Pelanggan Aktif", v: String(stats.pelangganAktif) },
    { k: "Belum Dibayar", v: `${stats.tagihanBulanIni} tagihan` },
    { k: "Terkumpul", v: formatRupiah(terkumpul) },
  ];

  return (
    <div className="pb-10 font-sans">
      {/* Page head */}
      <div className="mb-8">
        <h1 className="text-4xl sm:text-6xl font-black uppercase tracking-tighter text-black leading-none mb-2">
          {bulan} {tahun}
        </h1>
        <p className="font-bold text-sm uppercase bg-black text-white inline-block px-3 py-1">
          Ringkasan Operasional
        </p>
      </div>

      <div className="space-y-8">
        {/* Stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {cards.map((c) => (
            <div
              key={c.no}
              className={`hm-card ${c.bg} p-6 flex flex-col justify-between min-h-[160px]`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs font-black tracking-widest uppercase mb-1">
                    {c.label}
                  </p>
                  <p className="text-[10px] font-bold bg-black text-white px-1 inline-block">
                    IDX-{c.no}
                  </p>
                </div>
                <div className="w-12 h-12 border-2 border-black rounded-none-full flex items-center justify-center bg-white text-black shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
                  {c.icon}
                </div>
              </div>
              <div>
                <p className="text-3xl font-black tracking-tighter mb-2">
                  {c.value}
                </p>
                <div className="border-t-2 border-black pt-2">
                  <p className="text-[10px] font-bold tracking-widest uppercase">
                    &gt; {c.sub}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Progress collection */}
        <div className="hm-card bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b-2 border-black pb-2">
            <span className="text-sm font-black tracking-widest uppercase">
              Tingkat Penagihan
            </span>
            <span className="text-2xl font-black">{persenTerkumpul}%</span>
          </div>
          <div className="h-6 border-2 border-black bg-gray-100 relative overflow-hidden rounded-none-full">
            <div
              className="h-full bg-green-400 border-r-2 border-black transition-all duration-1000"
              style={{ width: `${persenTerkumpul}%` }}
            />
          </div>
          <div className="flex justify-between mt-4 text-xs font-bold tracking-widest uppercase">
            <span>
              TERKUMPUL: <span className="text-green-600">{formatRupiah(terkumpul)}</span>
            </span>
            <span>
              SISA: <span className="text-red-600">{formatRupiah(sisa)}</span>
            </span>
            <span>DITAGIH: {formatRupiah(tagihanBulanIni)}</span>
          </div>
        </div>

        {/* Tren & Tunggakan */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Grafik tren pemasukan vs pengeluaran */}
          <div className="hm-card bg-white p-6 lg:col-span-3 flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6 border-b-2 border-black pb-2">
              <span className="text-sm font-black tracking-widest uppercase">
                Tren Pemasukan vs Pengeluaran
              </span>
              <span className="text-[10px] font-bold bg-yellow-300 border border-black px-2 py-1">
                6 BLN TERAKHIR
              </span>
            </div>
            
            <div className="flex-1 flex items-end gap-2 sm:gap-4 h-48 border-b-2 border-black pb-2">
              {bulanLabels.map((m, i) => {
                const masuk = pemasukanTren[i];
                const keluar = pengeluaranTren[i];
                const hMasuk = Math.max(3, Math.round((masuk / maxTren) * 100));
                const hKeluar = Math.max(3, Math.round((keluar / maxTren) * 100));
                return (
                  <div key={m.label} className="flex-1 flex flex-col items-center h-full group">
                    <div
                      className="flex-1 w-full flex items-end justify-center gap-1"
                      title={`${m.label} — masuk ${formatRupiah(masuk)} · keluar ${formatRupiah(keluar)}`}
                    >
                      <div
                        className="w-4 sm:w-6 border-2 border-black bg-green-400 transition-all group-hover:bg-green-300"
                        style={{ height: `${hMasuk}%` }}
                      />
                      <div
                        className="w-4 sm:w-6 border-2 border-black bg-red-400 transition-all group-hover:bg-red-300"
                        style={{ height: `${hKeluar}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-2 sm:gap-4 mt-2">
                {bulanLabels.map((m) => (
                   <span key={m.label} className="flex-1 text-center text-[10px] font-bold tracking-widest uppercase pt-1">
                     {m.label}
                   </span>
                ))}
            </div>

            <div className="flex flex-wrap items-center gap-6 mt-6 pt-4 border-t-2 border-gray-200 text-xs font-bold tracking-widest uppercase">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 border-2 border-black bg-green-400" /> PEMASUKAN
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 border-2 border-black bg-red-400" /> PENGELUARAN
              </span>
              <span className="ml-auto text-gray-500">MAX: {formatRupiah(maxTren)}</span>
            </div>
          </div>

          {/* Top tunggakan */}
          <div className="hm-card bg-[#f4f4f0] p-0 overflow-hidden lg:col-span-2">
            <div className="px-5 py-4 border-b-2 border-black bg-red-500 text-white flex justify-between items-center">
              <span className="text-sm font-black tracking-widest uppercase">
                Top Tunggakan
              </span>
              <span className="text-xl">⚠️</span>
            </div>
            <div className="p-4 space-y-3">
              {topTunggakan.length === 0 && (
                <p className="text-sm text-green-600 py-6 text-center font-bold uppercase tracking-widest">
                  TIDAK ADA TUNGGAKAN ✓
                </p>
              )}
              {topTunggakan.map((t, i) => (
                <div
                  key={t.kode}
                  className="flex items-center gap-4 p-3 bg-white border-2 border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-x-1 hover:-translate-y-1 hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all"
                >
                  <span className="w-8 h-8 rounded-none-full border-2 border-black bg-yellow-300 flex items-center justify-center text-xs font-black shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black truncate uppercase">{t.nama}</p>
                    <p className="text-[10px] font-bold text-gray-600 truncate mt-1">
                      {t.kode} / {t.wilayah || "—"}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-black text-red-600">{formatRupiah(t.total)}</p>
                    <p className="text-[10px] font-bold text-gray-500 mt-1">
                      {t.jumlahTagihan} TAGIHAN
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick actions + info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="hm-card bg-white p-0 overflow-hidden">
            <div className="px-5 py-4 border-b-2 border-black bg-black text-white">
              <span className="text-sm font-black tracking-widest uppercase">Aksi Cepat</span>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {quickActions.map((a, i) => (
                <Link
                  key={a.href + a.label}
                  href={a.href}
                  className={`group flex items-center gap-3 p-3 border-2 border-black ${a.bg} hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:-translate-y-1 transition-all`}
                >
                  <span className="w-10 h-10 border-2 border-black bg-white flex items-center justify-center text-xl font-black shrink-0">
                    {a.code === "+" ? "+" : String(i + 1)}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs font-black uppercase tracking-wider mb-1">
                      {a.label}
                    </span>
                    <span className="block text-[10px] font-bold text-gray-700 truncate">
                      {a.desc}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </div>

          <div className="hm-card bg-white p-0 overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b-2 border-black bg-blue-500 text-white flex justify-between items-center">
              <span className="text-sm font-black tracking-widest uppercase">Status Sistem</span>
              <span className="w-3 h-3 rounded-none-full bg-green-400 border-2 border-black animate-pulse" />
            </div>
            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                {infoRows.map((r) => (
                  <div
                    key={r.k}
                    className="flex items-center justify-between pb-2 border-b-2 border-gray-100 last:border-0"
                  >
                    <span className="text-xs font-bold tracking-widest uppercase text-gray-500">{r.k}</span>
                    <span className="text-sm font-black uppercase">{r.v}</span>
                  </div>
                ))}
              </div>
              
              <div className="mt-auto">
                <div className="flex items-center justify-between p-3 bg-yellow-100 border-2 border-black">
                  <span className="text-xs font-black tracking-widest uppercase">Sisa Tagihan</span>
                  <span className={`text-lg font-black ${sisa > 0 ? "text-red-600" : "text-green-600"}`}>
                    {formatRupiah(sisa)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
