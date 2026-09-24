import type { Metadata } from "next";
import Link from "next/link";
import { Truck, MapPin, Smartphone, ArrowRight, Megaphone, Navigation, ShieldCheck, Sparkles, QrCode } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

import JsonLd from "@/components/JsonLd";
import PublicNavbar from "@/components/PublicNavbar";
import { generateLocalBusinessJsonLd } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "UPS HERU - Jasa Angkut Sampah & Retribusi Digital Kota Depok",
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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-emerald-800 selection:text-white">
      <JsonLd data={generateLocalBusinessJsonLd()} />
      <PublicNavbar />

      {/* ── B. Hero Section ── */}
      <main className="overflow-hidden">
        <div className="px-6 py-12 md:py-24 max-w-6xl mx-auto">
          <div className="grid md:grid-cols-12 gap-12 lg:gap-16 items-center">
            {/* Kolom Kiri: Copywriting & CTA (7 cols) */}
            <div className="md:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/50 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Jasa Angkut Sampah Modern Kota Depok</span>
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-900 leading-[1.12]">
                Angkut Sampah Pasti, <br />
                <span className="text-emerald-700">Bebas Khawatir.</span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 max-w-xl leading-relaxed font-medium">
                Tinggalkan cara lama. Pantau truk penjemput secara real-time di peta, nikmati kepastian jadwal, dan bayar retribusi mudah via QRIS.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link
                  href="/daftar"
                  className="px-8 py-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl font-bold text-sm shadow-xl shadow-emerald-900/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <span>Mulai Berlangganan 🚛</span>
                </Link>
                <Link
                  href="/lacak"
                  className="px-8 py-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-2xl font-bold text-sm active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <Navigation className="w-4 h-4 text-emerald-700" />
                  <span>Lacak Armada</span>
                </Link>
              </div>
            </div>

            {/* Kolom Kanan: Dashboard Transparansi (5 cols) */}
            <div className="md:col-span-5 relative flex justify-center lg:justify-end mt-12 md:mt-0">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-emerald-500/15 rounded-full blur-[100px] -z-10" />
              
              <div className="w-full max-w-sm rounded-[32px] bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 p-6 sm:p-8 shadow-2xl shadow-emerald-900/30 relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent" />
                
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h3 className="text-white font-extrabold text-lg tracking-tight">Live Dashboard</h3>
                    <p className="text-emerald-400 text-xs font-medium mt-0.5">Kinerja Hari Ini</p>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                </div>
                
                <div className="space-y-5">
                  <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50 flex items-center gap-4 transition-colors hover:bg-slate-800/80 cursor-default">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <Truck className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-3xl font-extrabold text-white tracking-tight">15.4 <span className="text-lg text-slate-400 font-bold">Ton</span></p>
                      <p className="text-[11px] text-slate-400 font-medium">Sampah Terangkut</p>
                    </div>
                  </div>
                  
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
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── E. Fitur Utama (Fokus pada Jasa Angkut, QRIS, Pengaduan) ── */}
        <section className="bg-white py-24 px-6 border-y border-slate-200/80 relative">
          <div className="absolute inset-0 bg-slate-50/50 pointer-events-none" />
          <div className="max-w-6xl mx-auto space-y-16 relative z-10">
            <div className="text-center max-w-2xl mx-auto space-y-4">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-extrabold tracking-wide uppercase">
                Fitur Unggulan
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900">
                Kelola Sampah Tanpa Ribet
              </h2>
              <p className="text-slate-600 text-base md:text-lg">
                Fokus jalani aktivitas Anda, biarkan kami yang mengurus kebersihan lingkungan dengan teknologi yang serba transparan.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Feature 1: QRIS */}
              <div className="bg-white rounded-[2rem] border border-slate-200 p-10 shadow-lg shadow-slate-200/40 hover:-translate-y-2 transition-transform duration-300">
                <div className="w-20 h-20 rounded-3xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-8 border border-emerald-100">
                  <QrCode className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-4">Pembayaran QRIS</h3>
                <p className="text-base text-slate-600 leading-relaxed font-medium">
                  Tidak perlu repot siapkan uang tunai atau kembalian. Bayar retribusi bulanan dalam hitungan detik langsung dari *mobile banking* atau *e-wallet* Anda lewat tagihan WhatsApp.
                </p>
                <Link href="/bayar" className="inline-flex items-center gap-2 mt-8 text-emerald-700 font-bold hover:text-emerald-800">
                  Cek Tagihan Sekarang <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Feature 2: Pengaduan Online */}
              <div className="bg-white rounded-[2rem] border border-slate-200 p-10 shadow-lg shadow-slate-200/40 hover:-translate-y-2 transition-transform duration-300">
                <div className="w-20 h-20 rounded-3xl bg-rose-50 flex items-center justify-center text-rose-600 mb-8 border border-rose-100">
                  <Smartphone className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-4">Pengaduan Online</h3>
                <p className="text-base text-slate-600 leading-relaxed font-medium">
                  Melihat tumpukan sampah liar atau ada jadwal yang terlewat? Foto dan laporkan langsung via sistem kami. Geotagging pintar akan mengirimkan tim reaksi cepat ke lokasi.
                </p>
                <Link href="/pengaduan" className="inline-flex items-center gap-2 mt-8 text-rose-600 font-bold hover:text-rose-700">
                  Buat Laporan <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Feature 3: Lacak Armada */}
              <div className="bg-white rounded-[2rem] border border-slate-200 p-10 shadow-lg shadow-slate-200/40 hover:-translate-y-2 transition-transform duration-300">
                <div className="w-20 h-20 rounded-3xl bg-sky-50 flex items-center justify-center text-sky-600 mb-8 border border-sky-100">
                  <MapPin className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-4">Lacak Armada</h3>
                <p className="text-base text-slate-600 leading-relaxed font-medium">
                  Pantau pergerakan truk sampah secara live di peta. Anda bisa melihat estimasi pasti kapan truk sampai di rumah Anda tanpa harus menebak-nebak jadwal.
                </p>
                <Link href="/lacak" className="inline-flex items-center gap-2 mt-8 text-sky-600 font-bold hover:text-sky-700">
                  Lacak Truk Hari Ini <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── F. Pengumuman Section (Jika Ada) ── */}
        {pengumuman.length > 0 && (
          <section className="bg-amber-50/60 py-20 px-6">
            <div className="max-w-6xl mx-auto space-y-10">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-amber-100 text-amber-700 rounded-2xl">
                    <Megaphone className="w-6 h-6" />
                  </div>
                  <h2 className="text-3xl font-black tracking-tight text-slate-900">
                    Pengumuman Warga
                  </h2>
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                {pengumuman.map((p) => (
                  <div
                    key={p.id}
                    className={`p-8 rounded-3xl border ${
                      p.penting
                        ? "bg-white border-rose-200 text-rose-950 shadow-md shadow-rose-900/5"
                        : "bg-white border-slate-200/80 text-slate-900 shadow-sm"
                    }`}
                  >
                    {p.penting && (
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-100 text-rose-700 text-[10px] font-black uppercase rounded-full mb-4">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                        Penting
                      </div>
                    )}
                    <h3 className="text-lg font-bold mb-3 leading-tight">{p.judul}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed mb-6">{p.isi}</p>
                    <p className="text-xs font-semibold text-slate-400 mt-auto">
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
        <section className="py-24 px-6 bg-slate-50 border-t border-slate-200/80">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="flex flex-col sm:flex-row justify-between items-end gap-6">
              <div className="max-w-2xl">
                <span className="inline-block font-bold text-emerald-600 tracking-wider uppercase text-sm mb-3">
                  Edukasi Lingkungan
                </span>
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
                  Kabar & Tips UPS HERU
                </h2>
                <p className="text-slate-600 text-base mt-3 font-medium">
                  Berita terbaru dan panduan praktis menjaga kebersihan lingkungan bersama kami.
                </p>
              </div>
              <Link href="/artikel" className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 hover:border-emerald-200 hover:bg-emerald-50 text-slate-800 rounded-2xl font-bold text-sm transition-all shadow-sm">
                <span>Lihat Semua Artikel</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {artikelTop3.length === 0 ? (
                <div className="md:col-span-3 text-center py-16 bg-white rounded-3xl border border-slate-200/80">
                  <p className="text-slate-500 font-medium text-lg">Belum ada artikel yang diterbitkan.</p>
                </div>
              ) : (
                artikelTop3.map((a) => (
                  <Link key={a.id} href={`/artikel/${a.slug}`} className="group flex flex-col bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300">
                    {a.gambar ? (
                      <div className="h-56 relative overflow-hidden">
                        <div className="absolute inset-0 bg-emerald-900/0 group-hover:bg-emerald-900/10 transition-colors z-10" />
                        <img src={a.gambar} alt={a.judul} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                        <div className="absolute top-4 left-4 z-20">
                          <span className="px-3 py-1 bg-white/90 backdrop-blur-md text-emerald-700 text-xs font-black uppercase rounded-lg">
                            {a.kategori}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="h-56 bg-slate-100 relative overflow-hidden flex items-center justify-center">
                        <div className="absolute inset-0 bg-emerald-900/0 group-hover:bg-emerald-900/5 transition-colors z-10" />
                        <span className="text-5xl opacity-50">📰</span>
                      </div>
                    )}
                    <div className="p-8 flex-1 flex flex-col">
                      <h3 className="text-xl font-bold text-slate-900 mb-4 group-hover:text-emerald-600 transition-colors leading-snug">
                        {a.judul}
                      </h3>
                      <p className="text-slate-600 font-medium mb-6 line-clamp-2 leading-relaxed">{a.isi}</p>
                      <div className="mt-auto text-xs font-bold text-slate-400">{formatDate(a.createdAt)}</div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </section>
      </main>

      {/* ── H. CTA Penutup & Footer Modern ── */}
      <footer className="bg-slate-950 text-white pt-24 pb-12 px-6">
        <div className="max-w-6xl mx-auto space-y-20">
          {/* CTA Banner */}
          <div className="bg-gradient-to-br from-emerald-600 to-teal-800 rounded-[3rem] p-10 sm:p-16 text-center text-white shadow-2xl space-y-6 max-w-5xl mx-auto relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight mb-4">
                Bebas Repot, <br className="hidden sm:block" /> Lingkungan Bersih Terjamin.
              </h2>
              <p className="text-emerald-100 text-base md:text-lg max-w-2xl mx-auto font-medium mb-10">
                Bergabunglah dengan 2.000+ warga Depok lainnya. Daftar sekarang dan nikmati layanan angkut sampah yang pasti dan transparan.
              </p>
              <Link
                href="/daftar"
                className="inline-flex items-center gap-2 px-10 py-5 bg-white text-emerald-950 hover:bg-emerald-50 rounded-2xl font-black text-lg shadow-xl active:scale-95 transition-all"
              >
                <span>Mulai Berlangganan Sekarang</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>

          {/* Footer Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 pt-12 border-t border-slate-800/80">
            <div className="space-y-6 md:col-span-1">
              <div className="flex items-center gap-3">
                <div className="p-1 bg-white rounded-xl">
                  <img src="/ups-heru-logo.jpg" alt="UPS HERU Logo" className="w-10 h-10 rounded-lg object-contain" />
                </div>
                <span className="font-black text-xl tracking-tight text-white">UPS HERU</span>
              </div>
              <p className="text-slate-400 text-sm font-medium leading-relaxed">
                Platform digital layanan retribusi dan operasional pengangkutan sampah terpadu UPS HERU Kota Depok.
              </p>
            </div>

            <div className="space-y-4">
              <p className="font-bold text-slate-200 uppercase tracking-wider text-xs">Layanan Warga</p>
              <ul className="space-y-3 text-slate-400 font-medium text-sm">
                <li><Link href="/lacak" className="hover:text-emerald-400 transition-colors">Lacak Armada</Link></li>
                <li><Link href="/bayar" className="hover:text-emerald-400 transition-colors">Cek Tagihan</Link></li>
                <li><Link href="/pengaduan" className="hover:text-emerald-400 transition-colors">Pengaduan</Link></li>
                <li><Link href="/tarif" className="hover:text-emerald-400 transition-colors">Tarif Resmi</Link></li>
              </ul>
            </div>

            <div className="space-y-4">
              <p className="font-bold text-slate-200 uppercase tracking-wider text-xs">Kontak Resmi</p>
              <ul className="space-y-3 text-slate-400 font-medium text-sm">
                <li>WA: <a href="https://wa.me/6281400782617" target="_blank" rel="noreferrer" className="text-emerald-400 font-bold hover:text-emerald-300 transition-colors">0814-0078-2617</a></li>
                <li>Email: <a href="mailto:cv.herozerowaste@gmail.com" className="hover:text-white transition-colors">cv.herozerowaste@gmail.com</a></li>
                <li className="pt-2 text-xs opacity-70">Senin - Sabtu (06:00 - 17:00 WIB)</li>
              </ul>
            </div>

            <div className="space-y-4">
              <p className="font-bold text-slate-200 uppercase tracking-wider text-xs">Kantor Operasional</p>
              <p className="text-slate-400 font-medium leading-relaxed text-sm">
                Jl. Kandang Ayam, Kalibaru, Kec. Cilodong, Kota Depok, Jawa Barat 16414
              </p>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800/80 text-center text-slate-500 text-sm font-medium flex flex-col md:flex-row items-center justify-between gap-4">
            <span>© {new Date().getFullYear()} UPS HERU Kota Depok. Hak Cipta Dilindungi.</span>
            <div className="flex items-center gap-6">
              <Link href="/login" className="hover:text-white transition-colors">Portal Petugas</Link>
              <span>Didukung oleh <a href="https://wastepay.id" className="text-emerald-500 hover:text-emerald-400 font-bold">wastepay.id</a></span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
