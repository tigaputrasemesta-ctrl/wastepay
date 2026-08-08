import { prisma } from "@/lib/prisma";
import { formatRupiah } from "@/lib/utils";
import Link from "next/link";

const NAMA_BULAN = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

async function getStats() {
  const now = new Date();
  const bulanIni = now.getMonth(); // 0-based
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

  // ── Tren 6 bulan: pemasukan vs pengeluaran ──
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

  // ── Top tunggakan (per pelanggan) ──
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
          wilayah: { select: { nama: true, kelurahan: true } },
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
        wilayah: [t.pelanggan.wilayah?.nama, t.pelanggan.wilayah?.kelurahan]
          .filter(Boolean)
          .join(" · "),
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
      subClass: "text-vest",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      no: "02",
      label: "Tagihan Bulan Ini",
      value: formatRupiah(tagihanBulanIni),
      sub: `${stats.tagihanBulanIni} tagihan belum bayar`,
      subClass: "text-amber",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      no: "03",
      label: "Terkumpul Bulan Ini",
      value: formatRupiah(terkumpul),
      sub: `${persenTerkumpul}% dari total tagihan`,
      subClass: "text-vest",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      no: "04",
      label: "Komplain Baru",
      value: String(stats.komplainBaru),
      sub: stats.komplainBaru > 0 ? "Perlu ditindaklanjuti" : "Aman",
      subClass: stats.komplainBaru > 0 ? "text-danger" : "text-vest",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
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
    },
    {
      label: "Generate Tagihan Bulanan",
      desc: `Terbitkan tagihan ${bulan.toLowerCase()} ${tahun}`,
      href: "/tagihan",
      code: "BIL",
    },
    {
      label: "Lihat Komplain Masuk",
      desc: stats.komplainBaru > 0 ? `${stats.komplainBaru} komplain belum ditangani` : "Tidak ada komplain baru",
      href: "/komplain",
      code: "KPL",
    },
    {
      label: "Laporan Keuangan",
      desc: "Rekap penerimaan & pengeluaran",
      href: "/laporan",
      code: "RPT",
    },
  ];

  const infoRows = [
    { k: "Petugas Aktif", v: String(stats.totalPetugas), c: "text-bone" },
    { k: "Pelanggan Aktif", v: String(stats.pelangganAktif), c: "text-bone" },
    { k: "Belum Dibayar", v: `${stats.tagihanBulanIni} tagihan`, c: "text-amber" },
    { k: "Terkumpul", v: formatRupiah(terkumpul), c: "text-vest" },
  ];

  return (
    <div className="pb-10">
      {/* Page head */}
      <div className="page-head animate-fade-in">
        <p className="stencil text-vest flex items-center gap-2">
          <span className="w-8 h-1.5 hazard inline-block" />
          Ringkasan Operasional
        </p>
        <div className="flex flex-wrap items-end justify-between gap-4 mt-2">
          <h1 className="font-display text-4xl sm:text-5xl tracking-wide text-bone leading-none">
            {bulan} <span className="text-vest">{tahun}</span>
          </h1>
          <p className="stencil text-bone-faint">
            Periode tagihan & penerimaan berjalan
          </p>
        </div>
      </div>

      <div className="px-6 pt-6 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {cards.map((c, i) => (
            <div
              key={c.no}
              className={`panel p-5 animate-reveal-up d-${i + 1} group`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="stencil text-bone-faint">{c.label}</p>
                  <p className="stencil text-[9px] text-bone-faint/60 mt-0.5">
                    IDX-{c.no}
                  </p>
                </div>
                <div className="w-10 h-10 chamfer-sm bg-asphalt-raised border border-asphalt-line flex items-center justify-center text-vest group-hover:chamfer-sm bg-vest group-hover:text-asphalt-deep transition-colors">
                  {c.icon}
                </div>
              </div>
              <p className={`stat-num text-3xl text-bone ${i === 2 ? "animate-ticker" : ""}`}>
                {c.value}
              </p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-asphalt-line">
                <p className={`font-mono text-xs ${c.subClass}`}>{c.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Progress collection */}
        <div className="panel p-5 animate-reveal-up d-4">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="sec-label">
              <span className="stencil text-bone">Tingkat Penagihan</span>
            </div>
            <span className="stat-num text-lg text-vest">{persenTerkumpul}%</span>
          </div>
          <div className="h-4 border border-asphalt-line bg-asphalt-deep relative overflow-hidden">
            <div
              className="h-full bg-vest transition-all"
              style={{ width: `${persenTerkumpul}%` }}
            />
            <div className="absolute inset-0 hazard opacity-10 animate-stripe" />
          </div>
          <div className="flex justify-between mt-2 font-mono text-[11px] text-bone-faint">
            <span>
              TERKUMPUL: <span className="text-vest">{formatRupiah(terkumpul)}</span>
            </span>
            <span>
              SISA: <span className="text-amber">{formatRupiah(sisa)}</span>
            </span>
            <span>DITAGIH: {formatRupiah(tagihanBulanIni)}</span>
          </div>
        </div>

        {/* Tren & Tunggakan */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Grafik tren pemasukan vs pengeluaran */}
          <div className="panel p-5 animate-reveal-up d-4 lg:col-span-3">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div className="sec-label">
                <span className="stencil text-vest">Tren Pemasukan vs Pengeluaran</span>
              </div>
              <span className="stencil text-bone-faint">6 BULAN TERAKHIR</span>
            </div>
            <div className="flex items-end gap-2 sm:gap-3 h-40">
              {bulanLabels.map((m, i) => {
                const masuk = pemasukanTren[i];
                const keluar = pengeluaranTren[i];
                const hMasuk = Math.max(3, Math.round((masuk / maxTren) * 100));
                const hKeluar = Math.max(3, Math.round((keluar / maxTren) * 100));
                return (
                  <div key={m.label} className="flex-1 flex flex-col items-center h-full group">
                    <div
                      className="flex-1 w-full flex items-end justify-center gap-1 pb-1"
                      title={`${m.label} — masuk ${formatRupiah(masuk)} · keluar ${formatRupiah(keluar)}`}
                    >
                      <div
                        className="w-3 sm:w-4 bg-vest/85 group-hover:bg-vest transition-colors"
                        style={{ height: `${hMasuk}%` }}
                      />
                      <div
                        className="w-3 sm:w-4 bg-amber/85 group-hover:bg-amber transition-colors"
                        style={{ height: `${hKeluar}%` }}
                      />
                    </div>
                    <span className="stencil text-[9px] text-bone-faint pt-1.5 whitespace-nowrap">{m.label}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-5 mt-4 pt-3 border-t border-asphalt-line font-mono text-[11px] text-bone-faint">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 bg-vest" /> Pemasukan (terverifikasi)
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 bg-amber" /> Pengeluaran
              </span>
              <span className="ml-auto">Puncak skala: {formatRupiah(maxTren)}</span>
            </div>
          </div>

          {/* Top tunggakan */}
          <div className="panel animate-reveal-up d-5 lg:col-span-2">
            <div className="flex items-center justify-between px-5 py-3 border-b border-asphalt-line bg-asphalt-deep">
              <span className="stencil text-danger">Top Tunggakan</span>
              <span className="stencil text-bone-faint">DEBT</span>
            </div>
            <div className="p-3 space-y-1">
              {topTunggakan.length === 0 && (
                <p className="text-sm text-vest px-3 py-6 text-center font-mono">
                  Tidak ada tagihan belum dibayar ✓
                </p>
              )}
              {topTunggakan.map((t, i) => (
                <div
                  key={t.kode}
                  className="flex items-center gap-3 px-3 py-2.5 border-b border-asphalt-line/60 last:border-0"
                >
                  <span className="chamfer-sm bg-danger/10 border border-danger/30 w-8 h-8 flex items-center justify-center font-display text-sm text-danger flex-shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-bone truncate">{t.nama}</p>
                    <p className="text-[10px] font-mono text-bone-faint truncate">
                      {t.kode} · {t.wilayah || "—"}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-mono text-xs text-danger">{formatRupiah(t.total)}</p>
                    <p className="text-[10px] text-bone-faint">
                      {t.jumlahTagihan} tagihan
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick actions + info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="panel animate-reveal-up d-4">
            <div className="flex items-center justify-between px-5 py-3 border-b border-asphalt-line bg-asphalt-deep">
              <span className="stencil text-vest">Aksi Cepat</span>
              <span className="stencil text-bone-faint">CMD</span>
            </div>
            <div className="p-3 space-y-1">
              {quickActions.map((a, i) => (
                <Link
                  key={a.href + a.label}
                  href={a.href}
                  className="group flex items-center gap-4 px-3 py-3 border border-transparent hover:border-asphalt-line hover:bg-asphalt-raised transition"
                >
                  <span className="chamfer-sm bg-asphalt-raised border border-asphalt-line w-10 h-10 flex items-center justify-center font-mono text-xs text-vest flex-shrink-0">
                    {a.code}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-bone group-hover:text-vest transition-colors">
                      {a.label}
                    </span>
                    <span className="block text-xs text-bone-faint mt-0.5 truncate">
                      {a.desc}
                    </span>
                  </span>
                  <span className="text-bone-faint group-hover:text-vest group-hover:translate-x-1 transition-all font-mono">
                    {String(i + 1).padStart(2, "0")} →
                  </span>
                </Link>
              ))}
            </div>
          </div>

          <div className="panel animate-reveal-up d-5">
            <div className="flex items-center justify-between px-5 py-3 border-b border-asphalt-line bg-asphalt-deep">
              <span className="stencil text-amber">Status Operasi</span>
              <span className="stencil text-bone-faint">SYS</span>
            </div>
            <div className="p-3 space-y-1">
              {infoRows.map((r) => (
                <div
                  key={r.k}
                  className="flex items-center justify-between px-3 py-3 border-b border-asphalt-line/60 last:border-0"
                >
                  <span className="stencil text-bone-faint">{r.k}</span>
                  <span className={`stat-num text-sm ${r.c}`}>{r.v}</span>
                </div>
              ))}
              <div className="flex items-center justify-between px-3 py-3 bg-asphalt-deep border border-asphalt-line">
                <span className="stencil text-bone">Sisa Tagihan Bulan Ini</span>
                <span className={`stat-num text-base ${sisa > 0 ? "text-danger" : "text-vest"}`}>
                  {formatRupiah(sisa)}
                </span>
              </div>
              <div className="flex items-center justify-between px-3 py-2">
                <span className="flex items-center gap-2 font-mono text-[10px] text-bone-faint uppercase tracking-widest">
                  <span className={`w-2 h-2 rounded-full animate-blink ${stats.komplainBaru > 0 ? "bg-danger" : "bg-vest"}`} />
                  {stats.komplainBaru > 0 ? "Ada komplain aktif" : "Semua sistem normal"}
                </span>
                <span className="font-mono text-[10px] text-bone-faint uppercase tracking-widest">
                  TPS-{String(tahun).slice(-2)}/{String(now.getMonth() + 1).padStart(2, "0")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
