import type { Metadata } from "next";
import Link from "next/link";
import { Download, Smartphone } from "lucide-react";
import { MOBILE_VERSION, getApkUrl } from "@/lib/mobile-version";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Unduh Aplikasi WastePay Driver Mobile",
  description:
    "Unduh aplikasi resmi WastePay Driver Mobile untuk petugas penjemputan sampah UPS HERU Kota Depok (Android APK).",
  alternates: {
    canonical: "/unduh",
  },
  openGraph: {
    title: "Unduh Aplikasi Driver WastePay | UPS HERU Depok",
    description:
      "Aplikasi Android untuk petugas armada angkut sampah dan operasional lapangan UPS HERU.",
  },
};

export default function UnduhPage() {
  const apkUrl = getApkUrl();
  const { versionName, versionCode } = MOBILE_VERSION;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20">
      {/* Top bar */}
      <header className="border-b border-slate-200/80 px-6 py-4 bg-white/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-emerald-600 text-white font-extrabold flex items-center justify-center text-base shadow-sm">
              W
            </span>
            <div className="leading-tight">
              <span className="font-extrabold text-slate-900 text-lg tracking-tight">WastePay</span>
              <span className="block text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">Driver Mobile</span>
            </div>
          </Link>
          <Link
            href="/"
            className="text-xs font-semibold text-slate-600 hover:text-emerald-600 transition-colors flex items-center gap-1.5"
          >
            ← Kembali ke Beranda
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12 md:py-16">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-4 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Aplikasi Khusus Petugas & Pengemudi Armada
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Unduh <span className="text-emerald-600">WastePay Driver</span>
          </h1>
          <p className="text-slate-600 text-sm sm:text-base mt-3 max-w-lg mx-auto">
            Aplikasi lapangan resmi petugas UPS HERU Kota Depok untuk pencatatan rute jemputan, verifikasi timbangan, dan manifest TPA.
          </p>
        </div>

        {/* Download card */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-8 shadow-sm">
          <div className="flex items-center justify-between gap-4 pb-6 border-b border-slate-100 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
                <Smartphone className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Versi {versionName}</h2>
                <p className="text-xs font-medium text-slate-500 mt-0.5">
                  Build rilis: {versionCode} · Android 8.0+
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              Terbaru
            </span>
          </div>

          <div className="space-y-3 mb-8">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Fitur Utama Rilis Ini:</p>
            <ul className="text-xs text-slate-600 space-y-2">
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-[10px]">✓</span>
                <span>Navigasi GPS rute penjemputan warga real-time & peta liveness</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-[10px]">✓</span>
                <span>Manifest digital & verifikasi timbangan residu TPA Cipayung</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-[10px]">✓</span>
                <span>Sinkronisasi offline-first hemat kuota & battery-optimized</span>
              </li>
            </ul>
          </div>

          {apkUrl ? (
            <a
              href={apkUrl}
              download
              className="w-full flex items-center justify-center gap-2.5 py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-base shadow-sm transition-all"
            >
              <Download className="w-5 h-5" /> Unduh Berkas APK ({versionName})
            </a>
          ) : (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-medium text-xs text-center">
              Tautan unduhan paket APK belum dikonfigurasi di server. Silakan hubungi admin teknis.
            </div>
          )}

          <p className="text-center text-[11px] text-slate-400 mt-4">
            Khusus armada operasional internal. Masuk menggunakan akun terdaftar Dinas UPS HERU.
          </p>
        </div>
      </main>
    </div>
  );
}
