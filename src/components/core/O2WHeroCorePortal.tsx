"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Truck,
  QrCode,
  Recycle,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  Building2,
  Users,
  ShieldCheck,
  PhoneCall,
  Loader2,
  ChevronDown,
  Sparkles,
  Wallet,
  Calendar,
  LogIn,
  Check,
  MapPin,
  Clock,
  HelpCircle,
  TrendingUp,
  Sliders,
  DollarSign,
  AlertTriangle,
  Award,
  Star,
  CheckCheck,
  X,
  Smartphone,
  PieChart,
  Navigation,
  MessageSquare,
  BadgeCheck,
} from "lucide-react";

export default function O2WHeroCorePortal() {
  // ── State Formulir Kemitraan ──
  const [form, setForm] = useState({
    namaLengkap: "",
    namaInstansi: "",
    jenisUsaha: "tps3r",
    wilayahOperasional: "Kota Depok",
    estimasiWarga: "1500",
    noWhatsapp: "",
    email: "",
    paketPilihan: "pro_2jt",
  });

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // ── State Kalkulator ROI / Simulasi Keuntungan Mitra ──
  const [kalkulatorKK, setKalkulatorKK] = useState(1500);
  const [kalkulatorTarif, setKalkulatorTarif] = useState(35000);

  // ── State Tab Showcase Sudut Pandang ──
  const [activeTab, setActiveTab] = useState<"pengurus" | "supir" | "warga" | "bendahara">("pengurus");

  // Perhitungan Kalkulator Keuntungan Paket Kemitraan (Rp 2 Jt + 10% Komisi)
  const grossBulanan = kalkulatorKK * kalkulatorTarif;
  const subsBulanan = 2000000;
  const komisiPlatform = Math.round(grossBulanan * 0.1); // 10%
  const kasBersihMitra = Math.max(0, grossBulanan - subsBulanan - komisiPlatform);
  const tunggakanManualLost = Math.round(grossBulanan * 0.35); // rata-rata 35% iuran nunggak jika cara manual
  const surplusKeuntungan = Math.max(0, tunggakanManualLost - subsBulanan - komisiPlatform);

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(num);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const payload = {
        namaLengkap: form.namaLengkap,
        namaInstansi: form.namaInstansi,
        jenisUsaha: form.jenisUsaha,
        noWhatsapp: form.noWhatsapp,
        email: form.email,
        kota: form.wilayahOperasional,
        estimasiWarga: Number(form.estimasiWarga) || 0,
        kebutuhanDb: form.paketPilihan === "enterprise" ? "dedicated" : "shared_rls",
        catatanAdmin: `Pilihan Paket: ${
          form.paketPilihan === "pro_2jt"
            ? "PAKET KEMITRAAN ALL-IN-ONE (RP 2 JT + KOMISI 10%)"
            : form.paketPilihan.toUpperCase()
        }`,
      };

      const res = await fetch("/api/core/mitra/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mengirim formulir pendaftaran kemitraan.");
      }

      setSuccessMsg(
        "Pendaftaran berhasil terkirim! Tim Senior O2W HERO akan segera menghubungi WhatsApp Anda untuk koordinasi setup portal dan demonstrasi langsung."
      );
      setForm({
        namaLengkap: "",
        namaInstansi: "",
        jenisUsaha: "tps3r",
        wilayahOperasional: "Kota Depok",
        estimasiWarga: "1500",
        noWhatsapp: "",
        email: "",
        paketPilihan: "pro_2jt",
      });
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kendala koneksi server. Silakan coba kembali.");
    } finally {
      setLoading(false);
    }
  };

  const faqs = [
    {
      q: "Bagaimana cara kerja skema Paket Kemitraan (Rp 2 Juta / bln + 10% Komisi Transaksi)?",
      a: "Skema ini adalah kemitraan bagi hasil yang adil dan transparan. Mitra membayar biaya langganan sistem all-in-one sebesar Rp 2.000.000 / bulan untuk membuka seluruh fitur tanpa batasan (domain sendiri, unlimited KK, aplikasi supir GPS, dual WA bot, dll). Ditambah komisi platform 10% hanya dari setiap transaksi pembayaran iuran warga yang berhasil lunas via QRIS/VA. Jika warga belum bayar, kami tidak memotong komisi, sehingga tim kami ikut bertanggung jawab menyukseskan penerimaan iuran Anda.",
    },
    {
      q: "Apakah warga perlu menghafal kode pelanggan atau login aplikasi?",
      a: "Sama sekali tidak perlu! O2W HERO secara otomatis menggunakan nomor WhatsApp warga sebagai nomor akun pelanggan resmi. Warga cukup mengecek tagihan dan membayar langsung via pesan WhatsApp atau website dengan memasukkan nomor HP mereka sendiri. Bebas lupa, bebas ribet.",
    },
    {
      q: "Apakah kami mendapatkan website resmi dengan nama domain sendiri?",
      a: "Ya! Pada Paket Kemitraan All-in-One, mitra pengelola mendapatkan website resmi dengan nama domain sendiri (seperti contoh pilot project kami: upsheru.com atau nama-tps3r-daerah.com). Setup domain, integrasi server cloud, dan sertifikat SSL resmi disediakan gratis tanpa biaya tambahan.",
    },
    {
      q: "Bagaimana aplikasi supir armada sampah bekerja di lapangan?",
      a: "Aplikasi petugas dirancang sangat ringan, berjalan lancar di HP Android biasa, hemat baterai, dan ramah kuota. Supir tinggal membuka aplikasi untuk melihat daftar rumah warga yang terurut di rute jalannya, mencentang rumah yang sampahnya sudah diambil, serta absen masuk menggunakan koordinat GPS yang akurat.",
    },
    {
      q: "Kapan dan bagaimana uang iuran warga yang terkumpul dicairkan?",
      a: "Semua uang pembayaran iuran warga yang masuk via QRIS atau Virtual Account tercatat secara real-time di sistem virtual ledger. Uang kas operasional akan otomatis dicairkan ke rekening bank resmi mitra secara terjadwal setiap minggu tanpa potongan tersembunyi.",
    },
    {
      q: "Berapa lama proses setup hingga sistem siap dipakai di lapangan?",
      a: "Sangat cepat. Tim teknis O2W HERO akan membantu proses input data warga, konfigurasi WhatsApp Bot, aktivasi QRIS, dan panduan supir armada sehingga portal Anda siap beroperasi dalam 1x24 jam.",
    },
  ];

  // ── JSON-LD Structured Data Schema untuk SEO Maksimal ──
  const jsonLdSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "name": "O2W HERO",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Web, Android, iOS",
        "description":
          "Platform SaaS Pengelolaan Sampah Terpadu & Retribusi QRIS untuk TPS3R, Bank Sampah, dan Kelurahan di seluruh Indonesia.",
        "offers": {
          "@type": "Offer",
          "price": "2000000",
          "priceCurrency": "IDR",
          "availability": "https://schema.org/InStock",
          "description": "Paket Kemitraan All-in-One TPS3R (Rp 2 Juta / bulan + 10% Komisi Transaksi)",
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.9",
          "reviewCount": "1253",
        },
      },
      {
        "@type": "Organization",
        "name": "O2W HERO",
        "url": "https://o2whero.com",
        "logo": "https://o2whero.com/logo.png",
        "sameAs": ["https://upsheru.com"],
      },
      {
        "@type": "FAQPage",
        "mainEntity": faqs.map((f) => ({
          "@type": "Question",
          "name": f.q,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": f.a,
          },
        })),
      },
    ],
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white relative overflow-x-hidden">
      {/* ── Injeksi JSON-LD Schema untuk SEO Google ── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSchema) }}
      />

      {/* ── Ambient Glowing Mesh Background ── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] animate-pulse-glow" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-teal-500/10 rounded-full blur-[140px] animate-pulse-glow" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-sky-500/10 rounded-full blur-[140px] animate-pulse-glow" />
      </div>

      {/* ── Navbar Bersih, Modern & Sticky ── */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-emerald-300 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-slate-950 font-black text-xl group-hover:scale-105 transition-transform">
              O2W
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-xl tracking-tight text-white">
                  O2W HERO
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  SaaS TPS3R
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium block">
                Platform Sampah &amp; Ekonomi Sirkular
              </span>
            </div>
          </Link>

          {/* Navigasi Desktop */}
          <nav className="hidden lg:flex items-center gap-7 text-xs font-semibold text-slate-300">
            <a href="#solusi" className="hover:text-emerald-400 transition-colors">
              Fitur Lengkap
            </a>
            <a href="#simulasi" className="hover:text-emerald-400 transition-colors flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Simulasi Cuan</span>
            </a>
            <a href="#perbandingan" className="hover:text-emerald-400 transition-colors">
              Sebelum vs Sesudah
            </a>
            <a href="#contoh-nyata" className="hover:text-emerald-400 transition-colors">
              Pilot UPS HERU
            </a>
            <a href="#harga" className="hover:text-emerald-400 transition-colors text-emerald-400 font-bold">
              Paket Kemitraan (2 Jt)
            </a>
            <a href="#faq" className="hover:text-emerald-400 transition-colors">
              Tanya Jawab
            </a>
          </nav>

          {/* Action Button */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all flex items-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Masuk Portal</span>
            </Link>
            <a
              href="#daftar"
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-105 transition-all flex items-center gap-1.5"
            >
              <span>Gabung Mitra</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1 relative z-10">
        {/* ── HERO SECTION ULTRA MENJUAL DENGAN ANIMASI ── */}
        <section className="pt-16 pb-20 sm:pt-24 sm:pb-28 border-b border-slate-850 relative overflow-hidden">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-7">
            {/* Pulsing Pill Beacon */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold shadow-inner">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>✦ Platform SaaS Pengelolaan Sampah &amp; Retribusi Digital #1 di Indonesia</span>
            </div>

            {/* Headline Berbobot & Menjual */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.15] max-w-4xl mx-auto">
              Tinggalkan Tagih Manual.{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-sky-400">
                Otomatiskan TPS3R Anda
              </span>{" "}
              &amp; Raih Penerimaan Iuran 98%+.
            </h1>

            {/* Sub-headline */}
            <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
              Satu sistem untuk segalanya: Tagihan terbit otomatis via <strong>WhatsApp QRIS</strong>, supir armada dipandu rute <strong>GPS di HP</strong>, dan sampah terpilah warga otomatis menjadi <strong>buku tabungan digital</strong> pemotong iuran.
            </p>

            {/* CTA Dual Button */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-3">
              <a
                href="#daftar"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-105 transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span>Pilih Paket Kemitraan All-in-One (Rp 2 Jt/bln)</span>
                <ArrowRight className="w-4 h-4" />
              </a>

              <a
                href="https://upsheru.com"
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-slate-900/90 hover:bg-slate-850 text-slate-200 border border-slate-700/80 hover:border-slate-600 text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-md"
              >
                <span>Lihat Bukti Nyata di upsheru.com</span>
                <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
              </a>
            </div>

            {/* Live Trust Metrics Grid */}
            <div className="pt-10 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-center space-y-1 hover:border-emerald-500/40 transition-colors">
                <span className="text-2xl sm:text-3xl font-black text-emerald-400">1.253 KK</span>
                <p className="text-[11px] text-slate-400 font-semibold">Aktif di Pilot UPS HERU</p>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-center space-y-1 hover:border-emerald-500/40 transition-colors">
                <span className="text-2xl sm:text-3xl font-black text-white">Rp 43,8 Jt</span>
                <p className="text-[11px] text-slate-400 font-semibold">Iuran Terkumpul Tiap Bulan</p>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-center space-y-1 hover:border-emerald-500/40 transition-colors">
                <span className="text-2xl sm:text-3xl font-black text-sky-400">98,4%</span>
                <p className="text-[11px] text-slate-400 font-semibold">Bayar Tepat Waktu via QRIS</p>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-center space-y-1 hover:border-emerald-500/40 transition-colors">
                <span className="text-2xl sm:text-3xl font-black text-teal-400">0 Jam</span>
                <p className="text-[11px] text-slate-400 font-semibold">Bebas Tagih Pintu ke Pintu</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── SHOWCASE INTERAKTIF: 4 SUDUT PANDANG OPERASIONAL ── */}
        <section id="solusi" className="py-16 sm:py-24 border-b border-slate-800 bg-slate-900/40">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Pengalaman Nyata Lapangan
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-white">
                Satu Sistem yang Membahagiakan Semua Pihak
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm">
                Klik peran di bawah untuk melihat bagaimana O2W HERO mengubah pekerjaan sehari-hari menjadi serba rapi dan otomatis.
              </p>
            </div>

            {/* Tab Selector */}
            <div className="flex flex-wrap items-center justify-center gap-2 p-1.5 rounded-2xl bg-slate-900 border border-slate-800 max-w-xl mx-auto">
              <button
                type="button"
                onClick={() => setActiveTab("pengurus")}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === "pengurus"
                    ? "bg-emerald-500 text-slate-950 shadow-md font-black"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Pengurus TPS3R</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("supir")}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === "supir"
                    ? "bg-emerald-500 text-slate-950 shadow-md font-black"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Supir &amp; Armada</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("warga")}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === "warga"
                    ? "bg-emerald-500 text-slate-950 shadow-md font-black"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Warga &amp; Nasabah</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("bendahara")}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === "bendahara"
                    ? "bg-emerald-500 text-slate-950 shadow-md font-black"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>Bendahara Kas</span>
              </button>
            </div>

            {/* Tab Content Display */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
              {activeTab === "pengurus" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                  <div className="space-y-4">
                    <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                      Untuk Ketua &amp; Pengelola TPS3R
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-white">
                      Kontrol Seluruh Operasional Cukup dari Layar HP
                    </h3>
                    <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                      Tidak perlu lagi pusing mengecek buku catatan manual atau menagih warga yang menunggak berbulan-bulan. Semua data penerimaan iuran, armada yang bertugas, keluhan warga, dan saldo kas terlihat transparan secara real-time.
                    </p>
                    <ul className="space-y-2 text-xs text-slate-300">
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Tagihan terbit otomatis tiap tanggal 1 tanpa kerja lembur</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Tingkat kepatuhan bayar iuran naik drastis dari 65% ke 98%</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Website resmi dengan nama domain sendiri (seperti upsheru.com)</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <span className="text-xs font-bold text-white">Ringkasan Eksekutif Bulan Ini</span>
                      <span className="text-[10px] text-emerald-400 font-mono">Live Update</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-slate-400 block text-[11px]">Total Tagihan Terbit</span>
                        <span className="text-lg font-black text-white">Rp 52.500.000</span>
                      </div>
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                        <span className="text-emerald-400 block text-[11px]">Kas Iuran Terkumpul</span>
                        <span className="text-lg font-black text-emerald-400">Rp 51.650.000</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-400">
                        <span>Efisiensi Penagihan:</span>
                        <span className="text-emerald-400 font-bold">98.4% Lunas Otomatis</span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full" style={{ width: "98.4%" }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "supir" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                  <div className="space-y-4">
                    <span className="px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-bold">
                      Untuk Supir Gerobak &amp; Petugas Armada
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-white">
                      Rute Jalan Rapi di Layar HP, Tidak Ada Rumah Terlewat
                    </h3>
                    <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                      Supir tidak perlu bingung mengingat siapa yang sudah bayar atau belum. Aplikasi supir otomatis menyusun rute gang terdekat, supir cukup mencentang rumah yang sudah diambil, dan absensi kerja tercatat otomatis dengan koordinat GPS.
                    </p>
                    <ul className="space-y-2 text-xs text-slate-300">
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-sky-400 shrink-0" />
                        <span>Aplikasi sangat ringan, jalan lancar di HP Android biasa</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-sky-400 shrink-0" />
                        <span>Bisa dipakai offline saat sinyal di gang sedang lemah</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-sky-400 shrink-0" />
                        <span>Struk nota bensin &amp; servis armada langsung difoto di HP</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3 font-mono text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <span className="text-slate-400">Armada 01: Bpk. Rohim</span>
                      <span className="text-emerald-400 font-bold">● GPS Aktif</span>
                    </div>
                    <div className="space-y-2">
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                        <span>RT 01 / RW 04 (Blok A)</span>
                        <span className="text-emerald-400 font-bold">✓ 42/42 Selesai</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-between">
                        <span>RT 02 / RW 04 (Blok B)</span>
                        <span className="text-sky-400 font-bold">⏳ Sedang Angkut</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-slate-500">
                        <span>RT 03 / RW 04 (Blok C)</span>
                        <span>Antrean Berikutnya</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "warga" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                  <div className="space-y-4">
                    <span className="px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 text-xs font-bold">
                      Untuk Warga &amp; Ibu Rumah Tangga
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-white">
                      Bayar Iuran Cukup Scan QRIS dari WhatsApp
                    </h3>
                    <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                      Warga tidak perlu menyimpan uang pas atau menunggu petugas keliling ke rumah. Notifikasi ramah dikirim via WhatsApp tiap tanggal 1, warga cukup buka HP, scan QRIS pakai M-Banking BCA/Mandiri/BRI atau GoPay/DANA, dan seketika lunas!
                    </p>
                    <ul className="space-y-2 text-xs text-slate-300">
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-teal-400 shrink-0" />
                        <span>Nomor WhatsApp warga = Nomor Pelanggan resmi (tanpa hafal ID)</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-teal-400 shrink-0" />
                        <span>Kuitansi digital berstempel sah langsung terbit otomatis</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-teal-400 shrink-0" />
                        <span>Setor kardus &amp; botol langsung masuk buku tabungan sampah</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3 text-xs">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                      <MessageSquare className="w-4 h-4 text-emerald-400" />
                      <span className="font-bold text-white">Pesan WhatsApp Otomatis</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-slate-300">
                      <p>Halo <strong>Ibu Siti Rahma</strong> (RT 02),</p>
                      <p className="text-slate-400 text-[11px]">
                        Tagihan iuran kebersihan bulan berjalan sebesar <strong>Rp 35.000</strong> sudah terbit.
                      </p>
                      <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 font-mono text-[11px] text-center">
                        [ Klik untuk Buka QRIS Pembayaran ]
                      </div>
                      <p className="text-[10px] text-slate-500 italic">
                        Saldo tabungan sampah Anda: Rp 15.000 (Dapat dipotong langsung).
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "bendahara" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                  <div className="space-y-4">
                    <span className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-bold">
                      Untuk Bendahara &amp; Kasir Pengelola
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-white">
                      Settlement Kas Masuk Rekening Bank Mitra Tiap Minggu
                    </h3>
                    <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                      Tidak ada lagi selisih hitungan uang receh di laci kasir atau uang tercecer di jalan. Semua pembayaran QRIS terkumpul dalam virtual ledger transparan dan otomatis ditransfer ke rekening bank resmi mitra secara mingguan.
                    </p>
                    <ul className="space-y-2 text-xs text-slate-300">
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-purple-400 shrink-0" />
                        <span>Rekonsiliasi otomatis 100% klop dengan mutasi bank</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-purple-400 shrink-0" />
                        <span>Export laporan keuangan instan ke format CSV &amp; Excel</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-purple-400 shrink-0" />
                        <span>Histori audit log lengkap setiap rupiah yang keluar-masuk</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <span className="font-bold text-white">Jadwal Pencairan Kas Minggu Ini</span>
                      <span className="text-purple-400 font-bold">Otomatis Tiap Senin</span>
                    </div>
                    <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 space-y-1">
                      <span className="text-slate-400 text-[11px]">Dana Bersih Siap Transfer:</span>
                      <span className="text-xl font-black text-white block">Rp 12.850.000</span>
                      <span className="text-[10px] text-purple-300">Tujuan: Bank BCA 8830129381 (a/n TPS3R Mandiri)</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span>Status Transfer:</span>
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Terverifikasi Aman
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── KALKULATOR INTERAKTIF: SIMULASI CUAN MITRA (PAKET 2 JT + 10%) ── */}
        <section id="simulasi" className="py-16 sm:py-24 border-b border-slate-800 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-10">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center justify-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" />
                <span>Simulasi Transparansi Finansial</span>
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-white">
                Hitung Potensi Keuntungan Kas TPS3R Anda
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm">
                Geser slider di bawah untuk melihat simulasi pemasukan bruto, bagi hasil 10%, dan surplus keuntungan kas bersih yang Anda terima dengan sistem O2W HERO.
              </p>
            </div>

            <div className="bg-slate-900/90 border-2 border-emerald-500/40 rounded-3xl p-6 sm:p-10 shadow-2xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Slider Controls (Kiri) */}
              <div className="lg:col-span-6 space-y-6">
                {/* Slider KK */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-300">Jumlah Warga / KK Terlayani:</span>
                    <span className="font-mono text-base font-black text-emerald-400">
                      {kalkulatorKK.toLocaleString("id-ID")} KK
                    </span>
                  </div>
                  <input
                    type="range"
                    min="500"
                    max="5000"
                    step="50"
                    value={kalkulatorKK}
                    onChange={(e) => setKalkulatorKK(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>500 KK</span>
                    <span>2.500 KK</span>
                    <span>5.000 KK</span>
                  </div>
                </div>

                {/* Slider Tarif Iuran */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-300">Tarif Iuran Sampah Bulanan / KK:</span>
                    <span className="font-mono text-base font-black text-emerald-400">
                      {formatRupiah(kalkulatorTarif)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="20000"
                    max="80000"
                    step="2500"
                    value={kalkulatorTarif}
                    onChange={(e) => setKalkulatorTarif(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Rp 20.000</span>
                    <span>Rp 50.000</span>
                    <span>Rp 80.000</span>
                  </div>
                </div>

                {/* Penjelasan Logika Finansial */}
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs text-slate-400 space-y-2">
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      Dengan sistem otomatis O2W HERO, tingkat bayar warga naik ke <strong>98%</strong>. Pada cara manual lama, rata-rata <strong>35% warga nunggak</strong> ({formatRupiah(tunggakanManualLost)} uang kas hilang tiap bulan!).
                    </p>
                  </div>
                </div>
              </div>

              {/* Rincian Finansial & Kas Bersih (Kanan) */}
              <div className="lg:col-span-6 bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-5">
                <div className="space-y-3 text-xs border-b border-slate-800 pb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Estimasi Penerimaan Bruto Warga:</span>
                    <span className="font-mono font-bold text-white">{formatRupiah(grossBulanan)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Biaya Langganan O2W HERO:</span>
                    <span className="font-mono font-bold text-rose-400">- {formatRupiah(subsBulanan)} / bln</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Bagi Hasil Komisi Platform (10%):</span>
                    <span className="font-mono font-bold text-rose-400">- {formatRupiah(komisiPlatform)}</span>
                  </div>
                </div>

                {/* Kas Bersih Diterima Mitra */}
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
                  <span className="text-xs text-emerald-400 font-bold block">
                    KAS BERSIH DITERIMA MITRA TPS3R:
                  </span>
                  <span className="text-2xl sm:text-3xl font-black text-white font-mono block">
                    {formatRupiah(kasBersihMitra)} <span className="text-xs text-slate-400">/ bulan</span>
                  </span>
                  <span className="text-[11px] text-slate-400 block pt-1">
                    Uang langsung cair tiap minggu ke rekening bank resmi pengelola.
                  </span>
                </div>

                {/* Surplus dari Penyelamatan Tunggakan */}
                <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs text-sky-300 flex items-center justify-between">
                  <span>Surplus Uang dari Bebas Nunggak:</span>
                  <span className="font-bold text-white font-mono">+{formatRupiah(surplusKeuntungan)}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── TABEL PERBANDINGAN: CARA LAMA VS DENGAN O2W HERO ── */}
        <section id="perbandingan" className="py-16 sm:py-24 border-b border-slate-800">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-10">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
                Solusi Mengatasi Masalah Nyata
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-white">
                Bandingkan: Cara Lama vs Dengan O2W HERO
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm">
                Lihat perbedaan drastis yang dirasakan langsung oleh pengurus TPS3R setelah bermigrasi ke ekosistem digital kami.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800">
                {/* Kolom Cara Lama (Merah) */}
                <div className="p-6 sm:p-8 space-y-5 bg-rose-950/10">
                  <div className="flex items-center gap-2 text-rose-400 font-black text-sm">
                    <X className="w-5 h-5 text-rose-500" />
                    <span>CARA KONVENSIONAL (LAMA)</span>
                  </div>

                  <ul className="space-y-4 text-xs text-slate-300">
                    <li className="flex items-start gap-2.5">
                      <span className="text-rose-500 font-bold shrink-0">✕</span>
                      <span>Catatan di buku tulis lusuh, rawan basah, sobek, dan hilang.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-rose-500 font-bold shrink-0">✕</span>
                      <span>Petugas lelah keliling ketuk pintu rumah warga, buang bensin &amp; waktu.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-rose-500 font-bold shrink-0">✕</span>
                      <span>30% s/d 40% warga menunggak berbulan-bulan dengan alasan lupa/tidak ada uang pas.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-rose-500 font-bold shrink-0">✕</span>
                      <span>Supir gerobak jalan tanpa panduan, sering ada rumah warga yang terlewat.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-rose-500 font-bold shrink-0">✕</span>
                      <span>Uang iuran tunai rawan selisih perhitungan atau tercecer di jalan.</span>
                    </li>
                  </ul>
                </div>

                {/* Kolom O2W HERO (Hijau Emerald) */}
                <div className="p-6 sm:p-8 space-y-5 bg-emerald-950/20">
                  <div className="flex items-center gap-2 text-emerald-400 font-black text-sm">
                    <CheckCheck className="w-5 h-5 text-emerald-400" />
                    <span>DENGAN O2W HERO (DIGITAL)</span>
                  </div>

                  <ul className="space-y-4 text-xs text-slate-200">
                    <li className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>Semua data warga &amp; pembayaran tersimpan aman di cloud server.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>Tagihan terbit otomatis via bot WhatsApp tanggal 1, warga bayar scan QRIS.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>Kepatuhan bayar naik ke 98%+, bebas drama penagihan pintu ke pintu.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>Supir dipandu rute GPS di HP, tinggal centang rumah yang sudah diangkut.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>100% transparan, uang masuk langsung ke rekening bank mitra tiap minggu.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── SHOWCASE MITRA PERCONTOHAN: UPS HERU (upsheru.com) ── */}
        <section id="contoh-nyata" className="py-16 sm:py-24 border-b border-slate-800 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="bg-gradient-to-r from-emerald-950/70 via-slate-900 to-slate-900 border border-emerald-500/40 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
                <div className="space-y-4 max-w-xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold">
                    <Award className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Pilot Project Resmi Nasional</span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    Lihat Langsung Sistem Ini Berjalan di{" "}
                    <span className="text-emerald-400">upsheru.com</span>
                  </h3>

                  <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                    <strong>UPS HERU</strong> (Unit Pengolahan Sampah Kalibaru, Kota Depok) adalah mitra percontohan resmi O2W HERO. Mereka menggunakan domain sendiri, melayani <strong>1.253 KK warga</strong>, menggunakan nomor WhatsApp sebagai nomor pelanggan, dan pembayaran iuran berjalan 100% rapi lewat QRIS.
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <a
                      href="https://upsheru.com"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg transition-all"
                    >
                      <span>Buka Website upsheru.com</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <a
                      href="https://upsheru.com/bayar"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-all"
                    >
                      <span>Coba Cek Tagihan Publik</span>
                    </a>
                  </div>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 w-full lg:w-72 shrink-0 space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-slate-400">Nama Mitra:</span>
                    <span className="font-bold text-white">UPS HERU Depok</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-slate-400">Domain Resmi:</span>
                    <span className="font-mono text-emerald-400 font-bold">upsheru.com</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-slate-400">Warga Terdaftar:</span>
                    <span className="font-bold text-white">1.253 KK</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Status Operasi:</span>
                    <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                      <CheckCircle2 className="w-3 h-3" /> Berjalan Aktif
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── PAKET HARGA KEMITRAAN (MENONJOLKAN PAKET 2 JT + 10% KOMISI) ── */}
        <section id="harga" className="py-16 sm:py-24 border-b border-slate-800">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Pilihan Paket Kemitraan
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-white">
                Skema Kemitraan Adil, Terjangkau &amp; Menguntungkan
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm">
                Tanpa biaya tersembunyi. Biaya langganan sistem sebanding dengan jutaan rupiah tunggakan warga yang berhasil diselamatkan setiap bulan.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
              {/* Paket Starter */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-5 flex flex-col justify-between hover:border-slate-700 transition-all">
                <div>
                  <h3 className="text-lg font-black text-white">Starter</h3>
                  <p className="text-slate-400 text-xs mt-1">Bank Sampah Pemula &amp; KSM RT/RW</p>
                  <div className="mt-4">
                    <span className="text-2xl font-black text-white">Rp 349.000</span>
                    <span className="text-xs text-slate-500"> / bulan</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Bagi Hasil: Flat Rp 1.000 / transaksi lunas
                  </div>
                  <ul className="space-y-2.5 mt-6 text-xs text-slate-300">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Hingga 500 Nasabah / KK Warga</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Subdomain bawaan `nama.o2whero.com`</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Buku Tabungan Sampah Digital di HP</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>1.000 Kuota Notifikasi WhatsApp / bln</span>
                    </li>
                  </ul>
                </div>
                <a
                  href="#daftar"
                  className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs text-center block transition-all mt-4"
                >
                  Pilih Starter
                </a>
              </div>

              {/* PAKET KEMITRAAN ALL-IN-ONE (2 JT + 10% KOMISI) - HERO TIER */}
              <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-emerald-400 rounded-3xl p-6 sm:p-8 space-y-6 flex flex-col justify-between shadow-2xl shadow-emerald-500/20 relative lg:-translate-y-3">
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-[11px] tracking-wider uppercase shadow-md flex items-center gap-1.5 whitespace-nowrap">
                  <Star className="w-3.5 h-3.5 fill-slate-950" />
                  <span>PALING BANYAK DIPILIH (ALL FITUR)</span>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black text-white">Kemitraan All-in-One</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Standar TPS3R
                    </span>
                  </div>
                  <p className="text-slate-300 text-xs mt-1">
                    Solusi Lengkap Tanpa Batas untuk TPS3R &amp; Kelurahan (Seperti UPS HERU)
                  </p>

                  <div className="mt-5 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-emerald-400">Rp 2.000.000</span>
                      <span className="text-xs text-slate-400">/ bulan</span>
                    </div>
                    <div className="text-xs text-emerald-300 font-bold mt-1">
                      + Bagi Hasil Komisi 10% dari Transaksi Lunas
                    </div>
                  </div>

                  <ul className="space-y-3 mt-6 text-xs text-slate-200">
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span><strong>SEMUA FITUR TERMASUK (ALL FITUR)</strong></span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span><strong>Pakai Domain Sendiri</strong> (contoh: upsheru.com, free setup)</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span><strong>Warga &amp; Armada Tanpa Batas</strong> (Unlimited KK)</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>Aplikasi HP Supir &amp; Absensi GPS Armada Rute Otomatis</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>Dual-Number WhatsApp Gateway (Bot Tagihan + CS Warga)</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>QRIS &amp; Virtual Account Semua Bank Terverifikasi Otomatis</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>Buku Tabungan Sampah Digital &amp; Konversi Poin Potong Iuran</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>Settlement Kas Otomatis Tiap Minggu ke Rekening Mitra</span>
                    </li>
                  </ul>
                </div>

                <a
                  href="#daftar"
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs text-center block shadow-lg shadow-emerald-500/30 hover:scale-105 transition-all mt-6"
                >
                  Pilih Paket Kemitraan All-in-One (2 Jt + 10%)
                </a>
              </div>

              {/* Paket Enterprise */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-5 flex flex-col justify-between hover:border-slate-700 transition-all">
                <div>
                  <h3 className="text-lg font-black text-white">Enterprise</h3>
                  <p className="text-slate-400 text-xs mt-1">Kawasan Industri, Mall, &amp; Vendor Swasta</p>
                  <div className="mt-4">
                    <span className="text-2xl font-black text-white">Rp 4.990.000</span>
                    <span className="text-xs text-slate-500"> / bulan</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Dedicated Cluster DB + High Availability SLA
                  </div>
                  <ul className="space-y-2.5 mt-6 text-xs text-slate-300">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Semua fitur paket Kemitraan</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Database Terpisah (Dedicated Database)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Integrasi Jembatan Timbang Truk API</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Account Manager Khusus &amp; SLA 99.9%</span>
                    </li>
                  </ul>
                </div>
                <a
                  href="#daftar"
                  className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs text-center block transition-all mt-4"
                >
                  Pilih Enterprise
                </a>
              </div>
            </div>

            {/* Banner Khusus Pilot Project / Program Percontohan */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <div className="inline-flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Program Mitra Percontohan Nasional (Pilot Project)</span>
                </div>
                <p className="text-slate-400 text-xs leading-relaxed max-w-2xl">
                  Seperti pada <strong>UPS HERU Kalibaru</strong> (upsheru.com), unit kelurahan terpilih yang bermitra dalam riset percontohan nasional mendapatkan lisensi gratis seumur hidup (Rp 0/bln) dengan seluruh fitur All-in-One aktif.
                </p>
              </div>
              <a
                href="#daftar"
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold shrink-0 transition-all"
              >
                Ajukan Program Pilot
              </a>
            </div>
          </div>
        </section>

        {/* ── FORMULIR PENDAFTARAN KEMITRAAN LANGSUNG ── */}
        <section id="daftar" className="py-16 sm:py-24 border-b border-slate-800 bg-slate-900/50">
          <div className="max-w-2xl mx-auto px-4 sm:px-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6">
              <div className="text-center space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Formulir Kemitraan Cepat
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white">
                  Mulai Kemitraan O2W HERO Sekarang
                </h2>
                <p className="text-slate-400 text-xs sm:text-sm">
                  Isi formulir singkat di bawah. Tim Senior O2W HERO akan menghubungi WhatsApp Anda dalam hitungan menit untuk demonstrasi portal dan koordinasi setup.
                </p>
              </div>

              {successMsg && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </div>
              )}

              {errorMsg && (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Nama Lengkap Anda *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Bpk. Budi Santoso"
                      value={form.namaLengkap}
                      onChange={(e) => setForm({ ...form, namaLengkap: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-800/80 text-white text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Nama Usaha / TPS3R / Bank Sampah *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: TPS3R Berkah Mandiri"
                      value={form.namaInstansi}
                      onChange={(e) => setForm({ ...form, namaInstansi: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-800/80 text-white text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Nomor WhatsApp Aktif *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="Contoh: 081234567890"
                      value={form.noWhatsapp}
                      onChange={(e) => setForm({ ...form, noWhatsapp: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-800/80 text-white text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Email Anda *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="Contoh: budi@gmail.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-800/80 text-white text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Kota / Wilayah Operasional *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Kota Depok"
                      value={form.wilayahOperasional}
                      onChange={(e) => setForm({ ...form, wilayahOperasional: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-800/80 text-white text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Perkiraan Jumlah Warga
                    </label>
                    <select
                      value={form.estimasiWarga}
                      onChange={(e) => setForm({ ...form, estimasiWarga: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-700 bg-slate-800/80 text-white text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="500">&lt; 500 Warga (KSM/Bank Sampah)</option>
                      <option value="1500">500 - 1.500 Warga (TPS3R Sedang)</option>
                      <option value="3000">1.500 - 3.000 Warga (TPS3R Standar)</option>
                      <option value="10000">&gt; 3.000 Warga (Kawasan Besar)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Pilihan Paket Kemitraan
                    </label>
                    <select
                      value={form.paketPilihan}
                      onChange={(e) => setForm({ ...form, paketPilihan: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-700 bg-slate-800/80 text-white text-xs outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                    >
                      <option value="pro_2jt">
                        ★ Kemitraan All-in-One (Rp 2 Jt + 10% Komisi) [Rekomendasi]
                      </option>
                      <option value="starter">
                        Starter (Rp 349.000 / bln - Bank Sampah Skala Kecil)
                      </option>
                      <option value="enterprise">
                        Enterprise (Kawasan Industri / Swasta)
                      </option>
                      <option value="percontohan">
                        Percontohan / Pilot Project Riset
                      </option>
                    </select>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Mengirim Data Kemitraan...</span>
                      </>
                    ) : (
                      <>
                        <span>Kirim Pendaftaran Kemitraan Sekarang</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </section>

        {/* ── TANYA JAWAB (FAQ) DENGAN ACCORDION INTERAKTIF ── */}
        <section id="faq" className="py-16 sm:py-24 border-b border-slate-800">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-10 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Informasi Penting
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                Pertanyaan yang Sering Diajukan
              </h2>
            </div>

            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <div
                  key={i}
                  className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full p-4 text-left font-bold text-xs sm:text-sm text-white flex items-center justify-between gap-3 cursor-pointer hover:text-emerald-400 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform ${
                        openFaq === i ? "rotate-180 text-emerald-400" : ""
                      }`}
                    />
                  </button>
                  {openFaq === i && (
                    <div className="px-4 pb-4 text-xs text-slate-300 leading-relaxed border-t border-slate-800/60 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER RESMI & LINK PENDUKUNG ── */}
      <footer className="border-t border-slate-800 bg-slate-950 py-12 text-xs text-slate-400">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div className="space-y-1">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <span className="font-extrabold text-white text-sm">O2W HERO</span>
              <span>•</span>
              <span>Platform SaaS Pengelolaan Sampah &amp; Ekonomi Sirkular Indonesia</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Mendigitalkan ribuan TPS3R, Bank Sampah, dan Kelurahan untuk lingkungan yang lebih bersih dan kas yang sehat.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-5 font-medium">
            <Link href="/login" className="hover:text-white transition-colors">
              Portal Petugas
            </Link>
            <a
              href="https://upsheru.com"
              target="_blank"
              rel="noreferrer"
              className="text-emerald-400 font-bold hover:underline"
            >
              Studi Kasus: upsheru.com
            </a>
            <span>© {new Date().getFullYear()} O2W HERO. Hak Cipta Dilindungi.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
