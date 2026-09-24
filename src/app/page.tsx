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
    <div className="min-h-screen bg-[#FAFAFA] text-slate-900 font-sans selection:bg-emerald-500 selection:text-white">
      <JsonLd data={generateLocalBusinessJsonLd()} />
      <PublicNavbar />

      {/* ── B. Hero Section ── */}
      <main className="overflow-hidden">
        <section className="relative px-6 pt-24 pb-16 md:pt-32 md:pb-24 max-w-7xl mx-auto">
          {/* Background Elements */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-tr from-emerald-200/40 via-teal-100/20 to-emerald-50/5 rounded-full blur-3xl -z-10 opacity-70" />
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-blue-100/40 to-transparent rounded-full blur-3xl -z-10 opacity-50" />

          <div className="grid lg:grid-cols-2 gap-16 lg:gap-8 items-center">
            {/* Kolom Kiri: Copywriting & CTA */}
            <div className="space-y-8 max-w-2xl z-10 relative">
              <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/80 backdrop-blur-md border border-emerald-100/80 shadow-sm text-emerald-800 text-xs font-semibold uppercase tracking-wide">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                Sistem Kelola Sampah Kota Depok
              </div>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tighter text-slate-900 leading-[1.05]">
                Angkut Sampah <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">
                  Tepat Waktu.
                </span>
              </h1>

              <p className="text-lg sm:text-xl text-slate-600 leading-relaxed font-medium">
                Tinggalkan cara lama. Pantau armada secara real-time, dapatkan jadwal pasti, dan bayar retribusi semudah memindai QRIS.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link
                  href="/daftar"
                  className="group relative px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-base shadow-[0_8px_30px_rgb(5,150,105,0.3)] hover:shadow-[0_8px_40px_rgb(5,150,105,0.4)] active:scale-[0.98] transition-all overflow-hidden flex items-center justify-center gap-3"
                >
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                  <span>Mulai Berlangganan</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="/lacak"
                  className="px-8 py-4 bg-white/80 backdrop-blur-sm hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-2xl font-bold text-base shadow-sm hover:shadow active:scale-[0.98] transition-all flex items-center justify-center gap-3 group"
                >
                  <Navigation className="w-5 h-5 text-emerald-600 group-hover:rotate-12 transition-transform" />
                  <span>Lacak Armada</span>
                </Link>
              </div>

              {/* Badge Rekam Jejak */}
              <div className="flex items-center gap-4 pt-4">
                <div className="flex -space-x-3">
                  {[1,2,3,4].map((i) => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center overflow-hidden">
                      <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${i}&backgroundColor=e2e8f0`} alt="User" className="w-full h-full object-cover" />
                    </div>
                  ))}
                  <div className="w-10 h-10 rounded-full border-2 border-white bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center">
                    +2k
                  </div>
                </div>
                <p className="text-sm font-medium text-slate-600">
                  Dipercaya oleh <span className="font-bold text-slate-900">2.000+</span> Pelanggan
                </p>
              </div>
            </div>

            {/* Kolom Kanan: Glassmorphism Dashboard Preview */}
            <div className="relative w-full max-w-lg mx-auto lg:ml-auto perspective-1000">
              <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-[2.5rem] transform rotate-3 scale-[1.02] opacity-20 blur-xl" />
              
              <div className="relative bg-white/60 backdrop-blur-2xl border border-white/60 rounded-[2.5rem] p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] transform transition-transform duration-500 hover:rotate-0 hover:scale-[1.02]">
                
                <div className="flex justify-between items-center mb-10">
                  <div>
                    <h3 className="text-slate-900 font-black text-xl tracking-tight">Live Dashboard</h3>
                    <p className="text-emerald-600 text-sm font-semibold mt-1">Kinerja Hari Ini</p>
                  </div>
                  <div className="px-3 py-1.5 bg-emerald-100 rounded-full flex items-center gap-2 border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-emerald-700">Live</span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {/* Stat Card 1 */}
                  <div className="bg-white/80 rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-5 hover:bg-white transition-colors group">
                    <div className="w-14 h-14 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                      <Truck className="w-7 h-7" />
                    </div>
                    <div>
                      <p className="text-4xl font-black text-slate-900 tracking-tight">15.4 <span className="text-xl text-slate-400 font-bold">Ton</span></p>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">Sampah Terangkut</p>
                    </div>
                  </div>
                  
                  {/* Timeline Preview */}
                  <div className="bg-white/80 rounded-2xl p-6 shadow-sm border border-slate-100 mt-6">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-5">Aktivitas Armada Live</p>
                    <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                      <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full border-4 border-white bg-emerald-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10" />
                        <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.5rem)] p-4 rounded-xl shadow-sm bg-white border border-slate-100">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-slate-900 text-sm">Armada 02</span>
                            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Tiba</span>
                          </div>
                          <p className="text-xs text-slate-500 font-medium">Jl. Beji Raya</p>
                        </div>
                      </div>
                      
                      <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full border-4 border-white bg-slate-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10" />
                        <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.5rem)] p-4 rounded-xl bg-slate-50/50 border border-slate-100">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-slate-600 text-sm">Armada 05</span>
                            <span className="text-[10px] font-medium text-slate-500">15m lalu</span>
                          </div>
                          <p className="text-xs text-slate-400 font-medium">Selesai Rute Sawangan</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── C. Trust Stats Bar ── */}
        <div className="relative z-20 -mt-8">
          <TrustStatsBar />
        </div>

        {/* ── D. Timeline Section ── */}
        <div className="pt-24">
          <TimelineSection />
        </div>

        {/* ── E. Fitur Utama (Bento Grid) ── */}
        <section className="py-32 px-6 bg-[#FAFAFA]">
          <div className="max-w-7xl mx-auto space-y-16">
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <span className="inline-block font-bold text-emerald-600 tracking-wider uppercase text-sm">
                Fitur Unggulan
              </span>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900">
                Ekosistem Terintegrasi
              </h2>
              <p className="text-slate-600 text-lg font-medium">
                Desain canggih untuk kemudahan warga, pengurus RT, dan petugas kebersihan di Kota Depok.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[320px]">
              {/* Feature 1 - Large Horizontal */}
              <div className="md:col-span-2 group bg-white rounded-[2rem] border border-slate-200/60 p-8 shadow-sm hover:shadow-xl hover:shadow-sky-900/5 hover:border-sky-200 transition-all duration-300 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute -right-20 -top-20 w-64 h-64 bg-gradient-to-bl from-sky-100/50 to-transparent rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700" />
                <div className="relative z-10">
                  <div className="w-16 h-16 rounded-2xl bg-sky-50 flex items-center justify-center text-sky-600 mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                    <MapPin className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mb-3">Pelacakan Armada Real-Time</h3>
                  <p className="text-slate-600 text-base max-w-md font-medium leading-relaxed">
                    Pantau pergerakan truk langsung dari HP. Ketahui kepastian jadwal tanpa perlu menebak-nebak, hidup lebih tenang.
                  </p>
                </div>
                <Link href="/lacak" className="relative z-10 inline-flex items-center gap-2 mt-8 text-sm font-bold text-sky-600 hover:text-sky-700 w-fit">
                  <span>Mulai Melacak</span>
                  <div className="w-8 h-8 rounded-full bg-sky-50 flex items-center justify-center group-hover:translate-x-2 transition-transform">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </Link>
              </div>

              {/* Feature 2 - Small Vertical */}
              <div className="group bg-white rounded-[2rem] border border-slate-200/60 p-8 shadow-sm hover:shadow-xl hover:shadow-rose-900/5 hover:border-rose-200 transition-all duration-300 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-gradient-to-tl from-rose-100/50 to-transparent rounded-full blur-3xl" />
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 mb-6 group-hover:-translate-y-1 transition-transform duration-300">
                    <Truck className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 mb-3">Lapor & Pengaduan</h3>
                  <p className="text-slate-600 text-sm font-medium leading-relaxed">
                    Timbunan liar? Foto dan lapor. Sistem otomatis mengirim koordinat ke unit reaksi cepat.
                  </p>
                </div>
                <Link href="/pengaduan" className="relative z-10 inline-flex items-center gap-1.5 mt-4 text-sm font-bold text-rose-600 group-hover:gap-2 transition-all w-fit">
                  <span>Buat Laporan</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Feature 3 - Small Vertical */}
              <div className="group bg-white rounded-[2rem] border border-slate-200/60 p-8 shadow-sm hover:shadow-xl hover:shadow-emerald-900/5 hover:border-emerald-200 transition-all duration-300 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute -left-10 -top-10 w-40 h-40 bg-gradient-to-br from-emerald-100/50 to-transparent rounded-full blur-3xl" />
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-6 group-hover:rotate-12 transition-transform duration-300">
                    <Smartphone className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 mb-3">Retribusi Digital</h3>
                  <p className="text-slate-600 text-sm font-medium leading-relaxed">
                    Tagihan instan via WhatsApp. Bayar hitungan detik via QRIS atau Virtual Account.
                  </p>
                </div>
                <Link href="/bayar" className="relative z-10 inline-flex items-center gap-1.5 mt-4 text-sm font-bold text-emerald-600 group-hover:gap-2 transition-all w-fit">
                  <span>Cek Tagihan</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Feature 4 - Large Horizontal */}
              <div className="md:col-span-2 group bg-slate-900 rounded-[2rem] border border-slate-800 p-8 shadow-xl overflow-hidden relative flex flex-col justify-center">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
                <div className="absolute right-0 top-0 w-96 h-96 bg-gradient-to-bl from-emerald-500/20 via-teal-500/10 to-transparent rounded-full blur-3xl translate-x-1/3 -translate-y-1/3" />
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                  <div className="max-w-md">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white text-xs font-bold mb-4 backdrop-blur-md">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Transparansi Total</span>
                    </div>
                    <h3 className="text-3xl font-black text-white mb-4">Membangun Depok Bersih Bersama</h3>
                    <p className="text-slate-300 font-medium leading-relaxed mb-8">
                      Seluruh retribusi dikelola secara transparan dan dikembalikan untuk peningkatan mutu layanan operasional kebersihan Kota.
                    </p>
                    <Link href="/daftar" className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-xl font-bold transition-colors">
                      Bergabung Sekarang
                    </Link>
                  </div>
                  
                  <div className="hidden md:flex flex-col gap-3">
                    {['Jadwal Teratur', 'Bebas Uang Tunai', 'Layanan Responsif'].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-4 transform transition-transform duration-500 hover:translate-x-2">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        </div>
                        <span className="font-bold text-white">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── F. Pengumuman Section ── */}
        {pengumuman.length > 0 && (
          <section className="py-24 px-6 bg-white relative">
            <div className="absolute inset-0 bg-gradient-to-b from-amber-50/50 to-white pointer-events-none" />
            <div className="max-w-7xl mx-auto relative z-10 space-y-10">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                      <Megaphone className="w-5 h-5 text-amber-600" />
                    </div>
                    <h2 className="text-3xl font-black tracking-tight text-slate-900">
                      Pusat Informasi Warga
                    </h2>
                  </div>
                  <p className="text-slate-600 font-medium ml-13">Pembaruan layanan dan pengumuman operasional penting.</p>
                </div>
              </div>
              
              <div className="grid md:grid-cols-3 gap-6">
                {pengumuman.map((p) => (
                  <div
                    key={p.id}
                    className={`group p-8 rounded-[2rem] border transition-all duration-300 hover:-translate-y-1 ${
                      p.penting
                        ? "bg-gradient-to-br from-rose-50 to-white border-rose-200 shadow-rose-900/5 hover:shadow-lg hover:shadow-rose-900/10"
                        : "bg-white border-slate-200/60 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 hover:border-slate-300"
                    }`}
                  >
                    {p.penting && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-100 text-rose-700 text-[11px] font-black uppercase tracking-wider rounded-full mb-5">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                        Pengumuman Penting
                      </div>
                    )}
                    <h3 className={`text-xl font-black mb-3 leading-tight ${p.penting ? 'text-rose-950' : 'text-slate-900'}`}>{p.judul}</h3>
                    <p className="text-sm font-medium text-slate-600 leading-relaxed mb-6">{p.isi}</p>
                    <div className="flex items-center gap-2 mt-auto text-xs font-bold text-slate-400">
                      <span className="w-8 h-px bg-slate-200" />
                      {p.createdAt.toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── G. Artikel & Edukasi ── */}
        <section className="py-32 px-6 bg-[#FAFAFA]">
          <div className="max-w-7xl mx-auto space-y-12">
            <div className="flex flex-col sm:flex-row justify-between items-end gap-6">
              <div className="max-w-2xl">
                <span className="inline-block font-bold text-emerald-600 tracking-wider uppercase text-sm mb-3">
                  Edukasi Lingkungan
                </span>
                <h2 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 mb-4">
                  Wawasan & Tips
                </h2>
                <p className="text-slate-600 text-lg font-medium">
                  Berita terbaru dan panduan praktis menjaga kebersihan lingkungan dari tim UPS HERU.
                </p>
              </div>
              <Link href="/artikel" className="group inline-flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 hover:border-emerald-200 hover:bg-emerald-50 text-slate-800 rounded-2xl font-bold text-sm shadow-sm transition-all">
                <span>Lihat Semua</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {artikelTop3.length === 0 ? (
                <div className="md:col-span-3 text-center py-16 bg-white rounded-[2rem] border border-dashed border-slate-300">
                  <p className="text-slate-500 font-semibold text-lg">Belum ada artikel yang diterbitkan.</p>
                </div>
              ) : (
                artikelTop3.map((a) => (
                  <Link key={a.id} href={`/artikel/${a.slug}`} className="group flex flex-col bg-white rounded-[2rem] border border-slate-200/60 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300">
                    {a.gambar ? (
                      <div className="h-56 relative overflow-hidden">
                        <div className="absolute inset-0 bg-emerald-900/0 group-hover:bg-emerald-900/10 transition-colors z-10 duration-300" />
                        <img src={a.gambar} alt={a.judul} className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out" />
                        <div className="absolute top-4 left-4 z-20">
                          <span className="px-3 py-1 bg-white/90 backdrop-blur text-emerald-700 text-xs font-black uppercase tracking-wider rounded-lg shadow-sm">
                            {a.kategori}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="h-56 bg-slate-50 relative overflow-hidden flex items-center justify-center">
                        <div className="w-full h-full bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center transform group-hover:scale-105 transition-transform duration-700">
                          <span className="text-5xl opacity-50">📰</span>
                        </div>
                        <div className="absolute top-4 left-4 z-20">
                          <span className="px-3 py-1 bg-white/90 backdrop-blur text-emerald-700 text-xs font-black uppercase tracking-wider rounded-lg shadow-sm">
                            {a.kategori}
                          </span>
                        </div>
                      </div>
                    )}
                    <div className="p-8 flex-1 flex flex-col">
                      <h3 className="text-xl font-black text-slate-900 mb-4 group-hover:text-emerald-600 transition-colors leading-snug">
                        {a.judul}
                      </h3>
                      <p className="text-slate-600 font-medium mb-6 line-clamp-2 leading-relaxed">{a.isi}</p>
                      <div className="mt-auto flex items-center justify-between">
                        <div className="text-xs font-bold text-slate-400">{formatDate(a.createdAt)}</div>
                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </section>

        {/* ── H. Testimoni Warga Depok ── */}
        <div className="bg-white">
          <TestimonialsSection />
        </div>
      </main>

      {/* ── I. CTA Penutup & Footer Modern ── */}
      <footer className="bg-slate-950 pt-24 pb-12 px-6 relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="max-w-7xl mx-auto space-y-20 relative z-10">
          {/* CTA Banner */}
          <div className="relative rounded-[3rem] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-900" />
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
            
            <div className="relative p-12 sm:p-20 text-center flex flex-col items-center">
              <h2 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-white mb-6 leading-tight max-w-4xl">
                Saatnya Beralih ke Sistem <br className="hidden sm:block" />
                <span className="text-emerald-200">Kelola Sampah Modern.</span>
              </h2>
              <p className="text-emerald-50/80 text-lg font-medium max-w-2xl mb-10">
                Bergabunglah dengan 2.000+ warga Depok lainnya. Nikmati layanan operasional kebersihan yang transparan, profesional, dan pasti.
              </p>
              <Link
                href="/daftar"
                className="group flex items-center gap-3 px-8 py-4 bg-white text-emerald-900 hover:bg-emerald-50 rounded-2xl font-black text-lg shadow-2xl active:scale-[0.98] transition-all"
              >
                <span>Daftar Sekarang</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Footer Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-8 pt-12 border-t border-white/10">
            <div className="md:col-span-4 space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-white rounded-xl shadow-sm">
                  <img src="/ups-heru-logo.jpg" alt="UPS HERU Logo" className="w-10 h-10 rounded-lg object-contain" />
                </div>
                <span className="font-black text-2xl tracking-tight text-white">UPS HERU</span>
              </div>
              <p className="text-slate-400 font-medium leading-relaxed pr-8">
                Platform digital layanan retribusi dan operasional pengangkutan sampah terpadu terpercaya di Kota Depok.
              </p>
            </div>

            <div className="md:col-span-2 space-y-4">
              <p className="font-bold text-white tracking-wide">Layanan Warga</p>
              <ul className="space-y-3 font-medium text-slate-400">
                <li><Link href="/lacak" className="hover:text-emerald-400 transition-colors">Lacak Armada</Link></li>
                <li><Link href="/bayar" className="hover:text-emerald-400 transition-colors">Cek Tagihan</Link></li>
                <li><Link href="/pengaduan" className="hover:text-emerald-400 transition-colors">Pengaduan</Link></li>
                <li><Link href="/tarif" className="hover:text-emerald-400 transition-colors">Tarif Resmi</Link></li>
              </ul>
            </div>
            
            <div className="md:col-span-2 space-y-4">
              <p className="font-bold text-white tracking-wide">Informasi</p>
              <ul className="space-y-3 font-medium text-slate-400">
                <li><Link href="/daftar" className="hover:text-emerald-400 transition-colors">Daftar Baru</Link></li>
                <li><Link href="/login" className="hover:text-emerald-400 transition-colors">Portal Petugas</Link></li>
                <li><Link href="/unduh" className="hover:text-emerald-400 transition-colors">Aplikasi Android</Link></li>
              </ul>
            </div>

            <div className="md:col-span-4 space-y-4">
              <p className="font-bold text-white tracking-wide">Hubungi Kami</p>
              <ul className="space-y-4 font-medium text-slate-400">
                <li className="flex flex-col">
                  <span className="text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">WhatsApp & Email</span>
                  <a href="https://wa.me/6281400782617" target="_blank" rel="noreferrer" className="text-emerald-400 hover:text-emerald-300 transition-colors font-bold text-lg">0814-0078-2617</a>
                  <a href="mailto:cv.herozerowaste@gmail.com" className="hover:text-white transition-colors mt-1">cv.herozerowaste@gmail.com</a>
                </li>
                <li className="flex flex-col pt-2 border-t border-white/5">
                  <span className="text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Alamat & Operasional</span>
                  <span className="leading-relaxed">Jl. Kandang Ayam, Kalibaru, Kec. Cilodong, Kota Depok 16414</span>
                  <span className="text-sm mt-1 opacity-70">Senin - Sabtu (06:00 - 17:00 WIB)</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 font-medium text-slate-500 text-sm">
            <span>© {new Date().getFullYear()} UPS HERU Kota Depok. Hak Cipta Dilindungi.</span>
            <span>Didukung oleh <a href="https://wastepay.id" className="text-emerald-500 hover:text-emerald-400 font-bold transition-colors">wastepay.id</a></span>
          </div>
        </div>
      </footer>
    </div>
  );
}
