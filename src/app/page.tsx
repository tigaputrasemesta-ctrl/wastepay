import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
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
  Home,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  AlertCircle,
  ShoppingBag,
  PackageCheck,
  Leaf,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

import JsonLd from "@/components/JsonLd";
import PublicNavbar from "@/components/PublicNavbar";
import CivicHeroWidget from "@/components/CivicHeroWidget";
import { generateLocalBusinessJsonLd } from "@/lib/seo";
import { DEFAULT_ARTIKEL, getArticleCoverImage, cleanArticleSnippet } from "@/lib/default-articles";
import ArticleImage from "@/components/ArticleImage";
import { NativeGuardedLink } from "@/components/mobile/LandingApkBanner";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";
import { getLayananImages } from "@/lib/layanan-images";
import { headers } from "next/headers";
import { resolveTenantByHost } from "@/lib/tenant";
import O2WHeroCorePortal from "@/components/core/O2WHeroCorePortal";

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
  const headersList = await headers();
  const host = headersList.get("host") || "";
  const tenantCtx = resolveTenantByHost(host);

  // Jika domain yang diakses adalah Core Hub (o2whero.com)
  if (tenantCtx.isCore) {
    return <O2WHeroCorePortal />;
  }

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

  const existingSlugs = new Set(artikelTop3.map((a) => a.slug));
  const fallbackList = DEFAULT_ARTIKEL.filter((a) => !existingSlugs.has(a.slug));
  const displayedArticles = [...artikelTop3, ...fallbackList].slice(0, 3);

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

  let layananImages = {
    rumahTangga: "/images/layanan/rumah-tangga.jpg",
    niaga: "/images/layanan/niaga-usaha.jpg",
    rtRw: "/images/layanan/rt-rw-kolektif.jpg",
  };
  try {
    layananImages = await getLayananImages();
  } catch {
    // fallback to default
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 font-sans selection:bg-[#0d7a75] selection:text-white overflow-x-hidden transition-colors">
      <JsonLd data={generateLocalBusinessJsonLd()} />

      {/* ── Primary Public Navbar ── */}
      <PublicNavbar />

      <main>
        {/* ── 3. Hero Section (Editorial + Dashboard Console ala BeCycle) ── */}
        <section className="bg-white border-b border-slate-200 py-10 sm:py-16 md:py-20 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto grid md:grid-cols-12 gap-8 lg:gap-14 items-center">
            {/* Left Column: Editorial Value Proposition (7 cols) */}
            <div className="md:col-span-7 space-y-5 sm:space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#e8f5f4] border border-[#d1ecea] text-[#0d7a75] text-[11px] sm:text-xs font-bold max-w-full">
                <span className="w-2 h-2 rounded-full bg-[#0d7a75] shrink-0" />
                <span className="truncate">Pengelolaan Sampah Terpadu • Kota Depok 2026</span>
              </div>

              <h1 className="text-2xl xs:text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.2] sm:leading-[1.18]">
                Solusi Pengelolaan Sampah yang{" "}
                <span className="text-[#0d7a75]">Memudahkan Warga</span> & Menjaga Lingkungan.
              </h1>

              <p className="text-xs sm:text-base text-slate-600 leading-relaxed font-normal max-w-xl">
                Platform operasional resmi UPS HERU (TPS 3R Kalibaru Kota Depok). Kami menghubungkan ribuan rumah tangga dan unit usaha di Depok dengan kepastian jadwal angkut, pelacakan armada live GPS, dan kemudahan pembayaran retribusi digital via QRIS.
              </p>

              {/* Action Buttons */}
              <div className="space-y-3 pt-1 sm:pt-2">
                <div className="flex flex-col sm:flex-row flex-wrap gap-2.5 sm:gap-3">
                  <Link
                    href="/daftar"
                    className="w-full sm:w-auto px-5 py-3.5 bg-[#0d7a75] hover:bg-[#0b6460] text-white rounded-xl font-bold text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                    <Home className="w-4 h-4 shrink-0" />
                    <span>Daftar Langganan</span>
                  </Link>

                  <Link
                    href="/pickup"
                    className="w-full sm:w-auto px-5 py-3.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-2 border-emerald-400 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-xs active:scale-95"
                  >
                    <PackageCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Pickup Sekali Angkut</span>
                  </Link>
                </div>

                {/* Info Marketplace Produk & Pengaduan Warga */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs text-slate-500 pt-1">
                  <p className="flex items-center gap-1.5">
                    <span>Butuh pupuk kompos atau produk olahan?</span>
                    <a href="#produk-olahan" className="text-[#0d7a75] hover:underline font-bold inline-flex items-center gap-0.5">
                      <span>Lihat Produk Olahan</span>
                      <ChevronRight className="w-3 h-3" />
                    </a>
                  </p>
                  <span className="hidden sm:inline text-slate-300 dark:text-zinc-700">•</span>
                  <p className="flex items-center gap-1.5">
                    <span>Sudah langganan?</span>
                    <Link href="/pengaduan" className="text-rose-600 hover:text-rose-700 font-bold hover:underline inline-flex items-center gap-0.5">
                      <span>Pengaduan Warga</span>
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  </p>
                </div>
              </div>

              {/* Metadata strip (Inspired by BeCycle specs row) */}
              <div className="pt-4 border-t border-slate-100 grid grid-cols-2 sm:flex sm:flex-wrap gap-3 sm:gap-x-6 sm:gap-y-2 text-xs text-slate-500 font-medium">
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

          {/* Municipal Trust Badge Bar */}
          <div className="mt-8 p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 font-black shadow-xs">
                ✓
              </div>
              <div>
                <span className="font-extrabold text-slate-900 block">Fasilitas Resmi TPS 3R Kalibaru Kota Depok</span>
                <span className="text-slate-500 text-[11px]">Binaan DLHK Kota Depok • Pengolahan Terintegrasi Kompos & Daur Ulang</span>
              </div>
            </div>
            <div className="flex items-center gap-2 font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200/60 shrink-0">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Garansi Jemput Susulan 1x24 Jam</span>
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
        <section className="py-16 md:py-20 px-4 sm:px-6 bg-slate-50 dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-800">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="max-w-2xl space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#0d7a75] dark:text-emerald-400 block">
                  Solusi Terintegrasi
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-zinc-100 tracking-tight">
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
                <Link href="#jadwal" className="text-xs font-bold text-[#0d7a75] hover:underline inline-flex items-center gap-1">
                  <span>Lihat Jadwal Penjemputan</span>
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

        {/* ── 6. Paket & Kategori Layanan (Inspired by BeCycle Waste Registry) ── */}
        <section className="py-16 md:py-20 px-4 sm:px-6 bg-slate-50 dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-800">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0d7a75] dark:text-emerald-400">
                Pilihan Retribusi
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-zinc-100 tracking-tight">
                Paket Layanan Sesuai Kebutuhan Anda
              </h2>
              <p className="text-sm text-slate-600">
                Pilih skema penjemputan sampah yang paling tepat untuk rumah tinggal perorangan, tempat usaha komersial, maupun kerjasama lingkungan RT/RW.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 items-stretch">
              {/* Tier 1: Warga Rumah Tangga */}
              <div className="group bg-white border-2 border-[#0d7a75] rounded-2xl overflow-hidden flex flex-col justify-between shadow-sm relative mt-5 md:mt-0 hover:shadow-lg transition-all duration-300">
                {/* Popular Ribbon Header */}
                <div className="bg-[#0d7a75] text-white text-[11px] font-extrabold uppercase py-1.5 px-4 text-center tracking-wider flex items-center justify-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span>Pilihan Terpopuler Warga Depok</span>
                </div>

                {/* Banner Visual Layanan */}
                <div className="relative aspect-[16/9] w-full bg-slate-900 overflow-hidden border-b border-slate-100">
                  <Image
                    src={layananImages.rumahTangga}
                    alt="Layanan Pengangkutan Sampah Rumah Tangga UPS HERU Kota Depok"
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-500 opacity-95"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />
                  <span className="absolute bottom-2.5 left-3.5 text-[11px] font-bold text-white drop-shadow flex items-center gap-1.5 z-10">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    Penjemputan Depan Pagar (2–3x / mgg)
                  </span>
                </div>

                <div className="p-5 sm:p-7 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-900">Rumah Tangga / Warga</h3>
                      <p className="text-xs text-slate-500 mt-1">Untuk pemukiman warga perorangan & komplek cluster</p>
                    </div>
                    <div className="py-2.5 border-y border-slate-100">
                      <span className="text-xs text-slate-400 font-medium">Mulai dari</span>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-3xl font-extrabold text-slate-900">Rp 40.000</span>
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
                  <div className="pt-4">
                    <Link
                      href="/daftar?kategori=R1"
                      className="w-full py-3 bg-[#0d7a75] hover:bg-[#0b6460] text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <span>Daftar Rumah Tangga</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Tier 2: Niaga & Toko */}
              <div className="group bg-white border border-slate-200/90 rounded-2xl overflow-hidden flex flex-col justify-between shadow-xs hover:border-slate-400 hover:shadow-lg transition-all duration-300">
                {/* Banner Visual Layanan */}
                <div className="relative aspect-[16/9] w-full bg-slate-900 overflow-hidden border-b border-slate-100">
                  <Image
                    src={layananImages.niaga}
                    alt="Layanan Pengangkutan Sampah Usaha & Toko Niaga UPS HERU"
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-500 opacity-95"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />
                  <span className="absolute bottom-2.5 left-3.5 text-[11px] font-bold text-white drop-shadow flex items-center gap-1.5 z-10">
                    <span className="w-2 h-2 rounded-full bg-sky-400" />
                    Volume Komersial & Jadwal Rutin
                  </span>
                </div>

                <div className="p-5 sm:p-7 flex-1 flex flex-col justify-between space-y-4">
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
                  <div className="pt-4">
                    <Link
                      href="/daftar?kategori=B1"
                      className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <span>Daftar Unit Usaha</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Tier 3: RT/RW & Kolektif */}
              <div className="group bg-white border border-slate-200/90 rounded-2xl overflow-hidden flex flex-col justify-between shadow-xs hover:border-slate-400 hover:shadow-lg transition-all duration-300">
                {/* Banner Visual Layanan */}
                <div className="relative aspect-[16/9] w-full bg-slate-900 overflow-hidden border-b border-slate-100">
                  <Image
                    src={layananImages.rtRw}
                    alt="Kerjasama Pengelolaan Sampah Lingkungan RT/RW Paguyuban UPS HERU"
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-500 opacity-95"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />
                  <span className="absolute bottom-2.5 left-3.5 text-[11px] font-bold text-white drop-shadow flex items-center gap-1.5 z-10">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    Skema Kolektif Lingkungan
                  </span>
                </div>

                <div className="p-5 sm:p-7 flex-1 flex flex-col justify-between space-y-4">
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
                  <div className="pt-4">
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
          </div>
        </section>

        {/* ── 6b. Produk Resmi Olahan TPS 3R UPS HERU (Kotak2 Produk Seperti Paket Layanan) ── */}
        <section id="produk-olahan" className="py-16 md:py-20 px-4 sm:px-6 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0d7a75] dark:text-emerald-400 flex items-center justify-center gap-1.5">
                <Leaf className="w-3.5 h-3.5" />
                <span>Ekonomi Sirkular Kota Depok</span>
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-zinc-100 tracking-tight">
                Produk Resmi Olahan TPS 3R UPS HERU
              </h2>
              <p className="text-sm text-slate-600 dark:text-zinc-400">
                Pilih produk turunan hasil biokonversi dan daur ulang sampah terpilah. Setiap pembelian langsung membuka halaman produk resmi untuk pemesanan instan tanpa repot.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 items-stretch">
              {/* Box 1: Pupuk Kompos Organik 5kg */}
              <div className="group bg-slate-50 dark:bg-zinc-950 border-2 border-slate-200 dark:border-zinc-800 hover:border-[#0d7a75] dark:hover:border-emerald-500 rounded-2xl overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-xl transition-all duration-300">
                <div className="bg-[#0d7a75] text-white text-[11px] font-extrabold uppercase py-1.5 px-4 text-center tracking-wider flex items-center justify-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span>Pilihan Terfavorit Pekarangan</span>
                </div>

                <div className="relative aspect-[16/10] w-full bg-slate-900 overflow-hidden border-b border-slate-100 dark:border-zinc-800">
                  <img
                    src="https://images.unsplash.com/photo-1585336261026-699708785089?auto=format&fit=crop&w=600&q=80"
                    alt="Pupuk Kompos Organik TPS 3R UPS HERU 5kg"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-95"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />
                  <span className="absolute bottom-2.5 left-3.5 text-[11px] font-bold text-white drop-shadow flex items-center gap-1.5 z-10">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    Pupuk Organik Matang (5 Kg)
                  </span>
                </div>

                <div className="p-5 sm:p-7 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                        Pupuk Kompos Organik (5 kg)
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                        Fermentasi sampah organik dapur warga TPS 3R Kalibaru
                      </p>
                    </div>
                    <div className="py-2.5 border-y border-slate-200/80 dark:border-zinc-800">
                      <span className="text-xs text-slate-400 font-medium">Harga Resmi</span>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-3xl font-extrabold text-slate-900 dark:text-white">Rp 25.000</span>
                        <span className="text-xs text-slate-500">/ sak</span>
                      </div>
                    </div>
                    <ul className="space-y-2.5 text-xs text-slate-600 dark:text-zinc-300 font-medium">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#0d7a75] shrink-0 mt-0.5" />
                        <span>Kaya unsur hara makro & mikro alami</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#0d7a75] shrink-0 mt-0.5" />
                        <span>Menggemburkan tanah & menyuburkan tanaman</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#0d7a75] shrink-0 mt-0.5" />
                        <span>Steril dari bakteri jahat & bebas biji gulma</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#0d7a75] shrink-0 mt-0.5" />
                        <span>Bisa diantar kurir atau ambil di lokasi TPS 3R</span>
                      </li>
                    </ul>
                  </div>

                  <div className="pt-4">
                    <Link
                      href="/marketplace/pupuk-kompos-organik-5kg"
                      className="w-full py-3.5 bg-[#0d7a75] hover:bg-[#0b6460] text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 active:scale-95"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>Buka Produk & Pesan</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Box 2: Pupuk Organik Cair (POC) 1 Liter */}
              <div className="group bg-slate-50 dark:bg-zinc-950 border-2 border-slate-200 dark:border-zinc-800 hover:border-emerald-500 rounded-2xl overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-xl transition-all duration-300">
                <div className="bg-emerald-700 text-white text-[11px] font-extrabold uppercase py-1.5 px-4 text-center tracking-wider flex items-center justify-center gap-1.5">
                  <Leaf className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                  <span>Konsentrat Nutrisi Daun & Akar</span>
                </div>

                <div className="relative aspect-[16/10] w-full bg-slate-900 overflow-hidden border-b border-slate-100 dark:border-zinc-800">
                  <img
                    src="https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&w=600&q=80"
                    alt="Pupuk Organik Cair POC UPS HERU 1 Liter"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-95"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />
                  <span className="absolute bottom-2.5 left-3.5 text-[11px] font-bold text-white drop-shadow flex items-center gap-1.5 z-10">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    Bio-Nutrisi Tanaman (1 Liter)
                  </span>
                </div>

                <div className="p-5 sm:p-7 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                        Pupuk Organik Cair (POC) 1L
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                        Konsentrat mikroorganisme baik siap campur semprot
                      </p>
                    </div>
                    <div className="py-2.5 border-y border-slate-200/80 dark:border-zinc-800">
                      <span className="text-xs text-slate-400 font-medium">Harga Resmi</span>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-3xl font-extrabold text-slate-900 dark:text-white">Rp 35.000</span>
                        <span className="text-xs text-slate-500">/ botol</span>
                      </div>
                    </div>
                    <ul className="space-y-2.5 text-xs text-slate-600 dark:text-zinc-300 font-medium">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>Kaya mikroba aktif pemacu pertumbuhan</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>Mudah diserap daun melalui stomata</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>Sangat hemat, 1 botol menghasilkan puluhan liter</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>Aman untuk tanaman sayur konsumsi & hias</span>
                      </li>
                    </ul>
                  </div>

                  <div className="pt-4">
                    <Link
                      href="/marketplace/poc-nutrisi-tanaman-1l"
                      className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 active:scale-95"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>Buka Produk & Pesan</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Box 3: Tempat Sampah Pilah 2-in-1 */}
              <div className="group bg-slate-50 dark:bg-zinc-950 border-2 border-slate-200 dark:border-zinc-800 hover:border-teal-500 rounded-2xl overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-xl transition-all duration-300">
                <div className="bg-teal-700 text-white text-[11px] font-extrabold uppercase py-1.5 px-4 text-center tracking-wider flex items-center justify-center gap-1.5">
                  <PackageCheck className="w-3.5 h-3.5 text-teal-300 shrink-0" />
                  <span>Solusi Pilah Praktis Keluarga</span>
                </div>

                <div className="relative aspect-[16/10] w-full bg-slate-900 overflow-hidden border-b border-slate-100 dark:border-zinc-800">
                  <img
                    src="https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=600&q=80"
                    alt="Tempat Sampah Pilah 2 in 1 UPS HERU"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-95"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />
                  <span className="absolute bottom-2.5 left-3.5 text-[11px] font-bold text-white drop-shadow flex items-center gap-1.5 z-10">
                    <span className="w-2 h-2 rounded-full bg-teal-400" />
                    Kapasitas 2×20 Liter Pedal
                  </span>
                </div>

                <div className="p-5 sm:p-7 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                        Tempat Sampah Pilah 2-in-1
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                        Kompartemen terpisah pedal higienis untuk dapur & ruang kerja
                      </p>
                    </div>
                    <div className="py-2.5 border-y border-slate-200/80 dark:border-zinc-800">
                      <span className="text-xs text-slate-400 font-medium">Harga Resmi</span>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-3xl font-extrabold text-slate-900 dark:text-white">Rp 120.000</span>
                        <span className="text-xs text-slate-500">/ set</span>
                      </div>
                    </div>
                    <ul className="space-y-2.5 text-xs text-slate-600 dark:text-zinc-300 font-medium">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                        <span>Dua ruang pisah: Organik & Anorganik</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                        <span>Sistem pedal kaki higienis tanpa sentuh tangan</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                        <span>Bahan kokoh berkualitas tahan lama</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                        <span>Mempermudah pemilahan langsung dari rumah</span>
                      </li>
                    </ul>
                  </div>

                  <div className="pt-4">
                    <Link
                      href="/marketplace/tempat-sampah-pilah-2in1"
                      className="w-full py-3.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 active:scale-95"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>Buka Produk & Pesan</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Link to Full Marketplace Catalog */}
            <div className="text-center pt-2">
              <Link
                href="/marketplace"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 font-bold text-xs sm:text-sm transition-all shadow-xs active:scale-95"
              >
                <ShoppingBag className="w-4 h-4 text-[#0d7a75] dark:text-emerald-400" />
                <span>Lihat Semua Produk (Maggot BSF, Kompos Curah 20kg & Kantong Ramah Lingkungan)</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* ── 7. Cakupan Wilayah & Rute Operasional Depok ── */}
        <section className="py-14 sm:py-18 px-4 sm:px-6 bg-slate-50 dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-800">
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="space-y-1.5 max-w-2xl">
                <span className="text-xs font-bold uppercase tracking-wider text-[#0d7a75] dark:text-emerald-400 block">
                  Jangkauan Armada Depok
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-zinc-100 tracking-tight">
                  Wilayah Operasional Aktif Terlayani
                </h2>
                <p className="text-xs sm:text-sm text-slate-600">
                  Penjemputan rutin armada truk pickup & motor roda 3 melintasi kelurahan berikut di Kota Depok:
                </p>
              </div>
              <a
                href="https://wa.me/6281400782617?text=Halo%20UPS%20HERU,%20apakah%20lingkungan%20saya%20sudah%20termasuk%20wilayah%20layanan%20pengangkutan?"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0d7a75] hover:underline shrink-0"
              >
                <span>Konsultasi Jangkauan Wilayah via WA</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              {[
                { name: "Kalibaru", days: "Sen, Rab, Jum", area: "Zona Inti TPS 3R & Poros Utama" },
                { name: "Cilodong", days: "Sel, Kam, Sab", area: "Pemukiman Warga & Ruko Raya" },
                { name: "Jatimulya", days: "Sen, Rab, Jum", area: "Cluster Perumahan & Perkampungan" },
                { name: "Sukamaju", days: "Sel, Kam, Sab", area: "Poros Tole Iskandar & Sekitarnya" },
                { name: "Kalimulya", days: "Sen, Kam, Sab", area: "Kebon Duren & Sektor Pemukiman" },
              ].map((w, i) => (
                <div key={i} className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-1.5 hover:border-[#0d7a75]/40 transition-all">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-900">
                    <MapPin className="w-3.5 h-3.5 text-[#0d7a75] shrink-0" />
                    <span>Kel. {w.name}</span>
                  </div>
                  <p className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md inline-block">
                    {w.days}
                  </p>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    {w.area}
                  </p>
                </div>
              ))}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <div className="p-4 sm:p-6 rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex sm:flex-col items-start gap-3.5 sm:gap-0 sm:space-y-3">
                <span className="w-8 h-8 rounded-lg bg-[#0d7a75] text-white font-extrabold text-sm flex items-center justify-center shrink-0">
                  1
                </span>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">Pendaftaran Online</h3>
                  <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed font-normal">
                    Isi formulir pendaftaran dengan nama, alamat rumah/usaha, RT/RW, dan nomor WhatsApp aktif Anda.
                  </p>
                </div>
              </div>

              <div className="p-4 sm:p-6 rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex sm:flex-col items-start gap-3.5 sm:gap-0 sm:space-y-3">
                <span className="w-8 h-8 rounded-lg bg-[#0d7a75] text-white font-extrabold text-sm flex items-center justify-center shrink-0">
                  2
                </span>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">Verifikasi & Penentuan Rute</h3>
                  <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed font-normal">
                    Petugas operasional memvalidasi lokasi penjemputan dan menetapkan hari jadwal rute yang melintas.
                  </p>
                </div>
              </div>

              <div className="p-4 sm:p-6 rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex sm:flex-col items-start gap-3.5 sm:gap-0 sm:space-y-3">
                <span className="w-8 h-8 rounded-lg bg-[#0d7a75] text-white font-extrabold text-sm flex items-center justify-center shrink-0">
                  3
                </span>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">Penjemputan Rutin</h3>
                  <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed font-normal">
                    Letakkan wadah sampah di depan pagar pada hari jadwal; armada kami akan mengangkut sampah secara teratur.
                  </p>
                </div>
              </div>

              <div className="p-4 sm:p-6 rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex sm:flex-col items-start gap-3.5 sm:gap-0 sm:space-y-3">
                <span className="w-8 h-8 rounded-lg bg-[#0d7a75] text-white font-extrabold text-sm flex items-center justify-center shrink-0">
                  4
                </span>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">Tagihan WhatsApp & QRIS</h3>
                  <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed font-normal">
                    Terima rincian tagihan via WhatsApp di awal bulan dan selesaikan pembayaran instan via QRIS kapan saja.
                  </p>
                </div>
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
        <section className="py-16 md:py-20 px-4 sm:px-6 bg-slate-50 dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-800">
          <div className="max-w-6xl mx-auto space-y-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
              <div className="max-w-2xl space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-[#0d7a75] dark:text-emerald-400 block">
                  Edukasi Lingkungan
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-zinc-100 tracking-tight">
                  Kabar & Panduan Praktis Kebersihan
                </h2>
                <p className="text-sm text-slate-600">
                  Panduan memilah sampah di rumah, informasi armada kebersihan, dan kabar TPS 3R Kota Depok.
                </p>
              </div>
              <Link
                href="/artikel"
                className="inline-flex items-center justify-center w-full sm:w-auto gap-1.5 px-4 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors shrink-0 shadow-xs"
              >
                <span>Lihat Semua Artikel</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {displayedArticles.map((a) => {
                const cover = getArticleCoverImage(a.gambar, a.kategori);
                const snippet = cleanArticleSnippet(a.isi, 130);
                return (
                  <Link
                    key={a.id}
                    href={`/artikel/${a.slug}`}
                    className="group flex flex-col bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs hover:shadow-md hover:border-emerald-300 transition-all"
                  >
                    <div className="h-44 bg-slate-900 border-b border-slate-100 relative overflow-hidden flex items-center justify-center">
                      <ArticleImage
                        src={cover}
                        alt={a.judul}
                        fallbackCategory={a.kategori}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <span className="absolute top-3 left-3 px-2.5 py-0.5 bg-black/60 backdrop-blur-md text-white text-[10px] font-extrabold uppercase rounded-md shadow-xs z-10">
                        {a.kategori}
                      </span>
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                      <div className="space-y-2">
                        <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors leading-snug">
                          {a.judul}
                        </h3>
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed font-normal">
                          {snippet}
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
                );
              })}
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
              <details className="group bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 sm:p-5 transition-all open:ring-1 open:ring-[#0d7a75]">
                <summary className="font-bold text-xs sm:text-sm text-slate-900 dark:text-zinc-100 cursor-pointer list-none flex items-center justify-between gap-3">
                  <span>1. Berapa kali dalam seminggu sampah rumah tangga saya dijemput?</span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-open:rotate-90 transition-transform shrink-0" />
                </summary>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 mt-3 leading-relaxed pt-2 border-t border-slate-200/80 dark:border-zinc-800">
                  Untuk paket rumah tangga standar, penjemputan dilakukan secara rutin 2 hingga 3 kali seminggu sesuai jadwal zona jalan Anda (misal Senin–Rabu–Jumat atau Selasa–Kamis–Sabtu). Jam operasional armada berlangsung mulai pukul 07.00 hingga 17.00 WIB.
                </p>
              </details>

              <details className="group bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 sm:p-5 transition-all open:ring-1 open:ring-[#0d7a75]">
                <summary className="font-bold text-xs sm:text-sm text-slate-900 dark:text-zinc-100 cursor-pointer list-none flex items-center justify-between gap-3">
                  <span>2. Bagaimana jika sampah saya terlewat dan belum terangkut oleh petugas?</span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-open:rotate-90 transition-transform shrink-0" />
                </summary>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 mt-3 leading-relaxed pt-2 border-t border-slate-200/80 dark:border-zinc-800">
                  Bila pintu pagar terkunci atau armada belum sempat melintas, Anda dapat langsung membuat laporan melalui menu &quot;Pengaduan&quot; di situs ini atau chat ke WhatsApp CS resmi. Tim reaksi cepat kami akan melakukan penjemputan susulan maksimal 1x24 jam.
                </p>
              </details>

              <details className="group bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 sm:p-5 transition-all open:ring-1 open:ring-[#0d7a75]">
                <summary className="font-bold text-xs sm:text-sm text-slate-900 dark:text-zinc-100 cursor-pointer list-none flex items-center justify-between gap-3">
                  <span>3. Apakah UPS HERU melayani sampah skala besar (puing renovasi / tebangan pohon)?</span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-open:rotate-90 transition-transform shrink-0" />
                </summary>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 mt-3 leading-relaxed pt-2 border-t border-slate-200/80 dark:border-zinc-800">
                  Ya, kami melayani pengangkutan khusus volume besar (insidental) seperti puing bangunan, dahan/pohon tebangan, atau pembersihan gudang dengan tarif borongan terpisah menggunakan truk engkel/dump truck. Silakan hubungi Call Center WhatsApp untuk survei volume dan estimasi biaya.
                </p>
              </details>

              <details className="group bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 sm:p-5 transition-all open:ring-1 open:ring-[#0d7a75]">
                <summary className="font-bold text-xs sm:text-sm text-slate-900 dark:text-zinc-100 cursor-pointer list-none flex items-center justify-between gap-3">
                  <span>4. Bagaimana cara pembayaran tagihan jika warga tidak memiliki mobile banking?</span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-open:rotate-90 transition-transform shrink-0" />
                </summary>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 mt-3 leading-relaxed pt-2 border-t border-slate-200/80 dark:border-zinc-800">
                  Pembayaran QRIS dapat di-scan melalui dompet digital apa pun (GoPay, OVO, ShopeePay, Dana, LinkAja) atau dibantu oleh gerai minimarket/agen pembayaran terdekat. Warga juga dapat melakukan pembayaran tunai langsung di kantor operasional UPS HERU atau melalui petugas resmi berbekal kwitansi digital.
                </p>
              </details>

              <details className="group bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 sm:p-5 transition-all open:ring-1 open:ring-[#0d7a75]">
                <summary className="font-bold text-xs sm:text-sm text-slate-900 dark:text-zinc-100 cursor-pointer list-none flex items-center justify-between gap-3">
                  <span>5. Bagaimana prosedur pendaftaran kolektif satu lingkungan RT atau perumahan?</span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-open:rotate-90 transition-transform shrink-0" />
                </summary>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 mt-3 leading-relaxed pt-2 border-t border-slate-200/80 dark:border-zinc-800">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 text-xs">
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
            </div>

            {/* Col 2: Layanan Warga */}
            <div className="space-y-3">
              <p className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">Layanan Warga</p>
              <ul className="space-y-2 text-slate-400 font-medium">
                <li>
                  <Link href="/pickup" className="hover:text-white transition-colors">
                    Pickup Sampah Sekali Angkut
                  </Link>
                </li>
                <li>
                  <Link href="/marketplace" className="hover:text-white transition-colors">
                    Toko Pupuk Kompos & Daur Ulang
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

          <div className="pt-6 border-t border-slate-800 text-slate-500 text-xs flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <span>© {new Date().getFullYear()} UPS HERU Kota Depok. Hak Cipta Dilindungi.</span>
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
              <Link href="/login" className="hover:text-white transition-colors">
                Portal Petugas
              </Link>
              <NativeGuardedLink href="/unduh" className="hover:text-white transition-colors">
                App Android Petugas
              </NativeGuardedLink>
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

      {/* Floating WA Button (Khusus Landing Page) */}
      <FloatingWhatsApp phoneNumber="6281400782617" />
    </div>
  );
}
