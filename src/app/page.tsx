import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { Truck, MapPin, Smartphone, ArrowRight, Megaphone, ShieldCheck, Sparkles, Navigation, CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

import TrustStatsBar from "@/components/TrustStatsBar";
import TimelineSection from "@/components/TimelineSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import JsonLd from "@/components/JsonLd";
import PublicNavbar from "@/components/PublicNavbar";
import { generateLocalBusinessJsonLd } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "UPS HERU - Sistem Pengelolaan & Retribusi Sampah Kota Depok",
  alternates: {
    canonical: "/",
  },
};

export default async function LandingPage() {
  const artikelTop3 = await prisma.artikel.findMany({
    where: { diterbitkan: true },
    orderBy: { createdAt: "desc" },
    take: 3,
  });
  
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
      <PublicNavbar />

      {/* ── B. Hero Section ── */}
      <main className="overflow-hidden">
        <div className="px-6 py-12 md:py-20 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Kolom Kiri: Copywriting & CTA (7 cols) */}
          <div className="md:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Sistem Kelola Sampah Lebih Mudah & Transparan • Kota Depok</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.12]">
              Angkut Sampah Tepat Waktu, <br />
              <span className="text-emerald-700">Bebas Repot.</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 max-w-xl leading-relaxed">
              Tinggalkan cara lama. Pantau armada real-time, dapatkan jadwal pasti, dan bayar retribusi mudah via QRIS.
            </p>

            {/* Badge Rekam Jejak */}
            <div className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs font-medium text-slate-700 shadow-sm">
              <Sparkles className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>Melayani Depok sejak 2014 • Dipercaya 2.000+ Pelanggan</span>
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

          {/* Kolom Kanan: Dashboard Transparansi (5 cols) */}
          <div className="md:col-span-5 relative flex justify-center lg:justify-end mt-12 md:mt-0">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-emerald-500/10 rounded-full blur-[100px] -z-10" />
            
            <div className="w-full max-w-sm rounded-[32px] bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 p-6 sm:p-8 shadow-2xl shadow-emerald-900/20 relative overflow-hidden">
              {/* Shine effect */}
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent" />
              
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-white font-extrabold text-lg tracking-tight">Kinerja Hari Ini</h3>
                  <p className="text-emerald-400 text-xs font-medium mt-0.5">Live Dashboard Depok</p>
                </div>
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              </div>
              
              <div className="space-y-5">
                {/* Stat 1 */}
                <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50 flex items-center gap-4 transition-colors hover:bg-slate-800/80 cursor-default">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Truck className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-3xl font-extrabold text-white tracking-tight">15.4 <span className="text-lg text-slate-400 font-bold">Ton</span></p>
                    <p className="text-[11px] text-slate-400 font-medium">Sampah Terangkut</p>
                  </div>
                </div>
                
                {/* Stat 2 */}
                <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50 flex items-center gap-4 transition-colors hover:bg-slate-800/80 cursor-default">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-3xl font-extrabold text-white tracking-tight">2.450<span className="text-lg text-blue-400 font-bold">+</span></p>
                    <p className="text-[11px] text-slate-400 font-medium">Pelanggan Aktif</p>
                  </div>
                </div>
              </div>
              
              {/* Live Timeline */}
              <div className="mt-8 pt-6 border-t border-slate-800/80">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Aktivitas Armada Live</p>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-3 relative">
                    <div className="absolute top-6 left-2.5 w-px h-8 bg-slate-700" />
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-200">Armada 02 tiba di Beji Raya</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">2 menit yang lalu</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400">Armada 05 selesai rute Sawangan</p>
                      <p className="text-[10px] text-slate-600 mt-0.5">15 menit yang lalu</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Floating Element: Before/After */}
            <div className="absolute -left-4 sm:-left-12 top-10 sm:top-20 bg-white p-3.5 sm:p-4 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-3 z-30 rotate-[-2deg] transition-transform hover:rotate-0">
              <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600 shrink-0">
                <span className="text-xl font-bold">✕</span>
              </div>
              <div>
                <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 line-through decoration-rose-400">Jadwal Tidak Pasti</p>
                <p className="text-[11px] sm:text-xs font-extrabold text-slate-800 mt-0.5">Pantau Armada Real-Time</p>
              </div>
            </div>
            
            <div className="absolute -right-2 sm:-right-8 bottom-16 sm:bottom-24 bg-white p-3.5 sm:p-4 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-3 z-30 rotate-[2deg] transition-transform hover:rotate-0">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 line-through decoration-rose-400">Ribet Siapkan Uang Pas</p>
                <p className="text-[11px] sm:text-xs font-extrabold text-slate-800 mt-0.5">Bayar Cepat via QRIS</p>
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
              Fitur Unggulan
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900">
              Kelola Sampah Lebih Mudah & Transparan
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-2">
              Ekosistem terintegrasi untuk warga, pengurus RT, dan petugas kebersihan di Kota Depok.
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
                  Pantau pergerakan truk real-time. Ketahui pasti kapan sampah Anda diangkut tanpa perlu menebak-nebak.
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
                  Temukan sampah terlewat atau timbunan liar? Foto dan laporkan langsung. Sistem otomatis mengirimkan titik lokasi ke unit reaksi cepat kami.
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
                  Notifikasi tagihan otomatis ke WhatsApp. Bayar retribusi dalam hitungan detik via QRIS atau Virtual Account.
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
                Pengumuman Warga
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
                Berita terbaru dan panduan praktis menjaga kebersihan lingkungan bersama UPS HERU.
              </p>
            </div>
            <Link href="/artikel" className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-sm transition-colors whitespace-nowrap">
              <span>Lihat Semua Artikel</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {artikelTop3.length === 0 ? (
              <div className="md:col-span-3 text-center py-12 bg-slate-50 rounded-3xl border border-slate-200/80">
                <p className="text-slate-500 font-medium">Belum ada artikel yang diterbitkan.</p>
              </div>
            ) : (
              artikelTop3.map((a) => (
                <Link key={a.id} href={`/artikel/${a.slug}`} className="group flex flex-col bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-md transition-all">
                  {a.gambar ? (
                    <div className="h-48 relative overflow-hidden">
                      <div className="absolute inset-0 bg-emerald-900/10 group-hover:bg-transparent transition-colors z-10" />
                      <img src={a.gambar} alt={a.judul} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                  ) : (
                    <div className="h-48 bg-slate-100 relative overflow-hidden">
                      <div className="absolute inset-0 bg-emerald-900/10 group-hover:bg-transparent transition-colors z-10" />
                      <div className="w-full h-full bg-gradient-to-br from-emerald-100 to-teal-50 flex items-center justify-center">
                        <span className="text-4xl">📰</span>
                      </div>
                    </div>
                  )}
                  <div className="p-6 flex-1 flex flex-col">
                    <span className="text-xs font-bold text-emerald-600 mb-2">
                      {a.kategori.charAt(0).toUpperCase() + a.kategori.slice(1)}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 mb-3 group-hover:text-emerald-700 transition-colors leading-snug">
                      {a.judul}
                    </h3>
                    <p className="text-sm text-slate-600 mb-4 line-clamp-2">{a.isi}</p>
                    <div className="mt-auto text-[11px] font-semibold text-slate-400">{formatDate(a.createdAt)}</div>
                  </div>
                </Link>
              ))
            )}
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
              Bebas Repot, Lingkungan Bersih Terjamin.
            </h2>
            <p className="text-emerald-100 text-sm sm:text-base max-w-xl mx-auto font-normal">
              Bergabunglah dengan 2.000+ warga Depok lainnya. Daftar sekarang dan nikmati layanan angkut sampah yang pasti dan transparan.
            </p>
            <div className="pt-2">
              <Link
                href="/daftar"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-emerald-950 hover:bg-emerald-50 rounded-2xl font-extrabold text-sm shadow-md active:scale-95 transition-all"
              >
                <span>Mulai Berlangganan Sekarang</span>
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
