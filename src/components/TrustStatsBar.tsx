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
      className="w-full bg-[#022c22] border-y-2 border-black text-white py-16 px-6 relative overflow-hidden"
    >
      {/* Subtle Background Pattern */}
      <div 
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(#10b981 1px, transparent 1px)",
          backgroundSize: "20px 20px"
        }}
      />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Caption Header */}
        <div className="text-center mb-10">
          <span className="inline-block px-3.5 py-1 bg-emerald-500 text-black border-2 border-black font-black uppercase text-xs tracking-widest mb-3 shadow-[2px_2px_0_0_#000]">
            REKAM JEJAK TERBUKTI
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight text-white">
            Bukan Pemain Baru di Urusan Sampah
          </h2>
          <p className="text-emerald-300/80 text-sm md:text-base font-medium max-w-xl mx-auto mt-2">
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
                className="bg-[#064e3b] border-2 border-black p-6 md:p-8 flex flex-col justify-between shadow-[4px_4px_0_0_#000] hover:shadow-[6px_6px_0_0_#10b981] hover:-translate-y-1 transition-all duration-200 group"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl md:text-3xl">{stat.icon}</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 group-hover:animate-ping" />
                </div>

                <div>
                  <div className="font-mono text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tighter leading-none flex items-baseline">
                    <span>{displayValue}</span>
                    <span className="text-emerald-400 ml-0.5">{stat.suffix}</span>
                  </div>

                  <h3 className="text-base sm:text-lg font-black uppercase text-emerald-100 tracking-tight mt-3">
                    {stat.label}
                  </h3>

                  <p className="text-xs font-semibold text-emerald-300/70 mt-1 uppercase tracking-wider">
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
