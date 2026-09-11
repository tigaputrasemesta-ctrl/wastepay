"use client";

import { useEffect, useRef, useState } from "react";

type StatItem = {
  target: number;
  suffix: string;
  label: string;
  sublabel: string;
  icon: string;
};

const STATS: StatItem[] = [
  {
    target: 12,
    suffix: "+",
    label: "Tahun Melayani",
    sublabel: "Konsisten Sejak 2014 di Depok",
    icon: "🗓️",
  },
  {
    target: 2000,
    suffix: "+",
    label: "Pelanggan Aktif",
    sublabel: "Keluarga & Pelaku Usaha",
    icon: "🤝",
  },
  {
    target: 18,
    suffix: "+",
    label: "Zona Cakupan",
    sublabel: "Wilayah Kelurahan Se-Depok",
    icon: "📍",
  },
  {
    target: 350,
    suffix: "+",
    label: "Ton/Bulan Sampah",
    sublabel: "Terkelola & Terpilah Terpadu",
    icon: "🚛",
  },
];

export default function TrustStatsBar() {
  const [hasAnimated, setHasAnimated] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [counts, setCounts] = useState<number[]>(STATS.map(() => 0));

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);

          const duration = 1800; // ms
          const frameDuration = 1000 / 60;
          const totalFrames = Math.round(duration / frameDuration);
          let frame = 0;

          const timer = setInterval(() => {
            frame++;
            const progress = Math.min(frame / totalFrames, 1);
            // Ease out cubic
            const easeOut = 1 - Math.pow(1 - progress, 3);

            setCounts(STATS.map((stat) => Math.round(stat.target * easeOut)));

            if (frame >= totalFrames) {
              clearInterval(timer);
              setCounts(STATS.map((stat) => stat.target));
            }
          }, frameDuration);
        }
      },
      { threshold: 0.25 }
    );

    const currentRef = containerRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) observer.unobserve(currentRef);
    };
  }, [hasAnimated]);

  return (
    <section
      ref={containerRef}
      className="w-full bg-slate-900 border-y border-slate-800 text-white py-16 sm:py-20 px-6 relative overflow-hidden"
    >
      {/* Subtle Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-emerald-500/10 blur-[120px] pointer-events-none rounded-full" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Caption Header */}
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-2 px-3.5 py-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-extrabold text-xs tracking-wider uppercase rounded-full mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Rekam Jejak Terbukti
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white">
            Bukan Pemain Baru di Pengelolaan Sampah
          </h2>
          <p className="text-slate-400 text-sm md:text-base font-normal max-w-xl mx-auto mt-2">
            Dedikasi lebih dari satu dekade merawat kebersihan lingkungan warga dan pelaku usaha di seluruh penjuru Kota Depok.
          </p>
        </div>

        {/* 4-Column Stats Grid (2x2 on Mobile) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {STATS.map((stat, idx) => {
            const displayValue = hasAnimated
              ? counts[idx].toLocaleString("id-ID")
              : "0";

            return (
              <div
                key={stat.label}
                className="bg-slate-800/80 border border-slate-700/60 rounded-3xl p-6 md:p-7 flex flex-col justify-between shadow-md hover:border-emerald-500/50 hover:bg-slate-800 transition-all duration-200 group"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl p-2.5 rounded-2xl bg-slate-700/50">{stat.icon}</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 opacity-60 group-hover:opacity-100 group-hover:scale-125 transition-all" />
                </div>

                <div>
                  <div className="font-extrabold text-3xl sm:text-4xl md:text-5xl text-white tracking-tight leading-none flex items-baseline">
                    <span>{displayValue}</span>
                    <span className="text-emerald-400 ml-0.5">{stat.suffix}</span>
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-slate-100 tracking-tight mt-3">
                    {stat.label}
                  </h3>

                  <p className="text-xs text-slate-400 mt-1 font-medium">
                    {stat.sublabel}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
