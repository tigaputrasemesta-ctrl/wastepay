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
} from "lucide-react";

export default function O2WHeroCorePortal() {
  const [form, setForm] = useState({
    namaLengkap: "",
    namaInstansi: "",
    jenisUsaha: "tps3r",
    wilayahOperasional: "Kota Depok",
    estimasiWarga: "1000",
    noWhatsapp: "",
    email: "",
    paketPilihan: "pro",
  });

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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
        catatanAdmin: `Pilihan Paket: ${form.paketPilihan.toUpperCase()}`,
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
        "Pendaftaran berhasil terkirim! Tim O2W HERO akan segera menghubungi WhatsApp Anda untuk koordinasi setup portal dan demonstrasi sistem."
      );
      setForm({
        namaLengkap: "",
        namaInstansi: "",
        jenisUsaha: "tps3r",
        wilayahOperasional: "Kota Depok",
        estimasiWarga: "1000",
        noWhatsapp: "",
        email: "",
        paketPilihan: "pro",
      });
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kendala koneksi server. Silakan coba kembali.");
    } finally {
      setLoading(false);
    }
  };

  const faqs = [
    {
      q: "Apakah warga perlu menghafal nomor ID pelanggan?",
      a: "Tidak perlu. Sistem O2W HERO secara otomatis menggunakan nomor WhatsApp warga sebagai nomor pelanggan. Saat mengecek tagihan di website atau mengirim pesan ke bot WhatsApp, warga cukup memakai nomor HP sendiri.",
    },
    {
      q: "Bagaimana sistem pembayaran iuran warga berjalan?",
      a: "Tagihan otomatis terbit tiap tanggal 1. Warga menerima pengingat via WhatsApp lalu bisa bayar langsung pakai QRIS (M-Banking BCA, Mandiri, BRI, BNI atau GoPay/OVO/DANA). Uang yang terkumpul masuk ke kas mitra dan bisa dicairkan ke rekening bank tiap minggu.",
    },
    {
      q: "Apakah mitra pengelola mendapatkan website dengan nama domain sendiri?",
      a: "Ya. Setiap mitra bisa menggunakan nama website sendiri (misal: upsheru.com atau tps3r-namadaerah.com). Sistem kami menyiapkan sertifikat keamanan SSL resmi tanpa biaya tambahan.",
    },
    {
      q: "Apakah aplikasi supir / petugas lapangan bisa dipakai di HP biasa?",
      a: "Bisa. Aplikasi petugas dirancang sangat ringan, berjalan lancar di HP Android biasa, hemat kuota internet, dan mendukung pencatatan di lapangan meskipun sinyal internet sedang lemah.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* ── Navbar Bersih & Ringkas ── */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white font-black text-lg">
              O2W
            </div>
            <div>
              <span className="font-black text-xl tracking-tight text-white block">
                O2W HERO
              </span>
              <span className="text-[11px] text-emerald-400 font-semibold block -mt-1">
                Aplikasi Sampah Terpadu
              </span>
            </div>
          </Link>

          {/* Navigasi Desktop */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
            <a href="#fitur" className="hover:text-white transition-colors">
              Fitur Utama
            </a>
            <a href="#cara-kerja" className="hover:text-white transition-colors">
              Cara Kerja
            </a>
            <a href="#contoh-nyata" className="hover:text-emerald-400 transition-colors font-bold">
              Contoh Nyata (UPS HERU)
            </a>
            <a href="#harga" className="hover:text-white transition-colors">
              Paket Harga
            </a>
            <a href="#faq" className="hover:text-white transition-colors">
              Tanya Jawab
            </a>
          </nav>

          {/* Tombol Aksi */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700 transition-all"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Masuk Portal</span>
            </Link>
            <a
              href="#daftar"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20 transition-all"
            >
              <span>Daftar Mitra</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ── HERO SECTION ── */}
        <section className="relative pt-16 pb-20 sm:pt-24 sm:pb-28 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-emerald-950/40 via-slate-950 to-slate-950 -z-10" />

          <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Sistem Operasional & Penagihan Sampah No. 1</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight sm:leading-tight">
              Kelola Penarikan Sampah &amp; Iuran Warga Jadi{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
                Otomatis &amp; Tanpa Ribet
              </span>
            </h1>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
              Aplikasi serba praktis untuk <strong>TPS3R</strong>, <strong>Bank Sampah</strong>, dan <strong>Pengangkut Sampah</strong>. Atur jadwal supir di HP, tagihan iuran bulanan via QRIS, dan tabungan sampah dalam satu sistem.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4">
              <a
                href="#daftar"
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/25 transition-all flex items-center justify-center gap-2"
              >
                <span>Mulai Daftar Jadi Mitra</span>
                <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="#contoh-nyata"
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm border border-slate-700 transition-all flex items-center justify-center gap-2"
              >
                <span>Lihat Contoh di upsheru.com</span>
                <ExternalLink className="w-4 h-4 text-emerald-400" />
              </a>
            </div>

            {/* Bukti Nyata Ringkas */}
            <div className="pt-8 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-lg mx-auto text-center">
              <div>
                <p className="text-xl sm:text-2xl font-black text-white">1.250+ KK</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Aktif di UPS HERU</p>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black text-emerald-400">100% Pakai WA</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Tanpa Hafal Nomor ID</p>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <p className="text-xl sm:text-2xl font-black text-teal-300">QRIS Instan</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Otomatis Lunas</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── 3 MASALAH BESAR YANG KAMI SELESAIKAN ── */}
        <section id="fitur" className="py-16 sm:py-20 border-t border-slate-800 bg-slate-900/40">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Solusi Nyata Lapangan
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                Kenapa Pengelola Sampah Memilih O2W HERO?
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm">
                Kami merancang sistem ini berdasarkan masalah nyata yang dihadapi pengurus TPS3R dan supir gerobak sampah setiap hari.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1 */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 hover:border-slate-700 transition-all">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
                  <QrCode className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">1. Iuran Warga Lancar &amp; Bebas Nunggak</h3>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Tagihan terbit otomatis tiap tanggal 1. Bot WhatsApp otomatis kirim pengingat sopan ke HP warga. Warga bayar gampang pakai <strong>QRIS</strong> atau M-Banking tanpa perlu petugas keliling menagih.
                </p>
              </div>

              {/* Card 2 */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 hover:border-slate-700 transition-all">
                <div className="w-11 h-11 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 font-bold">
                  <Truck className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">2. Supir &amp; Gerobak Sampah Lebih Teratur</h3>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Jadwal jalan dan rute rumah muncul rapi di HP supir. Supir tinggal centang rumah yang sudah diambil, absen kerja pakai GPS, dan struk bensin langsung difoto untuk diganti.
                </p>
              </div>

              {/* Card 3 */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 hover:border-slate-700 transition-all">
                <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
                  <Recycle className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">3. Tabungan Sampah (Ubah Sampah Jadi Duit)</h3>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Warga yang menyetor kardus atau botol plastik langsung ditimbang dan uangnya masuk ke buku tabungan di HP. Saldo ini bisa otomatis memotong iuran bulanan—warga rajin memilah bisa <strong>gratis iuran</strong>!
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── ALUR KERJA 4 LANGKAH SEDERHANA ── */}
        <section id="cara-kerja" className="py-16 sm:py-20 border-t border-slate-800">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-xl mx-auto mb-12 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Alur Praktis
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                Cara Kerja O2W HERO Sangat Sederhana
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
                <span className="text-emerald-400 font-black text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  Langkah 1
                </span>
                <h4 className="font-bold text-white text-sm">Nomor WA = Nomor Pelanggan</h4>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Warga tidak perlu hafal kode rumit. Nomor WhatsApp warga otomatis menjadi nomor akun resmi.
                </p>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
                <span className="text-sky-400 font-black text-xs px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/20">
                  Langkah 2
                </span>
                <h4 className="font-bold text-white text-sm">Tagihan &amp; Bayar QRIS</h4>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Tagihan terbit otomatis, dikirim via WhatsApp. Warga scan QRIS, uang langsung tercatat lunas.
                </p>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
                <span className="text-teal-400 font-black text-xs px-2.5 py-1 rounded-full bg-teal-500/10 border border-teal-500/20">
                  Langkah 3
                </span>
                <h4 className="font-bold text-white text-sm">Supir Bawa HP Saat Keliling</h4>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Daftar rumah muncul di layar HP. Supir tinggal centang rumah yang sampahnya sudah diangkut.
                </p>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
                <span className="text-purple-400 font-black text-xs px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20">
                  Langkah 4
                </span>
                <h4 className="font-bold text-white text-sm">Uang Masuk Rekening Tiap Minggu</h4>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Uang iuran yang terkumpul otomatis ditransfer ke rekening bank resmi mitra setiap minggu.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── SHOWCASE PILOT PROJECT: UPS HERU (upsheru.com) ── */}
        <section id="contoh-nyata" className="py-16 sm:py-20 border-t border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-800/40 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
                <div className="space-y-4 max-w-xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Studi Kasus Nyata di Lapangan</span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    Lihat Langsung Sistem Ini Dipakai di{" "}
                    <span className="text-emerald-400">upsheru.com</span>
                  </h3>

                  <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                    <strong>UPS HERU</strong> (Unit Pengolahan Sampah Kalibaru, Kota Depok) adalah mitra percontohan resmi O2W HERO. Mereka memiliki website dengan nama sendiri, melayani <strong>1.250+ warga</strong>, menggunakan nomor WA sebagai kode pelanggan, dan pembayaran iuran berjalan 100% rapi lewat QRIS.
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

        {/* ── PAKET HARGA SEDERHANA ── */}
        <section id="harga" className="py-16 sm:py-20 border-t border-slate-800">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-xl mx-auto mb-12 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Pilihan Paket
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                Paket Layanan O2W HERO
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm">
                Biaya transparan, terjangkau, dan sebanding dengan efisiensi yang didapatkan.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Paket Starter */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-extrabold text-white">Starter</h3>
                  <p className="text-slate-400 text-xs mt-1">Cocok untuk Bank Sampah &amp; KSM RT/RW</p>
                  <div className="mt-4">
                    <span className="text-2xl font-black text-white">Rp 349.000</span>
                    <span className="text-xs text-slate-500"> / bulan</span>
                  </div>
                  <ul className="space-y-2.5 mt-6 text-xs text-slate-300">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Hingga 500 Warga / Nasabah</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Pencatatan Tabungan Sampah di HP</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>1.000 Pesan WhatsApp Notifikasi</span>
                    </li>
                  </ul>
                </div>
                <a
                  href="#daftar"
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs text-center block transition-all"
                >
                  Pilih Starter
                </a>
              </div>

              {/* Paket Pro (Paling Populer) */}
              <div className="bg-slate-900 border-2 border-emerald-500 rounded-3xl p-6 space-y-5 flex flex-col justify-between shadow-xl relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] tracking-wider uppercase">
                  Paling Banyak Dipakai (TPS3R)
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-white">Pro</h3>
                  <p className="text-slate-400 text-xs mt-1">Standar TPS3R Kelurahan (Seperti UPS HERU)</p>
                  <div className="mt-4">
                    <span className="text-2xl font-black text-emerald-400">Rp 1.250.000</span>
                    <span className="text-xs text-slate-500"> / bulan</span>
                  </div>
                  <ul className="space-y-2.5 mt-6 text-xs text-slate-200">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Hingga 3.000 Warga / KK</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span><strong>Pakai Nama Website Sendiri</strong> (contoh: upsheru.com)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Pembayaran Otomatis QRIS &amp; VA Duitku</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Aplikasi HP Supir &amp; Absen GPS</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>5.000 Pesan WhatsApp Notifikasi/bln</span>
                    </li>
                  </ul>
                </div>
                <a
                  href="#daftar"
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs text-center block shadow-lg transition-all"
                >
                  Pilih Paket Pro
                </a>
              </div>

              {/* Paket Enterprise */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-extrabold text-white">Enterprise / Swasta</h3>
                  <p className="text-slate-400 text-xs mt-1">Kawasan Industri, Mall, &amp; Vendor Swasta</p>
                  <div className="mt-4">
                    <span className="text-2xl font-black text-white">Rp 2.990.000</span>
                    <span className="text-xs text-slate-500"> / bulan</span>
                  </div>
                  <ul className="space-y-2.5 mt-6 text-xs text-slate-300">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Warga &amp; Armada Tanpa Batas</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Database Terpisah (Dedicated Database)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Integrasi Timbangan Jembatan Truk</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Bantuan Teknis Prioritas 24 Jam</span>
                    </li>
                  </ul>
                </div>
                <a
                  href="#daftar"
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs text-center block transition-all"
                >
                  Hubungi Tim Kami
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ── FORMULIR PENDAFTARAN MITRA SEDERHANA ── */}
        <section id="daftar" className="py-16 sm:py-24 border-t border-slate-800 bg-slate-900/50">
          <div className="max-w-2xl mx-auto px-4 sm:px-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xl space-y-6">
              <div className="text-center space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Formulir Kemitraan
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white">
                  Tertarik Pakai O2W HERO di Tempat Anda?
                </h2>
                <p className="text-slate-400 text-xs sm:text-sm">
                  Silakan isi data singkat berikut. Tim kami akan segera menghubungi WhatsApp Anda untuk koordinasi setup.
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
                      Kota / Kabupaten *
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
                      <option value="500">&lt; 500 Warga (KSM)</option>
                      <option value="1000">500 - 1.500 Warga</option>
                      <option value="3000">1.500 - 3.000 Warga (TPS3R)</option>
                      <option value="10000">&gt; 3.000 Warga (Kawasan Besar)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Pilihan Paket
                    </label>
                    <select
                      value={form.paketPilihan}
                      onChange={(e) => setForm({ ...form, paketPilihan: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-700 bg-slate-800/80 text-white text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="starter">Paket Starter</option>
                      <option value="pro">Paket Pro (TPS3R)</option>
                      <option value="enterprise">Paket Enterprise</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Mengirim Data...</span>
                      </>
                    ) : (
                      <>
                        <span>Kirim Pendaftaran Kemitraan</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </section>

        {/* ── TANYA JAWAB (FAQ) ── */}
        <section id="faq" className="py-16 sm:py-20 border-t border-slate-800">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-10 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Tanya Jawab
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
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full p-4 text-left font-bold text-xs sm:text-sm text-white flex items-center justify-between gap-3 cursor-pointer"
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

      {/* ── FOOTER MINIMALIS & RAPI ── */}
      <footer className="border-t border-slate-800 bg-slate-950 py-10 text-xs text-slate-400">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-white text-sm">O2W HERO</span>
            <span>•</span>
            <span>Platform Pengelolaan Sampah &amp; Ekonomi Sirkular</span>
          </div>

          <div className="flex items-center gap-5 font-medium">
            <Link href="/login" className="hover:text-white transition-colors">
              Portal Petugas
            </Link>
            <a
              href="https://upsheru.com"
              target="_blank"
              rel="noreferrer"
              className="text-emerald-400 font-bold hover:underline"
            >
              Pilot: upsheru.com
            </a>
            <span>© {new Date().getFullYear()} O2W HERO.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
