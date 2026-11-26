"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  Users,
  Smartphone,
  CreditCard,
  Truck,
  ShieldCheck,
  Send,
  Loader2,
  ArrowRight,
  Database,
  HelpCircle,
} from "lucide-react";

export default function MitraRegistrationPage() {
  const [formData, setFormData] = useState({
    namaLengkap: "",
    namaInstansi: "",
    jenisUsaha: "tps3r",
    noWhatsapp: "",
    email: "",
    kota: "",
    estimasiWarga: 100,
    kebutuhanDb: "shared",
    catatanAdmin: "",
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successData, setSuccessData] = useState<{
    id: number;
    instansi: string;
    status: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      const res = await fetch("/api/core/mitra/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mengirimkan pendaftaran kemitraan.");
      }

      setSuccessData(data.data);
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan jaringan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 space-y-12">
      {/* Hero Section */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold uppercase tracking-wider">
          <ShieldCheck className="w-3.5 h-3.5" />
          Kemitraan Resmi O2W HERO
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Modernisasi Pengelolaan Sampah Unit Anda Bersama{" "}
          <span className="text-emerald-700 dark:text-emerald-400">O2W HERO</span>
        </h1>
        <p className="text-base text-slate-600 dark:text-zinc-400 leading-relaxed">
          Tingkatkan efisiensi penarikan sampah, tagihan iuran QRIS otomatis, dan pencatatan kasir
          digital untuk TPS 3R, Bank Sampah, Operator Swasta, dan Dinas Lingkungan Hidup.
        </p>
      </div>

      {/* 4 Pilar Keunggulan Mitra */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold">
            <CreditCard className="w-5 h-5" />
          </div>
          <h2 className="font-bold text-slate-900 dark:text-zinc-100 text-base">QRIS & Bayar Online</h2>
          <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
            Warga bayar iuran bulanan langsung scan QRIS. Uang masuk kas mitra tanpa perlu kuitansi kertas.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 flex items-center justify-center font-bold">
            <Truck className="w-5 h-5" />
          </div>
          <h2 className="font-bold text-slate-900 dark:text-zinc-100 text-base">Rute & GPS Armada</h2>
          <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
            Supir truk dan cator dipandu daftar rumah per hari di HP dengan checklist angkut dan absen GPS.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold">
            <Smartphone className="w-5 h-5" />
          </div>
          <h2 className="font-bold text-slate-900 dark:text-zinc-100 text-base">Website Sendiri</h2>
          <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
            Unit Anda mendapatkan subdomain resmi (misal: <code>unitanda.o2whero.com</code>) atau domain sendiri.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-400 flex items-center justify-center font-bold">
            <Database className="w-5 h-5" />
          </div>
          <h2 className="font-bold text-slate-900 dark:text-zinc-100 text-base">Isolasi Data Terjamin</h2>
          <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
            Data warga dan keuangan organisasi Anda terenkripsi aman, tidak dapat diintip unit mitra lain.
          </p>
        </div>
      </div>

      {/* Form Pendaftaran Kemitraan */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-md p-6 sm:p-10">
        {successData ? (
          <div className="text-center py-10 space-y-6 max-w-lg mx-auto">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Pendaftaran Berhasil Terkirim!</h2>
              <p className="text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
                Terima kasih, <strong>{successData.instansi}</strong>. Aplikasi kemitraan Anda telah tercatat dengan ID tiket{" "}
                <span className="font-mono text-emerald-700 dark:text-emerald-400 font-bold">#{successData.id}</span>.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800 text-left text-xs text-slate-600 dark:text-zinc-300 space-y-2">
              <p className="font-semibold text-slate-900 dark:text-white">Langkah Selanjutnya:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Tim O2W HERO akan menghubungi WhatsApp Anda dalam 1x24 jam untuk verifikasi awal.</li>
                <li>Setelah diverifikasi, subdomain uji coba dan akses akun admin akan langsung aktif.</li>
                <li>Panduan instalasi aplikasi mobile untuk supir akan dikirimkan lengkap.</li>
              </ul>
            </div>
            <button
              onClick={() => {
                setSuccessData(null);
                setFormData({
                  namaLengkap: "",
                  namaInstansi: "",
                  jenisUsaha: "tps3r",
                  noWhatsapp: "",
                  email: "",
                  kota: "",
                  estimasiWarga: 100,
                  kebutuhanDb: "shared",
                  catatanAdmin: "",
                });
              }}
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm transition-colors shadow-sm"
            >
              Kirim Pendaftaran Unit Lain
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="border-b border-slate-100 dark:border-zinc-800 pb-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
                Formulir Pendaftaran Mitra Baru
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                Isi data penanggung jawab dan profil unit pengelola sampah Anda untuk aktivasi sistem.
              </p>
            </div>

            {errorMsg && (
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-sm font-medium">
                {errorMsg}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Nama Lengkap */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
                  Nama Penanggung Jawab / Ketua <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Bpk. Bambang Wijaya"
                  value={formData.namaLengkap}
                  onChange={(e) => setFormData({ ...formData, namaLengkap: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              {/* Nama Instansi / TPS3R */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
                  Nama Unit / Instansi Pengelola <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: TPS 3R Sukamaju Bersih"
                  value={formData.namaInstansi}
                  onChange={(e) => setFormData({ ...formData, namaInstansi: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              {/* Jenis Usaha */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
                  Tipe Pengelola Sampah <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.jenisUsaha}
                  onChange={(e) => setFormData({ ...formData, jenisUsaha: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                >
                  <option value="tps3r">TPS 3R (Tempat Pengolahan Sampah 3R)</option>
                  <option value="bank_sampah">Bank Sampah Unit / Induk</option>
                  <option value="swasta">Operator Pengangkutan Swasta</option>
                  <option value="pengepul">Lapak / Pengepul Daur Ulang</option>
                  <option value="dlh">Dinas Lingkungan Hidup / Pemerintah</option>
                </select>
              </div>

              {/* Kota / Kabupaten */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
                  Kota / Kabupaten Wilayah Kerja <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kota Depok / Kab. Bogor"
                  value={formData.kota}
                  onChange={(e) => setFormData({ ...formData, kota: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              {/* Nomor WhatsApp */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
                  Nomor WhatsApp Penanggung Jawab <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="Contoh: 081290429898"
                  value={formData.noWhatsapp}
                  onChange={(e) => setFormData({ ...formData, noWhatsapp: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              {/* Email Resmi */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
                  Email Resmi <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="Contoh: admin@sukamajubersih.org"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              {/* Estimasi Warga */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
                  Estimasi Jumlah KK / Nasabah
                </label>
                <input
                  type="number"
                  min="10"
                  step="10"
                  placeholder="100"
                  value={formData.estimasiWarga}
                  onChange={(e) => setFormData({ ...formData, estimasiWarga: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              {/* Opsi Kebutuhan Basis Data (Arsitektur Hybrid) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
                  Paket Infrastruktur Basis Data
                </label>
                <select
                  value={formData.kebutuhanDb}
                  onChange={(e) => setFormData({ ...formData, kebutuhanDb: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                >
                  <option value="shared">Cloud Shared DB (Rekomendasi TPS 3R & Bank Sampah)</option>
                  <option value="dedicated">Dedicated Enterprise DB (Instansi DLH / Korporasi)</option>
                </select>
              </div>
            </div>

            {/* Catatan / Kebutuhan Tambahan */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
                Kendala Lapangan Saat Ini / Catatan Khusus
              </label>
              <textarea
                rows={3}
                placeholder="Ceritakan kendala penagihan, jumlah armada truk/cator yang dimiliki, atau kebutuhan khusus Anda..."
                value={formData.catatanAdmin}
                onChange={(e) => setFormData({ ...formData, catatanAdmin: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>

            {/* Tombol Submit */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Dengan mendaftar, Anda menyetujui Ketentuan Layanan & Kebijakan Privasi Data O2W HERO.
              </p>
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm transition-all shadow-md disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Kirim Pendaftaran Kemitraan
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* FAQ Singkat */}
      <div className="max-w-3xl mx-auto space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white text-center">
          Pertanyaan yang Sering Diajukan
        </h2>
        <div className="grid gap-3 text-sm">
          <div className="p-4 rounded-xl bg-slate-100/70 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700">
            <h3 className="font-semibold text-slate-900 dark:text-zinc-100">Berapa biaya bergabung menjadi mitra?</h3>
            <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1">
              Untuk tahap awal percontohan, pendaftaran dan masa uji coba adalah 100% gratis. Mitra hanya dikenakan biaya platform kecil per transaksi pembayaran QRIS warga yang berhasil.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-100/70 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700">
            <h3 className="font-semibold text-slate-900 dark:text-zinc-100">Apakah data warga saya aman dari operator lain?</h3>
            <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1">
              Sangat aman. Sistem O2W HERO menggunakan isolasi database hibrida dan PostgreSQL Row-Level Security. Data warga Anda hanya dapat diakses oleh admin dan petugas unit Anda sendiri.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
