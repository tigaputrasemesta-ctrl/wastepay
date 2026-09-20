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
              Tarif Retribusi
            </Link>
            <Link href="/pengaduan" className="hover:text-emerald-800 transition-colors">
              Pengaduan
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

          {/* Kolom Kanan: Visual Live Fleet Radar (5 cols) */}
          <div className="md:col-span-5 relative">
            <div className="rounded-3xl border border-slate-200/80 bg-slate-900 p-6 text-white shadow-xl overflow-hidden relative">
              {/* Radar pulse background */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-emerald-500/20 rounded-full pointer-events-none" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 border border-emerald-500/30 rounded-full pointer-events-none" />

              {/* Status Header */}
              <div className="flex items-center justify-between mb-6 relative z-10">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>LIVE GPS DEPOK</span>
                </div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">AKTIF SEKARANG</span>
              </div>

              {/* Vector Simulated Map */}
              <div className="h-56 rounded-2xl bg-slate-800/80 border border-slate-700/60 p-4 relative overflow-hidden flex items-center justify-center">
                {/* Roads */}
                <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 300 200">
                  <path d="M 20 180 L 100 120 L 220 120 L 280 40" stroke="#10b981" strokeWidth="4" fill="none" />
                  <path d="M 100 120 L 120 40 L 200 40" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 4" fill="none" />
                  <circle cx="20" cy="180" r="4" fill="#10b981" />
                  <circle cx="280" cy="40" r="5" fill="#f43f5e" />
                </svg>

                {/* Truck marker simulation */}
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-700 text-white flex items-center justify-center text-xl shadow-lg border-2 border-white/20">
                    🚛
                  </div>
                  <div className="mt-2 px-3 py-1 rounded-full bg-slate-900/90 border border-emerald-500/40 text-[11px] font-bold text-white shadow-md">
                    Armada 02 • Beji Raya
                  </div>
                </div>
              </div>

              {/* Mini Dispatch Strip */}
              <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Status: Penjemputan Rute Pagi</span>
                </div>
                <span className="text-emerald-400 font-bold">18 / 24 RT Selesai</span>
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
                <li><Link href="/tarif" className="hover:text-white transition-colors">Tarif Retribusi</Link></li>
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
