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
    <div className="pb-10 font-mono relative z-10">
      {/* Page head */}
      <div className="page-head animate-fade-in px-6 pt-6">
        <p className="text-[10px] uppercase tracking-widest text-[var(--neon-lime)] flex items-center gap-2 mb-2">
          <span className="w-8 h-1 bg-[var(--neon-lime)] inline-block shadow-[0_0_5px_var(--neon-lime)]" />
          // RINGKASAN_OPERASIONAL
        </p>
        <div className="flex flex-wrap items-end justify-between gap-4 mt-2 border-b border-[var(--neon-cyan)]/30 pb-4">
          <h1 className="font-display text-4xl sm:text-5xl tracking-tighter text-white leading-none uppercase">
            {bulan} <span className="text-[var(--neon-lime)] glitch-text">{tahun}</span>
          </h1>
          <p className="text-[10px] tracking-widest text-slate-500 uppercase">
            [ PERIODE_TAGIHAN_&_PENERIMAAN_BERJALAN ]
          </p>
        </div>
      </div>

      <div className="px-6 pt-6 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {cards.map((c, i) => (
            <div
              key={c.no}
              className={`cyber-box p-5 animate-reveal-up d-${i + 1} group`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-[10px] tracking-widest text-slate-400 uppercase">{c.label}</p>
                  <p className="text-[9px] font-bold text-[var(--neon-cyan)] mt-0.5">
                    IDX-{c.no}
                  </p>
                </div>
                <div className="w-10 h-10 border border-[var(--neon-cyan)]/50 bg-[rgba(0,243,255,0.05)] flex items-center justify-center text-[var(--neon-cyan)] group-hover:bg-[var(--neon-cyan)] group-hover:text-black transition-colors shadow-[0_0_10px_rgba(0,243,255,0.2)]">
                  {c.icon}
                </div>
              </div>
              <p className={`text-3xl font-bold text-white tracking-tighter ${i === 2 ? "glitch-text" : ""}`}>
                {c.value}
              </p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--neon-cyan)]/30">
                <p className={`text-[10px] tracking-widest uppercase ${c.subClass.replace('text-vest', 'text-[var(--neon-lime)]').replace('text-amber', 'text-[var(--neon-yellow)]').replace('text-danger', 'text-[var(--neon-pink)]')}`}>
                  &gt; {c.sub}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Progress collection */}
        <div className="cyber-box p-5 animate-reveal-up d-4">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div>
              <span className="text-[10px] tracking-widest uppercase text-white font-bold">// TINGKAT_PENAGIHAN</span>
            </div>
            <span className="text-lg font-bold text-[var(--neon-lime)] glitch-text">{persenTerkumpul}%</span>
          </div>
          <div className="h-4 border border-[var(--neon-lime)]/50 bg-[rgba(183,225,60,0.05)] relative overflow-hidden">
            <div
              className="h-full bg-[var(--neon-lime)] shadow-[0_0_10px_var(--neon-lime)] transition-all"
              style={{ width: `${persenTerkumpul}%` }}
            />
          </div>
          <div className="flex justify-between mt-3 font-mono text-[10px] tracking-widest text-slate-400 uppercase">
            <span>
              TERKUMPUL: <span className="text-[var(--neon-lime)] font-bold">{formatRupiah(terkumpul)}</span>
            </span>
            <span>
              SISA: <span className="text-[var(--neon-yellow)] font-bold">{formatRupiah(sisa)}</span>
            </span>
            <span>DITAGIH: {formatRupiah(tagihanBulanIni)}</span>
          </div>
        </div>

        {/* Tren & Tunggakan */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Grafik tren pemasukan vs pengeluaran */}
          <div className="cyber-box p-5 animate-reveal-up d-4 lg:col-span-3">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div>
                <span className="text-[10px] tracking-widest uppercase text-[var(--neon-lime)] font-bold">// TREN_PEMASUKAN_VS_PENGELUARAN</span>
              </div>
              <span className="text-[9px] tracking-[0.2em] text-slate-500">[ 6_BULAN_TERAKHIR ]</span>
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
                        className="w-3 sm:w-4 bg-[var(--neon-lime)]/80 group-hover:bg-[var(--neon-lime)] group-hover:shadow-[0_0_10px_var(--neon-lime)] transition-all"
                        style={{ height: `${hMasuk}%` }}
                      />
                      <div
                        className="w-3 sm:w-4 bg-[var(--neon-yellow)]/80 group-hover:bg-[var(--neon-yellow)] group-hover:shadow-[0_0_10px_var(--neon-yellow)] transition-all"
                        style={{ height: `${hKeluar}%` }}
                      />
                    </div>
                    <span className="text-[9px] tracking-widest text-slate-500 pt-2 whitespace-nowrap">{m.label}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-5 mt-4 pt-4 border-t border-[var(--neon-cyan)]/30 text-[9px] tracking-widest text-slate-400 uppercase">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-[var(--neon-lime)] shadow-[0_0_5px_var(--neon-lime)]" /> PEMASUKAN
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-[var(--neon-yellow)] shadow-[0_0_5px_var(--neon-yellow)]" /> PENGELUARAN
              </span>
              <span className="ml-auto text-[var(--neon-cyan)]">PUNCAK_SKALA: {formatRupiah(maxTren)}</span>
            </div>
          </div>

          {/* Top tunggakan */}
          <div className="cyber-box animate-reveal-up d-5 lg:col-span-2">
            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--neon-pink)] bg-[rgba(255,0,234,0.05)]">
              <span className="text-[10px] tracking-widest uppercase font-bold text-[var(--neon-pink)] glitch-text">// TOP_TUNGGAKAN</span>
              <span className="text-[9px] tracking-[0.2em] text-slate-500">[ DEBT_LIST ]</span>
            </div>
            <div className="p-3 space-y-1">
              {topTunggakan.length === 0 && (
                <p className="text-sm text-[var(--neon-lime)] px-3 py-6 text-center font-mono uppercase tracking-widest">
                  [ TIDAK_ADA_TUNGGAKAN ] ✓
                </p>
              )}
              {topTunggakan.map((t, i) => (
                <div
                  key={t.kode}
                  className="flex items-center gap-3 px-3 py-3 border-b border-[var(--neon-cyan)]/20 last:border-0 hover:bg-[rgba(0,243,255,0.05)] transition-colors"
                >
                  <span className="border border-[var(--neon-pink)] bg-[rgba(255,0,234,0.1)] w-8 h-8 flex items-center justify-center text-xs font-bold text-[var(--neon-pink)] flex-shrink-0 shadow-[0_0_5px_rgba(255,0,234,0.3)]">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate uppercase">{t.nama}</p>
                    <p className="text-[9px] tracking-widest text-[var(--neon-cyan)] truncate mt-0.5">
                      {t.kode} // {t.wilayah || "—"}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-bold text-[var(--neon-pink)]">{formatRupiah(t.total)}</p>
                    <p className="text-[9px] tracking-widest text-slate-400 mt-0.5">
                      {t.jumlahTagihan}_TAGIHAN
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick actions + info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="cyber-box animate-reveal-up d-4">
            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--neon-cyan)]/50 bg-[rgba(0,243,255,0.05)]">
              <span className="text-[10px] tracking-widest uppercase font-bold text-[var(--neon-cyan)]">// AKSI_CEPAT</span>
              <span className="text-[9px] tracking-[0.2em] text-slate-500">[ CMD_LIST ]</span>
            </div>
            <div className="p-3 space-y-2">
              {quickActions.map((a, i) => (
                <Link
                  key={a.href + a.label}
                  href={a.href}
                  className="group flex items-center gap-4 px-3 py-3 border border-transparent hover:border-[var(--neon-cyan)] hover:bg-[rgba(0,243,255,0.05)] transition-all hover:shadow-[0_0_15px_rgba(0,243,255,0.1)]"
                >
                  <span className="border border-[var(--neon-cyan)] bg-black w-10 h-10 flex items-center justify-center text-xs text-[var(--neon-cyan)] flex-shrink-0 group-hover:bg-[var(--neon-cyan)] group-hover:text-black transition-colors">
                    {a.code}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs font-bold uppercase tracking-widest text-white group-hover:text-[var(--neon-cyan)] transition-colors">
                      {a.label}
                    </span>
                    <span className="block text-[10px] text-slate-400 mt-1 truncate tracking-wider">
                      &gt; {a.desc}
                    </span>
                  </span>
                  <span className="text-slate-600 group-hover:text-[var(--neon-cyan)] group-hover:translate-x-2 transition-all font-bold">
                    {String(i + 1).padStart(2, "0")}_&gt;
                  </span>
                </Link>
              ))}
            </div>
          </div>

          <div className="cyber-box animate-reveal-up d-5">
            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--neon-yellow)] bg-[rgba(252,238,10,0.05)]">
              <span className="text-[10px] tracking-widest uppercase font-bold text-[var(--neon-yellow)]">// STATUS_OPERASI</span>
              <span className="text-[9px] tracking-[0.2em] text-slate-500">[ SYS_INFO ]</span>
            </div>
            <div className="p-3 space-y-1">
              {infoRows.map((r) => (
                <div
                  key={r.k}
                  className="flex items-center justify-between px-3 py-3 border-b border-[var(--neon-cyan)]/20 last:border-0"
                >
                  <span className="text-[10px] tracking-widest uppercase text-slate-400">{r.k}</span>
                  <span className={`text-xs font-bold tracking-widest ${r.c.replace('text-bone', 'text-white').replace('text-amber', 'text-[var(--neon-yellow)]').replace('text-vest', 'text-[var(--neon-lime)]')}`}>{r.v}</span>
                </div>
              ))}
              <div className="flex items-center justify-between px-3 py-4 mt-2 bg-[rgba(0,243,255,0.05)] border border-[var(--neon-cyan)]/50 shadow-[inset_0_0_10px_rgba(0,243,255,0.1)]">
                <span className="text-[10px] tracking-widest uppercase text-white font-bold">SISA_TAGIHAN_BULAN_INI</span>
                <span className={`text-sm font-bold tracking-widest ${sisa > 0 ? "text-[var(--neon-pink)]" : "text-[var(--neon-lime)]"}`}>
                  {formatRupiah(sisa)}
                </span>
              </div>
              <div className="flex items-center justify-between px-3 py-3 mt-2">
                <span className="flex items-center gap-2 text-[9px] text-slate-500 uppercase tracking-widest">
                  <span className={`w-2 h-2 rounded-full animate-pulse ${stats.komplainBaru > 0 ? "bg-[var(--neon-pink)] shadow-[0_0_5px_var(--neon-pink)]" : "bg-[var(--neon-lime)] shadow-[0_0_5px_var(--neon-lime)]"}`} />
                  {stats.komplainBaru > 0 ? "ADA_KOMPLAIN_AKTIF" : "SEMUA_SISTEM_NORMAL"}
                </span>
                <span className="text-[9px] text-[var(--neon-cyan)] uppercase tracking-widest">
                  [TPS-{String(tahun).slice(-2)}/{String(now.getMonth() + 1).padStart(2, "0")}]
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
