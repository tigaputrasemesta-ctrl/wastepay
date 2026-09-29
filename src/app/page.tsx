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
  HelpCircle,
  FileText,
  ChevronRight,
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
    "Layanan pengelolaan sampah terpadu Kota Depok oleh TPS 3R Kalibaru (CV Hero Zero Waste): penjemputan terjadwal ke rumah warga, pelacakan armada truk sampah live GPS, transparansi tarif retribusi, dan pembayaran digital via QRIS.",
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
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-emerald-800 selection:text-white">
      <JsonLd data={generateLocalBusinessJsonLd()} />

      {/* ── 1. Top Civic Operational Status Bar ── */}
      <section
        aria-label="Status Operasional Dinas"
        className="bg-slate-900 text-white text-xs py-2 px-4 border-b border-slate-800"
      >
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Operasional Normal
            </span>
            <span className="text-slate-300 hidden sm:inline text-[11px]">
              Armada aktif di Kec. Cilodong, Kel. Kalibaru, Jatimulya, Sukamaju & sekitarnya
            </span>
          </div>
          <div className="flex items-center gap-4 text-slate-400 text-[11px]">
            <span className="hidden md:inline">TPS 3R: 07.00 – 17.00 WIB</span>
            <a
              href="https://wa.me/6281400782617"
              target="_blank"
              rel="noreferrer"
              className="text-emerald-400 font-bold hover:underline inline-flex items-center gap-1"
            >
              <PhoneCall className="w-3 h-3" />
              <span>Hotline CS: 0814-0078-2617</span>
            </a>
          </div>
        </div>
      </section>

      {/* ── 2. Primary Civic Navbar ── */}
      <PublicNavbar />

      {/* ── 3. Hero Section: Clean, Authoritative, High-Utility ── */}
      <main>
        <section className="bg-slate-50 border-b border-slate-200 py-12 md:py-20 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto grid md:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Column: Civic Value Proposition (7 cols) */}
            <div className="md:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-white border border-slate-200 text-slate-700 text-xs font-semibold shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                <span>TPS 3R Kalibaru • Layanan Pengelolaan Sampah Kota Depok</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
                Layanan Angkut Sampah Rutin & Retribusi Resmi Kota Depok
              </h1>

              <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal max-w-xl">
                Pengelolaan sampah terpadu berbasis lingkungan oleh CV Hero Zero Waste (TPS 3R Kalibaru). Nikmati kepastian penjemputan sampah rumah tangga, pantau posisi truk secara real-time di peta, dan bayar retribusi bulanan transparan lewat QRIS.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link
                  href="/daftar"
                  className="px-6 py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  <Home className="w-4 h-4" />
                  <span>Daftar Langganan Baru</span>
                </Link>

                <Link
                  href="/lacak"
                  className="px-6 py-3.5 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 text-slate-800 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-xs active:scale-95"
                >
                  <Navigation className="w-4 h-4 text-emerald-700" />
                  <span>Lacak Truk di Peta</span>
                </Link>
              </div>

              {/* Trust Points Checklist */}
              <div className="pt-2 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs text-slate-600 font-medium">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Jadwal Pasti 2–3x / Minggu</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Kwitansi & QRIS Otomatis</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Dikelola TPS 3R Kalibaru</span>
                </div>
              </div>
            </div>

            {/* Right Column: Civic Utility Console Widget (5 cols) */}
            <div className="md:col-span-5">
              <CivicHeroWidget />
            </div>
          </div>
        </section>

        {/* ── 4. Key Operational Assurance Grid (Pilar Layanan) ── */}
        <section className="py-14 px-4 sm:px-6 bg-white border-b border-slate-200">
          <div className="max-w-6xl mx-auto space-y-10">
            <div className="max-w-2xl">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 block mb-1">
                Pilar Operasional
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Standar Pengelolaan Kebersihan Warga
              </h2>
              <p className="text-sm text-slate-600 mt-2">
                Empat jaminan layanan kami untuk memastikan kebersihan pemukiman terjaga secara tertib dan transparan.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Card 1 */}
              <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-all flex flex-col justify-between space-y-4">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-bold text-slate-900">Jadwal Angkut Teratur</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Petugas armada menjemput sampah rutin 2 hingga 3 kali seminggu sesuai jadwal zona wilayah Anda tanpa keterlambatan berulang.
                  </p>
                </div>
                <div className="text-[11px] font-semibold text-emerald-800">Senin – Sabtu Operasional</div>
              </div>

              {/* Card 2 */}
              <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-all flex flex-col justify-between space-y-4">
                <div className="w-11 h-11 rounded-xl bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-bold text-slate-900">Pelacakan Live GPS</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Lihat pergerakan truk pengangkut langsung di peta digital untuk memperkirakan waktu kedatangan armada di depan rumah.
                  </p>
                </div>
                <Link href="/lacak" className="text-[11px] font-bold text-sky-700 hover:underline inline-flex items-center gap-1">
                  <span>Buka Peta Pelacakan</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {/* Card 3 */}
              <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-all flex flex-col justify-between space-y-4">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                  <QrCode className="w-5 h-5" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-bold text-slate-900">Pembayaran QRIS Mudah</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Tagihan bulanan masuk otomatis ke WhatsApp. Bayar sekali scan dari seluruh aplikasi m-Banking dan e-Wallet tanpa uang tunai.
                  </p>
                </div>
                <Link href="/bayar" className="text-[11px] font-bold text-emerald-800 hover:underline inline-flex items-center gap-1">
                  <span>Cek Portal Tagihan</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {/* Card 4 */}
              <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-all flex flex-col justify-between space-y-4">
                <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-bold text-slate-900">Respon Aduan Cepat</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Sampah tertinggal atau ada timbunan liar di lingkungan Anda? Foto dan laporkan secara online; tim reaksi cepat segera dikerahkan.
                  </p>
                </div>
                <Link href="/pengaduan" className="text-[11px] font-bold text-amber-800 hover:underline inline-flex items-center gap-1">
                  <span>Form Pengaduan Warga</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── 5. Paket & Skema Tarif Retribusi Resmi ── */}
        <section className="py-16 px-4 sm:px-6 bg-slate-50 border-b border-slate-200">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                Tarif Transparan
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
                Pilihan Paket Retribusi Sesuai Kebutuhan
              </h2>
              <p className="text-sm text-slate-600">
                Tarif flat bulanan tanpa biaya tersembunyi. Disesuaikan dengan volume sampah domestik, komersial, maupun kerjasama lingkungan RT/RW.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 items-stretch">
              {/* Tier 1: Rumah Tangga */}
              <div className="bg-white border-2 border-emerald-600 rounded-2xl p-6 sm:p-8 flex flex-col justify-between shadow-sm relative">
                <div className="absolute -top-3 left-6 bg-emerald-700 text-white text-[10px] font-extrabold uppercase px-3 py-0.5 rounded-full tracking-wider">
                  Paling Banyak Digunakan
                </div>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900">Rumah Tangga / Warga</h3>
                    <p className="text-xs text-slate-500 mt-1">Untuk pemukiman warga perorangan & cluster</p>
                  </div>
                  <div className="py-2 border-y border-slate-100">
                    <span className="text-xs text-slate-500 font-medium">Mulai dari</span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-3xl font-extrabold text-slate-900">Rp 30.000</span>
                      <span className="text-xs text-slate-500">/ bulan</span>
                    </div>
                  </div>
                  <ul className="space-y-2.5 text-xs text-slate-600">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                      <span>Jadwal rutin 2–3 kali seminggu</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                      <span>Penjemputan di depan pagar rumah</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                      <span>Notifikasi tagihan WhatsApp & kwitansi</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                      <span>Akses penuh pelacakan truk di peta</span>
                    </li>
                  </ul>
                </div>
                <div className="pt-6">
                  <Link
                    href="/daftar?kategori=R1"
                    className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <span>Daftar Rumah Tangga</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Tier 2: Niaga & Ruko */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 flex flex-col justify-between shadow-xs">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900">Niaga, Toko & Ruko</h3>
                    <p className="text-xs text-slate-500 mt-1">Untuk toko retail, warung, kafe, kantor & UMKM</p>
                  </div>
                  <div className="py-2 border-y border-slate-100">
                    <span className="text-xs text-slate-500 font-medium">Mulai dari</span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-3xl font-extrabold text-slate-900">Rp 60.000</span>
                      <span className="text-xs text-slate-500">/ bulan</span>
                    </div>
                  </div>
                  <ul className="space-y-2.5 text-xs text-slate-600">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                      <span>Penjemputan volume komersial</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                      <span>Frekuensi harian atau sesuai volume usaha</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                      <span>Invoice resmi untuk pembukuan operasional</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                      <span>Bukti manifest penanganan sampah legal</span>
                    </li>
                  </ul>
                </div>
                <div className="pt-6">
                  <Link
                    href="/daftar?kategori=B1"
                    className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <span>Daftar Usaha / Niaga</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Tier 3: RT/RW & Kolektif */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 flex flex-col justify-between shadow-xs">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900">Kerjasama Pengurus RT/RW</h3>
                    <p className="text-xs text-slate-500 mt-1">Skema kolektif perumahan, paguyuban & komplek</p>
                  </div>
                  <div className="py-2 border-y border-slate-100">
                    <span className="text-xs text-slate-500 font-medium">Skema Pembayaran</span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-2xl font-extrabold text-slate-900">Kolektif Lingkungan</span>
                    </div>
                  </div>
                  <ul className="space-y-2.5 text-xs text-slate-600">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                      <span>Tarif hemat per KK untuk satu wilayah RT/RW</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                      <span>Laporan rekap pembayaran rutin bagi pengurus</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                      <span>Penetapan rute khusus seluruh jalan komplek</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                      <span>Dukungan tong komunal jika diperlukan</span>
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

            <div className="text-center pt-2">
              <Link href="/tarif" className="text-xs font-bold text-emerald-800 hover:underline inline-flex items-center gap-1">
                <span>Lihat tabel rincian tarif resmi selengkapnya</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </section>

        {/* ── 6. Alur 4 Langkah Cara Menjadi Pelanggan ── */}
        <section className="py-16 px-4 sm:px-6 bg-white border-b border-slate-200">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="max-w-2xl">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 block mb-1">
                Prosedur Pelayanan
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Alur Berlangganan Mudah & Cepat
              </h2>
              <p className="text-sm text-slate-600 mt-2">
                Tanpa birokrasi rumit, cukup empat langkah untuk menikmati layanan penjemputan sampah teratur.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Step 1 */}
              <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/40 space-y-3">
                <span className="w-8 h-8 rounded-lg bg-emerald-700 text-white font-extrabold text-sm flex items-center justify-center">
                  1
                </span>
                <h3 className="text-sm font-bold text-slate-900">Pengisian Formulir</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Daftar melalui halaman pendaftaran online dengan mengisi alamat rumah, RT/RW, dan nomor kontak WhatsApp aktif.
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/40 space-y-3">
                <span className="w-8 h-8 rounded-lg bg-emerald-700 text-white font-extrabold text-sm flex items-center justify-center">
                  2
                </span>
                <h3 className="text-sm font-bold text-slate-900">Verifikasi & Zona</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Petugas operasional memvalidasi lokasi rumah dan menetapkan jadwal hari jemput rutin sesuai rute lingkungan.
                </p>
              </div>

              {/* Step 3 */}
              <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/40 space-y-3">
                <span className="w-8 h-8 rounded-lg bg-emerald-700 text-white font-extrabold text-sm flex items-center justify-center">
                  3
                </span>
                <h3 className="text-sm font-bold text-slate-900">Penjemputan Armada</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Letakkan wadah sampah di depan pagar pada hari jadwal; armada kami akan mengangkut sampah secara tertib.
                </p>
              </div>

              {/* Step 4 */}
              <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/40 space-y-3">
                <span className="w-8 h-8 rounded-lg bg-emerald-700 text-white font-extrabold text-sm flex items-center justify-center">
                  4
                </span>
                <h3 className="text-sm font-bold text-slate-900">Tagihan WhatsApp & QRIS</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Terima rincian iuran bulanan via WhatsApp resmi setiap awal bulan dan selesaikan pembayaran instan via QRIS.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── 7. Cakupan Wilayah & Fasilitas TPS 3R Kalibaru ── */}
        <section className="py-16 px-4 sm:px-6 bg-slate-50 border-b border-slate-200">
          <div className="max-w-6xl mx-auto grid md:grid-cols-12 gap-10 items-center">
            <div className="md:col-span-7 space-y-6">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 block">
                Fasilitas Pengolahan & Jangkauan
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Pusat Pengolahan Sampah Terpadu TPS 3R Kalibaru
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Kami bukan sekadar memindahkan sampah ke TPA Cipayung, melainkan mengedepankan prinsip 3R (Reduce, Reuse, Recycle) untuk menekan volume residu di Kota Depok.
              </p>

              <div className="grid sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <Recycle className="w-4 h-4 text-emerald-700" />
                    <span>Pemilahan Organik</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    Sisa makanan dan dedaunan diolah menjadi kompos dan pakan maggot BSF ramah lingkungan.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <Building2 className="w-4 h-4 text-emerald-700" />
                    <span>Daur Ulang Anorganik</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    Botol plastik, kardus, dan logam dipres serta disalurkan ke industri daur ulang sirkular.
                  </p>
                </div>
              </div>

              {/* Area List Chips */}
              <div className="space-y-2 pt-2">
                <span className="text-xs font-bold text-slate-700 block">Wilayah Jangkauan Rutin:</span>
                <div className="flex flex-wrap gap-2 text-xs">
                  {["Kel. Kalibaru", "Kel. Cilodong", "Kel. Jatimulya", "Kel. Sukamaju", "Kel. Kalimulya", "Sukmajaya Sekitar"].map(
                    (wilayah) => (
                      <span
                        key={wilayah}
                        className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium"
                      >
                        ✓ {wilayah}
                      </span>
                    )
                  )}
                </div>
              </div>
            </div>

            <div className="md:col-span-5">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                    UPS
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Kantor & Fasilitas TPS 3R</h3>
                    <p className="text-[11px] text-slate-500">CV Hero Zero Waste</p>
                  </div>
                </div>

                <div className="space-y-3 text-xs text-slate-600">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-900 block">Alamat Operasional:</span>
                      <span>Jl. Kandang Ayam, Kel. Kalibaru, Kec. Cilodong, Kota Depok 16414</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <Clock className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-900 block">Jam Operasional Kantor:</span>
                      <span>Senin – Sabtu (07.00 – 17.00 WIB)</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <PhoneCall className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-900 block">Call Center WhatsApp:</span>
                      <a href="https://wa.me/6281400782617" target="_blank" rel="noreferrer" className="text-emerald-700 font-bold hover:underline">
                        0814-0078-2617
                      </a>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <a
                    href="https://maps.google.com/?q=-6.424838,106.832667"
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Navigation className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Petunjuk Arah Google Maps</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 8. Papan Pengumuman Resmi (Jika Ada) ── */}
        {pengumuman.length > 0 && (
          <section className="bg-amber-50/70 border-b border-amber-200/80 py-12 px-4 sm:px-6">
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-200/80 text-amber-900 rounded-xl">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Pengumuman & Pemberitahuan Warga</h2>
                  <p className="text-xs text-slate-600">Informasi operasional terkini dari manajemen UPS HERU</p>
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

        {/* ── 9. Edukasi & Artikel Lingkungan ── */}
        <section className="py-16 px-4 sm:px-6 bg-white border-b border-slate-200">
          <div className="max-w-6xl mx-auto space-y-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
              <div className="max-w-2xl">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 block mb-1">
                  Edukasi Lingkungan
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Kabar & Panduan Praktis Kebersihan
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  Informasi seputar pemilahan sampah mandiri, jadwal operasional, dan kabar kebersihan Kota Depok.
                </p>
              </div>
              <Link
                href="/artikel"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors shrink-0"
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
                  className="group flex flex-col bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md hover:border-slate-300 transition-all"
                >
                  <div className="h-44 bg-slate-100 border-b border-slate-100 relative overflow-hidden flex items-center justify-center">
                    {a.gambar ? (
                      <img
                        src={a.gambar}
                        alt={a.judul}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <span className="text-4xl opacity-40">📰</span>
                    )}
                    <span className="absolute top-3 left-3 px-2.5 py-0.5 bg-white/95 text-emerald-800 text-[10px] font-extrabold uppercase rounded-md shadow-xs">
                      {a.kategori}
                    </span>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-2">
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors leading-snug">
                        {a.judul}
                      </h3>
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {a.isi}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                      <span>{formatDate(a.createdAt)}</span>
                      <span className="font-bold text-emerald-700 group-hover:underline inline-flex items-center gap-1">
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

        {/* ── 10. FAQ Seputar Layanan Warga ── */}
        <section className="py-16 px-4 sm:px-6 bg-slate-50 border-b border-slate-200">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                Pertanyaan Umum
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Tanya Jawab Seputar Layanan UPS HERU
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                Informasi penting yang sering ditanyakan oleh warga mengenai operasional pengangkutan sampah.
              </p>
            </div>

            <div className="space-y-3">
              <details className="group bg-white border border-slate-200 rounded-xl p-4 sm:p-5 transition-all open:ring-1 open:ring-emerald-700">
                <summary className="font-bold text-sm text-slate-900 cursor-pointer list-none flex items-center justify-between gap-3">
                  <span>1. Berapa kali dalam seminggu sampah rumah tangga saya diangkut?</span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-open:rotate-90 transition-transform shrink-0" />
                </summary>
                <p className="text-xs sm:text-sm text-slate-600 mt-3 leading-relaxed pt-2 border-t border-slate-100">
                  Untuk paket rumah tangga standar, penjemputan dilakukan secara rutin 2 hingga 3 kali seminggu sesuai jadwal zona jalan Anda (misal Senin–Rabu–Jumat atau Selasa–Kamis–Sabtu). Jam operasional armada berlangsung mulai pukul 07.00 hingga 17.00 WIB.
                </p>
              </details>

              <details className="group bg-white border border-slate-200 rounded-xl p-4 sm:p-5 transition-all open:ring-1 open:ring-emerald-700">
                <summary className="font-bold text-sm text-slate-900 cursor-pointer list-none flex items-center justify-between gap-3">
                  <span>2. Bagaimana jika sampah saya terlewat dan belum terangkut oleh petugas?</span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-open:rotate-90 transition-transform shrink-0" />
                </summary>
                <p className="text-xs sm:text-sm text-slate-600 mt-3 leading-relaxed pt-2 border-t border-slate-100">
                  Bila pintu pagar terkunci atau armada belum sempat melintas, Anda dapat langsung membuat laporan melalui menu &quot;Pengaduan&quot; di situs ini atau chat ke WhatsApp CS resmi. Tim reaksi cepat kami akan melakukan penjemputan susulan maksimal 1x24 jam.
                </p>
              </details>

              <details className="group bg-white border border-slate-200 rounded-xl p-4 sm:p-5 transition-all open:ring-1 open:ring-emerald-700">
                <summary className="font-bold text-sm text-slate-900 cursor-pointer list-none flex items-center justify-between gap-3">
                  <span>3. Apakah UPS HERU melayani sampah skala besar (puing renovasi / tebangan pohon)?</span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-open:rotate-90 transition-transform shrink-0" />
                </summary>
                <p className="text-xs sm:text-sm text-slate-600 mt-3 leading-relaxed pt-2 border-t border-slate-100">
                  Ya, kami melayani pengangkutan khusus volume besar (insidental) seperti puing bangunan, dahan/pohon tebangan, atau pembersihan gudang dengan tarif borongan terpisah menggunakan truk engkel/dump truck. Silakan hubungi Call Center WhatsApp untuk survei volume dan estimasi biaya.
                </p>
              </details>

              <details className="group bg-white border border-slate-200 rounded-xl p-4 sm:p-5 transition-all open:ring-1 open:ring-emerald-700">
                <summary className="font-bold text-sm text-slate-900 cursor-pointer list-none flex items-center justify-between gap-3">
                  <span>4. Bagaimana cara pembayaran tagihan jika warga tidak memiliki mobile banking?</span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-open:rotate-90 transition-transform shrink-0" />
                </summary>
                <p className="text-xs sm:text-sm text-slate-600 mt-3 leading-relaxed pt-2 border-t border-slate-100">
                  Pembayaran QRIS dapat di-scan melalui dompet digital apa pun (GoPay, OVO, ShopeePay, Dana, LinkAja) atau dibantu oleh gerai minimarket/agen pembayaran terdekat. Warga juga dapat melakukan pembayaran tunai langsung di loket kantor TPS 3R Kalibaru atau melalui petugas resmi berbekal kwitansi digital.
                </p>
              </details>

              <details className="group bg-white border border-slate-200 rounded-xl p-4 sm:p-5 transition-all open:ring-1 open:ring-emerald-700">
                <summary className="font-bold text-sm text-slate-900 cursor-pointer list-none flex items-center justify-between gap-3">
                  <span>5. Bagaimana prosedur pendaftaran kolektif satu lingkungan RT atau perumahan?</span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-open:rotate-90 transition-transform shrink-0" />
                </summary>
                <p className="text-xs sm:text-sm text-slate-600 mt-3 leading-relaxed pt-2 border-t border-slate-100">
                  Pengurus RT/RW atau perwakilan paguyuban cluster dapat menghubungi tim kami. Kami akan melakukan survei jalur jalan, penentuan armada penjemput yang sesuai (motor roda 3 atau truk pickup), dan memberikan tarif kolektif terpadu dengan laporan rekapitulasi pembayaran bulanan.
                </p>
              </details>
            </div>
          </div>
        </section>

        {/* ── 11. Call-To-Action Penutup (Dignified Civic Banner) ── */}
        <section className="bg-slate-900 text-white py-14 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <span className="inline-block px-3 py-1 bg-emerald-900/60 border border-emerald-700 text-emerald-300 text-xs font-bold rounded-full">
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
                className="w-full sm:w-auto px-8 py-3.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs sm:text-sm transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"
              >
                <span>Daftar Langganan Sekarang</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="https://wa.me/6281400782617"
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto px-8 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2"
              >
                <PhoneCall className="w-4 h-4 text-emerald-400" />
                <span>Hubungi Call Center WA</span>
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* ── 12. Footer Resmi Komprehensif ── */}
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
                Unit Pengelolaan Sampah 3R Kalibaru di bawah naungan CV Hero Zero Waste. Melayani retribusi dan operasional kebersihan Kota Depok.
              </p>
              <div className="text-[11px] text-slate-500">
                Izin Operasional TPS 3R Kota Depok
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
                  <a href="mailto:cv.herozerowaste@gmail.com" className="hover:text-white transition-colors">
                    cv.herozerowaste@gmail.com
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
              <p className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">Kantor TPS 3R</p>
              <p className="text-slate-400 text-xs leading-relaxed">
                Jl. Kandang Ayam, Kel. Kalibaru, Kec. Cilodong, Kota Depok, Jawa Barat 16414
              </p>
              <p className="text-[11px] text-slate-500 font-mono">Koordinat: -6.424838, 106.832667</p>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-800 text-slate-500 text-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <span>© {new Date().getFullYear()} UPS HERU Kota Depok (CV Hero Zero Waste). Hak Cipta Dilindungi.</span>
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
