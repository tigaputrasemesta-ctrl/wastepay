import Link from "next/link";
import { getLaporan, labelKategoriPengeluaran, labelJenisSampah } from "@/lib/laporan";
import { formatRupiah, formatDate } from "@/lib/utils";
import { TabelRiwayatPemasukan } from "./TabelRiwayatPemasukan";

export default async function LaporanPage({
  searchParams,
}: {
  searchParams: Promise<{ bulan?: string; tahun?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const bulan = Math.min(12, Math.max(1, parseInt(params.bulan || String(now.getMonth() + 1)) || now.getMonth() + 1));
  const tahun = parseInt(params.tahun || String(now.getFullYear())) || now.getFullYear();

  const data = await getLaporan(bulan, tahun);

  const NAMA_BULAN = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];
  const NAMA_BULAN_SINGKAT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

  return (
    <div className="p-4 sm:p-6 pb-20 w-full max-w-[1600px] mx-auto space-y-8">
      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* HEADER & CONTROLS                                                     */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-bold tracking-wide uppercase">
                Laporan Keuangan Terpadu
              </span>
              <span className="text-xs text-slate-400 font-mono">UPS HERU Kota Depok</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 leading-none">
              Laporan Kas &amp; Keuangan Bulanan
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
              Periode {NAMA_BULAN[bulan - 1]} {tahun} · Ringkasan Arus Kas Masuk, Pengeluaran, dan Piutang Warga
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap w-full sm:w-auto">
            <form method="GET" className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <select
                name="bulan"
                defaultValue={bulan}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-sm"
              >
                {NAMA_BULAN_SINGKAT.map((b, i) => (
                  <option key={i + 1} value={i + 1}>
                    {b}
                  </option>
                ))}
              </select>
              <select
                name="tahun"
                defaultValue={tahun}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-sm"
              >
                {[2024, 2025, 2026, 2027, 2028].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
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
              <span>🖨️</span>
              <span>Cetak PDF Resmi</span>
            </a>
            <a
              href={`/api/laporan/export?bulan=${bulan}&tahun=${tahun}`}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold shadow-sm hover:shadow active:scale-[0.98] transition-all flex items-center gap-1.5"
            >
              <span>⬇️</span>
              <span>Ekspor CSV</span>
            </a>
          </div>
        </div>

        {/* QUICK JUMP ANCHORS (NAVIGASI CEPAT 1 HALAMAN) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-4 mt-4 border-t border-slate-100 scrollbar-none text-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Lompat Ke:</span>
          <a
            href="#ringkasan"
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg whitespace-nowrap transition"
          >
            📊 Ringkasan Kas
          </a>
          <a
            href="#pemasukan"
            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-lg whitespace-nowrap transition border border-emerald-200"
          >
            💵 Detail Pemasukan
          </a>
          <a
            href="#pengeluaran"
            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold rounded-lg whitespace-nowrap transition border border-rose-200"
          >
            ⛽ Biaya Operasional
          </a>
          <a
            href="#tunggakan"
            className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-lg whitespace-nowrap transition border border-amber-200"
          >
            ⏳ Tunggakan Warga
          </a>
          <a
            href="#riwayat"
            className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 font-bold rounded-lg whitespace-nowrap transition border border-sky-200"
          >
            📋 Log Uang Masuk
          </a>
          <a
            href="#operasional"
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg whitespace-nowrap transition"
          >
            🌱 Ritase &amp; Sampah
          </a>
        </div>
      </div>

      {/* Peringatan jika belum ada input pengeluaran */}
      {data.totalPengeluaran === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 flex items-start gap-3 shadow-sm">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="font-bold text-sm text-amber-950">Catatan Pengeluaran Operasional Masih Kosong</p>
            <p className="text-amber-800 mt-0.5 leading-relaxed">
              Pengeluaran bulan ini tercatat <b>Rp 0</b>. Angka sisa kas bersih belum memperhitungkan biaya operasional riil (BBM armada truk, upah petugas, dan servis). Silakan catat nota pengeluaran di menu{" "}
              <Link href="/pengeluaran" className="underline font-bold text-amber-950 hover:text-emerald-800">
                Pengeluaran Operasional &rarr;
              </Link>
            </p>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* SECTION 1: RINGKASAN KAS UTAMA (#ringkasan)                           */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      <section id="ringkasan" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <span>📊</span> 1. Ringkasan Kinerja Kas Vital
          </h2>
          <span className="text-xs text-slate-500 font-medium">Bulan {NAMA_BULAN[bulan - 1]} {tahun}</span>
        </div>

        {/* 4 Kartu KPI Utama */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Target Tagihan */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-slate-500">Target Kewajiban Iuran</p>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                Tagihan Terbit
              </span>
            </div>
            <p className="text-2xl font-black text-slate-900 tracking-tight">
              {formatRupiah(data.totalTagihan)}
            </p>
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Total Rumah Diterbitkan Tagihan:</span>
              <span className="font-bold text-slate-800">
                {data.kpi.tagihanLunasCount + data.kpi.tagihanBelumLunasCount} KK
              </span>
            </div>
          </div>

          {/* Uang Masuk Nyata */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-slate-500">Total Uang Masuk Nyata</p>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-50 text-sky-800 font-bold border border-sky-200">
                Kas Diterima
              </span>
            </div>
            <p className="text-2xl font-black text-sky-700 tracking-tight">
              {formatRupiah(data.totalPemasukan)}
            </p>
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Total Transaksi Terverifikasi:</span>
              <span className="font-bold text-slate-800">{data.riwayatPembayaranBulanIni.length} Transaksi</span>
            </div>
          </div>

          {/* Pengeluaran */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-slate-500">Biaya Operasional Keluar</p>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 font-bold border border-rose-200">
                Beban Nyata
              </span>
            </div>
            <p className="text-2xl font-black text-rose-600 tracking-tight">
              {formatRupiah(data.totalPengeluaran)}
            </p>
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>BBM, Upah Petugas &amp; Servis:</span>
              <span className="font-bold text-slate-800">{data.pengeluaranByKategori.length} Kategori Beban</span>
            </div>
          </div>

          {/* Saldo Bersih */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-slate-500">Sisa Kas Bersih (Surplus)</p>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                  data.saldo >= 0 ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-rose-50 text-rose-800 border-rose-200"
                }`}
              >
                {data.saldo >= 0 ? "Kas Surplus" : "Defisit"}
              </span>
            </div>
            <p className={`text-2xl font-black tracking-tight ${data.saldo >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
              {formatRupiah(data.saldo)}
            </p>
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Status Likuiditas:</span>
              <span className="font-bold text-slate-800">
                {data.saldo >= 0 ? "Kas Sehat & Aman" : "Perlu Penagihan"}
              </span>
            </div>
          </div>
        </div>

        {/* 3 Progress & Indikator Kesehatan Penagihan */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-slate-800">Persentase Iuran Tertagih</span>
                <span className="text-xs font-extrabold text-emerald-700">
                  {data.kpi.grossCollectionRate.toFixed(1)}%
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mb-2">
                Persentase tagihan bulan {NAMA_BULAN_SINGKAT[bulan - 1]} yang sudah lunas.
              </p>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    data.kpi.grossCollectionRate >= 80 ? "bg-emerald-600" : data.kpi.grossCollectionRate >= 60 ? "bg-amber-500" : "bg-rose-600"
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, data.kpi.grossCollectionRate))}%` }}
                />
              </div>
            </div>
            <div className="pt-2 mt-2 border-t border-slate-100 flex justify-between text-[11px]">
              <span className="text-slate-500">Lunas: {data.kpi.tagihanLunasCount} KK</span>
              <span className="text-rose-600 font-bold">Belum Lunas: {data.kpi.tagihanBelumLunasCount} KK</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-slate-800">Rata-rata Iuran per Rumah (KK)</span>
                <span className="text-xs font-extrabold text-slate-900">
                  {formatRupiah(Math.round(data.unitEconomics.arpu))}/KK
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mb-2">
                Nilai rata-rata kontribusi bulanan tiap pelanggan aktif.
              </p>
            </div>
            <div className="pt-2 mt-2 border-t border-slate-100 flex justify-between text-[11px]">
              <span className="text-slate-500">Pelanggan Aktif:</span>
              <span className="font-bold text-slate-800">{data.totalPelanggan} Rumah / KK</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-slate-800">Kecepatan Bayar Warga</span>
                <span className="text-xs font-extrabold text-sky-700">
                  {data.kpi.dsoHari} Hari
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mb-2">
                Rata-rata waktu yang dibutuhkan warga untuk menyelesaikan iuran.
              </p>
            </div>
            <div className="pt-2 mt-2 border-t border-slate-100 flex justify-between text-[11px]">
              <span className="text-slate-500">Kepatuhan Warga:</span>
              <span className="font-bold text-emerald-700">
                {data.kpi.dsoHari <= 15 ? "Sangat Disiplin" : data.kpi.dsoHari <= 30 ? "Normal" : "Perlu Reminder WA"}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* SECTION 2: DETAIL PEMASUKAN BULANAN (#pemasukan)                      */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      <section id="pemasukan" className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span>💵</span> 2. Rincian Lengkap Pemasukan Bulan Ini
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Transparansi uang masuk berdasarkan jalur penerimaan (tempat uang disimpan), asal periode tagihan, dan kontribusi kelurahan.
            </p>
          </div>
          <span className="px-3 py-1 bg-emerald-100 text-emerald-900 font-extrabold text-xs rounded-full">
            Total Kas Masuk: {formatRupiah(data.totalPemasukan)}
          </span>
        </div>

        {/* 3 KOTAK DETAIL PEMASUKAN */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* KOTAK A: JALUR PEMBAYARAN / TEMPAT UANG */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <h3 className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                  <span>🏦</span> Berdasarkan Jalur Bayar
                </h3>
                <span className="text-[10px] text-slate-400 font-mono">Tempat Fisik Uang</span>
              </div>

              <div className="space-y-3">
                {data.detailPemasukanByMetode.map((m) => {
                  let icon = "📱";
                  let label = "QRIS / Gateway Duitku";
                  let note = "Masuk Rekening Penampung Otomatis";
                  let badgeCls = "bg-purple-50 text-purple-800 border-purple-200";

                  if (m.metode === "tunai") {
                    icon = "💵";
                    label = "Uang Kas Tunai Fisik";
                    note = "Dipegang Kasir / Petugas (Wajib Setor)";
                    badgeCls = "bg-amber-50 text-amber-900 border-amber-200 font-bold";
                  } else if (m.metode === "transfer") {
                    icon = "🏦";
                    label = "Transfer Bank Manual";
                    note = "Rekening Operasional Bank";
                    badgeCls = "bg-blue-50 text-blue-900 border-blue-200";
                  } else if (m.metode === "virtual_account") {
                    icon = "💳";
                    label = "Virtual Account";
                    note = "Otomatis Verifikasi Bank";
                    badgeCls = "bg-indigo-50 text-indigo-900 border-indigo-200";
                  }

                  return (
                    <div key={m.metode} className="p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{icon}</span>
                          <div>
                            <span className="font-extrabold text-slate-900 text-xs block">{label}</span>
                            <span className="text-[10px] text-slate-500 font-medium block">{note}</span>
                          </div>
                        </div>
                        <span className="font-black text-emerald-700 text-sm tabular-nums">
                          {formatRupiah(m.jumlah)}
                        </span>
                      </div>
                      <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                        <span className={`px-2 py-0.5 rounded border ${badgeCls}`}>{m.count} Transaksi</span>
                        <span className="font-mono font-bold text-slate-600">{m.persen.toFixed(1)}% dari total kas</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between font-bold text-xs text-slate-800">
              <span>Total Uang Nyata Masuk:</span>
              <span className="text-emerald-700 text-sm font-black">{formatRupiah(data.totalPemasukan)}</span>
            </div>
          </div>

          {/* KOTAK B: SUMBER ASAL PERIODE TAGIHAN */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <h3 className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                  <span>📅</span> Berdasarkan Asal Periode Tagihan
                </h3>
                <span className="text-[10px] text-slate-400 font-mono">Disiplin Warga</span>
              </div>

              <div className="space-y-3">
                {/* 1. Tepat Waktu */}
                <div className="p-3 rounded-xl border border-emerald-100 bg-emerald-50/40">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-extrabold text-emerald-950 text-xs block">
                        Iuran Bulan Berjalan ({NAMA_BULAN_SINGKAT[bulan - 1]})
                      </span>
                      <span className="text-[10px] text-emerald-700 font-medium">Warga bayar tepat waktu bulan ini</span>
                    </div>
                    <span className="font-black text-emerald-800 text-sm tabular-nums">
                      {formatRupiah(data.sumberPemasukan.tepatWaktu.total)}
                    </span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-emerald-200/60 flex items-center justify-between text-[10px] text-emerald-900 font-bold">
                    <span>Porsi Penerimaan:</span>
                    <span className="font-mono">{data.sumberPemasukan.tepatWaktu.persen.toFixed(1)}%</span>
                  </div>
                </div>

                {/* 2. Pelunasan Tunggakan Lalu */}
                <div className="p-3 rounded-xl border border-amber-100 bg-amber-50/40">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-extrabold text-amber-950 text-xs block">
                        Pelunasan Tunggakan Lama
                      </span>
                      <span className="text-[10px] text-amber-700 font-medium">Hasil penagihan utang bulan-bulan lalu</span>
                    </div>
                    <span className="font-black text-amber-800 text-sm tabular-nums">
                      {formatRupiah(data.sumberPemasukan.tunggakanLalu.total)}
                    </span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-amber-200/60 flex items-center justify-between text-[10px] text-amber-900 font-bold">
                    <span>Porsi Penerimaan:</span>
                    <span className="font-mono">{data.sumberPemasukan.tunggakanLalu.persen.toFixed(1)}%</span>
                  </div>
                </div>

                {/* 3. Bayar di Muka */}
                <div className="p-3 rounded-xl border border-sky-100 bg-sky-50/40">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-extrabold text-sky-950 text-xs block">
                        Bayar di Muka (Prepaid)
                      </span>
                      <span className="text-[10px] text-sky-700 font-medium">Titipan iuran warga untuk bulan depan</span>
                    </div>
                    <span className="font-black text-sky-800 text-sm tabular-nums">
                      {formatRupiah(data.sumberPemasukan.bayarDiMuka.total)}
                    </span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-sky-200/60 flex items-center justify-between text-[10px] text-sky-900 font-bold">
                    <span>Porsi Penerimaan:</span>
                    <span className="font-mono">{data.sumberPemasukan.bayarDiMuka.persen.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 mt-4 pt-2 border-t border-slate-100 leading-relaxed">
              💡 <b>Catatan Kas:</b> Pelunasan tunggakan lama membantu menambah uang kas riil bulan ini, sementara pembayaran di muka menjadi cadangan kas untuk bulan depan.
            </p>
          </div>

          {/* KOTAK C: KONTRIBUSI SETORAN PER KELURAHAN */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <h3 className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                  <span>📍</span> Kontribusi per Kelurahan
                </h3>
                <span className="text-[10px] text-slate-400 font-mono">Peringkat Wilayah</span>
              </div>

              {data.pemasukanByKelurahan.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">Belum ada transaksi di bulan ini</div>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {data.pemasukanByKelurahan.map((kel, i) => {
                    const persen = data.totalPemasukan > 0 ? (kel.total / data.totalPemasukan) * 100 : 0;
                    return (
                      <div key={kel.nama} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-900">
                            #{i + 1} {kel.nama}
                          </span>
                          <span className="font-black text-emerald-700 tabular-nums">
                            {formatRupiah(kel.total)}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-600 h-full rounded-full transition-all"
                            style={{ width: `${Math.min(100, Math.max(5, persen))}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>{kel.count} Rumah Bayar</span>
                          <span>{persen.toFixed(1)}% dari total</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
              <span>Total Wilayah Aktif:</span>
              <span className="font-bold text-slate-800">{data.pemasukanByKelurahan.length} Kelurahan</span>
            </div>
          </div>
        </div>

        {/* ALUR ALASAN SELISIH KAS MASUK vs TARGET TAGIHAN (SEDERHANA) */}
        <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-lg space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-emerald-400 font-bold text-sm">
            <span>[+] Total Uang Kas Nyata Masuk ke Dompet/Rekening</span>
            <span className="text-base font-black">{formatRupiah(data.totalPemasukan)}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] text-slate-300">
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span>&bull; Dari Tagihan Bulan Ini (Tepat Waktu):</span>
                <span className="text-white font-bold">{formatRupiah(data.sumberPemasukan.tepatWaktu.total)}</span>
              </div>
              <div className="flex justify-between">
                <span>&bull; Dari Pelunasan Tunggakan Lama:</span>
                <span className="text-white font-bold">{formatRupiah(data.sumberPemasukan.tunggakanLalu.total)}</span>
              </div>
              <div className="flex justify-between">
                <span>&bull; Titipan Bayar di Muka (Bulan Depan):</span>
                <span className="text-white font-bold">{formatRupiah(data.sumberPemasukan.bayarDiMuka.total)}</span>
              </div>
            </div>

            <div className="space-y-1.5 border-t md:border-t-0 md:border-l border-slate-800 pt-2 md:pt-0 md:pl-4">
              <div className="flex justify-between">
                <span>&bull; Target Total Tagihan Terbit:</span>
                <span className="text-white font-bold">{formatRupiah(data.totalTagihan)}</span>
              </div>
              <div className="flex justify-between text-rose-400">
                <span>&bull; Sisa Tagihan Bulan Ini Belum Lunas:</span>
                <span className="font-bold">- {formatRupiah(data.tagihanSisa)}</span>
              </div>
              <div className="flex justify-between text-emerald-300">
                <span>&bull; Tagihan Bulan Ini yg Sudah Lunas:</span>
                <span className="font-bold">{formatRupiah(data.tagihanTerkumpul)}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* SECTION 3: BIAYA & PENGELUARAN OPERASIONAL (#pengeluaran)             */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      <section id="pengeluaran" className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span>⛽</span> 3. Realisasi Biaya &amp; Pengeluaran Operasional
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Alokasi biaya riil armada truk sampah, gaji kru, BBM, dan pemeliharaan lapangan.
            </p>
          </div>
          <Link
            href="/pengeluaran"
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition"
          >
            + Catat Pengeluaran Baru &rarr;
          </Link>
        </div>

        {data.pengeluaranByKategori.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center text-slate-400 text-xs">
            Belum ada nota pengeluaran kas yang diinput pada periode ini.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.pengeluaranByKategori.map((k) => (
              <div key={k.kategori} className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  {labelKategoriPengeluaran(k.kategori)}
                </span>
                <p className="text-xl font-black text-rose-600 tracking-tight">
                  {formatRupiah(k._sum.jumlah || 0)}
                </p>
                <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between text-[10px] text-slate-500 font-medium">
                  <span>Porsi dari Total Beban:</span>
                  <span className="font-bold text-slate-700">
                    {data.totalPengeluaran > 0 ? (((k._sum.jumlah || 0) / data.totalPengeluaran) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* SECTION 4: TUNGGAKAN WARGA YANG BELUM BAYAR (#tunggakan)              */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      <section id="tunggakan" className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span>⏳</span> 4. Daftar Tunggakan Warga yang Belum Bayar
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Daftar seluruh rumah tangga dengan tagihan tertunggak untuk prioritas penagihan tim lapangan.
            </p>
          </div>
          <Link
            href="/tagihan?status=tunggakan"
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
          >
            Buka Menu Tagihan &rarr;
          </Link>
        </div>

        {/* 3 Kartu Ringkasan Umur Tunggakan */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Total Seluruh Tunggakan Warga
            </span>
            <p className="text-2xl font-black text-slate-900 tracking-tight">
              {formatRupiah(data.agingSchedule.totalPiutangGross)}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {data.agingSchedule.totalDebiturUnik} Rumah Tangga / KK menunggak
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-rose-200/80 p-5 shadow-sm bg-rose-50/20">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block mb-1">
              Cadangan Risiko Macet
            </span>
            <p className="text-2xl font-black text-rose-600 tracking-tight">
              - {formatRupiah(data.agingSchedule.totalNilaiCkpn)}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Estimasi nilai yang berisiko sulit tertagih
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
              Target uang yang realistis dicairkan ke kas
            </p>
          </div>
        </div>

        {/* Tabel Ringkas Debitur Menunggak */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-extrabold text-slate-900 text-sm">
              Daftar Rumah Tangga Menunggak ({data.tagihanMenunggak.length} Tagihan)
            </h3>
            <span className="text-xs text-slate-400 font-mono">Prioritas Petugas Lapangan</span>
          </div>

          {data.tagihanMenunggak.length === 0 ? (
            <p className="text-sm text-slate-400 font-medium py-8 text-center">
              🎉 Hebat! Tidak ada tagihan tertunggak pada saat ini.
            </p>
          ) : (
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto border border-slate-100 rounded-xl">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                  <tr className="text-slate-600 font-bold uppercase text-[10px]">
                    <th className="text-left px-3 py-2.5">No</th>
                    <th className="text-left px-3 py-2.5">Warga / Pelanggan</th>
                    <th className="text-left px-3 py-2.5">Kelurahan</th>
                    <th className="text-left px-3 py-2.5">No. Telepon / WA</th>
                    <th className="text-left px-3 py-2.5">Bulan Menunggak</th>
                    <th className="text-right px-3 py-2.5">Nominal Tagihan</th>
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
                      <td className="px-3 py-2 text-slate-600">{t.pelanggan.kelurahan?.nama || "-"}</td>
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
      </section>

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* SECTION 5: LOG SELURUH TRANSAKSI MASUK (#riwayat)                    */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      <section id="riwayat" className="space-y-4">
        <TabelRiwayatPemasukan
          data={data.riwayatPembayaranBulanIni as any}
          bulanIni={bulan}
          tahunIni={tahun}
        />
      </section>

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* SECTION 6: OPERASIONAL LOGISTIK & SAMPAH (#operasional)              */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      <section id="operasional" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <span>🌱</span> 5. Operasional TPS &amp; Ritase Sampah
          </h2>
          <span className="text-xs text-slate-500 font-medium">Bulan {NAMA_BULAN[bulan - 1]} {tahun}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Total Tonase Sampah
            </span>
            <p className="text-xl font-black text-slate-900">
              {(data.totalBerat / 1000).toFixed(2)} Ton
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Setara {data.totalBerat.toLocaleString()} kg</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Volume Sampah Diangkut
            </span>
            <p className="text-xl font-black text-slate-900">
              {data.totalVolume.toFixed(1)} m&sup3;
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Total kubikasi sampah terkelola</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Total Ritase Truk
            </span>
            <p className="text-xl font-black text-slate-900">
              {data.totalPengangkutan} Kali Rit
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Trip pengangkutan ke TPA / TPS</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Biaya Angkut per KK
            </span>
            <p className="text-xl font-black text-slate-900">
              {formatRupiah(Math.round(data.unitEconomics.costToServePerUser))}/KK
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Cost-to-serve tiap rumah tangga</p>
          </div>
        </div>
      </section>
    </div>
  );
}
