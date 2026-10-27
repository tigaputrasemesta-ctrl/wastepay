import type { Metadata } from "next";
import Link from "next/link";
import { Download, Smartphone, ShieldCheck, Database, Zap, Sparkles } from "lucide-react";
import {
  MOBILE_VERSION,
  ADMIN_VERSION,
  getApkUrl,
  getAdminApkUrl,
} from "@/lib/mobile-version";
import UnduhButtonSection from "@/components/mobile/UnduhButtonSection";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Unduh Aplikasi UPS HERU (Driver & Admin)",
  description:
    "Unduh aplikasi Android resmi UPS HERU untuk Pengemudi Armada Lapangan (Native) dan Admin Backoffice (Offline Cache).",
  alternates: {
    canonical: "/unduh",
  },
  openGraph: {
    title: "Unduh Aplikasi UPS HERU | Driver & Admin",
    description:
      "Aplikasi Android resmi untuk supir armada lapangan dan admin backoffice UPS HERU Kota Depok.",
  },
};

export default function UnduhPage() {
  const driverApkUrl = getApkUrl();
  const adminApkUrl = getAdminApkUrl();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-24">
      {/* Top bar */}
      <header className="border-b border-slate-200/80 px-6 py-4 bg-white/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-emerald-700 text-white font-extrabold flex items-center justify-center text-base shadow-sm">
              W
            </span>
            <div className="leading-tight">
              <span className="font-extrabold text-slate-900 text-lg tracking-tight">
                UPS HERU
              </span>
              <span className="block text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">
                Aplikasi Android Resmi
              </span>
            </div>
          </Link>
          <Link
            href="/"
            className="text-xs font-semibold text-slate-600 hover:text-emerald-800 transition-colors flex items-center gap-1.5"
          >
            ← Kembali ke Beranda
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 md:py-14">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-3 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            Pilihan Aplikasi Android Resmi Sesuai Peran
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Unduh Aplikasi <span className="text-emerald-700">UPS HERU</span>
          </h1>
          <p className="text-slate-600 text-sm sm:text-base mt-2.5 max-w-xl mx-auto">
            Tersedia dua aplikasi terpisah: Aplikasi Khusus Supir / Driver Lapangan dan Aplikasi Khusus Admin dengan Penyimpanan Data Offline di HP.
          </p>
        </div>

        {/* 2-Column Grid untuk Pilihan APK */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {/* ── CARD 1: APK PETUGAS & SUPIR ARMADA ── */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-bl-full pointer-events-none" />

            <div>
              <div className="flex items-center justify-between gap-4 pb-5 border-b border-slate-100 mb-5">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
                      Khusus Pengemudi / Supir
                    </span>
                    <h2 className="text-lg font-extrabold text-slate-900">
                      UPS HERU Petugas Native
                    </h2>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                  v{MOBILE_VERSION.versionName}
                </span>
              </div>

              <div className="space-y-3 mb-6">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Keunggulan Driver:
                </p>
                <ul className="text-xs text-slate-600 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-[10px] mt-0.5 shrink-0">
                      ✓
                    </span>
                    <span>
                      <b>Auto-Popup Geofence (&lt;30m)</b> dengan respon getar haptic saat tiba di depan rumah warga.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-[10px] mt-0.5 shrink-0">
                      ✓
                    </span>
                    <span>
                      <b>Swipe to Pickup</b> untuk konfirmasi penjemputan anti salah pencet.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-[10px] mt-0.5 shrink-0">
                      ✓
                    </span>
                    <span>
                      <b>Quick Skip Presets</b> (Sampah Kosong, Gembok, Akses Tutup) dalam 1 sentuhan.
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            <div>
              <UnduhButtonSection
                apkUrl={driverApkUrl}
                versionName={MOBILE_VERSION.versionName}
                versionCode={MOBILE_VERSION.versionCode}
                label="Unduh APK Driver (Flutter Native)"
                colorClass="bg-emerald-700 hover:bg-emerald-800"
              />
              <p className="text-center text-[10px] text-slate-400 mt-3">
                ID Paket: <code className="font-mono text-slate-500">id.o2whero.mobile_petugas</code>
              </p>
            </div>
          </div>

          {/* ── CARD 2: APK KHUSUS ADMIN (OFFLINE-FIRST) ── */}
          <div className="bg-white rounded-3xl border border-blue-200/90 p-6 sm:p-8 shadow-sm flex flex-col justify-between relative overflow-hidden ring-1 ring-blue-500/10">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-bl-full pointer-events-none" />

            <div>
              <div className="flex items-center justify-between gap-4 pb-5 border-b border-slate-100 mb-5">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0">
                    <Database className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">
                      Khusus Pengelola Backoffice (Flutter Native)
                    </span>
                    <h2 className="text-lg font-extrabold text-slate-900">
                      UPS HERU Admin Native
                    </h2>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">
                  v{ADMIN_VERSION.versionName}
                </span>
              </div>

              <div className="space-y-3 mb-6">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Keunggulan Offline-First Admin:
                </p>
                <ul className="text-xs text-slate-600 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px] mt-0.5 shrink-0">
                      ✓
                    </span>
                    <span>
                      <b>Data Tersimpan di HP (IndexedDB)</b>: Buka aplikasi & cari data pelanggan langsung 0 detik tanpa menunggu database Supabase.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px] mt-0.5 shrink-0">
                      ✓
                    </span>
                    <span>
                      <b>Delta Push Sync Otomatis</b>: Hanya menarik data baru/diubah, hemat kuota seluler hingga 99%.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px] mt-0.5 shrink-0">
                      ✓
                    </span>
                    <span>
                      <b>Terpisah Total dari APK Supir</b>: Bisa di-install bersamaan di satu HP tanpa bentrok.
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            <div>
              <UnduhButtonSection
                apkUrl={adminApkUrl}
                versionName={ADMIN_VERSION.versionName}
                versionCode={ADMIN_VERSION.versionCode}
                label="Unduh APK Admin (Flutter Native)"
                colorClass="bg-blue-600 hover:bg-blue-700"
              />
              <p className="text-center text-[10px] text-slate-400 mt-3">
                ID Paket: <code className="font-mono text-slate-500">id.o2whero.admin</code>
              </p>
            </div>
          </div>
        </div>

        {/* Petunjuk Penggunaan & Pemasangan */}
        <div className="mt-12 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 text-xs text-slate-600 space-y-4">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>Petunjuk Pemasangan File APK di Android</span>
          </div>
          <ol className="list-decimal pl-5 space-y-1.5 leading-relaxed">
            <li>Klik tombol unduh di atas untuk berkas APK yang sesuai dengan peran Anda (Driver atau Admin).</li>
            <li>Setelah unduhan selesai, buka file APK dari bilah notifikasi ponsel atau pengelola berkas.</li>
            <li>Jika muncul peringatan <i>"Izinkan pemasangan dari sumber ini"</i> pada Chrome atau browser Anda, centang <b>Izinkan</b> (aplikasi ini ditandatangani dengan sertifikat resmi internal UPS HERU).</li>
            <li>Untuk Admin: Setelah login pertama kali, klik tombol <b>"Simpan ke HP"</b> di bilah atas untuk mengunduh snapshot data warga agar aplikasi bisa bekerja secara instan offline.</li>
          </ol>
        </div>
      </main>
    </div>
  );
}
