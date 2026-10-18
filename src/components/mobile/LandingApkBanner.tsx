"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, Smartphone, X } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { MOBILE_VERSION } from "@/lib/mobile-version";

/**
 * Banner pintar unduh APK di Landing Page.
 * Sesuai rekomendasi audit Mobile-First Modul 7:
 * Otomatis disembunyikan (return null) saat berjalan di dalam WebView APK Native (Capacitor.isNativePlatform() === true).
 */
export default function LandingApkBanner() {
  const [isNative, setIsNative] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const native = Capacitor.isNativePlatform();
      setIsNative(native);
      const isDismissed = sessionStorage.getItem("wastepay_apk_banner_dismissed");
      if (isDismissed) setDismissed(true);
    }
  }, []);

  // Jangan render di server atau jika berjalan di dalam APK Native
  if (!mounted || isNative || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("wastepay_apk_banner_dismissed", "true");
    }
  };

  return (
    <aside
      aria-label="Unduh Aplikasi Android WastePay"
      className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white px-4 py-2.5 sm:py-3 border-b border-emerald-800/60 transition-all animate-in fade-in"
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0 text-emerald-300">
            <Smartphone className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white truncate">
                Aplikasi Android UPS HERU Driver & Petugas
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono border border-emerald-400/20">
                v{MOBILE_VERSION.versionName} (b{MOBILE_VERSION.versionCode})
              </span>
            </div>
            <p className="text-[11px] text-slate-300 truncate font-normal">
              Navigasi rute jemput OSRM, pelacakan live GPS, dan absensi selfie presisi tinggi.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/unduh"
            className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh APK</span>
          </Link>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Tutup banner APK"
            className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

/**
 * Komponen Link APK di Footer / Login yang aman dari APK Native.
 * Menyembunyikan dirinya sendiri bila pengguna sudah berada di dalam aplikasi APK.
 */
export function NativeGuardedLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [isNative, setIsNative] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      setIsNative(Capacitor.isNativePlatform());
    }
  }, []);

  if (!mounted || isNative) return null;

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
