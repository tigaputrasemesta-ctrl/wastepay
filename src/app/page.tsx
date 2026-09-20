import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { Truck, MapPin, Smartphone, ArrowRight, Megaphone, ShieldCheck, Sparkles, Navigation, CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/prisma";

import TrustStatsBar from "@/components/TrustStatsBar";
import TimelineSection from "@/components/TimelineSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import JsonLd from "@/components/JsonLd";
import { generateLocalBusinessJsonLd } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "UPS HERU - Sistem Pengelolaan & Retribusi Sampah Kota Depok",
  alternates: {
    canonical: "/",
  },
};

export default async function LandingPage() {
  
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
      {/* ── A. Sticky Modern Navbar ── */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-6 py-3.5 transition-all">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-3">
          <Link href="/" className="flex items-center gap-3 group">
            <img src="/ups-heru-logo.jpg" alt="UPS HERU Logo" className="h-10 w-10 sm:h-12 sm:w-12 object-contain rounded-xl shadow-sm group-hover:scale-105 transition-transform shrink-0" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg tracking-tight text-slate-900">UPS HERU</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Depok</span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium">Pengelolaan Sampah Terpadu Kota Depok</p>
            </div>
          </Link>

          <div className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm font-bold text-slate-600 flex-wrap justify-center">
            <Link href="/lacak" className="hover:text-emerald-800 transition-colors flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-700" />
              <span>Lacak Armada</span>
            </Link>
            <Link href="/bayar" className="hover:text-emerald-800 transition-colors">
              Cek Tagihan
            </Link>
            <Link href="/pengaduan" className="hover:text-emerald-800 transition-colors">
              Pengaduan
            </Link>
            <Link href="/tarif" className="hover:text-emerald-800 transition-colors">
              Tarif Resmi
            </Link>
            <Link href="/login" className="hover:text-emerald-800 transition-colors">
              Masuk Petugas
            </Link>
            <Link
              href="/daftar"
              className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-xl font-bold shadow-sm active:scale-95 transition-all flex items-center gap-1.5"
            >
              <span>Daftar Warga Baru</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── B. Hero Section ── */}
      <main>
        <div className="px-6 py-12 md:py-20 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Kolom Kiri: Copywriting & CTA (7 cols) */}
          <div className="md:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Layanan Retribusi Sampah Modern • Kota Depok 2026</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.12]">
              Layanan Angkut Sampah Pasti, <br />
              <span className="text-emerald-700">Bebas Khawatir.</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 max-w-xl leading-relaxed">
              Tinggalkan cara lama yang tidak menentu. Pantau truk penjemput secara real-time di peta, nikmati jadwal angkut teratur, dan bayar iuran praktis via QRIS.
            </p>

            {/* Badge Rekam Jejak */}
            <div className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs font-medium text-slate-700 shadow-sm">
              <Sparkles className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>Melayani Depok sejak 2014 • Dipercaya lebih dari 2.000+ pelanggan</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link
                href="/daftar"
                className="px-6 py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl font-bold text-sm shadow-md hover:shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <span>Mulai Berlangganan 🚛</span>
              </Link>
              <Link
                href="/lacak"
                className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl font-bold text-sm active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Navigation className="w-4 h-4 text-emerald-700" />
                <span>Lacak Armada</span>
              </Link>
            </div>
          </div>

          {/* Kolom Kanan: Mockup Aplikasi Modern (5 cols) */}
          <div className="md:col-span-5 relative flex justify-center mt-12 md:mt-0">
            {/* Dekorasi Background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-emerald-400/20 rounded-full blur-[80px] -z-10" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-emerald-500/10 rounded-full -z-10 hidden sm:block" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 border border-emerald-500/5 rounded-full -z-10 hidden sm:block" />
            
            {/* Frame HP (Sleek Glass/Metal Finish) */}
            <div className="relative w-[280px] h-[580px] bg-white rounded-[44px] shadow-2xl border-[10px] border-slate-900 overflow-hidden flex flex-col ring-4 ring-slate-100">
              {/* Hardware Details: Dynamic Island / Notch */}
              <div className="absolute top-2 inset-x-0 mx-auto w-24 h-6 bg-slate-900 rounded-full z-30 flex items-center justify-between px-2 shadow-inner">
                <div className="w-2 h-2 rounded-full bg-slate-800" />
                <div className="w-2 h-2 rounded-full bg-emerald-900/50" />
              </div>
              
              {/* Status Bar */}
              <div className="bg-emerald-700 text-white text-[10px] font-medium pt-3 pb-2 px-6 flex justify-between items-center z-20">
                <span>08:00</span>
                <div className="flex items-center gap-1 opacity-90">
                   <div className="w-3 h-3 flex items-center justify-center"><div className="w-2 h-2 border-[1.5px] border-white rounded-full"/></div>
                   <div className="w-3.5 h-2.5 border border-white rounded-[2px] relative"><div className="absolute inset-y-[1px] left-[1px] right-[2px] bg-white rounded-[1px]"/></div>
                </div>
              </div>

              {/* Layar Aplikasi */}
              <div className="flex-1 bg-slate-50 flex flex-col relative z-10 overflow-hidden pb-4">
                {/* Header Mockup */}
                <div className="bg-emerald-700 pt-6 pb-20 px-5 text-white relative">
                  <div className="absolute bottom-0 inset-x-0 h-10 bg-slate-50 rounded-t-3xl" />
                  <p className="text-[11px] text-emerald-100/80 mb-0.5 font-medium">Selamat datang,</p>
                  <h3 className="text-xl font-bold tracking-tight">Keluarga Bpk. Budi</h3>
                </div>

                <div className="px-5 -mt-14 relative z-10 space-y-4">
                  {/* Card Tagihan */}
                  <div className="bg-white rounded-3xl p-5 text-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-100 relative overflow-hidden">
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-50 rounded-full blur-xl" />
                    <div className="flex items-center justify-between mb-3 relative z-10">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tagihan Aktif</p>
                      <span className="px-2 py-1 bg-rose-50 text-rose-600 border border-rose-100 text-[9px] font-extrabold rounded-md tracking-wide">BELUM DIBAYAR</span>
                    </div>
                    <div className="relative z-10 mb-4">
                      <p className="text-3xl font-extrabold text-slate-900 tracking-tight">Rp 50.000</p>
                      <p className="text-[10px] text-slate-500 mt-1">Jatuh tempo: 10 Sep 2026</p>
                    </div>
                    <button className="w-full py-3 bg-emerald-600 text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 active:scale-95 transition-transform">
                      <Smartphone className="w-4 h-4" /> Bayar Sekarang (QRIS)
                    </button>
                  </div>

                  {/* Quick Action Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] text-center">
                      <div className="w-12 h-12 mx-auto bg-sky-50 text-sky-600 rounded-full flex items-center justify-center mb-2">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <p className="text-[11px] font-bold text-slate-700">Lacak Truk</p>
                    </div>
                    <div className="bg-white p-3.5 rounded-2xl border border-rose-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] text-center ring-1 ring-rose-50 relative overflow-hidden">
                      <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-sm" />
                      <div className="w-12 h-12 mx-auto bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mb-2">
                        <Megaphone className="w-5 h-5" />
                      </div>
                      <p className="text-[11px] font-bold text-slate-700">Buat Laporan</p>
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)]">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Aktivitas Terakhir</p>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 mt-0.5">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-slate-800 leading-snug">Sampah Berhasil Diangkut</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Oleh Petugas (Armada 02)</p>
                        <p className="text-[9px] text-slate-400 mt-1">Hari ini, 07:45 WIB</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Floating Badges (Static but with hover effect instead of bounce to prevent layout bugs) */}
            <div className="absolute -left-2 sm:-left-12 bottom-12 sm:bottom-20 bg-white p-2.5 sm:p-3 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 flex items-center gap-2 sm:gap-3 transition-transform hover:-translate-y-2 cursor-default z-30">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                <ShieldCheck className="w-4 h-4 sm:w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] sm:text-xs font-extrabold text-slate-800">QRIS Tersedia</p>
                <p className="text-[9px] sm:text-[10px] text-slate-500 font-medium leading-tight">Otomatis Lunas</p>
              </div>
            </div>
            
            <div className="absolute -right-2 sm:-right-10 top-32 sm:top-40 bg-white p-2.5 sm:p-3 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 flex items-center gap-2 sm:gap-3 transition-transform hover:-translate-y-2 cursor-default z-30">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600 shrink-0">
                <Megaphone className="w-4 h-4 sm:w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] sm:text-xs font-extrabold text-slate-800">Sistem Laporan</p>
                <p className="text-[9px] sm:text-[10px] text-slate-500 font-medium leading-tight">Respons Cepat</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── C. Trust Stats Bar (12 Tahun Rekam Jejak) ── */}
      <TrustStatsBar />

      {/* ── D. Timeline Section (Dari Gerobak ke Geotag) ── */}
      <TimelineSection />

      {/* ── E. Fitur Utama ── */}
      <section className="border-b border-slate-200/80 bg-slate-50/50 py-20 px-6">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold mb-3">
              Solusi Terintegrasi
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900">
              Pengelolaan Sampah Modern
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-2">
              Ekosistem lengkap yang dirancang khusus untuk mempermudah warga, pengurus RT, dan petugas lapangan.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all flex flex-col justify-between">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 mb-6">
                  <MapPin className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-extrabold text-slate-900 mb-2">Lacak Armada</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Pantau pergerakan armada secara real-time. Ketahui estimasi menit kedatangan truk di depan rumah tanpa perlu menebak-nebak.
                </p>
              </div>
              <Link
                href="/lacak"
                className="inline-flex items-center gap-1.5 mt-6 text-xs font-bold text-sky-700 hover:text-sky-800"
              >
                <span>Lacak Armada</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all flex flex-col justify-between">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mb-6">
                  <Truck className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-extrabold text-slate-900 mb-2">Pengaduan</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Ada sampah terlewat atau timbunan liar? Cukup foto dengan kamera HP Anda. Sistem geotag otomatis mencatat koordinat untuk unit reaksi cepat.
                </p>
              </div>
              <Link
                href="/pengaduan"
                className="inline-flex items-center gap-1.5 mt-6 text-xs font-bold text-rose-700 hover:text-rose-800"
              >
                <span>Pengaduan</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all flex flex-col justify-between">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 mb-6">
                  <Smartphone className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-extrabold text-slate-900 mb-2">Cek Tagihan</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Pemberitahuan jadwal dan tagihan bulanan langsung masuk ke WhatsApp Anda. Bayar dengan sekali scan QRIS atau Virtual Account.
                </p>
              </div>
              <Link
                href="/bayar"
                className="inline-flex items-center gap-1.5 mt-6 text-xs font-bold text-emerald-700 hover:text-emerald-800"
              >
                <span>Cek Tagihan</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── F. Pengumuman Section (Jika Ada) ── */}
      {pengumuman.length > 0 && (
        <section className="border-b border-slate-200/80 bg-amber-50/60 py-16 px-6">
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex items-center gap-3">
              <Megaphone className="w-6 h-6 text-amber-700" />
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                Papan Pengumuman Warga
              </h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {pengumuman.map((p) => (
                <div
                  key={p.id}
                  className={`p-6 rounded-3xl border ${
                    p.penting
                      ? "bg-rose-50 border-rose-200 text-rose-950"
                      : "bg-white border-slate-200/80 text-slate-900"
                  } shadow-sm`}
                >
                  {p.penting && (
                    <div className="inline-block px-2.5 py-0.5 bg-rose-600 text-white text-[10px] font-bold uppercase rounded-full mb-3">
                      PENTING
                    </div>
                  )}
                  <h3 className="text-base font-extrabold mb-2 leading-tight">{p.judul}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed mb-4">{p.isi}</p>
                  <p className="text-[10px] font-semibold text-slate-400">
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

      {/* ── G. Artikel & Edukasi ── */}
      <section className="py-20 px-6 bg-white border-b border-slate-200/80">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="flex flex-col sm:flex-row justify-between items-end gap-4">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold mb-3">
                Edukasi Lingkungan
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
                Kabar & Tips UPS HERU
              </h2>
              <p className="text-slate-600 text-sm sm:text-base mt-2">
                Informasi terbaru seputar pengelolaan sampah dan tips menjaga kebersihan lingkungan di Kota Depok.
              </p>
            </div>
            <Link href="/artikel" className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-sm transition-colors whitespace-nowrap">
              <span>Lihat Semua Artikel</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Link href="/artikel/jadwal-pengangkutan-sampah-cilodong-depok" className="group flex flex-col bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-md transition-all">
              <div className="h-48 bg-slate-100 relative overflow-hidden">
                <div className="absolute inset-0 bg-emerald-900/10 group-hover:bg-transparent transition-colors z-10" />
                <div className="w-full h-full bg-gradient-to-br from-emerald-100 to-teal-50 flex items-center justify-center">
                  <span className="text-4xl">🗓️</span>
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <span className="text-xs font-bold text-emerald-600 mb-2">Informasi Layanan</span>
                <h3 className="text-lg font-bold text-slate-900 mb-3 group-hover:text-emerald-700 transition-colors leading-snug">Jadwal Pengangkutan Sampah di Cilodong Depok 2026</h3>
                <p className="text-sm text-slate-600 mb-4 line-clamp-2">Pembaruan jadwal operasional truk pengangkut sampah UPS HERU untuk wilayah Cilodong dan sekitarnya.</p>
                <div className="mt-auto text-[11px] font-semibold text-slate-400">18 September 2026</div>
              </div>
            </Link>
            <Link href="/artikel/cara-memilah-sampah-organik-anorganik" className="group flex flex-col bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-md transition-all">
              <div className="h-48 bg-slate-100 relative overflow-hidden">
                <div className="absolute inset-0 bg-emerald-900/10 group-hover:bg-transparent transition-colors z-10" />
                <div className="w-full h-full bg-gradient-to-br from-amber-100 to-orange-50 flex items-center justify-center">
                  <span className="text-4xl">♻️</span>
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <span className="text-xs font-bold text-emerald-600 mb-2">Edukasi Warga</span>
                <h3 className="text-lg font-bold text-slate-900 mb-3 group-hover:text-emerald-700 transition-colors leading-snug">Cara Benar Memilah Sampah Organik dan Anorganik di Rumah</h3>
                <p className="text-sm text-slate-600 mb-4 line-clamp-2">Langkah mudah memilah sampah dari dapur tangga untuk membantu proses daur ulang di TPS 3R.</p>
                <div className="mt-auto text-[11px] font-semibold text-slate-400">15 September 2026</div>
              </div>
            </Link>
            <Link href="/artikel/daftar-tarif-retribusi-sampah-depok-terbaru" className="group flex flex-col bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-md transition-all">
              <div className="h-48 bg-slate-100 relative overflow-hidden">
                <div className="absolute inset-0 bg-emerald-900/10 group-hover:bg-transparent transition-colors z-10" />
                <div className="w-full h-full bg-gradient-to-br from-sky-100 to-blue-50 flex items-center justify-center">
                  <span className="text-4xl">💰</span>
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <span className="text-xs font-bold text-emerald-600 mb-2">Pembaruan Sistem</span>
                <h3 className="text-lg font-bold text-slate-900 mb-3 group-hover:text-emerald-700 transition-colors leading-snug">Daftar Tarif Retribusi Sampah Kota Depok Terbaru</h3>
                <p className="text-sm text-slate-600 mb-4 line-clamp-2">Transparansi biaya retribusi layanan kebersihan UPS HERU untuk kategori perumahan, niaga, dan industri.</p>
                <div className="mt-auto text-[11px] font-semibold text-slate-400">10 September 2026</div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* ── H. Testimoni Warga Depok ── */}
      <TestimonialsSection />
      </main>

      {/* ── H. CTA Penutup & Footer Modern ── */}
      <footer className="bg-slate-900 text-white pt-20 pb-12 px-6">
        <div className="max-w-6xl mx-auto space-y-16">
          {/* CTA Banner */}
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-3xl p-8 sm:p-12 text-center text-white shadow-xl space-y-4 max-w-4xl mx-auto">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight leading-tight">
              Siap Menikmati Lingkungan Bersih Tanpa Pusing?
            </h2>
            <p className="text-emerald-100 text-sm sm:text-base max-w-xl mx-auto font-normal">
              Bergabunglah dengan ribuan keluarga dan pemilik usaha di Depok. Daftar hari ini dan nikmati jadwal pengangkutan teratur.
            </p>
            <div className="pt-2">
              <Link
                href="/daftar"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-emerald-950 hover:bg-emerald-50 rounded-2xl font-extrabold text-sm shadow-md active:scale-95 transition-all"
              >
                <span>Daftar Langganan Sekarang</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Footer Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pt-8 border-t border-slate-800 text-xs">
            <div className="space-y-3 md:col-span-1">
              <div className="flex items-center gap-2">
                <img src="/ups-heru-logo.jpg" alt="UPS HERU Logo" className="w-8 h-8 rounded-xl object-contain bg-white shadow-sm" />
                <span className="font-extrabold text-base tracking-tight text-white">UPS HERU</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Platform digital layanan retribusi dan operasional pengangkutan sampah terpadu UPS HERU Kota Depok.
              </p>
            </div>

            <div className="space-y-2">
              <p className="font-extrabold text-slate-200 uppercase tracking-wider text-[11px]">Layanan Warga</p>
              <ul className="space-y-1.5 text-slate-400">
                <li><Link href="/lacak" className="hover:text-white transition-colors">Lacak Armada</Link></li>
                <li><Link href="/bayar" className="hover:text-white transition-colors">Cek Tagihan</Link></li>
                <li><Link href="/pengaduan" className="hover:text-white transition-colors">Pengaduan</Link></li>
                <li><Link href="/tarif" className="hover:text-white transition-colors">Tarif Resmi</Link></li>
                <li><Link href="/daftar" className="hover:text-white transition-colors">Daftar Warga Baru</Link></li>
                <li><Link href="/login" className="hover:text-white transition-colors">Masuk Petugas</Link></li>
              </ul>
            </div>

            <div className="space-y-2">
              <p className="font-extrabold text-slate-200 uppercase tracking-wider text-[11px]">Kontak Resmi</p>
              <ul className="space-y-1.5 text-slate-400">
                <li>WhatsApp: <a href="https://wa.me/6281400782617" target="_blank" rel="noreferrer" className="text-emerald-400 font-bold hover:underline">0814-0078-2617</a></li>
                <li>Email: <a href="mailto:cv.herozerowaste@gmail.com" className="hover:text-white transition-colors">cv.herozerowaste@gmail.com</a></li>
                <li className="pt-1 text-[10px] text-slate-400">Operasional: Senin - Sabtu (06:00 - 17:00 WIB)</li>
              </ul>
            </div>

            <div className="space-y-2">
              <p className="font-extrabold text-slate-200 uppercase tracking-wider text-[11px]">Kantor & UPS</p>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Jl. Kandang Ayam, Kalibaru, Kec. Cilodong, Kota Depok, Jawa Barat 16414
              </p>
              <p className="text-[10px] text-slate-400 font-mono">GPS: -6.424838, 106.832667</p>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800 text-center text-slate-400 text-[11px] flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>© 2026 UPS HERU Kota Depok. Hak Cipta Dilindungi.<br />Sistem aplikasi dikelola bekerja sama dengan <a href="https://wastepay.id" className="text-emerald-500 hover:text-emerald-400 font-medium">wastepay.id</a></span>
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-slate-400 hover:text-white transition-colors">Portal Petugas & Admin</Link>
              <Link href="/unduh" className="text-slate-400 hover:text-white transition-colors">Download App Android</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
