"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowLeft, Compass, RefreshCw } from "lucide-react";

// Muat komponen peta secara dinamis untuk SSR safe
const WastePayInteractiveMapOSRM = dynamic(
  () => import("@/components/map/WastePayInteractiveMapOSRM"),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex flex-col items-center justify-center bg-slate-950 text-white space-y-3">
        <div className="w-9 h-9 rounded-full border-3 border-emerald-500 border-t-transparent animate-spin" />
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">
          Memuat Peta Navigasi Driver OSRM...
        </p>
      </div>
    ),
  }
);

export default function DriverPetaPage() {
  const [posSaya, setPosSaya] = useState<{ lat: number; lng: number; akurasi?: number } | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setPosSaya({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          akurasi: pos.coords.accuracy,
        });
      },
      (err) => {
        console.warn("Gagal melacak GPS driver:", err.message);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  return (
    <div className="relative w-full h-[100dvh] bg-slate-950 flex flex-col overflow-hidden select-none">
      {/* Top Bar Khusus Pengemudi */}
      <header className="h-12 bg-slate-950/90 border-b border-slate-800 px-4 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-2.5">
          <Link
            href="/m/angkut"
            className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
            title="Kembali ke Dashboard Driver"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-xs font-black text-white tracking-wide uppercase">
              Navigasi Lapangan OSRM
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {posSaya && (
            <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-lg border border-emerald-800">
              GPS ±{Math.round(posSaya.akurasi || 0)}m
            </span>
          )}
        </div>
      </header>

      {/* Kontainer Kanvas Peta Interaktif Penuh */}
      <div className="flex-1 relative w-full h-full overflow-hidden touch-none">
        <WastePayInteractiveMapOSRM posSaya={posSaya} isDriverMode={true} />
      </div>
    </div>
  );
}
