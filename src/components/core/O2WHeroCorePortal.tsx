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
} from "lucide-react";

export default function O2WHeroCorePortal() {
  const [form, setForm] = useState({
    namaLengkap: "",
    namaInstansi: "",
    jenisUsaha: "tps3r",
    noWhatsapp: "",
    email: "",
    kota: "Kota Depok",
    estimasiWarga: "500",
    kebutuhanDb: "dedicated",
    catatanAdmin: "",
  });

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/core/mitra/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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
        catatanAdmin: "",
      });
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan koneksi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Top Banner / Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-sky-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-sky-500/20 text-white font-black text-xl tracking-wider">
              O2W
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-white flex items-center gap-1.5">
                O2W HERO <span className="text-xs px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 font-semibold border border-sky-500/30">CORE HUB</span>
              </span>
              <p className="text-xs text-slate-400">Waste Management SaaS & Multi-Mitra Ecosystem</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="https://upsheru.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-800 hover:bg-emerald-900/50 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Percontohan: upsheru.com
            </a>
            <a
              href="#daftar-mitra"
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-600/25 transition-all"
            >
              Gabung Mitra
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-32 border-b border-slate-800">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.15),rgba(255,255,255,0))]" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-300 text-xs sm:text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4 text-sky-400" />
            Solusi Multi-Tenant Terdesentralisasi untuk Pengelola Sampah Mandiri
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight sm:leading-none max-w-4xl mx-auto">
            Satu Ekosistem Inti. <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-sky-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
              Setiap Mitra Memiliki Database & Domain Sendiri.
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Platform SaaS O2W Hero menghubungkan ratusan pengelola sampah—dari TPS 3R, bank sampah warga, hingga pabrik daur ulang—dengan isolasi data aman, QRIS otomatis, dan pelacakan armada real-time.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#daftar-mitra"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-base shadow-xl shadow-sky-600/30 transition-all flex items-center justify-center gap-2"
            >
              Daftarkan Unit Pengelola Anda
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="https://upsheru.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold text-base transition-all flex items-center justify-center gap-2"
            >
              Lihat Contoh Lapangan (upsheru.com)
              <ExternalLink className="w-4 h-4 text-emerald-400" />
            </a>
          </div>

          {/* Pilot Showcase Banner */}
          <div className="mt-14 max-w-3xl mx-auto rounded-2xl bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-800/60 p-6 text-left shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 font-bold text-lg">
                  1st
                </div>
                <div>
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
                    Mitra Percontohan Pertama
                  </span>
                  <h2 className="text-lg font-bold text-white">UPS HERU (TPS 3R Kota Depok)</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Aktif melayani ribuan warga dengan retribusi otomatis, live tracking GPS armada, dan database PostgreSQL mandiri di domain resmi <strong className="text-white">upsheru.com</strong>.
                  </p>
                </div>
              </div>
              <a
                href="https://upsheru.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shrink-0 transition-colors"
              >
                Kunjungi Portal
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Pillar: Mengapa Arsitektur Ini Unggul */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-bold uppercase tracking-widest text-sky-400 mb-2">Arsitektur Kemitraan</h2>
          <h3 className="text-3xl font-black text-white">Dirancang Khusus untuk Pengelola Sampah Mandiri</h3>
          <p className="text-slate-400 mt-3 text-sm sm:text-base">
            Setiap mitra memiliki otonomi penuh atas data warga dan keuangannya sendiri tanpa risiko kebocoran atau tercampur dengan mitra lain.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-sky-500/40 transition-all">
            <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-4">
              <Database className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-white">Database-per-Tenant Terisolasi</h4>
            <p className="text-sm text-slate-400 mt-2">
              Tiap mitra memiliki database terpisah (PostgreSQL). Data pelanggan, setoran, dan buku kas aman 100% dan dapat dibackup mandiri kapan saja.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 transition-all">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
              <Globe className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-white">Custom Domain & Branding Mandiri</h4>
            <p className="text-sm text-slate-400 mt-2">
              Gunakan domain sendiri (seperti <em>upsheru.com</em>) dengan SSL otomatis gratis, atau pilih subdomain gratis dari ekosistem <em>o2whero.com</em>.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 transition-all">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4">
              <QrCode className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-white">Kasir QRIS & Tagihan WhatsApp</h4>
            <p className="text-sm text-slate-400 mt-2">
              Warga membayar retribusi atau menimbang sampah via QRIS Duitku. Lunas otomatis tanpa perlu upload bukti transfer manual.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-purple-500/40 transition-all">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4">
              <Truck className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-white">Live Tracking Armada GPS</h4>
            <p className="text-sm text-slate-400 mt-2">
              Petugas lapangan menggunakan aplikasi mobile native dengan GPS background, memudahkan warga memantau kedatangan truk sampah.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-teal-500/40 transition-all">
            <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-4">
              <Recycle className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-white">Katalog Daur Ulang & Offtaker</h4>
            <p className="text-sm text-slate-400 mt-2">
              Kelola kategori sampah (plastik, minyak jelantah, kertas, logam) dan pantau penjualan partai besar langsung ke pabrik daur ulang.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-rose-500/40 transition-all">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-white">Laporan ESG & Standar DLH</h4>
            <p className="text-sm text-slate-400 mt-2">
              Perhitungan otomatis reduksi emisi karbon (CO2e) dan tonase terkelola, siap diekspor untuk laporan dinas lingkungan hidup atau program CSR.
            </p>
          </div>
        </div>
      </section>

      {/* Form Pendaftaran Kemitraan */}
      <section id="daftar-mitra" className="py-20 border-t border-slate-800 bg-slate-900/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="text-xs font-bold uppercase tracking-widest text-sky-400">Pendaftaran Kemitraan</span>
            <h3 className="text-3xl font-black text-white mt-1">Gabung Sebagai Mitra Pengelola Sampah</h3>
            <p className="text-slate-400 text-sm mt-2">
              Isi data unit pengelola sampah Anda. Kami akan menyiapkan dedicated database dan konfigurasi sistem operasional Anda.
            </p>
          </div>

          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl">
            {successMsg ? (
              <div className="p-6 rounded-2xl bg-emerald-950/60 border border-emerald-800 text-center space-y-4">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <h4 className="text-xl font-bold text-white">Pendaftaran Diterima!</h4>
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
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-sky-600 to-emerald-600 hover:from-sky-500 hover:to-emerald-500 text-white font-bold text-base shadow-xl shadow-sky-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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

      {/* Footer */}
      <footer className="border-t border-slate-800 py-10 text-center text-xs text-slate-500 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-2">
          <p>© {new Date().getFullYear()} O2W Hero Platform — Main Core Hub.</p>
          <p>
            Mitra Percontohan Resmi:{" "}
            <a href="https://upsheru.com" className="text-emerald-400 hover:underline">
              UPS HERU (upsheru.com)
            </a>{" "}
            — Unit Pengelolaan Sampah Kota Depok.
          </p>
        </div>
      </footer>
    </div>
  );
}
