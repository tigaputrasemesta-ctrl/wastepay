import Link from "next/link";
import { getLaporan, labelKategoriPengeluaran, labelJenisSampah } from "@/lib/laporan";
import { formatRupiah, formatDate } from "@/lib/utils";

export default async function LaporanPage({
  searchParams,
}: {
  searchParams: Promise<{ bulan?: string; tahun?: string; tab?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const bulan = Math.min(12, Math.max(1, parseInt(params.bulan || String(now.getMonth() + 1)) || now.getMonth() + 1));
  const tahun = parseInt(params.tahun || String(now.getFullYear())) || now.getFullYear();
  const activeTab = params.tab || "eksekutif";

  const data = await getLaporan(bulan, tahun);
  const NAMA_BULAN = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];
  const NAMA_BULAN_SINGKAT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

  const tabs = [
    { id: "eksekutif", label: "📊 Ringkasan Utama", desc: "Kinerja Vital" },
    { id: "arus_kas", label: "💰 Arus Kas & Laba Rugi", desc: "Kas Masuk & Beban" },
    { id: "piutang", label: "⏳ Status Tunggakan Warga", desc: "Aging Piutang" },
    { id: "logistik", label: "🌱 Operasional & Logistik", desc: "Biaya per KK & Ritase" },
    { id: "referral", label: "🤝 Referral & Warga", desc: "Agen & Retensi" },
  ];

  return (
    <div className="p-4 sm:p-6 pb-16 w-full max-w-[1600px] mx-auto">
      {/* Header & Controls */}
      <div className="mb-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-bold tracking-wide uppercase">
                Audit &amp; Financial Pack
              </span>
              <span className="text-xs text-slate-400 font-mono">UPS HERU Kota Depok</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-none">
              Laporan Keuangan &amp; Operasional
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
              Periode {NAMA_BULAN[bulan - 1]} {tahun} · Standar Pengakuan Akrual &amp; Arus Kas Riil
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap w-full sm:w-auto">
            <form method="GET" className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <input type="hidden" name="tab" value={activeTab} />
              <select
                name="bulan"
                defaultValue={bulan}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-sm"
              >
                {NAMA_BULAN_SINGKAT.map((b, i) => (
                  <option key={i + 1} value={i + 1}>{b}</option>
                ))}
              </select>
              <select
                name="tahun"
                defaultValue={tahun}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-sm"
              >
                {[2024, 2025, 2026, 2027, 2028].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <button
                type="submit"
                className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow active:scale-[0.98] transition-all"
              >
                Tampilkan
              </button>
            </form>

            <a
              href={`/laporan-cetak?bulan=${bulan}&tahun=${tahun}`}
              target="_blank"
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow active:scale-[0.98] transition-all flex items-center gap-1.5"
            >
              <span>🖨</span>
              <span>Cetak PDF Resmi</span>
            </a>
            <a
              href={`/api/laporan/export?bulan=${bulan}&tahun=${tahun}`}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold shadow-sm hover:shadow active:scale-[0.98] transition-all flex items-center gap-1.5"
            >
              <span>⬇</span>
              <span>Ekspor Multi-Modul (CSV)</span>
            </a>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 border-b border-slate-200 scrollbar-none">
        {tabs.map((t) => {
          const isActive = activeTab === t.id;
          return (
            <Link
              key={t.id}
              href={`/laporan?bulan=${bulan}&tahun=${tahun}&tab=${t.id}`}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                isActive
                  ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                  : "bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80"
              }`}
            >
              <span>{t.label}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${isActive ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-500"}`}>
                {t.desc}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Peringatan Pengeluaran Kosong (Empty State Warning) */}
      {data.totalPengeluaran === 0 && (
        <div className="mb-6 bg-amber-50/90 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 flex items-start gap-3 shadow-sm">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="font-bold text-sm text-amber-950">Catatan Pengeluaran Operasional Belum Diinput</p>
            <p className="text-amber-800 mt-0.5 leading-relaxed">
              Total pengeluaran bulan ini tercatat <b>Rp 0</b>. Angka estimasi laba operasional dan margin di bawah belum memperhitungkan biaya operasional riil (BBM armada truk, upah petugas/kru, dan servis armada). Silakan catat nota pengeluaran di menu{" "}
              <Link href="/pengeluaran" className="underline font-bold text-amber-950 hover:text-emerald-800">
                Pengeluaran Operasional &rarr;
              </Link>
            </p>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: RINGKASAN UTAMA (KILAS KINERJA VITAL)                          */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "eksekutif" && (
        <div className="space-y-6">
          {/* 4 Kartu KPI Utama */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-slate-500">Komitmen Tagihan Terbit</p>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                  Hak Pendapatan
                </span>
              </div>
              <p className="text-2xl font-black text-slate-900 tracking-tight">
                {formatRupiah(data.kpi.earnedAccrualRevenue)}
              </p>
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Total Rumah Terbit Tagihan:</span>
                <span className="font-semibold text-slate-800">{data.kpi.tagihanLunasCount + data.kpi.tagihanBelumLunasCount} KK</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-slate-500">Uang Kas Nyata Diterima</p>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-50 text-sky-800 font-bold border border-sky-200">
                  Uang Masuk Riil
                </span>
              </div>
              <p className="text-2xl font-black text-sky-700 tracking-tight">
                {formatRupiah(data.kpi.totalRealizedCash)}
              </p>
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Dari Tagihan Periode Ini:</span>
                <span className="font-semibold text-slate-800">{formatRupiah(data.bridge.currentBilledCollected)}</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-slate-500">Pengeluaran Operasional</p>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 font-bold border border-rose-200">
                  BBM, Kru &amp; Servis
                </span>
              </div>
              <p className="text-2xl font-black text-rose-600 tracking-tight">
                {formatRupiah(data.kpi.totalPengeluaran)}
              </p>
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Sisa Kas Masuk Bersih:</span>
                <span className={`font-semibold ${data.kpi.netCashFlow >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                  {formatRupiah(data.kpi.netCashFlow)}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-slate-500">Estimasi Laba Operasional</p>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${data.totalPengeluaran === 0 ? "bg-amber-50 text-amber-800 border-amber-200" : data.kpi.accrualOperatingProfit >= 0 ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-rose-50 text-rose-800 border-rose-200"}`}>
                  {data.totalPengeluaran === 0 ? "Menunggu Beban" : `Margin ${data.kpi.accrualMarginPersen.toFixed(1)}%`}
                </span>
              </div>
              <p className={`text-2xl font-black tracking-tight ${data.kpi.accrualOperatingProfit >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                {formatRupiah(data.kpi.accrualOperatingProfit)}
              </p>
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Status Profitabilitas:</span>
                <span className="font-semibold text-slate-800">
                  {data.totalPengeluaran === 0 ? "Perlu Input Beban Riil" : data.kpi.accrualOperatingProfit >= 0 ? "Surplus Sehat" : "Defisit"}
                </span>
              </div>
            </div>
          </div>

          {/* Indikator Penagihan, Kecepatan Bayar, dan Kesehatan Pelanggan */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tingkat Keberhasilan Penagihan (GCR) */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-slate-900 text-sm">Tingkat Keberhasilan Penagihan (GCR)</h3>
                  <span className="text-xs font-mono font-bold text-emerald-700">
                    {data.kpi.grossCollectionRate.toFixed(1)}%
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  Persentase tagihan bulan berjalan yang telah lunas tertagih dibanding total tagihan yang diterbitkan.
                </p>
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden mb-3">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      data.kpi.grossCollectionRate >= 85 ? "bg-emerald-600" : data.kpi.grossCollectionRate >= 70 ? "bg-amber-500" : "bg-rose-600"
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, data.kpi.grossCollectionRate))}%` }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[10px]">Terkumpul Bulan Ini:</span>
                  <span className="font-bold text-emerald-700">{formatRupiah(data.bridge.currentBilledCollected)}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px]">Sisa Belum Terbayar:</span>
                  <span className="font-bold text-rose-600">{formatRupiah(data.bridge.accruedUncollected)}</span>
                </div>
              </div>
            </div>

            {/* Kecepatan Bayar Warga (DSO) */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-slate-900 text-sm">Kecepatan Pembayaran Warga (DSO)</h3>
                  <span className="text-xs font-mono font-bold text-indigo-700">
                    {data.kpi.dsoHari} Hari
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  Rata-rata waktu (dalam hari) yang dibutuhkan sejak invoice dikirim hingga warga melunasi iurannya.
                </p>
                <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs text-indigo-900 mb-2">
                  <div className="flex justify-between font-semibold mb-1">
                    <span>Total Tunggakan Tertahan:</span>
                    <span>{formatRupiah(data.agingSchedule.totalPiutangGross)}</span>
                  </div>
                  <div className="flex justify-between text-indigo-700 text-[11px]">
                    <span>Estimasi Kas Tertagih Bersih:</span>
                    <span>{formatRupiah(data.agingSchedule.netCarryingValuePiutang)}</span>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 italic">
                {data.kpi.dsoHari <= 30 ? "✓ Perputaran kas sangat cepat & tertib (< 30 hari)" : "⚠ Banyak warga menunggak lama, perlu reminder penagihan"}
              </p>
            </div>

            {/* Kesehatan Langganan Warga */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-slate-900 text-sm">Kesehatan Langganan Warga</h3>
                  <span className="text-xs font-mono font-bold text-emerald-700">
                    {data.cohort.pelangganAktif} KK Aktif
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  Jumlah rumah warga yang aktif mendapatkan layanan pengangkutan rutin dari total {data.cohort.totalPelanggan} terdaftar.
                </p>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-slate-50">
                    <span className="text-slate-600">Pelanggan Baru Bulan Ini</span>
                    <span className="font-bold text-emerald-700">+{data.cohort.pelangganBaruBulanIni} Pelanggan</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-50">
                    <span className="text-slate-600">Pelanggan Sedang Libur/Cuti</span>
                    <span className="font-semibold text-amber-700">{data.cohort.pelangganLiburBulanIni} Pelanggan</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-600">Pelanggan Sudah Lunas</span>
                    <span className="font-bold text-slate-900">{data.kpi.tagihanLunasCount} dari {data.kpi.tagihanLunasCount + data.kpi.tagihanBelumLunasCount} Tagihan</span>
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100 flex justify-between text-xs">
                <span className="text-slate-500">Rata-rata Retribusi per KK:</span>
                <span className="font-bold text-slate-900">{formatRupiah(Math.round(data.unitEconomics.arpu))}/KK</span>
              </div>
            </div>
          </div>

          {/* Sorotan Pengendalian Kas & Catatan Auditor */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold uppercase tracking-wider">
                  Audit Summary &amp; Internal Controls
                </span>
                <h3 className="text-lg font-bold mt-2 text-white">Catatan Pengawasan Keuangan &amp; Arus Kas</h3>
                <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
                  Laporan ini secara ketat memisahkan antara <b>uang fisik yang nyata masuk ke kasir/rekening</b> dengan <b>uang yang masih dalam bentuk komitmen tagihan</b>. Uang muka yang dibayar warga untuk bulan mendatang juga dipisahkan sebagai titipan agar tidak dianggap laba sepihak, dan tunggakan lama dikelompokkan berdasarkan usia keterlambatannya.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/laporan?bulan=${bulan}&tahun=${tahun}&tab=arus_kas`}
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition backdrop-blur-sm"
                >
                  Buka Rincian Arus Kas &rarr;
                </Link>
                <Link
                  href={`/laporan?bulan=${bulan}&tahun=${tahun}&tab=piutang`}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-sm"
                >
                  Lihat Status Tunggakan &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: ARUS KAS & LABA RUGI (WATERFALL BRIDGE PSAK 72)                 */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "arus_kas" && (
        <div className="space-y-6">
          {/* Visual Waterfall Bridge Arus Kas ke Akrual */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                <h2 className="font-bold text-slate-900 text-base">
                  Alur Rekonsiliasi Kas Masuk ke Hak Pendapatan Murni
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Menjelaskan secara transparan mengapa uang kas yang masuk berbeda dengan total tagihan yang dicetak pada bulan {NAMA_BULAN[bulan - 1]} {tahun}.
                </p>
              </div>
              <span className="px-3 py-1 bg-slate-100 text-slate-700 font-mono text-xs rounded-lg font-bold">
                Standar Akuntansi Keuangan (PSAK 72)
              </span>
            </div>

            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200/80 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between py-2 border-b border-slate-200 text-slate-900 font-bold text-sm">
                <span>[+] Total Uang Kas Nyata Masuk (Rekening / Kasir)</span>
                <span className="text-sky-700">{formatRupiah(data.bridge.realizedCashInflow)}</span>
              </div>
              <div className="flex items-center justify-between pl-4 text-slate-600">
                <span>&bull; Dari Tagihan Bulan Berjalan Ini</span>
                <span>{formatRupiah(data.bridge.currentBilledCollected)}</span>
              </div>
              <div className="flex items-center justify-between pl-4 text-slate-600">
                <span>&bull; Dari Pelunasan Tunggakan Bulan-Bulan Lalu</span>
                <span>{formatRupiah(data.bridge.pastArrearsCollected)}</span>
              </div>
              <div className="flex items-center justify-between pl-4 text-amber-700 bg-amber-50/70 p-1.5 rounded">
                <span>&bull; Titipan Uang di Muka (Warga Bayar Duluan utk Bulan Depan)</span>
                <span>- {formatRupiah(data.bridge.prepaidFutureCollected)}</span>
              </div>

              <div className="flex items-center justify-between py-2 border-t border-slate-200 text-slate-700 font-semibold">
                <span>[=] Kas Masuk yang Murni Menjadi Hak Bulan Ini</span>
                <span>{formatRupiah(data.bridge.currentBilledCollected)}</span>
              </div>
              <div className="flex items-center justify-between pl-4 text-emerald-800 bg-emerald-50/70 p-1.5 rounded">
                <span>[+] Tagihan Bulan Ini yg Sudah Dibayar Duluan di Bulan Lalu</span>
                <span>+ {formatRupiah(data.bridge.prepaidPastRecognized)}</span>
              </div>
              <div className="flex items-center justify-between pl-4 text-slate-600">
                <span>[+] Sisa Tagihan Bulan Ini yg Belum Dibayar Warga (Piutang Berjalan)</span>
                <span>+ {formatRupiah(data.bridge.accruedUncollected)}</span>
              </div>

              <div className="flex items-center justify-between py-3 border-t-2 border-slate-300 text-slate-900 font-black text-sm bg-emerald-100/50 p-2.5 rounded-lg">
                <span>[=] TOTAL HAK PENDAPATAN SEJATI BULAN INI (KOMITMEN TAGIHAN)</span>
                <span className="text-emerald-900 text-base">{formatRupiah(data.bridge.earnedAccrualRevenue)}</span>
              </div>

              <div className="flex items-center justify-between py-2 text-rose-700">
                <span>[-] Total Beban Operasional Kas (BBM, Gaji, Servis Armada)</span>
                <span>- {formatRupiah(data.bridge.accrualOperatingExpenses)}</span>
              </div>

              <div className="flex items-center justify-between py-3 border-t-2 border-slate-900 text-slate-900 font-black text-sm bg-slate-900 text-white p-3 rounded-xl">
                <span>[=] ESTIMASI SURPLUS / LABA OPERASIONAL BERSIH</span>
                <span className="text-emerald-400 text-base">
                  {formatRupiah(data.bridge.accrualOperatingProfit)} ({data.bridge.accrualMarginPersen.toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>

          {/* Dua Kolom: Pemasukan per Kanal & Pengeluaran per Kategori */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pemasukan per Metode */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
              <h3 className="font-bold text-slate-900 text-base mb-3">Realisasi Kas Masuk per Kanal Pembayaran</h3>
              <div className="space-y-3">
                {data.pemasukanByMetode.map((m) => {
                  let nama = m.metode;
                  let badge = "Manual";
                  if (m.metode.startsWith("duitku") || ["qris", "ewallet", "virtual_account"].includes(m.metode)) {
                    nama = "Payment Gateway Duitku (QRIS / VA)";
                    badge = "Otomatis";
                  } else if (m.metode === "transfer") {
                    nama = "Transfer Bank Manual";
                    badge = "Verifikasi Kasir";
                  } else if (m.metode === "tunai") {
                    nama = "Kas Tunai (Petugas Tagih / Kasir)";
                    badge = "Fisik";
                  }
                  return (
                    <div key={m.metode} className="flex items-center justify-between py-2 border-b border-slate-100 text-xs">
                      <div>
                        <span className="font-bold text-slate-800 capitalize block">{nama}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{badge}</span>
                      </div>
                      <span className="font-bold text-emerald-700 tabular-nums text-sm">{formatRupiah(m.jumlah)}</span>
                    </div>
                  );
                })}
                <div className="pt-2 flex justify-between font-bold text-slate-900 text-sm">
                  <span>Total Kas Masuk Riil</span>
                  <span className="text-emerald-700">{formatRupiah(data.totalPemasukan)}</span>
                </div>
              </div>
            </div>

            {/* Pengeluaran per Kategori */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
              <h3 className="font-bold text-slate-900 text-base mb-3">Realisasi Beban Kas Operasional</h3>
              {data.pengeluaranByKategori.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                  Belum ada catatan pengeluaran kas yang diinput pada periode ini
                </div>
              ) : (
                <div className="space-y-3">
                  {data.pengeluaranByKategori.map((k) => (
                    <div key={k.kategori} className="flex items-center justify-between py-2 border-b border-slate-100 text-xs">
                      <div>
                        <span className="font-bold text-slate-800 capitalize block">{labelKategoriPengeluaran(k.kategori)}</span>
                        <span className="text-[10px] text-slate-400 font-mono">Beban Rutin</span>
                      </div>
                      <span className="font-bold text-rose-600 tabular-nums text-sm">{formatRupiah(k._sum.jumlah || 0)}</span>
                    </div>
                  ))}
                  <div className="pt-2 flex justify-between font-bold text-slate-900 text-sm">
                    <span>Total Beban Kas</span>
                    <span className="text-rose-600">{formatRupiah(data.totalPengeluaran)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tabel Pembayaran di Muka (Prepaid) */}
          {data.tagihanDibayarDiMuka.length > 0 && (
            <div className="bg-white rounded-2xl border border-emerald-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Tagihan {NAMA_BULAN[bulan - 1]} yang Dilunasi di Muka (Bulan Sebelumnya)
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Uang kas telah masuk di bulan lalu, diakui sebagai pendapatan bersih di bulan berjalan ini.
                  </p>
                </div>
                <span className="px-3 py-1 bg-emerald-100 text-emerald-900 font-bold text-xs rounded-full">
                  Total {formatRupiah(data.totalDibayarDiMuka)} ({data.tagihanDibayarDiMuka.length} Tagihan)
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-emerald-50/60 text-slate-700 font-bold border-b border-emerald-200 uppercase text-[10px]">
                      <th className="text-left px-3 py-2">No</th>
                      <th className="text-left px-3 py-2">Pelanggan</th>
                      <th className="text-left px-3 py-2">Tanggal Bayar Riil</th>
                      <th className="text-left px-3 py-2">Metode</th>
                      <th className="text-right px-3 py-2">Nominal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.tagihanDibayarDiMuka.map((p, idx) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="px-3 py-2 font-bold text-slate-900">
                          {p.pelanggan?.nama || "Pelanggan"} <span className="text-[10px] text-slate-400 font-mono">({p.pelanggan?.kodePelanggan || "-"})</span>
                        </td>
                        <td className="px-3 py-2 text-slate-600">{formatDate(p.tanggal)}</td>
                        <td className="px-3 py-2 capitalize text-slate-600">{p.metode}</td>
                        <td className="px-3 py-2 text-right font-bold text-emerald-700 tabular-nums">{formatRupiah(p.jumlah)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tabel Titipan Periode Depan (Deferred Revenue) */}
          {data.penerimaanUangDiMuka.length > 0 && (
            <div className="bg-white rounded-2xl border border-sky-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Titipan Kas Bulan Ini untuk Periode Mendatang (Deferred Revenue)
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Kas telah masuk fisik/rekening, namun diakui sebagai liabilitas titipan hingga jasa diantarkan.
                  </p>
                </div>
                <span className="px-3 py-1 bg-sky-100 text-sky-900 font-bold text-xs rounded-full">
                  Total {formatRupiah(data.totalPenerimaanUangDiMuka)} ({data.penerimaanUangDiMuka.length} Transaksi)
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-sky-50/60 text-slate-700 font-bold border-b border-sky-200 uppercase text-[10px]">
                      <th className="text-left px-3 py-2">No</th>
                      <th className="text-left px-3 py-2">Pelanggan</th>
                      <th className="text-left px-3 py-2">Untuk Periode Tagihan</th>
                      <th className="text-left px-3 py-2">Tanggal Masuk</th>
                      <th className="text-left px-3 py-2">Metode</th>
                      <th className="text-right px-3 py-2">Nominal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.penerimaanUangDiMuka.map((p, idx) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="px-3 py-2 font-bold text-slate-900">
                          {p.pelanggan?.nama || "Pelanggan"} <span className="text-[10px] text-slate-400 font-mono">({p.pelanggan?.kodePelanggan || "-"})</span>
                        </td>
                        <td className="px-3 py-2 font-bold text-sky-800">
                          {NAMA_BULAN[p.tagihan.bulan - 1]} {p.tagihan.tahun}
                        </td>
                        <td className="px-3 py-2 text-slate-600">{formatDate(p.tanggal)}</td>
                        <td className="px-3 py-2 capitalize text-slate-600">{p.metode}</td>
                        <td className="px-3 py-2 text-right font-bold text-sky-700 tabular-nums">{formatRupiah(p.jumlah)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 3: AGING SCHEDULE PIUTANG & CKPN (STATUS TUNGGAKAN WARGA)          */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "piutang" && (
        <div className="space-y-6">
          {/* Ringkasan Portofolio Piutang & CKPN */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Total Tunggakan Warga (Piutang)
              </span>
              <p className="text-2xl font-black text-slate-900 tracking-tight">
                {formatRupiah(data.agingSchedule.totalPiutangGross)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {data.agingSchedule.totalDebiturUnik} rumah tangga/KK menunggak (seluruh periode)
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-rose-200/80 p-5 shadow-sm bg-rose-50/20">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block mb-1">
                Cadangan Risiko Macet (Penyisihan)
              </span>
              <p className="text-2xl font-black text-rose-600 tracking-tight">
                - {formatRupiah(data.agingSchedule.totalNilaiCkpn)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Penyisihan cadangan risiko sesuai usia keterlambatan
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-emerald-200/80 p-5 shadow-sm bg-emerald-50/20">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block mb-1">
                Ekspektasi Kas Tertagih Bersih
              </span>
              <p className="text-2xl font-black text-emerald-700 tracking-tight">
                {formatRupiah(data.agingSchedule.netCarryingValuePiutang)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Perkiraan nilai piutang yang realistis dapat dicairkan
              </p>
            </div>
          </div>

          {/* Matriks Aging Schedule 5 Jenjang */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Jadwal Umur Keterlambatan Warga (Aging Schedule)</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Pengelompokan rumah tangga yang menunggak berdasarkan lama hari keterlambatan untuk prioritas penagihan lapangan.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-bold text-xs">
                Audit Scope: 100% Data Riil Seluruh Wilayah
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[10px]">
                    <th className="text-left px-3 py-2.5">Kategori Umur</th>
                    <th className="text-left px-3 py-2.5">Rentang Hari</th>
                    <th className="text-center px-3 py-2.5">Jml Tagihan</th>
                    <th className="text-center px-3 py-2.5">Debitur</th>
                    <th className="text-right px-3 py-2.5">Saldo Piutang (Rp)</th>
                    <th className="text-center px-3 py-2.5">% CKPN</th>
                    <th className="text-right px-3 py-2.5">Nilai Cadangan (Rp)</th>
                    <th className="text-center px-3 py-2.5">Tindakan SOP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.agingSchedule.buckets.map((b) => {
                    const badgeCls =
                      b.kategori === "lancar" ? "bg-emerald-50 text-emerald-800 border-emerald-200" :
                      b.kategori === "perhatian" ? "bg-amber-50 text-amber-800 border-amber-200" :
                      b.kategori === "kurang_lancar" ? "bg-orange-50 text-orange-800 border-orange-200" :
                      b.kategori === "diragukan" ? "bg-rose-50 text-rose-800 border-rose-200" :
                      "bg-red-100 text-red-900 border-red-300 font-bold";
                    return (
                      <tr key={b.kategori} className="hover:bg-slate-50">
                        <td className="px-3 py-3 font-bold text-slate-900">
                          <span className={`inline-flex px-2 py-0.5 rounded-md border text-[11px] ${badgeCls}`}>
                            {b.label}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-slate-600 font-mono">{b.rentangHari}</td>
                        <td className="px-3 py-3 text-center font-bold text-slate-800">{b.jumlahTagihan}</td>
                        <td className="px-3 py-3 text-center text-slate-700">{b.jumlahPelanggan} KK</td>
                        <td className="px-3 py-3 text-right font-black text-slate-900 tabular-nums">
                          {formatRupiah(b.totalNominal)}
                        </td>
                        <td className="px-3 py-3 text-center font-mono font-semibold text-slate-600">
                          {b.persenCkpn}%
                        </td>
                        <td className="px-3 py-3 text-right font-bold text-rose-600 tabular-nums">
                          {formatRupiah(b.nilaiCkpn)}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="text-[10px] text-slate-500 font-medium">
                            {b.kategori === "lancar" ? "Reminder WA H-3" :
                             b.kategori === "perhatian" ? "Rute Petugas Tagih" :
                             b.kategori === "kurang_lancar" ? "Telepon Admin & SP1" :
                             b.kategori === "diragukan" ? "SP2 & Jeda Angkut" :
                             "Suspended Barcode"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300">
                    <td colSpan={4} className="px-3 py-3 text-right uppercase text-[11px]">Total Portofolio &amp; Penyisihan</td>
                    <td className="px-3 py-3 text-right text-sm">{formatRupiah(data.agingSchedule.totalPiutangGross)}</td>
                    <td className="px-3 py-3 text-center text-[11px] font-mono">Avg</td>
                    <td className="px-3 py-3 text-right text-rose-600 text-sm">{formatRupiah(data.agingSchedule.totalNilaiCkpn)}</td>
                    <td className="px-3 py-3 text-center text-emerald-800 text-[11px]">Net: {formatRupiah(data.agingSchedule.netCarryingValuePiutang)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Tabel Seluruh Tagihan Tertunggak */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Daftar Debitur Menunggak ({data.tagihanMenunggak.length} Tagihan)
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Daftar rinci seluruh pelanggan dengan tunggakan berjalan untuk prioritas penagihan tim lapangan.
                </p>
              </div>
              <Link
                href="/tagihan?status=tunggakan"
                className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-sm transition"
              >
                Buka di Menu Tagihan &rarr;
              </Link>
            </div>

            {data.tagihanMenunggak.length === 0 ? (
              <p className="text-sm text-slate-400 font-medium py-8 text-center">Tidak ada tagihan tertunggak</p>
            ) : (
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                    <tr className="text-slate-600 font-bold uppercase text-[10px]">
                      <th className="text-left px-3 py-2.5">No</th>
                      <th className="text-left px-3 py-2.5">Pelanggan</th>
                      <th className="text-left px-3 py-2.5">Wilayah</th>
                      <th className="text-left px-3 py-2.5">No. Telepon</th>
                      <th className="text-left px-3 py-2.5">Periode Tagihan</th>
                      <th className="text-right px-3 py-2.5">Nominal Tunggakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.tagihanMenunggak.map((t, idx) => (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="px-3 py-2 font-bold text-slate-900">
                          {t.pelanggan.nama}
                          <span className="block text-[10px] text-slate-500 font-mono font-normal">
                            {t.pelanggan.kodePelanggan}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {t.pelanggan.kelurahan?.nama || "-"}
                        </td>
                        <td className="px-3 py-2 text-slate-600 font-mono">{t.pelanggan.noTelepon || "-"}</td>
                        <td className="px-3 py-2 font-medium text-slate-800">
                          {NAMA_BULAN[t.bulan - 1]} {t.tahun}
                        </td>
                        <td className="px-3 py-2 text-right font-black text-rose-600 tabular-nums">
                          {formatRupiah(t.jumlah)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 4: UNIT ECONOMICS & LOGISTIK SAMPAH (OPERASIONAL & ARMADA)         */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "logistik" && (
        <div className="space-y-6">
          {/* Banner Peringatan Timbangan Fisik jika berat 0 */}
          {data.totalBerat === 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-700 flex items-start gap-3 shadow-sm">
              <span className="text-xl">⚖️</span>
              <div>
                <p className="font-bold text-slate-900">Armada Belum Menggunakan Timbangan Fisik (Weighbridge)</p>
                <p className="text-slate-600 mt-0.5 leading-relaxed">
                  Pencatatan saat ini berfokus pada status penjemputan rumah dan ritase trip truk. Karena berat fisik belum ditimbang di jembatan timbang TPS 3R/TPA, metrik operasional difokuskan pada <b>Biaya &amp; Margin per KK</b> serta <b>Biaya per Trip Armada</b>.
                </p>
              </div>
            </div>
          )}

          {/* 4 Kartu Unit Economics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Biaya Logistik per Tonase
              </span>
              <p className="text-2xl font-black text-slate-900 tracking-tight">
                {data.unitEconomics.totalTonase > 0 ? (
                  <>
                    {formatRupiah(Math.round(data.unitEconomics.totalCostPerTon))}
                    <span className="text-xs font-normal text-slate-500"> / Ton</span>
                  </>
                ) : (
                  <span className="text-slate-400 text-lg font-bold">Belum Ditimbang</span>
                )}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {data.unitEconomics.totalTonase > 0 ? "BBM, perawatan & gaji per tonase sampah" : "Memerlukan data jembatan timbang (kg)"}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Biaya Armada per Ritase (Trip)
              </span>
              <p className="text-2xl font-black text-slate-900 tracking-tight">
                {formatRupiah(Math.round(data.unitEconomics.totalRitase > 0 ? data.totalPengeluaran / data.unitEconomics.totalRitase : 0))}
                <span className="text-xs font-normal text-slate-500"> / Trip</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Rata-rata ongkos operasional 1 kali angkut armada
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Revenue per Tonase Sampah
              </span>
              <p className="text-2xl font-black text-emerald-700 tracking-tight">
                {data.unitEconomics.totalTonase > 0 ? (
                  <>
                    {formatRupiah(Math.round(data.unitEconomics.revenuePerTon))}
                    <span className="text-xs font-normal text-slate-500"> / Ton</span>
                  </>
                ) : (
                  <span className="text-slate-400 text-lg font-bold">Belum Ditimbang</span>
                )}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {data.unitEconomics.totalTonase > 0 ? "Omset retribusi yang dihasilkan tiap 1 ton" : "Menunggu pencatatan berat fisik sampah"}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Margin Kontribusi per KK
              </span>
              <p className="text-2xl font-black text-emerald-700 tracking-tight">
                +{formatRupiah(Math.round(data.unitEconomics.netMarginPerUser))}
                <span className="text-xs font-normal text-slate-500"> / KK</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Iuran {formatRupiah(Math.round(data.unitEconomics.arpu))} vs Beban {formatRupiah(Math.round(data.unitEconomics.costToServePerUser))}
              </p>
            </div>
          </div>

          {/* Volume Fisik & Ritase */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
              <p className="text-xs font-semibold text-slate-500 mb-1">Total Volume Sampah</p>
              <p className="text-2xl font-bold text-slate-900 tracking-tight">{data.totalVolume.toFixed(1)} m³</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
              <p className="text-xs font-semibold text-slate-500 mb-1">Total Berat Sampah</p>
              <p className="text-2xl font-bold text-slate-900 tracking-tight">
                {(data.totalBerat / 1000).toFixed(2)} Ton <span className="text-xs text-slate-400">({data.totalBerat.toFixed(0)} kg)</span>
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
              <p className="text-xs font-semibold text-slate-500 mb-1">Total Ritase Pengangkutan</p>
              <p className="text-2xl font-bold text-slate-900 tracking-tight">{data.totalPengangkutan} Trip</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
              <p className="text-xs font-semibold text-slate-500 mb-1">Rata-rata Muatan per Trip</p>
              <p className="text-2xl font-bold text-emerald-700 tracking-tight">
                {data.unitEconomics.muatanPerRitaseTon.toFixed(2)} Ton/Trip
              </p>
            </div>
          </div>

          {/* Rincian Pembuangan per TPA & Sampah per Jenis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
              <h3 className="font-bold text-slate-900 text-base mb-3">Distribusi Pembuangan ke TPA</h3>
              {data.sampahByTpa.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">Belum ada pembuangan TPA tercatat</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[10px]">
                        <th className="text-left px-3 py-2">TPA</th>
                        <th className="text-right px-3 py-2">Volume (m³)</th>
                        <th className="text-right px-3 py-2">Berat (kg)</th>
                        <th className="text-right px-3 py-2">Frekuensi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.sampahByTpa.map((s) => (
                        <tr key={s.tpaId} className="hover:bg-slate-50">
                          <td className="px-3 py-2.5 font-bold text-slate-900">{s.nama}</td>
                          <td className="px-3 py-2.5 text-right font-mono text-slate-700">{s.volume.toFixed(1)}</td>
                          <td className="px-3 py-2.5 text-right font-mono text-slate-700">{s.berat.toFixed(1)}</td>
                          <td className="px-3 py-2.5 text-right font-bold text-slate-900">{s.count} kali</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
              <h3 className="font-bold text-slate-900 text-base mb-3">Komposisi Sampah per Jenis</h3>
              {data.sampahByJenis.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">Belum ada data jenis sampah tercatat</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {data.sampahByJenis.map((j) => (
                    <div key={j.jenisSampah} className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs">
                      <p className="font-bold text-slate-900">{labelJenisSampah(j.jenisSampah || "")}</p>
                      <p className="text-slate-600 mt-1">
                        Volume: <b>{j._sum.volume?.toFixed(1) || 0} m³</b> | Berat: <b>{j._sum.berat?.toFixed(1) || 0} kg</b>
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{j._count} kali pengangkutan</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 5: REFERRAL & KOHOR PELANGGAN                                      */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "referral" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Rekapitulasi Agen Referral Petugas &amp; Mitra</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Jumlah pelanggan yang berhasil didaftarkan melalui kode referral petugas tagih dan mitra RW.
                </p>
              </div>
              <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm">
                <span>🤝</span>
                <span>{data.rekapReferral.reduce((acc, curr) => acc + curr.total, 0)} Pelanggan Tereferensikan</span>
              </span>
            </div>

            {data.rekapReferral.length === 0 ? (
              <p className="text-sm text-slate-400 font-medium py-8 text-center">Belum ada pelanggan terdaftar via referral</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[10px]">
                      <th className="text-left px-3 py-2.5">No</th>
                      <th className="text-left px-3 py-2.5">Kode Referral / Nama Agen</th>
                      <th className="text-right px-3 py-2.5">Total Pelanggan Terdaftar</th>
                      <th className="text-right px-3 py-2.5">Estimasi Kontribusi Omset/Bulan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.rekapReferral.map((r, idx) => (
                      <tr key={r.referal} className="hover:bg-slate-50">
                        <td className="px-3 py-2.5 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="px-3 py-2.5 font-bold text-slate-900">
                          <code className="px-2 py-0.5 bg-slate-100 rounded text-slate-800 font-mono text-[11px] mr-2">
                            {r.referal}
                          </code>
                        </td>
                        <td className="px-3 py-2.5 text-right font-black text-slate-900 tabular-nums">
                          {r.total} KK
                        </td>
                        <td className="px-3 py-2.5 text-right font-bold text-emerald-700 tabular-nums">
                          {formatRupiah(r.total * Math.round(data.unitEconomics.arpu))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
