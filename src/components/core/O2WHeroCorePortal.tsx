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
  Gift,
} from "lucide-react";

export default function O2WHeroCorePortal() {
  // State formulir pendaftaran mitra
  const [form, setForm] = useState({
    namaLengkap: "",
    namaInstansi: "",
    jenisUsaha: "tps3r",
    noWhatsapp: "",
    email: "",
    kota: "Kota Depok",
    estimasiWarga: "500",
    kebutuhanDb: "dedicated",
    paketPilihan: "pro",
    catatanAdmin: "",
  });

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // State kalkulator potensi kemitraan
  const [kalkulatorKk, setKalkulatorKk] = useState(1000);
  const [iuranPerKk, setIuranPerKk] = useState(30000);
  const [estimasiSampahKg, setEstimasiSampahKg] = useState(250);

  // State tab arsitektur
  const [activeTab, setActiveTab] = useState<"db" | "domain" | "armada" | "esg">("db");

  // State FAQ accordion
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Perhitungan dinamis kalkulator
  const potensiRetribusi = kalkulatorKk * iuranPerKk;
  const potensiDaurUlangBulan = estimasiSampahKg * 30 * 2500; // estimasi Rp 2.500 / kg nilai daur ulang
  const totalPotensi = potensiRetribusi + potensiDaurUlangBulan;
  const reduksiCo2Kg = Math.round(estimasiSampahKg * 30 * 0.85); // estimasi 0.85 kg CO2e per kg sampah terpilah

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const payload = {
        ...form,
        catatanAdmin: `[Pilihan Paket: ${form.paketPilihan.toUpperCase()}] ${form.catatanAdmin ? `Catatan: ${form.catatanAdmin}` : ""}`.trim(),
      };

      const res = await fetch("/api/core/mitra/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mengirim formulir pendaftaran.");
      }

      setSuccessMsg(
        "Pendaftaran berhasil! Tim O2W Hero akan segera menghubungi WhatsApp Anda untuk koordinasi setup database dan domain mandiri."
      );
      setForm({
        namaLengkap: "",
        namaInstansi: "",
        jenisUsaha: "tps3r",
        noWhatsapp: "",
        email: "",
        kota: "Kota Depok",
        estimasiWarga: "500",
        kebutuhanDb: "dedicated",
        paketPilihan: "pro",
        catatanAdmin: "",
      });
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan koneksi.");
    } finally {
      setLoading(false);
    }
  };

  const faqs = [
    {
      q: "Apakah data nasabah dan keuangan mitra kami aman dan tidak bercampur dengan mitra lain?",
      a: "Sangat aman. O2W Hero menggunakan arsitektur Database-per-Tenant. Setiap mitra memiliki database PostgreSQL terpisah dengan kredensial terenkripsi sendiri. Data nasabah, catatan kas, tagihan, dan rute Anda 100% terisolasi dan dapat dibackup mandiri secara berkala.",
    },
    {
      q: "Bisakah mitra menggunakan domain resmi sendiri seperti upsheru.com?",
      a: "Bisa. Anda cukup mengarahkan CNAME DNS domain Anda (misal: pengelolasampah.com) ke core kami. Reverse proxy kami (On-Demand TLS) akan otomatis menerbitkan sertifikat SSL Let's Encrypt resmi secara gratis tanpa perlu konfigurasi server manual.",
    },
    {
      q: "Bagaimana alur pembayaran warga melalui QRIS Duitku?",
      a: "Warga dapat langsung memindai QRIS dinamis yang tertera pada faktur web atau pesan WhatsApp. Setelah pembayaran berhasil, gateway Duitku langsung memverifikasi sistem dalam hitungan detik (status lunas otomatis) dan dana diteruskan ke rekening pengelola sampah mitra.",
    },
    {
      q: "Apakah aplikasi petugas lapangan sudah mendukung pelacakan armada GPS real-time?",
      a: "Ya. Petugas armada pengangkut menggunakan aplikasi mobile Android native berbasis GPS latar belakang (background tracking). Warga dan pengurus RT/RW dapat melihat posisi pergerakan truk sampah secara live di peta digital situs mitra.",
    },
    {
      q: "Bagaimana cara melihat contoh implementasi operasional yang sudah berjalan?",
      a: "Anda dapat melihat langsung mitra percontohan pertama kami di Kota Depok, yaitu TPS 3R Heru yang beroperasi aktif di domain resmi https://upsheru.com.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Top Header / Sticky Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-sky-600 via-teal-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-sky-500/25 text-white font-black text-xl tracking-wider">
              O2W
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xl tracking-tight text-white">
                  O2W HERO
                </span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30">
                  CORE PLATFORM
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                SaaS Pengelolaan Sampah Multi-Mitra & Daur Ulang Indonesia
              </p>
            </div>
          </div>

          {/* Quick Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-slate-300">
            <a href="#arsitektur" className="hover:text-white transition-colors">
              Arsitektur
            </a>
            <a href="#percontohan" className="hover:text-emerald-400 transition-colors">
              Mitra Percontohan
            </a>
            <a href="#kalkulator" className="hover:text-sky-400 transition-colors">
              Kalkulator Potensi
            </a>
            <a href="#paket-harga" className="hover:text-amber-400 transition-colors font-bold">
              Paket Kemitraan
            </a>
            <a href="#faq" className="hover:text-white transition-colors">
              FAQ
            </a>
          </nav>

          {/* Action Buttons: Login & Register */}
          <div className="flex items-center gap-3">
            <a
              href="https://upsheru.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-emerald-950/70 text-emerald-300 border border-emerald-800 hover:bg-emerald-900/50 transition-colors"
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
              <span>Login Admin</span>
            </Link>

            <a
              href="#daftar-mitra"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-500 hover:to-teal-500 text-white shadow-lg shadow-sky-600/25 transition-all"
            >
              <span>Daftar Mitra</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-32 border-b border-slate-800">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.18),rgba(255,255,255,0))]" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-300 text-xs sm:text-sm font-semibold mb-6">
            <Sparkles className="w-4 h-4 text-sky-400" />
            Platform Multi-Tenant Pengelola Sampah & Bank Sampah Mandiri
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight sm:leading-none max-w-4xl mx-auto">
            Satu Ekosistem Inti. <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-sky-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
              Setiap Mitra Berdaulat dengan Database &amp; Domain Sendiri.
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Platform SaaS O2W Hero menghubungkan TPS 3R, bank sampah warga, pengepul, hingga offtaker daur ulang dengan isolasi database mandiri, kasir QRIS otomatis, armada GPS live, dan sertifikasi emisi ESG.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#daftar-mitra"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-500 hover:to-teal-500 text-white font-extrabold text-base shadow-xl shadow-sky-600/30 transition-all flex items-center justify-center gap-2"
            >
              Daftarkan Unit Pengelola Anda
              <ArrowRight className="w-5 h-5" />
            </a>
            <a
              href="https://upsheru.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold text-base transition-all flex items-center justify-center gap-2"
            >
              Lihat Contoh Lapangan (upsheru.com)
              <ExternalLink className="w-5 h-5 text-emerald-400" />
            </a>
          </div>

          {/* Key Metric Highlights */}
          <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Isolasi Data</p>
              <h2 className="text-xl font-black text-white mt-1">100% Terpisah</h2>
              <p className="text-[11px] text-emerald-400 mt-0.5">Database per Mitra</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Custom Domain</p>
              <h2 className="text-xl font-black text-white mt-1">SSL Otomatis</h2>
              <p className="text-[11px] text-sky-400 mt-0.5">CNAME Ready</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Pembayaran</p>
              <h2 className="text-xl font-black text-white mt-1">QRIS Dinamis</h2>
              <p className="text-[11px] text-teal-400 mt-0.5">Verifikasi Realtime</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Pelacakan</p>
              <h2 className="text-xl font-black text-white mt-1">Live GPS Truk</h2>
              <p className="text-[11px] text-purple-400 mt-0.5">Mobile Native App</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pilot Showcase Section: UPS HERU */}
      <section id="percontohan" className="py-20 border-b border-slate-800 bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-gradient-to-br from-emerald-950/70 via-slate-900 to-slate-900 border border-emerald-800/60 p-6 sm:p-10 shadow-2xl relative overflow-hidden">
            <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
              <div className="space-y-4 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold uppercase tracking-wider">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Mitra Percontohan Pertama (Proof of Concept Live)
                </div>

                <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                  UPS HERU — Unit Pengelolaan Sampah Kota Depok
                </h2>

                <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                  Bukti nyata keandalan arsitektur O2W Hero yang telah beroperasi di lapangan. Mengelola penjemputan sampah ribuan warga Kalibaru &amp; Cilodong dengan armada dump truck ber-GPS live, WhatsApp bot otomatis, dan pembayaran QRIS langsung di domain mandiri <strong>upsheru.com</strong>.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
                    <p className="text-[11px] text-slate-400 font-semibold">Cakupan Warga</p>
                    <p className="text-base font-extrabold text-white mt-0.5">2.450+ KK</p>
                    <p className="text-[10px] text-emerald-400">Kalibaru &amp; Cilodong</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
                    <p className="text-[11px] text-slate-400 font-semibold">Armada Aktif</p>
                    <p className="text-base font-extrabold text-purple-300 mt-0.5">3 Truk Dump</p>
                    <p className="text-[10px] text-purple-400">Live GPS &amp; Cockpit</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
                    <p className="text-[11px] text-slate-400 font-semibold">Pembayaran</p>
                    <p className="text-base font-extrabold text-emerald-400 mt-0.5">100% QRIS</p>
                    <p className="text-[10px] text-slate-400">0% Kas Bocor</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
                    <p className="text-[11px] text-slate-400 font-semibold">Database Tenant</p>
                    <p className="text-base font-extrabold text-sky-400 mt-0.5">PostgreSQL</p>
                    <p className="text-[10px] text-sky-300">Dedicated Sumobase</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
                <a
                  href="https://upsheru.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-xl shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
                >
                  Buka Portal upsheru.com
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
                  href="https://upsheru.com/cek-tagihan"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 font-semibold text-xs transition-all flex items-center justify-center gap-2"
                >
                  <QrCode className="w-4 h-4 text-sky-400" />
                  Uji Cek Tagihan Warga
                  <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Potential & ROI Calculator */}
      <section id="kalkulator" className="py-20 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-teal-400 mb-2 block">
              Simulasi &amp; Kalkulator Bisnis
            </span>
            <h2 className="text-3xl font-black text-white">Hitung Potensi Pendapatan &amp; Dampak Unit Anda</h2>
            <p className="text-slate-400 mt-3 text-sm sm:text-base">
              Perkirakan retribusi bulanan, nilai ekonomis daur ulang, dan reduksi emisi karbon yang dapat dicapai unit pengelola sampah Anda bersama O2W Hero.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center max-w-5xl mx-auto">
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
              </div>

              <div>
                <div className="flex justify-between text-sm font-semibold mb-2">
                  <label className="text-slate-300">Estimasi Sampah Terpilah / Hari (Daur Ulang)</label>
                  <span className="text-emerald-400 font-bold">{estimasiSampahKg.toLocaleString("id-ID")} kg/hari</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="2000"
                  step="50"
                  value={estimasiSampahKg}
                  onChange={(e) => setEstimasiSampahKg(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer h-2 bg-slate-950 rounded-lg"
                />
              </div>
            </div>

            {/* Live Output Cards */}
            <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-gradient-to-br from-sky-950/60 to-slate-900 border border-sky-800/50 shadow-lg">
                <p className="text-xs font-bold text-sky-400 uppercase tracking-wider">Potensi Retribusi</p>
                <h3 className="text-2xl font-black text-white mt-1">
                  Rp {potensiRetribusi.toLocaleString("id-ID")}
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">per bulan dari iuran warga</p>
              </div>

              <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/60 to-slate-900 border border-emerald-800/50 shadow-lg">
                <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Nilai Jual Daur Ulang</p>
                <h3 className="text-2xl font-black text-white mt-1">
                  Rp {potensiDaurUlangBulan.toLocaleString("id-ID")}
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">estimasi penjualan ke offtaker</p>
              </div>

              <div className="p-5 rounded-2xl bg-gradient-to-br from-teal-950/60 to-slate-900 border border-teal-800/50 shadow-lg sm:col-span-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-teal-400 uppercase tracking-wider">Total Potensi Finansial</p>
                    <h3 className="text-3xl font-black text-white mt-1">
                      Rp {totalPotensi.toLocaleString("id-ID")}
                      <span className="text-xs text-slate-400 font-normal"> / bulan</span>
                    </h3>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Reduksi Karbon</p>
                    <p className="text-xl font-black text-emerald-300 mt-1">
                      {reduksiCo2Kg.toLocaleString("id-ID")} kg
                    </p>
                    <p className="text-[10px] text-slate-400">CO2e terhindar / bulan</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Deep-Dive Architecture Tabs */}
      <section id="arsitektur" className="py-20 border-b border-slate-800 bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-sky-400 mb-2 block">
              Pondasi Teknologi
            </span>
            <h2 className="text-3xl font-black text-white">4 Pilar Arsitektur Multi-Tenant O2W Hero</h2>
            <p className="text-slate-400 mt-2 text-sm sm:text-base">
              Dibangun dengan standar keamanan enterprise, koneksi database adaptif, dan performa serverless modern.
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
            <button
              onClick={() => setActiveTab("db")}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === "db"
                  ? "bg-sky-600 text-white shadow-lg shadow-sky-600/30"
                  : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              <Database className="w-4 h-4" />
              Database-per-Tenant
            </button>
            <button
              onClick={() => setActiveTab("domain")}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === "domain"
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30"
                  : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              <Globe className="w-4 h-4" />
              Custom Domain Engine
            </button>
            <button
              onClick={() => setActiveTab("armada")}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === "armada"
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                  : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              <Truck className="w-4 h-4" />
              Logistik &amp; Live GPS
            </button>
            <button
              onClick={() => setActiveTab("esg")}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === "esg"
                  ? "bg-teal-600 text-white shadow-lg shadow-teal-600/30"
                  : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Laporan DLH &amp; ESG
            </button>
          </div>

          {/* Tab Content Display */}
          <div className="p-6 sm:p-10 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl max-w-4xl mx-auto">
            {activeTab === "db" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Isolasi Database Penuh per Mitra</h3>
                    <p className="text-xs text-slate-400">PostgreSQL Dedicated Connection Pooling</p>
                  </div>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Tidak seperti aplikasi monolitik yang mencampurkan ribuan data mitra dalam satu tabel besar, O2W Hero mendukung arsitektur <strong>Database-per-Tenant</strong>. Setiap pengelola sampah memiliki skema atau instance PostgreSQL mandiri. Sistem koneksi dinamis (Dynamic Connection Manager) membuka koneksi hanya saat ada aktivitas, menjaga performa tetap optimal dan anti bocor data.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                    <span className="font-bold text-sky-400">✓ Enkripsi Kredensial</span>
                    <p className="text-slate-400 mt-1">String koneksi DB diamankan di master vault.</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                    <span className="font-bold text-sky-400">✓ Backup Mandiri</span>
                    <p className="text-slate-400 mt-1">Mitra bebas ekspor dump database kapan saja.</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                    <span className="font-bold text-sky-400">✓ Skalabilitas Tanpa Batas</span>
                    <p className="text-slate-400 mt-1">Kapasitas server fleksibel mengikuti skala mitra.</p>
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
                    <h3 className="text-xl font-bold text-white">Branding Mandiri dengan Custom Domain</h3>
                    <p className="text-xs text-slate-400">Automated CNAME Routing &amp; On-Demand SSL</p>
                  </div>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Tingkatkan reputasi pengelola sampah Anda di mata dinas dan warga dengan nama domain sendiri (contoh: <em>upsheru.com</em> atau <em>banksampah-depok.id</em>). Sistem reverse proxy kami mendeteksi host header secara otomatis dan menerbitkan sertifikat SSL resmi tanpa biaya tambahan.
                </p>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 space-y-1">
                  <p className="text-slate-500">// Cara mengarahkan domain mitra:</p>
                  <p><span className="text-emerald-400">CNAME</span> @ ➔ <span className="text-sky-400">cname.o2whero.com</span></p>
                  <p><span className="text-emerald-400">SSL</span> ➔ <span className="text-teal-400">Otomatis Terbit (Let's Encrypt / Cloudflare Edge)</span></p>
                </div>
              </div>
            )}

            {activeTab === "armada" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Logistik Realtime &amp; Cockpit Driver</h3>
                    <p className="text-xs text-slate-400">Integrasi Aplikasi Petugas Lapangan Native</p>
                  </div>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Dilengkapi aplikasi petugas lapangan native Android dengan background geolocation. Sopir armada truk dan knek dapat mencatat ritase sampah, memverifikasi barcode stiker rumah warga, memproses absensi presensi, serta menerima laporan komplain penjemputan secara langsung dari warga.
                </p>
              </div>
            )}

            {activeTab === "esg" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center font-bold">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Standar Pelaporan DLH &amp; Sertifikasi Emisi</h3>
                    <p className="text-xs text-slate-400">ESG Analytics &amp; Landfill Diversion Rate</p>
                  </div>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Semua transaksi penimbangan sampah terpilah otomatis dikonversi ke tonase bulanan dan estimasi kalkulasi reduksi karbon (CO2e). Siap dicetak untuk laporan pertanggungjawaban ke Dinas Lingkungan Hidup (DLH), pemda setempat, maupun audit program CSR perusahaan mitra.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Paket Kemitraan Section */}
      <section id="paket-harga" className="py-20 border-b border-slate-800 bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-sky-400 mb-2 block">
              Investasi Transparan &amp; ROI Nyata
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Pilihan Skema Paket Kemitraan O2W Hero
            </h2>
            <p className="text-sm sm:text-base text-slate-400 mt-3 leading-relaxed">
              Tingkatkan efisiensi penagihan dan operasional armada Anda. Biaya langganan terjangkau yang menutup sendiri biayanya hanya dari pencegahan kebocoran kas warga.
            </p>
          </div>

          {/* Penawaran Emas Banner */}
          <div className="mb-12 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-sky-950/60 border border-emerald-500/30 shadow-2xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                  <Gift className="w-7 h-7" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold uppercase tracking-wider mb-1">
                    <Award className="w-3.5 h-3.5" /> Jaminan Bebas Risiko
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white">
                    Garansi 60 Hari Bebas Risiko &amp; Gratis Migrasi Data Warga
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                    Coba seluruh fitur Pro tanpa biaya di 60 hari pertama. Tim teknis O2W Hero akan membantu merapikan database warga dari file Excel atau buku fisik Anda hingga sistem siap jalan.
                  </p>
                </div>
              </div>

              <a
                href="#daftar-mitra"
                onClick={() => setForm(prev => ({ ...prev, paketPilihan: "pro" }))}
                className="shrink-0 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs sm:text-sm shadow-xl shadow-emerald-500/20 transition-all flex items-center gap-2"
              >
                <span>Klaim Trial 60 Hari Sekarang</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Grid 3 Paket */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
            {/* Paket Starter */}
            <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-8 flex flex-col justify-between hover:border-slate-700 transition-all">
              <div className="space-y-6">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Bank Sampah &amp; TPS 3R Swadaya
                  </span>
                  <h3 className="text-2xl font-black text-white mt-1">Paket Starter</h3>
                  <p className="text-xs text-slate-400 mt-2">
                    Solusi terjangkau bagi unit pengelola yang baru memulai transisi dari pencatatan manual ke digital.
                  </p>
                </div>

                <div className="pb-6 border-b border-slate-800">
                  <div className="flex items-baseline gap-1">
                    <span className="text-xs font-bold text-slate-400">Rp</span>
                    <span className="text-4xl font-black text-white">299.000</span>
                    <span className="text-xs text-slate-400">/ bulan</span>
                  </div>
                  <p className="text-[11px] text-teal-400 mt-1">Hingga 1.000 KK Warga</p>
                </div>

                <ul className="space-y-3 text-xs text-slate-300">
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                    <span>1–2 Armada Operasional (Gerobak Motor/Tossa)</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                    <span>Billing Iuran Digital &amp; QRIS Dinamis Otomatis</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                    <span>Notifikasi WhatsApp Pengingat Tagihan Warga</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                    <span>Subdomain Resmi: <code className="text-teal-300 font-mono">unit.o2whero.com</code></span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                    <span>Laporan Kas &amp; Buku Besar Kas Masuk/Keluar</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                    <span>Shared High-Performance DB Cluster</span>
                  </li>
                </ul>
              </div>

              <div className="pt-8">
                <a
                  href="#daftar-mitra"
                  onClick={() => setForm(prev => ({ ...prev, paketPilihan: "starter" }))}
                  className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 transition-all"
                >
                  <span>Pilih Paket Starter</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Paket Pro (Featured) */}
            <div className="rounded-3xl bg-gradient-to-b from-sky-950/60 to-slate-900 border-2 border-sky-500/80 p-8 flex flex-col justify-between shadow-2xl shadow-sky-950/50 relative">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-sky-500 to-teal-500 text-slate-950 text-[11px] font-black tracking-wider uppercase shadow-lg flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Paling Diminati / Best Value
              </div>

              <div className="space-y-6">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
                    Operator Swasta &amp; TPS 3R Mandiri
                  </span>
                  <h3 className="text-2xl font-black text-white mt-1">Paket Pro</h3>
                  <p className="text-xs text-slate-300 mt-2">
                    Standar lengkap operasional setara <strong>upsheru.com</strong> dengan branding mandiri dan pelacakan GPS live.
                  </p>
                </div>

                <div className="pb-6 border-b border-sky-800/60">
                  <div className="flex items-baseline gap-1">
                    <span className="text-xs font-bold text-slate-400">Rp</span>
                    <span className="text-4xl font-black text-white">899.000</span>
                    <span className="text-xs text-slate-400">/ bulan</span>
                  </div>
                  <p className="text-[11px] text-sky-400 mt-1">Hingga 3.500 KK Warga</p>
                </div>

                <ul className="space-y-3 text-xs text-slate-200">
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    <span><strong>Armada Tak Terbatas</strong> + Driver Cockpit Native</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    <span><strong>Live GPS Tracking</strong> Truk Sampah Terbuka untuk Warga</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    <span><strong>Custom Domain Mandiri</strong> (<code className="text-sky-300 font-mono">namaunit.com</code>) + SSL Otomatis</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    <span><strong>Dedicated PostgreSQL</strong> Terisolasi Penuh di Sumobase</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    <span>WhatsApp Bot Interaktif &amp; Multi-Staff Admin Notification</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    <span>Laporan Neraca Sampah &amp; Estimasi Reduksi Karbon DLH</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    <span>Prioritas Bantuan Teknis SLA 4 Jam</span>
                  </li>
                </ul>
              </div>

              <div className="pt-8">
                <a
                  href="#daftar-mitra"
                  onClick={() => setForm(prev => ({ ...prev, paketPilihan: "pro" }))}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl shadow-sky-500/25 transition-all"
                >
                  <span>Pilih Paket Pro (Trial 60 Hari)</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Paket Enterprise / B2G */}
            <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-8 flex flex-col justify-between hover:border-slate-700 transition-all">
              <div className="space-y-6">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
                    DLH Pemda &amp; Pengembang Kota Mandiri
                  </span>
                  <h3 className="text-2xl font-black text-white mt-1">Enterprise / B2G</h3>
                  <p className="text-xs text-slate-400 mt-2">
                    Integrasi tata kelola persampahan skala kabupaten/kota dengan command center terpadu.
                  </p>
                </div>

                <div className="pb-6 border-b border-slate-800">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white">Kustom</span>
                    <span className="text-xs text-slate-400"> / kontrak APBD / CSR</span>
                  </div>
                  <p className="text-[11px] text-purple-400 mt-1">Multi-Kecamatan / Tanpa Batas KK</p>
                </div>

                <ul className="space-y-3 text-xs text-slate-300">
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                    <span><strong>DLH Command Center Dashboard</strong> Memantau Seluruh TPS</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                    <span>Standar Integrasi API SIPSN KLHK &amp; Satu Data Pemda</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                    <span>Pendampingan Lapangan &amp; Pelatihan Driver Bersertifikat</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                    <span>Opsi On-Premise / Dedicated Sovereign Cloud</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                    <span>Dedicated Technical Account Manager &amp; Support 24/7</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                    <span>Jaminan SLA Uptime 99.9%</span>
                  </li>
                </ul>
              </div>

              <div className="pt-8">
                <a
                  href="#daftar-mitra"
                  onClick={() => setForm(prev => ({ ...prev, paketPilihan: "enterprise" }))}
                  className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 transition-all"
                >
                  <span>Konsultasi Enterprise B2G</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>

          {/* Lead Magnet Box: Pitch Deck & Proposal B2B */}
          <div className="mt-14 p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-400">
                <FileText className="w-4 h-4" /> Dokumen Kemitraan Resmi
              </div>
              <h3 className="text-xl font-bold text-white">
                Butuh Proposal Resmi untuk Rapat Pengurus RT/RW, Direksi, atau DLH?
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Kami siapkan Dokumen Proposal Kemitraan, Ringkasan Kalkulasi ROI, dan Lembar Spesifikasi Teknis O2W Hero dalam format PDF siap presentasi.
              </p>
            </div>
            <a
              href={`https://wa.me/6281290000000?text=${encodeURIComponent("Halo Tim O2W HERO, mohon kirimkan Dokumen Proposal Kemitraan & Pitch Deck Resmi untuk unit pengelola kami...")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 border border-sky-800/70 font-bold text-xs sm:text-sm transition-all flex items-center gap-2"
            >
              <FileText className="w-4 h-4 text-sky-400" />
              <span>Minta Proposal Kemitraan (PDF)</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </a>
          </div>
        </div>
      </section>

      {/* Formulir Pendaftaran Mitra */}
      <section id="daftar-mitra" className="py-20 border-b border-slate-800 bg-slate-900/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="text-xs font-bold uppercase tracking-widest text-sky-400">Pendaftaran Kemitraan</span>
            <h2 className="text-3xl font-black text-white mt-1">Gabung Sebagai Mitra Pengelola Sampah</h2>
            <p className="text-slate-400 text-sm mt-2">
              Isi data unit pengelola sampah Anda. Kami akan menyiapkan dedicated database dan konfigurasi sistem operasional Anda.
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
                    Pilihan Paket Kemitraan
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
                      <p className="text-xs font-bold">Starter (Rp 299rb/bln)</p>
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
                        <p className="text-xs font-bold text-sky-400">Pro (Rp 899rb/bln)</p>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-bold uppercase">Popular</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">3.500 KK + Live GPS</p>
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
                      <p className="text-[11px] text-slate-400 mt-0.5">DLH / Multi-Kecamatan</p>
                    </button>
                  </div>
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
                      placeholder="Contoh: Bank Sampah Sukatani / TPS 3R Berkah"
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
                      <option value="pengepul">Pengepul / Lapak Daur Ulang</option>
                      <option value="swasta">Perusahaan Swasta / Jasa Kebersihan</option>
                      <option value="dlh">Instansi DLH / Pemerintah Daerah</option>
                    </select>
                  </div>

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
                      placeholder="admin@pengelola.com"
                      className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      Kota / Wilayah Operasional
                    </label>
                    <input
                      type="text"
                      value={form.kota}
                      onChange={(e) => setForm({ ...form, kota: e.target.value })}
                      placeholder="Kota Depok, Bogor, Bekasi, dll"
                      className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      Estimasi Nasabah / KK Terlayani
                    </label>
                    <input
                      type="number"
                      value={form.estimasiWarga}
                      onChange={(e) => setForm({ ...form, estimasiWarga: e.target.value })}
                      placeholder="500"
                      className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Catatan Tambahan (Kebutuhan Khusus / Domain yang Diinginkan)
                  </label>
                  <textarea
                    rows={3}
                    value={form.catatanAdmin}
                    onChange={(e) => setForm({ ...form, catatanAdmin: e.target.value })}
                    placeholder="Contoh: Kami ingin menggunakan domain mandiri tps-berkah.id dan butuh integrasi timbangan digital..."
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
                      Sedang Memproses...
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

      {/* FAQ Section */}
      <section id="faq" className="py-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-sky-400 mb-2 block">
            Pertanyaan Umum
          </span>
          <h2 className="text-3xl font-black text-white">Tanya Jawab Seputar Kemitraan O2W Hero</h2>
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

      {/* Footer */}
      <footer className="border-t border-slate-800 py-12 text-xs text-slate-500 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-bold text-slate-300 text-sm">O2W Hero Platform — Main Core Hub</p>
            <p className="mt-1">
              Mitra Percontohan Resmi:{" "}
              <a href="https://upsheru.com" className="text-emerald-400 hover:underline">
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
            <a href="https://wa.me/6281532843224" className="text-slate-400 hover:text-emerald-400 flex items-center gap-1 font-semibold">
              <PhoneCall className="w-3.5 h-3.5" />
              Kontak O2W Hero
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
