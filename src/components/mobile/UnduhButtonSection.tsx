"use client";

import { useEffect, useState } from "react";
import { Download, CheckCircle2, Smartphone } from "lucide-react";
import { Capacitor } from "@capacitor/core";

export default function UnduhButtonSection({
  apkUrl,
  versionName,
  versionCode,
  label,
  colorClass,
}: {
  apkUrl: string | null;
  versionName: string;
  versionCode: number;
  label?: string;
  colorClass?: string;
}) {
  const [isNative, setIsNative] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      setIsNative(Capacitor.isNativePlatform());
    }
  }, []);

  if (mounted && isNative) {
    return (
      <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/90 border border-emerald-200 text-center space-y-1.5 animate-in fade-in">
        <div className="flex items-center justify-center gap-2 font-bold text-xs sm:text-sm text-emerald-900">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Aplikasi Sudah Terpasang (Native Mode)</span>
        </div>
        <p className="text-[11px] sm:text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
          Anda sedang menjalankan WastePay v{versionName} (Build {versionCode}) di dalam aplikasi Android. Pembaruan sistem akan diperiksa secara otomatis.
        </p>
      </div>
    );
  }

  if (apkUrl) {
    return (
      <a
        href={apkUrl}
        download
        className={`w-full flex items-center justify-center gap-2.5 py-4 px-6 rounded-2xl active:scale-[0.99] text-white font-bold text-base shadow-sm transition-all ${
          colorClass || "bg-emerald-700 hover:bg-emerald-800"
        }`}
      >
        <Download className="w-5 h-5" />
        <span>{label || `Unduh Berkas APK (${versionName})`}</span>
      </a>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-medium text-xs text-center">
      Tautan unduhan paket APK belum dikonfigurasi di server. Silakan hubungi admin teknis.
    </div>
  );
}
