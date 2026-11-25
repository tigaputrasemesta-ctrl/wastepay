"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Database,
  Globe,
  Truck,
  QrCode,
  Recycle,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  Building2,
  Users,
  BarChart3,
  Sparkles,
  PhoneCall,
  Send,
  Loader2,
  Lock,
  ChevronRight,
  Calculator,
  Layers,
  MapPin,
  TrendingUp,
  FileCheck,
  HelpCircle,
  ChevronDown,
  Cpu,
  LogIn,
  Zap,
  Check,
  FileText,
  Award,
  AlertCircle,
  Smartphone,
  Headphones,
  Compass,
  Factory,
  Scale,
  Calendar,
  PackageCheck,
  AlertTriangle,
  Wallet,
  Coins,
  Repeat,
  Boxes,
  Activity,
  ArrowUpRight,
  Clock,
  CheckCheck,
} from "lucide-react";

export default function O2WHeroCorePortal() {
  // State formulir pendaftaran kemitraan komprehensif
  const [form, setForm] = useState({
    namaLengkap: "",
    namaInstansi: "",
    jenisUsaha: "tps3r",
    wilayahOperasional: "Kota Depok",
    estimasiWarga: "1000",
    armadaEksisting: "truk_dump",
    metodePengelolaan: "buku_manual",
    noWhatsapp: "",
    email: "",
    paketPilihan: "pro",
    kebutuhanSpesifik: "",
    catatanAdmin: "",
  });

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // State kalkulator potensi kemitraan & proyeksi finansial
  const [kalkulatorKk, setKalkulatorKk] = useState(1200);
  const [iuranPerKk, setIuranPerKk] = useState(35000);
  const [collectionRate, setCollectionRate] = useState(90); // 90% kepatuhan bayar
  const [estimasiSampahKg, setEstimasiSampahKg] = useState(300); // 300 kg anorganik terpilah/hari

  // State tab arsitektur & navigasi interaktif
  const [activeTab, setActiveTab] = useState<"codebase" | "domain" | "rls" | "enterprise">("codebase");

  // State FAQ accordion
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Perhitungan dinamis kalkulator finansial
  const grossTagihanBulan = kalkulatorKk * iuranPerKk;
  const kasTerkumpulBulan = Math.round(grossTagihanBulan * (collectionRate / 100));
  const wargaBayarCount = Math.round(kalkulatorKk * (collectionRate / 100));
  const platformFeeBulan = wargaBayarCount * 1000; // Flat Rp 1.000 per transaksi digital lunas
  const estimasiBiayaArmada = Math.round(kasTerkumpulBulan * 0.32); // BBM, solar, perawatan armada ~32%
  const estimasiBiayaAdminPetugas = Math.round(kasTerkumpulBulan * 0.28); // Honor sopir, knek, admin ~28%
  const estimasiOperatingMarginMitra = Math.max(
    0,
    kasTerkumpulBulan - platformFeeBulan - estimasiBiayaArmada - estimasiBiayaAdminPetugas
  );

  // Potensi ekonomi sirkular (daur ulang terpilah)
  const potensiDaurUlangBulan = estimasiSampahKg * 30 * 2500; // Estimasi konservatif Rp 2.500 / kg komoditas daur ulang
  const totalPotensiEkosistem = estimasiOperatingMarginMitra + potensiDaurUlangBulan;
  const reduksiCo2Kg = Math.round(estimasiSampahKg * 30 * 0.85); // 0.85 kg CO2e terhindar per kg sampah terpilah

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      // Struktur catatan tambahan terstruktur agar kompatibel penuh dengan skema backend
      const structuredCatatan = [
        form.armadaEksisting ? `Armada Eksisting: ${form.armadaEksisting.replace(/_/g, " ").toUpperCase()}` : null,
        form.metodePengelolaan ? `Metode Saat Ini: ${form.metodePengelolaan.replace(/_/g, " ").toUpperCase()}` : null,
        form.paketPilihan ? `Pilihan Paket: ${form.paketPilihan.toUpperCase()}` : null,
        form.kebutuhanSpesifik ? `Kebutuhan Spesifik: ${form.kebutuhanSpesifik}` : null,
        form.catatanAdmin ? `Catatan: ${form.catatanAdmin}` : null,
      ]
        .filter(Boolean)
        .join(" | ");

      const payload = {
        namaLengkap: form.namaLengkap,
        namaInstansi: form.namaInstansi,
        jenisUsaha: form.jenisUsaha,
        noWhatsapp: form.noWhatsapp,
        email: form.email,
        kota: form.wilayahOperasional,
        estimasiWarga: Number(form.estimasiWarga) || 0,
        kebutuhanDb: form.paketPilihan === "enterprise" ? "dedicated" : "shared_rls",
        catatanAdmin: structuredCatatan,
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
        "Pendaftaran kemitraan berhasil dikirim! Tim O2WHERO akan segera menghubungi WhatsApp Anda untuk koordinasi setup portal, onboarding domain, dan konfigurasi sistem."
      );
      setForm({
        namaLengkap: "",
        namaInstansi: "",
        jenisUsaha: "tps3r",
        wilayahOperasional: "Kota Depok",
        estimasiWarga: "1000",
        armadaEksisting: "truk_dump",
        metodePengelolaan: "buku_manual",
        noWhatsapp: "",
        email: "",
        paketPilihan: "pro",
        kebutuhanSpesifik: "",
        catatanAdmin: "",
      });
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kendala koneksi server. Silakan coba kembali.");
    } finally {
      setLoading(false);
    }
  };

  const faqs = [
    {
      q: "Bagaimana arsitektur isolasi data bekerja pada platform O2WHERO?",
      a: "O2WHERO menerapkan prinsip 'One Platform. Multiple Organizations. Isolated Data.' Seluruh tenant standar berbagi infrastruktur aplikasi Next.js dan database PostgreSQL yang sama secara efisien, namun data operasional setiap tenant (nasabah, transaksi, tagihan, rute) diproteksi secara ketat menggunakan PostgreSQL Row-Level Security (RLS) berbasis sesi transaksi tenantId. Bagi tenant enterprise atau instansi pemerintah, tersedia opsi Dedicated Database mandiri.",
    },
    {
      q: "Apakah mitra dapat menggunakan nama domain sendiri seperti upsheru.com?",
      a: "Ya, tentu saja. Setiap mitra dapat mengarahkan CNAME DNS domain sendiri (contoh: tps-berkah.id atau pengelolasampah.com) ke server O2WHERO. Sistem Dynamic Domain Resolver kami otomatis memvalidasi host header dan menerbitkan sertifikat SSL resmi (HTTPS) secara otomatis tanpa biaya lisensi tambahan.",
    },
    {
      q: "Bagaimana cara kerja akun WhatsApp Fonnte dan Payment Gateway Duitku per-tenant?",
      a: "Setiap tenant menggunakan akun WhatsApp Fonnte mandiri (mendukung 2 nomor: Nomor Operasional/Tagihan & Nomor CS/Pengaduan) dengan API token terenkripsi AES-256-GCM. Untuk pembayaran, tenant dapat menggunakan akun Duitku sendiri (mode dedicated) atau memanfaatkan pool terpusat O2WHERO dengan pembagian kas otomatis (split payment) langsung ke rekening mitra.",
    },
    {
      q: "Berapa biaya awal setup domain dan bagaimana skema komisi transaksi?",
      a: "Biaya aktivasi onboarding dan konfigurasi domain mandiri adalah flat Rp 2.000.000 di awal per tenant. Untuk transaksi pembayaran iuran warga, berlaku komisi platform O2WHERO yang fleksibel (standar flat Rp 1.000 per tagihan lunas dan persentase komisi yang dapat disesuaikan per tenant).",
    },
    {
      q: "Bagaimana peran UPS HERU dalam platform O2WHERO?",
      a: "UPS HERU (Unit Pengelolaan Sampah Kota Depok) adalah mitra percontohan operasional nyata (real operational pilot & case study) dari O2WHERO. Seluruh alur sistem—mulai dari penjemputan warga, live GPS armada dump truck, pembayaran QRIS, hingga otomasi bot WhatsApp—telah teruji aktif melayani 2.450+ KK di Kalibaru & Cilodong melalui domain resmi upsheru.com.",
    },
    {
      q: "Apakah aplikasi petugas lapangan bekerja secara offline?",
      a: "Ya. Aplikasi mobile petugas lapangan dilengkapi modul sinkronisasi master & delta offline (`/api/sync/master` & `/api/sync/delta`). Petugas dapat tetap memindai stiker barcode rumah dan mencatat status angkut di area dengan sinyal lemah, lalu data otomatis tersinkronisasi saat kembali online.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Top Header / Sticky Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo & Brand Identity */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-sky-600 via-teal-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-sky-500/25 text-white font-black text-xl tracking-wider">
              O2W
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xl tracking-tight text-white">
                  O2WHERO
                </span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  ECOSYSTEM PLATFORM
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Platform Digital Terintegrasi Pengelolaan Sampah &amp; Ekonomi Sirkular
              </p>
            </div>
          </div>

          {/* Quick Navigation Links */}
          <nav className="hidden xl:flex items-center gap-5 text-xs font-semibold text-slate-300">
            <a href="#tantangan-bisnis" className="hover:text-white transition-colors">
              Tantangan Bisnis
            </a>
            <a href="#kemampuan-platform" className="hover:text-sky-400 transition-colors">
              Fitur Platform
            </a>
            <a href="#alur-kerja" className="hover:text-teal-400 transition-colors">
              Alur Kerja
            </a>
            <a href="#model-layanan" className="hover:text-emerald-400 transition-colors">
              Layanan
            </a>
            <a href="#ekosistem" className="hover:text-purple-400 transition-colors">
              Ekosistem
            </a>
            <a href="#arsitektur" className="hover:text-sky-400 transition-colors">
              Multi-Tenant
            </a>
            <a href="#percontohan" className="hover:text-emerald-400 transition-colors font-bold">
              Pilot UPS HERU
            </a>
            <a href="#kalkulator" className="hover:text-teal-400 transition-colors">
              Kalkulator
            </a>
            <a href="#faq" className="hover:text-white transition-colors">
              FAQ
            </a>
          </nav>

          {/* Action Buttons: Pilot Link, Login & CTA */}
          <div className="flex items-center gap-3">
            <a
              href="https://upsheru.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-emerald-950/70 text-emerald-300 border border-emerald-800 hover:bg-emerald-900/50 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
              upsheru.com
            </a>

            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition-all shadow-sm"
              title="Masuk ke Panel Dashboard Admin"
            >
              <LogIn className="w-4 h-4 text-sky-400" />
              <span>Login</span>
            </Link>

            <a
              href="#daftar-mitra"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold px-4.5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 via-teal-600 to-emerald-600 hover:from-sky-500 hover:to-emerald-500 text-white shadow-lg shadow-sky-600/25 transition-all"
            >
              <span>Mulai Kemitraan</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </header>

      {/* PHASE 2: HERO SECTION — UPDATED POSITIONING */}
      <section className="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-32 border-b border-slate-800">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.18),rgba(255,255,255,0))]" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs sm:text-sm font-semibold mb-6">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            Platform Digital Terintegrasi: Operasional, Logistik, Pembayaran, Kemitraan &amp; Ekonomi Sirkular
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight sm:leading-tight max-w-5xl mx-auto">
            Ubah Pengelolaan Sampah Menjadi{" "}
            <span className="bg-gradient-to-r from-sky-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
              Ekosistem Bisnis yang Terukur dan Berkelanjutan.
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
            O2WHERO menghubungkan pelanggan, TPS 3R, Bank Sampah, operator pengangkutan, fasilitas pengolahan, dan mitra daur ulang melalui satu platform digital.
          </p>

          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#daftar-mitra"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-sky-600 via-teal-600 to-emerald-600 hover:from-sky-500 hover:to-emerald-500 text-white font-extrabold text-base shadow-xl shadow-sky-600/30 transition-all flex items-center justify-center gap-2"
            >
              Mulai Kemitraan
              <ArrowRight className="w-5 h-5" />
            </a>
            <a
              href="#percontohan"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-slate-600 font-bold text-base transition-all flex items-center justify-center gap-2"
            >
              Lihat Implementasi UPS HERU
              <ExternalLink className="w-5 h-5 text-emerald-400" />
            </a>
          </div>

          {/* Key Metric Highlights Verified in Platform */}
          <div className="mt-14 grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto text-left">
            <div className="p-4.5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-sky-500/40 transition-colors">
              <div className="flex items-center gap-2 text-sky-400">
                <Layers className="w-4 h-4" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Arsitektur Multi-Tenant</span>
              </div>
              <h2 className="text-xl font-black text-white mt-1.5">Satu Platform Terisolasi</h2>
              <p className="text-xs text-sky-400 mt-1">PostgreSQL RLS &amp; Domain Mandiri</p>
            </div>

            <div className="p-4.5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-teal-500/40 transition-colors">
              <div className="flex items-center gap-2 text-teal-400">
                <QrCode className="w-4 h-4" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Kas &amp; Retribusi Digital</span>
              </div>
              <h2 className="text-xl font-black text-white mt-1.5">QRIS &amp; VA Dinamis</h2>
              <p className="text-xs text-teal-400 mt-1">Verifikasi Real-Time Zero-Variance</p>
            </div>

            <div className="p-4.5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-purple-500/40 transition-colors">
              <div className="flex items-center gap-2 text-purple-400">
                <Truck className="w-4 h-4" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Armada &amp; Logistik</span>
              </div>
              <h2 className="text-xl font-black text-white mt-1.5">Live GPS &amp; Cockpit</h2>
              <p className="text-xs text-purple-400 mt-1">Aplikasi Petugas Mobile Native</p>
            </div>

            <div className="p-4.5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/40 transition-colors">
              <div className="flex items-center gap-2 text-emerald-400">
                <Recycle className="w-4 h-4" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Ekonomi Sirkular</span>
              </div>
              <h2 className="text-xl font-black text-white mt-1.5">Offtaker Daur Ulang</h2>
              <p className="text-xs text-emerald-400 mt-1">Tonase Pilah &amp; Metrik Emisi CO2</p>
            </div>
          </div>
        </div>
      </section>

      {/* PHASE 3: BUSINESS PROBLEM SECTION — 5 OPERATIONAL CHALLENGES */}
      <section id="tantangan-bisnis" className="py-20 border-b border-slate-800 bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-rose-400 mb-2 block">
              Tantangan Nyata di Lapangan
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              5 Hambatan Kritis Pengelolaan Sampah Konvensional
            </h2>
            <p className="text-slate-400 mt-3 text-sm sm:text-base leading-relaxed">
              Sebagian besar unit pengelola sampah, TPS 3R, dan Bank Sampah menghadapi kebocoran pendapatan, komplain tak tertangani, dan inefisiensi rute akibat ketiadaan instrumen digital terpadu.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Challenge 1 */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4 hover:border-rose-500/30 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">1. Administrasi Pelanggan &amp; Tagihan Manual</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Pencatatan di buku tulis fisik rentan hilang, data tagihan warga sering tercecer, dan iuran bulanan mengandalkan tagihan door-to-door yang menyita waktu.
              </p>
              <div className="pt-2 border-t border-slate-800/80">
                <span className="text-[11px] font-bold text-sky-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Solusi O2WHERO:
                </span>
                <p className="text-xs text-slate-300 mt-1">
                  Master data pelanggan digital, stiker barcode QR rumah, dan penagihan otomatis via invoice WhatsApp.
                </p>
              </div>
            </div>

            {/* Challenge 2 */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4 hover:border-rose-500/30 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold">
                <Coins className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">2. Pembayaran &amp; Rekonsiliasi Tidak Transparan</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Pembayaran tunai menimbulkan risiko kebocoran kas di tangan kolektor, selisih hitung, dan proses rekonsiliasi yang memakan waktu berminggu-minggu.
              </p>
              <div className="pt-2 border-t border-slate-800/80">
                <span className="text-[11px] font-bold text-teal-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Solusi O2WHERO:
                </span>
                <p className="text-xs text-slate-300 mt-1">
                  Gerbang pembayaran QRIS dinamis &amp; VA Duitku terverifikasi instan dengan pembukuan zero-variance.
                </p>
              </div>
            </div>

            {/* Challenge 3 */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4 hover:border-rose-500/30 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold">
                <Truck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">3. Rute &amp; Armada Kurang Efisien</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Armada truk dan motor roda tiga berkeliling tanpa panduan rute optimal, konsumsi solar boros, dan jadwal penjemputan warga kerap terlewat.
              </p>
              <div className="pt-2 border-t border-slate-800/80">
                <span className="text-[11px] font-bold text-purple-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Solusi O2WHERO:
                </span>
                <p className="text-xs text-slate-300 mt-1">
                  Zonasi rute per wilayah, pemantauan live GPS truk, serta cockpit penugasan ritase di HP petugas.
                </p>
              </div>
            </div>

            {/* Challenge 4 */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4 hover:border-rose-500/30 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold">
                <Headphones className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">4. Komplain Pelanggan Sulit Dipantau</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Keluhan warga berceceran di grup chat RT atau media sosial tanpa nomor tiket, tindak lanjut penanganan lambat, dan kepuasan warga menurun.
              </p>
              <div className="pt-2 border-t border-slate-800/80">
                <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Solusi O2WHERO:
                </span>
                <p className="text-xs text-slate-300 mt-1">
                  Tiket komplain digital via bot WhatsApp Fonnte, status penyelesaian terukur, dan re-dispatch armada.
                </p>
              </div>
            </div>

            {/* Challenge 5 */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4 hover:border-rose-500/30 transition-all md:col-span-2 lg:col-span-2">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold">
                <Recycle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">5. Potensi Ekonomi Sampah Belum Terintegrasi</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Sampah anorganik bernilai ekonomis (plastik, karton, logam) terbuang sia-sia ke TPA karena pengelola lokal tidak memiliki akses data harga komoditas dan jalur penjualan langsung ke offtaker daur ulang industri.
              </p>
              <div className="pt-2 border-t border-slate-800/80">
                <span className="text-[11px] font-bold text-teal-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Solusi O2WHERO:
                </span>
                <p className="text-xs text-slate-300 mt-1">
                  Modul marketplace agregasi daur ulang, digitalisasi timbangan sampah, pelaporan tonase emisi ESG, dan penyaluran ke jaringan pabrik daur ulang resmi.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PHASE 4: INTEGRATED PLATFORM CAPABILITIES — 9 FEATURE GRID */}
      <section id="kemampuan-platform" className="py-20 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-sky-400 mb-2 block">
              Fitur Lengkap &amp; Terverifikasi
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              9 Kemampuan Inti Platform O2WHERO
            </h2>
            <p className="text-slate-400 mt-3 text-sm sm:text-base leading-relaxed">
              Seluruh fungsionalitas di bawah ini telah aktif beroperasi pada codebase WastePay dan teruji di lingkungan operasional lapangan.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Capability 1 */}
            <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 hover:border-sky-500/40 transition-all space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">1. Customer &amp; Subscription Management</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Manajemen database warga/KK terpusat, penomoran kode pelanggan unik, penerbitan stiker barcode rumah, histori langganan, dan pemetaan geolokasi rumah.
              </p>
              <span className="inline-block text-[10px] font-semibold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-md">
                CRM &amp; Barcode Ready
              </span>
            </div>

            {/* Capability 2 */}
            <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 hover:border-teal-500/40 transition-all space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center font-bold">
                <QrCode className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">2. Billing &amp; Digital Payment</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Penerbitan tagihan bulanan otomatis, QRIS dinamis ber-MDR rendah, Virtual Account antar bank, integrasi gateway Duitku, dan verifikasi lunas tanpa manual check.
              </p>
              <span className="inline-block text-[10px] font-semibold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-md">
                Duitku Gateway &amp; Auto-Verify
              </span>
            </div>

            {/* Capability 3 */}
            <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 hover:border-purple-500/40 transition-all space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
                <Compass className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">3. Fleet &amp; Route Management</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Pemantauan armada truk dan kendaraan operasional secara live GPS, visualisasi rute penjemputan berbasis peta digital Leaflet, dan pembagian zona TPS 3R.
              </p>
              <span className="inline-block text-[10px] font-semibold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md">
                Live GPS &amp; Zonasi Wilayah
              </span>
            </div>

            {/* Capability 4 */}
            <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 hover:border-emerald-500/40 transition-all space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                <Smartphone className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">4. Driver &amp; Field Operations</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Aplikasi mobile native petugas lapangan dengan presensi kehadiran geotagging, pemindai barcode stiker rumah, pencatatan ritase, dan mode sinkronisasi offline.
              </p>
              <span className="inline-block text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                Mobile Native &amp; Offline Sync
              </span>
            </div>

            {/* Capability 5 */}
            <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 hover:border-emerald-500/40 transition-all space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                <PhoneCall className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">5. WhatsApp Automation</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Bot WhatsApp interaktif Fonnte dengan arsitektur 2 nomor (Nomor Bot Tagihan &amp; Nomor CS), pengiriman reminder tagihan massal, dan kuitansi instan.
              </p>
              <span className="inline-block text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                Fonnte Dual-Device &amp; Bot AI
              </span>
            </div>

            {/* Capability 6 */}
            <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 hover:border-amber-500/40 transition-all space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
                <Headphones className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">6. Customer Service &amp; Complaints</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Portal pelaporan komplain warga via website dan chat, nomor tiket otomatis, tracking status perbaikan penjemputan, serta mode Human Takeover petugas.
              </p>
              <span className="inline-block text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
                Ticketing &amp; Human Takeover
              </span>
            </div>

            {/* Capability 7 */}
            <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 hover:border-sky-500/40 transition-all space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold">
                <Wallet className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">7. Partner &amp; Settlement Management</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Buku kas pembukuan digital mitra (`TenantLedger`), bagi hasil otomatis per transaksi, pemisahan kas hak mitra (escrow), dan laporan batch pencairan dana (`TenantPayout`).
              </p>
              <span className="inline-block text-[10px] font-semibold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-md">
                Tenant Ledger &amp; Escrow
              </span>
            </div>

            {/* Capability 8 */}
            <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 hover:border-teal-500/40 transition-all space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center font-bold">
                <Recycle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">8. Circular Economy &amp; Recycling</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Pencatatan komoditas daur ulang (kardus, botol plastik, logam), penimbangan digital, laporan diversifikasi TPA, dan estimasi reduksi emisi karbon untuk CSR/DLH.
              </p>
              <span className="inline-block text-[10px] font-semibold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-md">
                ESG Metrik &amp; Offtaker Ready
              </span>
            </div>

            {/* Capability 9 */}
            <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 hover:border-purple-500/40 transition-all space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">9. AI Operational Intelligence</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Mesin AI Command terintegrasi untuk ringkasan eksekutif cepat, audit integritas logistik, deteksi dini anomali penagihan, serta analisis tren kepatuhan warga.
              </p>
              <span className="inline-block text-[10px] font-semibold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md">
                AI Command &amp; Analytics
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* PHASE 5: SIX-STEP BUSINESS WORKFLOW — HORIZONTAL & VERTICAL TIMELINE */}
      <section id="alur-kerja" className="py-20 border-b border-slate-800 bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-teal-400 mb-2 block">
              Siklus Operasional Lengkap
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Alur Kerja Bisnis 6 Langkah: End-to-End
            </h2>
            <p className="text-slate-400 mt-3 text-sm sm:text-base leading-relaxed">
              Mulai dari pendaftaran warga hingga penyelesaian pencairan kas mitra, seluruh proses berjalan terotomasi dan transparan.
            </p>
          </div>

          {/* Desktop Horizontal Workflow & Mobile Vertical Timeline */}
          <div className="relative">
            {/* Connecting line for desktop */}
            <div className="hidden lg:block absolute top-1/2 left-8 right-8 h-1 bg-gradient-to-r from-sky-500 via-teal-500 to-emerald-500 -translate-y-6 z-0" />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 relative z-10">
              {/* Step 1 */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col justify-between hover:border-sky-500 transition-all">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-sky-600 text-white flex items-center justify-center font-black text-lg mb-4 shadow-lg shadow-sky-600/30">
                    1
                  </div>
                  <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider block mb-1">
                    Langkah 1
                  </span>
                  <h3 className="text-base font-extrabold text-white">PESAN</h3>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    Warga mendaftar langganan rutin atau memesan penjemputan insidental via portal web atau bot WhatsApp.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 font-mono">
                  Portal / WA Chat
                </div>
              </div>

              {/* Step 2 */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col justify-between hover:border-teal-500 transition-all">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-black text-lg mb-4 shadow-lg shadow-teal-600/30">
                    2
                  </div>
                  <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider block mb-1">
                    Langkah 2
                  </span>
                  <h3 className="text-base font-extrabold text-white">BAYAR</h3>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    Warga memindai QRIS dinamis atau transfer Virtual Account dengan verifikasi pelunasan seketika.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 font-mono">
                  Duitku Real-Time
                </div>
              </div>

              {/* Step 3 */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col justify-between hover:border-purple-500 transition-all">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-black text-lg mb-4 shadow-lg shadow-purple-600/30">
                    3
                  </div>
                  <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block mb-1">
                    Langkah 3
                  </span>
                  <h3 className="text-base font-extrabold text-white">DISPATCH</h3>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    Sistem mengalokasikan armada truk dan petugas terdekat berdasarkan jadwal ritase dan zonasi wilayah.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 font-mono">
                  Auto-Routing Zonasi
                </div>
              </div>

              {/* Step 4 */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col justify-between hover:border-emerald-500 transition-all">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-lg mb-4 shadow-lg shadow-emerald-600/30">
                    4
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                    Langkah 4
                  </span>
                  <h3 className="text-base font-extrabold text-white">JEMPUT</h3>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    Armada bergerak ke lokasi rumah, warga dapat melacak posisi truk secara live di peta digital.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 font-mono">
                  Live GPS Cockpit
                </div>
              </div>

              {/* Step 5 */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col justify-between hover:border-sky-500 transition-all">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-sky-600 text-white flex items-center justify-center font-black text-lg mb-4 shadow-lg shadow-sky-600/30">
                    5
                  </div>
                  <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider block mb-1">
                    Langkah 5
                  </span>
                  <h3 className="text-base font-extrabold text-white">VALIDASI</h3>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    Petugas memindai stiker barcode rumah via aplikasi mobile dan mengonfirmasi penyelesaian ritase.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 font-mono">
                  Scan QR &amp; Geotag
                </div>
              </div>

              {/* Step 6 */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col justify-between hover:border-emerald-500 transition-all">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-500 text-white flex items-center justify-center font-black text-lg mb-4 shadow-lg shadow-emerald-600/30">
                    6
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                    Langkah 6
                  </span>
                  <h3 className="text-base font-extrabold text-white">SETTLEMENT</h3>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    Sistem otomatis menghitung komisi platform, membukukan pendapatan bersih ke buku kas mitra, dan siap dicairkan.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 font-mono">
                  Buku Kas Zero-Variance
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PHASE 6: TWO SERVICE MODELS — RECURRING & ON-DEMAND */}
      <section id="model-layanan" className="py-20 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-2 block">
              Diversifikasi Portofolio
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              2 Model Layanan Pengelolaan Sampah
            </h2>
            <p className="text-slate-400 mt-3 text-sm sm:text-base leading-relaxed">
              O2WHERO memadukan stabilitas iuran langganan rutin bulanan dengan fleksibilitas pendapatan beromzet tinggi dari penjemputan insidental.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Model A: Recurring Subscription */}
            <div className="p-8 sm:p-10 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6 relative overflow-hidden">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30 text-xs font-bold uppercase tracking-wider">
                <Repeat className="w-3.5 h-3.5" /> Model A: Langganan Rutin (Recurring)
              </div>

              <div>
                <h3 className="text-2xl font-black text-white">Langganan Rutin Rumah Tangga &amp; Komersial</h3>
                <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                  Memberikan kepastian arus kas bulanan (MRR) melalui penjemputan berkala terjadwal yang tertib dan tercatat rapi.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Target Pelanggan:</h4>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-200">
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <CheckCheck className="w-4 h-4 text-sky-400 shrink-0" />
                    <span>Rumah Tangga Mandiri</span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <CheckCheck className="w-4 h-4 text-sky-400 shrink-0" />
                    <span>Klaster Perumahan (RT/RW)</span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <CheckCheck className="w-4 h-4 text-sky-400 shrink-0" />
                    <span>Ruko &amp; Bisnis Komersial</span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <CheckCheck className="w-4 h-4 text-sky-400 shrink-0" />
                    <span>Restoran, Kafe &amp; Perkantoran</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-800 text-xs text-slate-300">
                <p className="flex items-center gap-2">
                  <span className="font-bold text-sky-400">Jadwal:</span> 2 hingga 3 kali seminggu sesuai kalender wilayah.
                </p>
                <p className="flex items-center gap-2">
                  <span className="font-bold text-sky-400">Penagihan:</span> Iuran bulanan tetap via faktur otomatis &amp; bot WhatsApp reminder.
                </p>
                <p className="flex items-center gap-2">
                  <span className="font-bold text-sky-400">Identifikasi:</span> Stiker barcode tahan cuaca terpasang di pagar rumah warga.
                </p>
              </div>
            </div>

            {/* Model B: On-Demand Pickup */}
            <div className="p-8 sm:p-10 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6 relative overflow-hidden">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold uppercase tracking-wider">
                <Boxes className="w-3.5 h-3.5" /> Model B: Penjemputan Insidental (On-Demand)
              </div>

              <div>
                <h3 className="text-2xl font-black text-white">Layanan Angkut Khusus Sesuai Kebutuhan</h3>
                <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                  Menjawab kebutuhan angkut sampah dalam volume besar yang tidak tertampung oleh ritase rutin, dengan margin keuntungan tinggi.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Jenis Sampah Insidental:</h4>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-200">
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <CheckCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Puing Sampah Renovasi</span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <CheckCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Tebangan Dahan &amp; Pohon</span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <CheckCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Perabot Rusak (Bulky Waste)</span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <CheckCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Sampah Acara / Event Besar</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-800 text-xs text-slate-300">
                <p className="flex items-center gap-2">
                  <span className="font-bold text-emerald-400">Penetapan Tarif:</span> Berbasis estimasi volume (m³) dan jenis kendaraan.
                </p>
                <p className="flex items-center gap-2">
                  <span className="font-bold text-emerald-400">Kapasitas Armada:</span> Pilihan Mobil Pickup bak terbuka atau Truk Dump besar.
                </p>
                <p className="flex items-center gap-2">
                  <span className="font-bold text-emerald-400">Alokasi Mitra:</span> Penugasan instan ke armada mitra terdekat dari lokasi penjemputan.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PHASE 7: PARTNERSHIP ECOSYSTEM — CIRCULAR ECONOMY ARCHITECTURE */}
      <section id="ekosistem" className="py-20 border-b border-slate-800 bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-2 block">
              Arsitektur Sirkular
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Ekosistem Kemitraan Sirkular O2WHERO
            </h2>
            <p className="text-slate-400 mt-3 text-sm sm:text-base leading-relaxed">
              O2WHERO menyatukan seluruh pelaku rantai nilai pengelolaan sampah dari rumah tangga hingga industri daur ulang dalam satu jaringan digital yang saling menguntungkan.
            </p>
          </div>

          {/* Diagram Alur Ekosistem Interaktif */}
          <div className="p-8 sm:p-12 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center text-center">
              {/* Node 1 */}
              <div className="p-4.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center mx-auto">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="text-xs font-extrabold text-white">Konsumen &amp; Warga</h3>
                <p className="text-[11px] text-slate-400">
                  Penghasil sampah terlayani secara tertib, terjadwal, dan transparan.
                </p>
              </div>

              {/* Arrow */}
              <div className="hidden md:flex justify-center text-slate-600">
                <ArrowRight className="w-6 h-6 text-sky-400" />
              </div>

              {/* Node 2: Core Platform */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-sky-950/80 to-slate-950 border border-sky-500/60 shadow-lg shadow-sky-500/10 space-y-2">
                <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center mx-auto font-black">
                  O2W
                </div>
                <h3 className="text-xs font-black text-white">Platform O2WHERO</h3>
                <p className="text-[11px] text-sky-300">
                  Core engine multi-tenant, billing, gateway, live GPS, dan escrow kas.
                </p>
              </div>

              {/* Arrow */}
              <div className="hidden md:flex justify-center text-slate-600">
                <ArrowRight className="w-6 h-6 text-teal-400" />
              </div>

              {/* Node 3 */}
              <div className="p-4.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center mx-auto">
                  <Building2 className="w-5 h-5" />
                </div>
                <h3 className="text-xs font-extrabold text-white">Mitra Pengelola</h3>
                <p className="text-[11px] text-slate-400">
                  TPS 3R, Bank Sampah, KSM, dan armada pengangkut berdaulat.
                </p>
              </div>
            </div>

            {/* Second Row: Processing to Offtaker */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-800/80">
              <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-teal-400 uppercase flex items-center gap-1.5">
                  <Factory className="w-4 h-4" /> Fasilitas Pengolahan (TPST &amp; Komposting)
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Sampah organik diproses menjadi pupuk kompos atau bahan bakar biomassa (RDF). Sampah anorganik disortir berdasarkan jenis material.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-emerald-400 uppercase flex items-center gap-1.5">
                  <Scale className="w-4 h-4" /> Pembeli Daur Ulang / Offtaker Industri
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Pabrik daur ulang plastik, karton, dan logam membeli pasokan material pilah secara kontinyu dengan standar timbangan digital dan harga wajar.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-purple-400 uppercase flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4" /> Pemerintah Daerah &amp; DLH
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Dinas Lingkungan Hidup menerima laporan terukur mengenai volume timbulan sampah, laju pengurangan sampah ke TPA, dan reduksi emisi gas rumah kaca.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PHASE 8: PARTNER BUSINESS VALUE — 5 VALUE PROPOSITIONS */}
      <section id="nilai-bisnis" className="py-20 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-teal-400 mb-2 block">
              Nilai Nyata Kemitraan
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              5 Keuntungan Bisnis Nyata Bagi Mitra Pengelola Sampah
            </h2>
            <p className="text-slate-400 mt-3 text-sm sm:text-base leading-relaxed">
              Bergabung dengan O2WHERO bukan hanya tentang menggunakan software, tetapi menaikkan kelas instansi Anda menjadi entitas bisnis yang profesional.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold">
                1
              </div>
              <h3 className="text-base font-bold text-white">Akuisisi Pelanggan Lebih Mudah</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Mitra memiliki website resmi mandiri ber-domain sendiri dengan formulir registrasi online, mempermudah perluasan cakupan ke klaster perumahan baru.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center font-bold">
                2
              </div>
              <h3 className="text-base font-bold text-white">Penagihan Digital Lebih Tertib</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Otomasi penagihan via invoice QRIS dan notifikasi WhatsApp memangkas tunggakan warga serta menghapuskan risiko kebocoran kas di lapangan.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
                3
              </div>
              <h3 className="text-base font-bold text-white">Efisiensi Armada &amp; Rute</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Pengawasan posisi GPS armada truk secara real-time memastikan kepatuhan jadwal ritase, menghemat bahan bakar, dan mencegah perjalanan liar.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                4
              </div>
              <h3 className="text-base font-bold text-white">Layanan Pelanggan Terlacak Cepat</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Keluhan sampah terlambat tertangani dalam hitungan jam dengan sistem tiket pengaduan terpadu dan eskalasi langsung ke petugas piket.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-3 md:col-span-2 lg:col-span-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
                5
              </div>
              <h3 className="text-base font-bold text-white">Penyelesaian Dana &amp; Buku Kas Transparan</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Pencatatan pendapatan bersih di `TenantLedger` memberikan kepastian hak mitra tanpa potongan tersembunyi, mempermudah laporan keuangan ke pengurus, koperasi, dan dinas.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PHASE 9: MULTI-TENANT ARCHITECTURE MESSAGING — CORRECT & VERIFIED */}
      <section id="arsitektur" className="py-20 border-b border-slate-800 bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-sky-400 mb-2 block">
              Pondasi Multi-Tenant Sebenarnya
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              One Platform. Multiple Organizations. Isolated Data.
            </h2>
            <p className="text-slate-400 mt-3 text-sm sm:text-base leading-relaxed">
              Arsitektur terverifikasi yang menggabungkan efisiensi satu codebase bersama dengan isolasi data berbasis PostgreSQL Row-Level Security (RLS).
            </p>
          </div>

          {/* Interactive Architecture Navigation */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
            <button
              type="button"
              onClick={() => setActiveTab("codebase")}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === "codebase"
                  ? "bg-sky-600 text-white shadow-lg shadow-sky-600/30"
                  : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              <Layers className="w-4 h-4" />
              Shared Application Codebase
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("domain")}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === "domain"
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30"
                  : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              <Globe className="w-4 h-4" />
              Domain &amp; Branding Mandiri
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("rls")}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === "rls"
                  ? "bg-teal-600 text-white shadow-lg shadow-teal-600/30"
                  : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              Isolasi PostgreSQL RLS
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("enterprise")}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === "enterprise"
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                  : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              <Database className="w-4 h-4" />
              Dedicated DB (Enterprise)
            </button>
          </div>

          {/* Architecture Content Display */}
          <div className="p-6 sm:p-10 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl max-w-4xl mx-auto">
            {activeTab === "codebase" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Satu Aplikasi Bersama, Pembaruan Otomatis</h3>
                    <p className="text-xs text-slate-400">Next.js Single-Deployment Architecture</p>
                  </div>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Semua mitra menjalankan versi aplikasi Next.js mutakhir yang sama. Ketika ada fitur baru, optimasi rute peta, atau perbaikan bug yang dirilis, seluruh tenant otomatis menikmati pembaruan tersebut tanpa perlu proses update server manual satu per satu.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="font-bold text-sky-400">Zero Maintenance Overhead</span>
                    <p className="text-slate-400 mt-1">Pemeliharaan server terpusat oleh tim O2WHERO.</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="font-bold text-sky-400">High Availability 99.9%</span>
                    <p className="text-slate-400 mt-1">Arsitektur stateless siap menangani lonjakan transaksi.</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="font-bold text-sky-400">Backward Compatible</span>
                    <p className="text-slate-400 mt-1">Migrasi non-destruktif menjamin data lama tidak terganggu.</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "domain" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Domain Resmi &amp; Identitas Instansi Sendiri</h3>
                    <p className="text-xs text-slate-400">Dynamic Host Resolution &amp; Automated SSL</p>
                  </div>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Mitra dapat menggunakan subdomain standar (`nama-tps.o2whero.com`) atau domain kustom terverifikasi (seperti `upsheru.com`). Proxy server kami mendeteksi host yang masuk dan mengunci konteks organisasi secara otomatis dengan sertifikat SSL resmi.
                </p>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 space-y-1">
                  <p className="text-slate-500">// Penanganan Domain &amp; SSL:</p>
                  <p><span className="text-emerald-400">Standard Subdomain</span> ➔ <span className="text-sky-400">[slug].o2whero.com</span> (Instan)</p>
                  <p><span className="text-emerald-400">Verified Custom Domain</span> ➔ <span className="text-sky-400">upsheru.com</span> (CNAME DNS + Auto-SSL)</p>
                  <p><span className="text-rose-400">Untrusted Host</span> ➔ <span className="text-slate-400">Ditolak otomatis (HTTP 421 Misdirected Request)</span></p>
                </div>
              </div>
            )}

            {activeTab === "rls" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center font-bold">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Row-Level Security (RLS) PostgreSQL</h3>
                    <p className="text-xs text-slate-400">Pemisahan Data Logis Tingkat Database Engine</p>
                  </div>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Untuk tenant standar di database bersama, isolasi tidak hanya bergantung pada query kode aplikasi, melainkan dijamin oleh fitur native <strong>PostgreSQL Row-Level Security</strong> (`FORCE ROW LEVEL SECURITY`). Setiap sesi transaksi database mengunci variabel `app.current_tenant_id`, sehingga kebocoran data antar tenant mustahil terjadi.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="font-bold text-teal-400">Kredensial Terenkripsi AES-256</span>
                    <p className="text-slate-400 mt-1">API Key Fonnte &amp; Duitku dienkripsi saat tersimpan (at rest).</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="font-bold text-teal-400">Defense-in-Depth</span>
                    <p className="text-slate-400 mt-1">Query terfilter di Prisma ORM dan diverifikasi ulang di level database.</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "enterprise" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Dedicated Database untuk Kebutuhan B2G / Korporasi</h3>
                    <p className="text-xs text-slate-400">Koneksi Database Mandiri &amp; Fleksibilitas Penempatan</p>
                  </div>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Khusus bagi mitra institusi pemerintah (DLH) atau perusahaan swasta besar yang memiliki kebijakan kepatuhan audit data tersendiri, O2WHERO menyediakan opsi koneksi database terpisah (`dbConnectionString`) tanpa harus mengubah codebase aplikasi.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* PHASE 10: UPS HERU CASE STUDY — OPERATIONAL PILOT CASE STUDY */}
      <section id="percontohan" className="py-20 border-b border-slate-800 bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-gradient-to-br from-emerald-950/70 via-slate-900 to-slate-900 border border-emerald-800/60 p-6 sm:p-12 shadow-2xl relative overflow-hidden">
            <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
              <div className="space-y-4 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold uppercase tracking-wider">
                  <Award className="w-4 h-4 text-emerald-400" />
                  Studi Kasus &amp; Mitra Percontohan Operasional Nyata (Live Pilot)
                </div>

                <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                  UPS HERU — Unit Pengelolaan Sampah Kota Depok
                </h2>

                <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                  UPS HERU adalah bukti nyata keandalan ekosistem O2WHERO yang telah beroperasi di lapangan. Mengelola penjemputan sampah ribuan warga Kalibaru &amp; Cilodong dengan armada dump truck ber-GPS live, bot WhatsApp interaktif, dan penagihan QRIS langsung di domain mandiri <strong>upsheru.com</strong>.
                </p>

                {/* Verified Operational Data Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
                    <p className="text-[11px] text-slate-400 font-semibold">Cakupan Warga</p>
                    <p className="text-lg font-extrabold text-white mt-0.5">2.450+ KK</p>
                    <p className="text-[10px] text-emerald-400">Kalibaru &amp; Cilodong</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
                    <p className="text-[11px] text-slate-400 font-semibold">Armada Aktif</p>
                    <p className="text-lg font-extrabold text-purple-300 mt-0.5">3 Truk Dump</p>
                    <p className="text-[10px] text-purple-400">Live GPS &amp; Cockpit</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
                    <p className="text-[11px] text-slate-400 font-semibold">Pembayaran</p>
                    <p className="text-lg font-extrabold text-emerald-400 mt-0.5">100% QRIS/VA</p>
                    <p className="text-[10px] text-slate-400">Duitku Integrated</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
                    <p className="text-[11px] text-slate-400 font-semibold">Otomasi Bot WA</p>
                    <p className="text-lg font-extrabold text-sky-400 mt-0.5">Fonnte Dual</p>
                    <p className="text-[10px] text-sky-300">Bot Tagihan &amp; CS</p>
                  </div>
                </div>
              </div>

              {/* CTAs to UPS HERU Pilot */}
              <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
                <a
                  href="https://upsheru.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-xl shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
                >
                  Kunjungi upsheru.com
                  <ExternalLink className="w-4 h-4" />
                </a>
                <a
                  href="https://upsheru.com/lacak"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 rounded-xl bg-slate-950/80 hover:bg-slate-800 text-emerald-300 border border-emerald-800/80 font-semibold text-xs transition-all flex items-center justify-center gap-2"
                >
                  <Truck className="w-4 h-4 text-emerald-400" />
                  Live Lacak Armada Truk
                  <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                </a>
                <a
                  href="https://upsheru.com/bayar"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 font-semibold text-xs transition-all flex items-center justify-center gap-2"
                >
                  <QrCode className="w-4 h-4 text-sky-400" />
                  Simulasi Cek Tagihan Warga
                  <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PHASE 11: IMPROVED BUSINESS CALCULATOR — OPERATIONAL & REVENUE SIMULATION */}
      <section id="kalkulator" className="py-20 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-teal-400 mb-2 block">
              Simulasi Finansial Transparan
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Kalkulator Potensi Pendapatan &amp; Biaya Operasional
            </h2>
            <p className="text-slate-400 mt-3 text-sm sm:text-base leading-relaxed">
              Hitung proyeksi pendapatan retribusi, bagi hasil mitra, biaya operasional armada, serta estimasi nilai tambah ekonomi sirkular berdasarkan asumsi yang realistis.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start max-w-6xl mx-auto">
            {/* Input Controls */}
            <div className="lg:col-span-6 p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
              <div>
                <div className="flex justify-between text-sm font-semibold mb-2">
                  <label className="text-slate-300">Jumlah Warga / KK Terlayani</label>
                  <span className="text-sky-400 font-bold">{kalkulatorKk.toLocaleString("id-ID")} KK</span>
                </div>
                <input
                  type="range"
                  min="200"
                  max="5000"
                  step="100"
                  value={kalkulatorKk}
                  onChange={(e) => setKalkulatorKk(Number(e.target.value))}
                  className="w-full accent-sky-500 cursor-pointer h-2 bg-slate-950 rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>200 KK</span>
                  <span>Skala TPS 3R Mandiri</span>
                  <span>5.000 KK</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm font-semibold mb-2">
                  <label className="text-slate-300">Tarif Iuran Rata-rata per Bulan</label>
                  <span className="text-teal-400 font-bold">Rp {iuranPerKk.toLocaleString("id-ID")}</span>
                </div>
                <input
                  type="range"
                  min="15000"
                  max="100000"
                  step="5000"
                  value={iuranPerKk}
                  onChange={(e) => setIuranPerKk(Number(e.target.value))}
                  className="w-full accent-teal-500 cursor-pointer h-2 bg-slate-950 rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>Rp 15.000</span>
                  <span>Standar Perumahan</span>
                  <span>Rp 100.000</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm font-semibold mb-2">
                  <label className="text-slate-300">Tingkat Kepatuhan Bayar (Collection Rate)</label>
                  <span className="text-emerald-400 font-bold">{collectionRate}%</span>
                </div>
                <input
                  type="range"
                  min="70"
                  max="100"
                  step="5"
                  value={collectionRate}
                  onChange={(e) => setCollectionRate(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer h-2 bg-slate-950 rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>70% (Manual)</span>
                  <span>90% (O2WHERO Digital)</span>
                  <span>100%</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm font-semibold mb-2">
                  <label className="text-slate-300">Sampah Anorganik Terpilah / Hari</label>
                  <span className="text-purple-400 font-bold">{estimasiSampahKg.toLocaleString("id-ID")} kg/hari</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="2000"
                  step="50"
                  value={estimasiSampahKg}
                  onChange={(e) => setEstimasiSampahKg(Number(e.target.value))}
                  className="w-full accent-purple-500 cursor-pointer h-2 bg-slate-950 rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>50 kg</span>
                  <span>Potensi Daur Ulang</span>
                  <span>2.000 kg</span>
                </div>
              </div>
            </div>

            {/* Comprehensive Financial Breakdown Output */}
            <div className="lg:col-span-6 space-y-4">
              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block border-b border-slate-800 pb-2">
                  Rincian Proyeksi Finansial Bulanan
                </span>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between items-center text-slate-300">
                    <span>Gross Tagihan Maksimal:</span>
                    <span className="font-bold text-white">Rp {grossTagihanBulan.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between items-center text-emerald-400 font-semibold">
                    <span>Realisasi Kas Masuk ({collectionRate}%):</span>
                    <span className="text-sm font-extrabold text-emerald-400">
                      Rp {kasTerkumpulBulan.toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Komisi Platform O2WHERO (Rp 1.000/transaksi):</span>
                    <span className="text-rose-400">- Rp {platformFeeBulan.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Estimasi Biaya Bahan Bakar &amp; Armada (~32%):</span>
                    <span className="text-rose-400">- Rp {estimasiBiayaArmada.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Estimasi Honor Sopir, Knek &amp; Admin (~28%):</span>
                    <span className="text-rose-400">- Rp {estimasiBiayaAdminPetugas.toLocaleString("id-ID")}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
                  <div>
                    <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">
                      Estimasi Kas Bersih (Operating Margin) Mitra
                    </span>
                    <p className="text-[11px] text-slate-500">Setelah dikurangi seluruh beban operasional dasar</p>
                  </div>
                  <span className="text-xl sm:text-2xl font-black text-white">
                    Rp {estimasiOperatingMarginMitra.toLocaleString("id-ID")}
                    <span className="text-xs text-slate-400 font-normal"> /bln</span>
                  </span>
                </div>
              </div>

              {/* Circular Economy Potential Card */}
              <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-800/60 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Recycle className="w-4 h-4" /> Potensi Tambahan Daur Ulang &amp; ESG
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                    Estimasi Pasar
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Nilai Jual Daur Ulang (@Rp 2.500/kg):</span>
                    <span className="text-base font-extrabold text-emerald-400 mt-0.5 block">
                      + Rp {potensiDaurUlangBulan.toLocaleString("id-ID")} /bln
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Reduksi Emisi Karbon:</span>
                    <span className="text-base font-extrabold text-teal-300 mt-0.5 block">
                      {reduksiCo2Kg.toLocaleString("id-ID")} kg CO2e /bln
                    </span>
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 italic pt-2 border-t border-slate-800/80">
                  *Catatan: Nilai daur ulang dan reduksi karbon merupakan estimasi simulasi berdasarkan rata-rata pasar komoditas daur ulang dan bukan jaminan pendapatan mutlak.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PHASE 12: PARTNERSHIP REGISTRATION CTA & FORM */}
      <section id="daftar-mitra" className="py-20 border-b border-slate-800 bg-slate-900/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="text-xs font-bold uppercase tracking-widest text-sky-400">Pendaftaran Kemitraan</span>
            <h2 className="text-3xl sm:text-4xl font-black text-white mt-1">Gabung Sebagai Mitra Pengelola Sampah</h2>
            <p className="text-slate-400 text-sm mt-2 max-w-xl mx-auto">
              Lengkapi informasi unit pengelola sampah Anda. Tim O2WHERO akan menyiapkan konfigurasi portal, database, dan mendampingi hingga operasional live di lapangan.
            </p>
          </div>

          <div className="p-6 sm:p-10 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl">
            {successMsg ? (
              <div className="p-8 rounded-2xl bg-emerald-950/60 border border-emerald-800 text-center space-y-4">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <h3 className="text-xl font-bold text-white">Pendaftaran Berhasil Dikirim!</h3>
                <p className="text-sm text-slate-300 max-w-md mx-auto">{successMsg}</p>
                <button
                  type="button"
                  onClick={() => setSuccessMsg("")}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all"
                >
                  Kirim Pendaftaran Lain
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {errorMsg && (
                  <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-sm">
                    {errorMsg}
                  </div>
                )}

                {/* Pilihan Paket Kemitraan */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Pilihan Paket Kemitraan O2WHERO
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, paketPilihan: "starter" })}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        form.paketPilihan === "starter"
                          ? "bg-teal-950/60 border-teal-500 text-white shadow-md shadow-teal-500/20"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <p className="text-xs font-bold text-teal-400">Starter</p>
                      <p className="text-sm font-extrabold text-white mt-0.5">Rp 299rb/bln</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">&lt; 1.000 KK Warga</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setForm({ ...form, paketPilihan: "pro" })}
                      className={`p-3.5 rounded-xl border text-left transition-all relative ${
                        form.paketPilihan === "pro"
                          ? "bg-sky-950/60 border-sky-500 text-white shadow-md shadow-sky-500/20"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-sky-400">Pro (Rekomendasi)</p>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-bold uppercase">Popular</span>
                      </div>
                      <p className="text-sm font-extrabold text-white mt-0.5">Rp 899rb/bln</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">3.500 KK + Live GPS Armada</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setForm({ ...form, paketPilihan: "enterprise" })}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        form.paketPilihan === "enterprise"
                          ? "bg-purple-950/60 border-purple-500 text-white shadow-md shadow-purple-500/20"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <p className="text-xs font-bold text-purple-400">Enterprise B2G</p>
                      <p className="text-sm font-extrabold text-white mt-0.5">Kustom DLH/Pemda</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Dedicated Database &amp; Multi-Zone</p>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">
                    *Biaya setup domain mandiri &amp; onboarding awal: Flat Rp 2.000.000. Komisi per transaksi lunas: Rp 1.000.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      Nama Penanggung Jawab *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.namaLengkap}
                      onChange={(e) => setForm({ ...form, namaLengkap: e.target.value })}
                      placeholder="Contoh: Heru Santoso"
                      className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      Nama Unit / Instansi Pengelola *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.namaInstansi}
                      onChange={(e) => setForm({ ...form, namaInstansi: e.target.value })}
                      placeholder="Contoh: TPS 3R Sukatani / Bank Sampah Merdeka"
                      className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      Jenis Pengelola *
                    </label>
                    <select
                      value={form.jenisUsaha}
                      onChange={(e) => setForm({ ...form, jenisUsaha: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-sky-500"
                    >
                      <option value="tps3r">TPS 3R / TPST</option>
                      <option value="bank_sampah">Bank Sampah Unit / Induk</option>
                      <option value="ksm_komunitas">KSM / Paguyuban RT-RW</option>
                      <option value="pengepul">Pengepul / Lapak Daur Ulang</option>
                      <option value="swasta">Perusahaan Swasta Kebersihan</option>
                      <option value="dlh">Instansi DLH / Pemerintah Daerah</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      Wilayah / Kota Operasional *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.wilayahOperasional}
                      onChange={(e) => setForm({ ...form, wilayahOperasional: e.target.value })}
                      placeholder="Kota Depok, Bogor, Bekasi, dll"
                      className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      Estimasi KK Terlayani *
                    </label>
                    <input
                      type="number"
                      required
                      value={form.estimasiWarga}
                      onChange={(e) => setForm({ ...form, estimasiWarga: e.target.value })}
                      placeholder="1000"
                      className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      Kapasitas Armada Eksisting
                    </label>
                    <select
                      value={form.armadaEksisting}
                      onChange={(e) => setForm({ ...form, armadaEksisting: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-sky-500"
                    >
                      <option value="truk_dump">Truk Dump (1 - 3 Unit)</option>
                      <option value="pickup">Mobil Pickup Bak Terbuka</option>
                      <option value="motor_roda_3">Motor Roda Tiga (Tossa / Viar)</option>
                      <option value="kombinasi">Kombinasi Truk &amp; Roda Tiga</option>
                      <option value="belum_ada">Belum Memiliki Armada (Rencana Pengadaan)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      Metode Pengelolaan Saat Ini
                    </label>
                    <select
                      value={form.metodePengelolaan}
                      onChange={(e) => setForm({ ...form, metodePengelolaan: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-sky-500"
                    >
                      <option value="buku_manual">Buku Catatan Manual / Buku Kas Kertas</option>
                      <option value="excel">Microsoft Excel / Google Spreadsheet</option>
                      <option value="aplikasi_lama">Aplikasi Sistem Lama (Ingin Migrasi)</option>
                      <option value="belum_terorganisir">Belum Terorganisir / Memulai dari Awal</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      No. WhatsApp Aktif *
                    </label>
                    <input
                      type="tel"
                      required
                      value={form.noWhatsapp}
                      onChange={(e) => setForm({ ...form, noWhatsapp: e.target.value })}
                      placeholder="081234567890"
                      className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      Email Resmi *
                    </label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="admin@instansi.com"
                      className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Kebutuhan Kemitraan Khusus / Domain yang Diinginkan
                  </label>
                  <textarea
                    rows={3}
                    value={form.catatanAdmin}
                    onChange={(e) => setForm({ ...form, catatanAdmin: e.target.value })}
                    placeholder="Contoh: Kami ingin menggunakan domain resmi tps3r-merdeka.id, membutuhkan integrasi 2 nomor WhatsApp Fonnte, dan pembayaran QRIS warga..."
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-sky-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-sky-600 via-teal-600 to-emerald-600 hover:from-sky-500 hover:to-emerald-500 text-white font-extrabold text-base shadow-xl shadow-sky-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Sedang Memproses Pendaftaran...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Kirim Pendaftaran Kemitraan
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* PHASE 13: FAQ ACCORDION SECTION */}
      <section id="faq" className="py-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-sky-400 mb-2 block">
            Pertanyaan Umum
          </span>
          <h2 className="text-3xl font-black text-white">Tanya Jawab Seputar Ekosistem O2WHERO</h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden transition-all"
            >
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full px-6 py-4.5 text-left font-bold text-sm sm:text-base text-white flex items-center justify-between gap-4"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                    openFaq === idx ? "rotate-180 text-sky-400" : ""
                  }`}
                />
              </button>
              {openFaq === idx && (
                <div className="px-6 pb-5 text-sm text-slate-300 leading-relaxed border-t border-slate-800/60 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-800 py-12 text-xs text-slate-500 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-bold text-slate-300 text-sm">O2WHERO Platform — Core Digital Ecosystem</p>
            <p className="mt-1">
              Mitra Percontohan Resmi:{" "}
              <a href="https://upsheru.com" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">
                UPS HERU (upsheru.com)
              </a>{" "}
              — Pengelolaan &amp; Retribusi Kebersihan Kota Depok.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-slate-400 hover:text-white flex items-center gap-1 font-semibold">
              <Lock className="w-3.5 h-3.5 text-sky-400" />
              Login Admin
            </Link>
            <span>•</span>
            <a href="https://wa.me/6281532843224" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-emerald-400 flex items-center gap-1 font-semibold">
              <PhoneCall className="w-3.5 h-3.5" />
              Kontak Kemitraan
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
