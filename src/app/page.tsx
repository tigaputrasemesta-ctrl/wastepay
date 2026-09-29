import type { Metadata } from "next";
import Link from "next/link";
import {
  Truck,
  MapPin,
  ArrowRight,
  Megaphone,
  Navigation,
  ShieldCheck,
  QrCode,
  Calendar,
  Clock,
  PhoneCall,
  Building2,
  Home,
  Users,
  Recycle,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  FileCheck2,
  Layers,
  Sparkles,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

import JsonLd from "@/components/JsonLd";
import PublicNavbar from "@/components/PublicNavbar";
import CivicHeroWidget from "@/components/CivicHeroWidget";
import { generateLocalBusinessJsonLd } from "@/lib/seo";
import { DEFAULT_ARTIKEL } from "@/lib/default-articles";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "UPS HERU - Jasa Angkut Sampah & Retribusi Digital Kota Depok",
  description:
    "Solusi pengelolaan sampah terpadu Kota Depok oleh UPS HERU (TPS 3R Kalibaru). Penjemputan terjadwal ke rumah warga, pelacakan armada live GPS, transparansi tarif retribusi, dan pembayaran digital via QRIS.",
  alternates: {
    canonical: "/",
  },
};

export default async function LandingPage() {
  let artikelTop3: Array<{
    id: number;
    slug: string;
    judul: string;
    isi: string;
    kategori: string;
    gambar: string | null;
    createdAt: Date;
  }> = [];

  try {
    artikelTop3 = await prisma.artikel.findMany({
      where: { diterbitkan: true },
      orderBy: { createdAt: "desc" },
      take: 3,
    });
  } catch {
    // ignore
  }

  const displayedArticles = artikelTop3.length > 0 ? artikelTop3 : DEFAULT_ARTIKEL;

  type PengumumanRingkas = {
    id: number;
    judul: string;
    isi: string;
    penting: boolean;
    createdAt: Date;
  };
  let pengumuman: PengumumanRingkas[] = [];
  try {
    pengumuman = await prisma.pengumuman.findMany({
      where: { untukWilayahId: null },
      orderBy: [{ penting: "desc" }, { createdAt: "desc" }],
      take: 3,
    });
  } catch {
    // ignore
  }

  return (
    <div className="min-h-screen bg-[#f8fafb] text-slate-900 font-sans selection:bg-[#0d7a75] selection:text-white">
      <JsonLd data={generateLocalBusinessJsonLd()} />

      {/* ── 1. Top Civic Status Bar ── */}
      <section
        aria-label="Status Operasional Dinas"
        className="bg-[#0c3d3a] text-white text-xs py-2 px-4 border-b border-[#124b47]"
      >
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#1b5e59] text-emerald-300 font-semibold text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Operasional Normal
            </span>
            <span className="text-slate-200 hidden sm:inline text-[11px]">
              Armada aktif di Kec. Cilodong, Kel. Kalibaru, Jatimulya, Sukamaju & sekitarnya
            </span>
          </div>
          <div className="flex items-center gap-4 text-slate-300 text-[11px]">
            <span className="hidden md:inline">Loket TPS 3R: 07.00 – 17.00 WIB</span>
            <a
              href="https://wa.me/6281400782617"
              target="_blank"
              rel="noreferrer"
              className="text-emerald-300 font-bold hover:underline inline-flex items-center gap-1"
            >
              <PhoneCall className="w-3 h-3" />
              <span>Hotline CS: 0814-0078-2617</span>
            </a>
          </div>
        </div>
      </section>

      {/* ── 2. Primary Public Navbar ── */}
      <PublicNavbar />

      <main>
        {/* ── 3. Hero Section (Editorial + Dashboard Console ala BeCycle) ── */}
        <section className="bg-white border-b border-slate-200 py-12 md:py-20 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto grid md:grid-cols-12 gap-10 lg:gap-14 items-center">
            {/* Left Column: Editorial Value Proposition (7 cols) */}
            <div className="md:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#e8f5f4] border border-[#d1ecea] text-[#0d7a75] text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-[#0d7a75]" />
                <span>Pengelolaan Sampah Terpadu • Kota Depok 2026</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.18]">
                Solusi Pengelolaan Sampah yang{" "}
                <span className="text-[#0d7a75]">Memudahkan Warga</span> & Menjaga Lingkungan.
              </h1>

              <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal max-w-xl">
                Platform operasional resmi UPS HERU (TPS 3R Kalibaru Kota Depok). Kami menghubungkan ribuan rumah tangga dan unit usaha di Depok dengan kepastian jadwal angkut, pelacakan armada live GPS, dan kemudahan pembayaran retribusi digital via QRIS.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link
                  href="/daftar"
                  className="px-6 py-3.5 bg-[#0d7a75] hover:bg-[#0b6460] text-white rounded-xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  <Home className="w-4 h-4" />
                  <span>Daftar Langganan Baru</span>
                </Link>

                <Link
                  href="/lacak"
                  className="px-6 py-3.5 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 text-slate-800 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-xs active:scale-95"
                >
                  <Navigation className="w-4 h-4 text-[#0d7a75]" />
                  <span>Lacak Truk di Peta</span>
                </Link>
              </div>

              {/* Metadata strip (Inspired by BeCycle specs row) */}
              <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500 font-medium">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Fasilitas</span>
                  <span className="text-slate-800 font-semibold">UPS HERU Kalibaru</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Wilayah</span>
                  <span className="text-slate-800 font-semibold">Cilodong, Depok</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Kapasitas</span>
                  <span className="text-slate-800 font-semibold">15+ Ton / hari</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Metode</span>
                  <span className="text-slate-800 font-semibold">Kompos & Daur Ulang</span>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Console (5 cols) */}
            <div className="md:col-span-5">
              <CivicHeroWidget />
            </div>
          </div>
        </section>

        {/* ── 4. Problem & Tantangan (Dark Forest Teal Container ala BeCycle img2) ── */}
        <section className="py-16 md:py-20 px-4 sm:px-6 bg-[#0c3d3a] text-white">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="max-w-3xl space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 block">
                Problem & Tantangan
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight">
                Mengapa Pengelolaan Sampah Tradisional Perlu Diubah?
              </h2>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
                Setiap hari ratusan ton sampah domestik bercampur tanpa pemilahan, membebani kapasitas TPA Cipayung dan menyulitkan warga akibat jadwal angkut manual yang sering tidak menentu.
              </p>
            </div>

            {/* 4 Numbered Problem Cards (01, 02, 03, 04) */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="p-6 rounded-2xl bg-[#124b47] border border-[#1b5e59] flex flex-col justify-between space-y-4">
                <span className="text-xl font-mono font-bold text-emerald-400">01</span>
                <div className="space-y-2">
                  <h3 className="text-base font-bold text-white">Jadwal Tidak Menentu</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Warga sering menunggu berhari-hari tanpa kepastian jam kedatangan gerobak atau truk sampah di depan rumah.
                  </p>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-[#124b47] border border-[#1b5e59] flex flex-col justify-between space-y-4">
                <span className="text-xl font-mono font-bold text-emerald-400">02</span>
                <div className="space-y-2">
                  <h3 className="text-base font-bold text-white">Tanpa Pemilahan Sumber</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Sampah organik dan anorganik tercampur di wadah yang sama, menghilangkan potensi daur ulang bernilai ekonomis.
                  </p>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-[#124b47] border border-[#1b5e59] flex flex-col justify-between space-y-4">
                <span className="text-xl font-mono font-bold text-emerald-400">03</span>
                <div className="space-y-2">
                  <h3 className="text-base font-bold text-white">Iuran Tunai Rumit</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Penarikan iuran manual door-to-door sering terkendala uang pas, kembalian, atau ketidakhadiran penghuni rumah.
                  </p>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-[#124b47] border border-[#1b5e59] flex flex-col justify-between space-y-4">
                <span className="text-xl font-mono font-bold text-emerald-400">04</span>
                <div className="space-y-2">
                  <h3 className="text-base font-bold text-white">Saluran Aduan Tertutup</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Bila ada sampah tercecer atau timbunan liar di lingkungan, warga tidak memiliki saluran pengaduan langsung yang terdata.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 5. Solution & Core Ecosystem (Clean White Cards ala BeCycle img3) ── */}
        <section className="py-16 md:py-20 px-4 sm:px-6 bg-[#f8fafb] border-b border-slate-200">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="max-w-2xl space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#0d7a75] block">
                  Solusi Terintegrasi
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Pengelolaan Sampah Mandiri & Berkelanjutan
                </h2>
                <p className="text-sm text-slate-600">
                  Ekosistem terpadu yang memadukan operasional armada fisik dengan sistem monitoring digital untuk kenyamanan seluruh warga.
                </p>
              </div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Standar Operasional 2026
              </div>
            </div>

            {/* 4 White Solution Cards (01, 02, 03, 04) */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs hover:border-[#0d7a75]/40 hover:shadow-md transition-all flex flex-col justify-between space-y-4">
                <span className="text-2xl font-mono font-extrabold text-[#0d7a75]">01</span>
                <div className="space-y-2">
                  <h3 className="text-base font-bold text-slate-900">Jadwal Pasti & Pelacakan Live</h3>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    Penjemputan rutin 2–3x seminggu di depan pagar rumah. Pantau pergerakan truk langsung di peta untuk estimasi kedatangan.
                  </p>
                </div>
                <Link href="/lacak" className="text-xs font-bold text-[#0d7a75] hover:underline inline-flex items-center gap-1">
                  <span>Lihat Peta Armada</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs hover:border-[#0d7a75]/40 hover:shadow-md transition-all flex flex-col justify-between space-y-4">
                <span className="text-2xl font-mono font-extrabold text-[#0d7a75]">02</span>
                <div className="space-y-2">
                  <h3 className="text-base font-bold text-slate-900">Fasilitas UPS HERU Mandiri</h3>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    Sampah organik diolah menjadi kompos & budidaya maggot BSF di fasilitas UPS HERU Kalibaru, sedangkan anorganik didaur ulang sirkular.
                  </p>
                </div>
                <span className="text-[11px] font-semibold text-emerald-800">82% Sampah Tereduksi</span>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs hover:border-[#0d7a75]/40 hover:shadow-md transition-all flex flex-col justify-between space-y-4">
                <span className="text-2xl font-mono font-extrabold text-[#0d7a75]">03</span>
                <div className="space-y-2">
                  <h3 className="text-base font-bold text-slate-900">Penagihan WhatsApp & QRIS</h3>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    Notifikasi tagihan masuk berkala ke WhatsApp. Pembayaran selesai dalam hitungan detik via scan QRIS tanpa uang kembalian.
                  </p>
                </div>
                <Link href="/bayar" className="text-xs font-bold text-[#0d7a75] hover:underline inline-flex items-center gap-1">
                  <span>Cek Tagihan Warga</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs hover:border-[#0d7a75]/40 hover:shadow-md transition-all flex flex-col justify-between space-y-4">
                <span className="text-2xl font-mono font-extrabold text-[#0d7a75]">04</span>
                <div className="space-y-2">
                  <h3 className="text-base font-bold text-slate-900">Pengaduan Foto Geotagging</h3>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    Sampah terlewat atau ada timbunan liar? Foto lewat HP, koordinat GPS otomatis tersimpan dan unit lapangan segera bergerak.
                  </p>
                </div>
                <Link href="/pengaduan" className="text-xs font-bold text-[#0d7a75] hover:underline inline-flex items-center gap-1">
                  <span>Buat Laporan Warga</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── 6. Interactive Dashboard & Recovery Breakdown (Inspired by BeCycle img4/img5) ── */}
        <section className="py-16 md:py-20 px-4 sm:px-6 bg-white border-b border-slate-200">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="max-w-2xl space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0d7a75] block">
                Transparansi Pengolahan
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Metrik Kinerja & Distribusi Daur Ulang UPS HERU
              </h2>
              <p className="text-sm text-slate-600">
                Data kinerja harian fasilitas pengolahan sampah UPS HERU Kalibaru untuk mendukung kebersihan Kota Depok.
              </p>
            </div>

            <div className="grid lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Visual Donut Gauges (5 cols) */}
              <div className="lg:col-span-5 bg-[#f8fafb] border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">Tingkat Pengolahan Mandiri</h3>
                    <p className="text-xs text-slate-500">Rata-rata pemulihan material fasilitas UPS HERU</p>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-[#e6f5f4] text-[#0d7a75]">
                    Aktif
                  </span>
                </div>

                {/* Circular Gauge Representation */}
                <div className="flex flex-col items-center justify-center py-2">
                  <div className="relative w-44 h-44 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      {/* Background track */}
                      <circle cx="50" cy="50" r="40" fill="transparent" stroke="#e2e8f0" strokeWidth="10" />
                      {/* Organic track (62%) */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="transparent"
                        stroke="#0d7a75"
                        strokeWidth="10"
                        strokeDasharray="251.2"
                        strokeDashoffset="95.4"
                        strokeLinecap="round"
                      />
                      {/* Inorganic track (23%) */}
                      <circle
                        cx="50"
                        cy="50"
                        r="30"
                        fill="transparent"
                        stroke="#22577a"
                        strokeWidth="8"
                        strokeDasharray="188.5"
                        strokeDashoffset="145.1"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-3xl font-extrabold text-slate-900 tracking-tight">85%</span>
                      <span className="text-[11px] font-bold text-[#0d7a75] uppercase tracking-wider">Tereduksi</span>
                    </div>
                  </div>
                </div>

                {/* Progress bars list (ala BeCycle img5) */}
                <div className="space-y-3 pt-2 text-xs">
                  <div>
                    <div className="flex justify-between font-semibold text-slate-700 mb-1">
                      <span>Sampah Organik (Kompos & Maggot BSF)</span>
                      <span className="text-[#0d7a75] font-bold">62%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div className="h-full rounded-full bg-[#0d7a75]" style={{ width: "62%" }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between font-semibold text-slate-700 mb-1">
                      <span>Daur Ulang Anorganik (Plastik, Kertas, Logam)</span>
                      <span className="text-[#22577a] font-bold">23%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div className="h-full rounded-full bg-[#22577a]" style={{ width: "23%" }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between font-semibold text-slate-700 mb-1">
                      <span>Residu Terangkut ke TPA Cipayung</span>
                      <span className="text-slate-500 font-bold">15%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div className="h-full rounded-full bg-slate-400" style={{ width: "15%" }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Key Operational Statistics (7 cols) */}
              <div className="lg:col-span-7 space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="p-5 rounded-2xl bg-[#f8fafb] border border-slate-200/90 space-y-2">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#0d7a75] flex items-center justify-center font-bold text-xs">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <span className="text-2xl font-extrabold text-slate-900 block">15.4 Ton</span>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Kapasitas harian sampah domestik yang diolah di fasilitas TPS 3R Kalibaru per hari kerja.
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-[#f8fafb] border border-slate-200/90 space-y-2">
                    <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center font-bold text-xs">
                      <Users className="w-4 h-4" />
                    </div>
                    <span className="text-2xl font-extrabold text-slate-900 block">2.450+ KK</span>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Kepala keluarga & unit usaha terdaftar di wilayah Cilodong, Kalibaru, Jatimulya, Sukamaju & sekitarnya.
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-[#f8fafb] border border-slate-200/90 space-y-2">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-xs">
                      <Truck className="w-4 h-4" />
                    </div>
                    <span className="text-2xl font-extrabold text-slate-900 block">6 Unit</span>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Armada truk pickup & motor roda tiga pengangkut kebersihan aktif melayani rute pagi dan siang.
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-[#f8fafb] border border-slate-200/90 space-y-2">
                    <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#0d7a75] flex items-center justify-center font-bold text-xs">
                      <FileCheck2 className="w-4 h-4" />
                    </div>
                    <span className="text-2xl font-extrabold text-slate-900 block">100% Legal</span>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Dikelola resmi oleh UPS HERU dengan perizinan operasional pengelolaan sampah di Kota Depok.
                    </p>
                  </div>
                </div>

                {/* Callout box */}
                <div className="p-5 rounded-2xl border border-slate-200 bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Ingin melihat rincian tarif retribusi resmi?</h4>
                    <p className="text-xs text-slate-500">Transparansi iuran untuk rumah tinggal, warung, toko, dan ruko.</p>
                  </div>
                  <Link
                    href="/tarif"
                    className="px-4 py-2.5 bg-[#0d7a75] hover:bg-[#0b6460] text-white text-xs font-bold rounded-xl transition-all shadow-xs shrink-0"
                  >
                    Buka Daftar Tarif
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 7. Paket & Kategori Layanan (Inspired by BeCycle Waste Registry) ── */}
        <section className="py-16 md:py-20 px-4 sm:px-6 bg-[#f8fafb] border-b border-slate-200">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0d7a75]">
                Pilihan Retribusi
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
                Paket Layanan Sesuai Kebutuhan Anda
              </h2>
              <p className="text-sm text-slate-600">
                Pilih skema penjemputan sampah yang paling tepat untuk rumah tinggal perorangan, tempat usaha komersial, maupun kerjasama lingkungan RT/RW.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 items-stretch">
              {/* Tier 1: Warga Rumah Tangga */}
              <div className="bg-white border-2 border-[#0d7a75] rounded-2xl p-6 sm:p-8 flex flex-col justify-between shadow-sm relative">
                <div className="absolute -top-3 left-6 bg-[#0d7a75] text-white text-[10px] font-extrabold uppercase px-3 py-0.5 rounded-full tracking-wider">
                  Paling Banyak Dipilih
                </div>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900">Rumah Tangga / Warga</h3>
                    <p className="text-xs text-slate-500 mt-1">Untuk pemukiman warga perorangan & komplek cluster</p>
                  </div>
                  <div className="py-2.5 border-y border-slate-100">
                    <span className="text-xs text-slate-400 font-medium">Mulai dari</span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-3xl font-extrabold text-slate-900">Rp 50.000</span>
                      <span className="text-xs text-slate-500">/ bulan</span>
                    </div>
                  </div>
                  <ul className="space-y-2.5 text-xs text-slate-600 font-medium">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#0d7a75] shrink-0 mt-0.5" />
                      <span>Penjemputan rutin 2–3 kali seminggu</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#0d7a75] shrink-0 mt-0.5" />
                      <span>Diambil langsung di depan pagar rumah</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#0d7a75] shrink-0 mt-0.5" />
                      <span>Notifikasi tagihan WhatsApp & kwitansi</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#0d7a75] shrink-0 mt-0.5" />
                      <span>Akses penuh pelacakan truk di peta live</span>
                    </li>
                  </ul>
                </div>
                <div className="pt-6">
                  <Link
                    href="/daftar?kategori=R1"
                    className="w-full py-3 bg-[#0d7a75] hover:bg-[#0b6460] text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <span>Daftar Rumah Tangga</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Tier 2: Niaga & Toko */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 flex flex-col justify-between shadow-xs">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900">Niaga, Ruko & Usaha</h3>
                    <p className="text-xs text-slate-500 mt-1">Untuk toko retail, warung makan, kafe, kantor & UMKM</p>
                  </div>
                  <div className="py-2.5 border-y border-slate-100">
                    <span className="text-xs text-slate-400 font-medium">Mulai dari</span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-3xl font-extrabold text-slate-900">Rp 100.000</span>
                      <span className="text-xs text-slate-500">/ bulan</span>
                    </div>
                  </div>
                  <ul className="space-y-2.5 text-xs text-slate-600 font-medium">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#0d7a75] shrink-0 mt-0.5" />
                      <span>Kapasitas penjemputan volume komersial</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#0d7a75] shrink-0 mt-0.5" />
                      <span>Frekuensi harian atau sesuai jadwal usaha</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#0d7a75] shrink-0 mt-0.5" />
                      <span>Invoice resmi untuk pembukuan operasional</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#0d7a75] shrink-0 mt-0.5" />
                      <span>Bukti pengelolaan sampah legal & teratur</span>
                    </li>
                  </ul>
                </div>
                <div className="pt-6">
                  <Link
                    href="/daftar?kategori=B1"
                    className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <span>Daftar Unit Usaha</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Tier 3: RT/RW & Kolektif */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 flex flex-col justify-between shadow-xs">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900">Kerjasama Pengurus RT/RW</h3>
                    <p className="text-xs text-slate-500 mt-1">Skema kolektif perumahan, paguyuban & komplek</p>
                  </div>
                  <div className="py-2.5 border-y border-slate-100">
                    <span className="text-xs text-slate-400 font-medium">Skema Pembayaran</span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-2xl font-extrabold text-slate-900">Kolektif Lingkungan</span>
                    </div>
                  </div>
                  <ul className="space-y-2.5 text-xs text-slate-600 font-medium">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#0d7a75] shrink-0 mt-0.5" />
                      <span>Tarif hemat per KK untuk seluruh lingkungan</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#0d7a75] shrink-0 mt-0.5" />
                      <span>Laporan rekap pembayaran rutin bagi pengurus RT</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#0d7a75] shrink-0 mt-0.5" />
                      <span>Penetapan rute khusus seluruh jalan komplek</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#0d7a75] shrink-0 mt-0.5" />
                      <span>Dukungan tong komunal bila dibutuhkan</span>
                    </li>
                  </ul>
                </div>
                <div className="pt-6">
                  <a
                    href="https://wa.me/6281400782617?text=Halo%20UPS%20HERU,%20kami%20pengurus%20RT/RW%20ingin%20konsultasi%20kerjasama%20pengangkutan%20lingkungan"
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-bold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <span>Konsultasi Pengurus RT</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 8. Multi-step Onboarding Workflow (Inspired by BeCycle Process) ── */}
        <section className="py-16 md:py-20 px-4 sm:px-6 bg-white border-b border-slate-200">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="max-w-2xl space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0d7a75] block">
                Alur Berlangganan
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Empat Langkah Mudah Menuju Lingkungan Bersih
              </h2>
              <p className="text-sm text-slate-600">
                Proses registrasi cepat dan transparan tanpa birokrasi berbelit.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-6 rounded-2xl border border-slate-200/90 bg-[#f8fafb] space-y-3">
                <span className="w-8 h-8 rounded-lg bg-[#0d7a75] text-white font-extrabold text-sm flex items-center justify-center">
                  1
                </span>
                <h3 className="text-sm font-bold text-slate-900">Pendaftaran Online</h3>
                <p className="text-xs text-slate-600 leading-relaxed font-normal">
                  Isi formulir pendaftaran dengan nama, alamat rumah/usaha, RT/RW, dan nomor WhatsApp aktif Anda.
                </p>
              </div>

              <div className="p-6 rounded-2xl border border-slate-200/90 bg-[#f8fafb] space-y-3">
                <span className="w-8 h-8 rounded-lg bg-[#0d7a75] text-white font-extrabold text-sm flex items-center justify-center">
                  2
                </span>
                <h3 className="text-sm font-bold text-slate-900">Verifikasi & Penentuan Rute</h3>
                <p className="text-xs text-slate-600 leading-relaxed font-normal">
                  Petugas operasional memvalidasi lokasi penjemputan dan menetapkan hari jadwal rute yang melintas.
                </p>
              </div>

              <div className="p-6 rounded-2xl border border-slate-200/90 bg-[#f8fafb] space-y-3">
                <span className="w-8 h-8 rounded-lg bg-[#0d7a75] text-white font-extrabold text-sm flex items-center justify-center">
                  3
                </span>
                <h3 className="text-sm font-bold text-slate-900">Penjemputan Rutin</h3>
                <p className="text-xs text-slate-600 leading-relaxed font-normal">
                  Letakkan wadah sampah di depan pagar pada hari jadwal; armada kami akan mengangkut sampah secara teratur.
                </p>
              </div>

              <div className="p-6 rounded-2xl border border-slate-200/90 bg-[#f8fafb] space-y-3">
                <span className="w-8 h-8 rounded-lg bg-[#0d7a75] text-white font-extrabold text-sm flex items-center justify-center">
                  4
                </span>
                <h3 className="text-sm font-bold text-slate-900">Tagihan WhatsApp & QRIS</h3>
                <p className="text-xs text-slate-600 leading-relaxed font-normal">
                  Terima rincian tagihan via WhatsApp di awal bulan dan selesaikan pembayaran instan via QRIS kapan saja.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── 9. Papan Pengumuman Resmi (Jika Ada) ── */}
        {pengumuman.length > 0 && (
          <section className="bg-amber-50/70 border-b border-amber-200/80 py-12 px-4 sm:px-6">
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-200/80 text-amber-900 rounded-xl">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Pengumuman Resmi Warga</h2>
                  <p className="text-xs text-slate-600">Pemberitahuan terkini seputar operasional dinas pengangkutan</p>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                {pengumuman.map((p) => (
                  <div
                    key={p.id}
                    className={`p-5 rounded-2xl border ${
                      p.penting
                        ? "bg-white border-rose-300 text-slate-900 shadow-xs"
                        : "bg-white border-amber-200 text-slate-900 shadow-xs"
                    }`}
                  >
                    {p.penting && (
                      <span className="inline-block px-2.5 py-0.5 bg-rose-600 text-white text-[10px] font-bold uppercase rounded-md mb-2">
                        Penting
                      </span>
                    )}
                    <h3 className="text-sm font-bold mb-2">{p.judul}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed mb-3">{p.isi}</p>
                    <p className="text-[10px] font-medium text-slate-400">
                      {p.createdAt.toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── 10. Edukasi Lingkungan (Kabar & Panduan Praktis) ── */}
        <section className="py-16 md:py-20 px-4 sm:px-6 bg-[#f8fafb] border-b border-slate-200">
          <div className="max-w-6xl mx-auto space-y-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
              <div className="max-w-2xl space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-[#0d7a75] block">
                  Edukasi Lingkungan
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Kabar & Panduan Praktis Kebersihan
                </h2>
                <p className="text-sm text-slate-600">
                  Panduan memilah sampah di rumah, informasi armada kebersihan, dan kabar TPS 3R Kota Depok.
                </p>
              </div>
              <Link
                href="/artikel"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors shrink-0 shadow-xs"
              >
                <span>Lihat Semua Artikel</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {displayedArticles.map((a) => (
                <Link
                  key={a.id}
                  href={`/artikel/${a.slug}`}
                  className="group flex flex-col bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs hover:shadow-md hover:border-slate-300 transition-all"
                >
                  <div className="h-44 bg-[#f1f5f9] border-b border-slate-100 relative overflow-hidden flex items-center justify-center">
                    {a.gambar ? (
                      <img
                        src={a.gambar}
                        alt={a.judul}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <span className="text-4xl opacity-40">📰</span>
                    )}
                    <span className="absolute top-3 left-3 px-2.5 py-0.5 bg-white/95 text-[#0d7a75] text-[10px] font-extrabold uppercase rounded-md shadow-xs">
                      {a.kategori}
                    </span>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-2">
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-[#0d7a75] transition-colors leading-snug">
                        {a.judul}
                      </h3>
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed font-normal">
                        {a.isi}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                      <span>{formatDate(a.createdAt)}</span>
                      <span className="font-bold text-[#0d7a75] group-hover:underline inline-flex items-center gap-1">
                        Baca Panduan
                        <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── 11. FAQ Seputar Layanan Warga ── */}
        <section className="py-16 md:py-20 px-4 sm:px-6 bg-white border-b border-slate-200">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0d7a75]">
                Pusat Informasi
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Tanya Jawab Seputar Layanan UPS HERU
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                Pertanyaan yang paling sering diajukan warga terkait prosedur pengangkutan dan pembayaran.
              </p>
            </div>

            <div className="space-y-3">
              <details className="group bg-[#f8fafb] border border-slate-200 rounded-xl p-4 sm:p-5 transition-all open:bg-white open:ring-1 open:ring-[#0d7a75]">
                <summary className="font-bold text-sm text-slate-900 cursor-pointer list-none flex items-center justify-between gap-3">
                  <span>1. Berapa kali dalam seminggu sampah rumah tangga saya dijemput?</span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-open:rotate-90 transition-transform shrink-0" />
                </summary>
                <p className="text-xs sm:text-sm text-slate-600 mt-3 leading-relaxed pt-2 border-t border-slate-200/80">
                  Untuk paket rumah tangga standar, penjemputan dilakukan secara rutin 2 hingga 3 kali seminggu sesuai jadwal zona jalan Anda (misal Senin–Rabu–Jumat atau Selasa–Kamis–Sabtu). Jam operasional armada berlangsung mulai pukul 07.00 hingga 17.00 WIB.
                </p>
              </details>

              <details className="group bg-[#f8fafb] border border-slate-200 rounded-xl p-4 sm:p-5 transition-all open:bg-white open:ring-1 open:ring-[#0d7a75]">
                <summary className="font-bold text-sm text-slate-900 cursor-pointer list-none flex items-center justify-between gap-3">
                  <span>2. Bagaimana jika sampah saya terlewat dan belum terangkut oleh petugas?</span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-open:rotate-90 transition-transform shrink-0" />
                </summary>
                <p className="text-xs sm:text-sm text-slate-600 mt-3 leading-relaxed pt-2 border-t border-slate-200/80">
                  Bila pintu pagar terkunci atau armada belum sempat melintas, Anda dapat langsung membuat laporan melalui menu &quot;Pengaduan&quot; di situs ini atau chat ke WhatsApp CS resmi. Tim reaksi cepat kami akan melakukan penjemputan susulan maksimal 1x24 jam.
                </p>
              </details>

              <details className="group bg-[#f8fafb] border border-slate-200 rounded-xl p-4 sm:p-5 transition-all open:bg-white open:ring-1 open:ring-[#0d7a75]">
                <summary className="font-bold text-sm text-slate-900 cursor-pointer list-none flex items-center justify-between gap-3">
                  <span>3. Apakah UPS HERU melayani sampah skala besar (puing renovasi / tebangan pohon)?</span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-open:rotate-90 transition-transform shrink-0" />
                </summary>
                <p className="text-xs sm:text-sm text-slate-600 mt-3 leading-relaxed pt-2 border-t border-slate-200/80">
                  Ya, kami melayani pengangkutan khusus volume besar (insidental) seperti puing bangunan, dahan/pohon tebangan, atau pembersihan gudang dengan tarif borongan terpisah menggunakan truk engkel/dump truck. Silakan hubungi Call Center WhatsApp untuk survei volume dan estimasi biaya.
                </p>
              </details>

              <details className="group bg-[#f8fafb] border border-slate-200 rounded-xl p-4 sm:p-5 transition-all open:bg-white open:ring-1 open:ring-[#0d7a75]">
                <summary className="font-bold text-sm text-slate-900 cursor-pointer list-none flex items-center justify-between gap-3">
                  <span>4. Bagaimana cara pembayaran tagihan jika warga tidak memiliki mobile banking?</span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-open:rotate-90 transition-transform shrink-0" />
                </summary>
                <p className="text-xs sm:text-sm text-slate-600 mt-3 leading-relaxed pt-2 border-t border-slate-200/80">
                  Pembayaran QRIS dapat di-scan melalui dompet digital apa pun (GoPay, OVO, ShopeePay, Dana, LinkAja) atau dibantu oleh gerai minimarket/agen pembayaran terdekat. Warga juga dapat melakukan pembayaran tunai langsung di loket kantor TPS 3R Kalibaru atau melalui petugas resmi berbekal kwitansi digital.
                </p>
              </details>

              <details className="group bg-[#f8fafb] border border-slate-200 rounded-xl p-4 sm:p-5 transition-all open:bg-white open:ring-1 open:ring-[#0d7a75]">
                <summary className="font-bold text-sm text-slate-900 cursor-pointer list-none flex items-center justify-between gap-3">
                  <span>5. Bagaimana prosedur pendaftaran kolektif satu lingkungan RT atau perumahan?</span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-open:rotate-90 transition-transform shrink-0" />
                </summary>
                <p className="text-xs sm:text-sm text-slate-600 mt-3 leading-relaxed pt-2 border-t border-slate-200/80">
                  Pengurus RT/RW atau perwakilan paguyuban cluster dapat menghubungi tim kami. Kami akan melakukan survei jalur jalan, penentuan armada penjemput yang sesuai (motor roda 3 atau truk pickup), dan memberikan tarif kolektif terpadu dengan laporan rekapitulasi pembayaran bulanan.
                </p>
              </details>
            </div>
          </div>
        </section>

        {/* ── 12. Call-To-Action Penutup (Deep Forest Teal ala BeCycle) ── */}
        <section className="bg-[#0c3d3a] text-white py-16 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <span className="inline-block px-3 py-1 bg-[#124b47] border border-[#1b5e59] text-emerald-300 text-xs font-bold rounded-full">
              Wujudkan Kota Depok Bersih & Nyaman
            </span>

            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight leading-tight">
              Tinggalkan Cara Lama, Nikmati Kepastian Jadwal Angkut Sampah.
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
              Bergabunglah bersama ribuan warga dan pemilik usaha di Depok. Daftarkan rumah Anda hari ini untuk jadwal jemput rutin tanpa khawatir penumpukan sampah.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                href="/daftar"
                className="w-full sm:w-auto px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"
              >
                <span>Daftar Langganan Sekarang</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="https://wa.me/6281400782617"
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto px-8 py-3.5 bg-[#124b47] hover:bg-[#185d58] text-white border border-[#1b5e59] rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2"
              >
                <PhoneCall className="w-4 h-4 text-emerald-300" />
                <span>Hubungi Call Center WA</span>
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* ── 13. Comprehensive Municipal Footer ── */}
      <footer className="bg-slate-950 text-white pt-14 pb-10 px-4 sm:px-6 border-t border-slate-800">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-xs">
            {/* Col 1: Brand & Bio */}
            <div className="space-y-3 md:col-span-1">
              <div className="flex items-center gap-2.5">
                <img
                  src="/ups-heru-logo.jpg"
                  alt="UPS HERU Logo"
                  className="w-9 h-9 rounded-lg object-contain bg-white p-0.5"
                />
                <span className="font-extrabold text-base tracking-tight text-white">UPS HERU</span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                Unit Pengolahan Sampah (UPS HERU) Kalibaru Kota Depok. Melayani retribusi dan operasional kebersihan terpadu.
              </p>
              <div className="text-[11px] text-slate-500">
                Izin Operasional Pengelolaan Sampah Kota Depok
              </div>
            </div>

            {/* Col 2: Layanan Warga */}
            <div className="space-y-3">
              <p className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">Layanan Warga</p>
              <ul className="space-y-2 text-slate-400 font-medium">
                <li>
                  <Link href="/lacak" className="hover:text-white transition-colors">
                    Pelacakan Truk Real-Time
                  </Link>
                </li>
                <li>
                  <Link href="/bayar" className="hover:text-white transition-colors">
                    Cek & Bayar Tagihan QRIS
                  </Link>
                </li>
                <li>
                  <Link href="/daftar" className="hover:text-white transition-colors">
                    Pendaftaran Warga Baru
                  </Link>
                </li>
                <li>
                  <Link href="/tarif" className="hover:text-white transition-colors">
                    Tarif Retribusi Resmi
                  </Link>
                </li>
                <li>
                  <Link href="/pengaduan" className="hover:text-white transition-colors">
                    Pusat Pengaduan Kebersihan
                  </Link>
                </li>
                <li>
                  <Link href="/artikel" className="hover:text-white transition-colors">
                    Edukasi Lingkungan & Artikel
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 3: Kontak Resmi */}
            <div className="space-y-3">
              <p className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">Kontak Operasional</p>
              <ul className="space-y-2 text-slate-400 font-medium">
                <li>
                  WhatsApp:{" "}
                  <a
                    href="https://wa.me/6281400782617"
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-400 font-bold hover:underline"
                  >
                    0814-0078-2617
                  </a>
                </li>
                <li>
                  Email:{" "}
                  <a href="mailto:kontak@upsheru.com" className="hover:text-white transition-colors">
                    kontak@upsheru.com
                  </a>
                </li>
                <li className="text-[11px] text-slate-500 pt-1">
                  Jam Layanan Loket: <br />
                  Senin – Sabtu (07.00 – 17.00 WIB)
                </li>
              </ul>
            </div>

            {/* Col 4: Fasilitas Fisik */}
            <div className="space-y-3">
              <p className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">Kantor UPS HERU</p>
              <p className="text-slate-400 text-xs leading-relaxed">
                Jl. Kandang Ayam, Kel. Kalibaru, Kec. Cilodong, Kota Depok, Jawa Barat 16414
              </p>
              <p className="text-[11px] text-slate-500 font-mono">Koordinat: -6.424838, 106.832667</p>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-800 text-slate-500 text-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <span>© {new Date().getFullYear()} UPS HERU Kota Depok. Hak Cipta Dilindungi.</span>
            <div className="flex items-center gap-5">
              <Link href="/login" className="hover:text-white transition-colors">
                Portal Petugas
              </Link>
              <Link href="/unduh" className="hover:text-white transition-colors">
                App Android Petugas
              </Link>
              <span>
                Didukung oleh{" "}
                <a href="https://wastepay.id" target="_blank" rel="noreferrer" className="text-emerald-500 hover:text-emerald-400 font-semibold">
                  wastepay.id
                </a>
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
