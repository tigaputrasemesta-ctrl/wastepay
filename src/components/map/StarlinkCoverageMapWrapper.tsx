"use client";

import dynamic from "next/dynamic";

const StarlinkCoverageMap = dynamic(
  () => import("@/components/map/StarlinkCoverageMap"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-screen bg-[#070b14] flex flex-col items-center justify-center text-white select-none gap-4">
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 animate-spin" />
          <div className="absolute w-8 h-8 rounded-full bg-emerald-500/20 animate-pulse" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-xs font-black uppercase tracking-widest text-emerald-400">
            UPS HERU COVERAGE GRID
          </p>
          <p className="text-[11px] text-slate-400">
            Menginisialisasi peta satelit &amp; 23 blok operasional Depok…
          </p>
        </div>
      </div>
    ),
  }
);

export default function StarlinkCoverageMapWrapper() {
  return <StarlinkCoverageMap />;
}
