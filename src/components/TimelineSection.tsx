"use client";

import { useState } from "react";

type TimelineMilestone = {
  year: string;
  badge: string;
  title: string;
  desc: string;
  icon: string;
  highlight: string;
};

const MILESTONES: TimelineMilestone[] = [
  {
    year: "2014",
    badge: "FONDASI AWAL",
    title: "Titik Awal di Jalanan Depok",
    desc: "Mulai dari armada gerobak kayu & pickup sederhana, melayani warga beberapa RT di Beji & Sawangan dengan komitmen jam angkut yang pasti dan tanpa drama.",
    icon: "🛒",
    highlight: "Armada Pertama & Komitmen Jadwal",
  },
  {
    year: "2018",
    badge: "EKSPANSI ARMADA",
    title: "Hadirnya Truk Hidrolik Pertama",
    desc: "Menambah unit dump truck hidrolik untuk melayani rute komplek perumahan, cluster, ruko pertokoan, dan sentra kuliner yang membutuhkan volume muat lebih besar.",
    icon: "🚚",
    highlight: "Jangkauan Rute Komplek Perumahan",
  },
  {
    year: "2021",
    badge: "LINGKUNGAN & 3R",
    title: "Standarisasi Pemilahan TPS 3R",
    desc: "Mengintegrasikan sentra pemilahan sampah organik & anorganik terpadu bersama komunitas warga untuk mengurangi beban timbunan residu ke TPA Cipayung.",
    icon: "🌱",
    highlight: "Gerakan Pilah Sampah Berkelanjutan",
  },
  {
    year: "2024",
    badge: "INOVASI DIGITAL",
    title: "Masuk Era Geotag & GPS Tracking",
    desc: "Peluncuran sistem pelacakan truk GPS real-time, laporan warga via foto ber-geotag otomatis, serta notifikasi tagihan dan struk resmi via bot WhatsApp.",
    icon: "📱",
    highlight: "Live Tracking & WhatsApp Bot",
  },
  {
    year: "2026",
    badge: "DEPOK BERSIH 2026",
    title: "2.000+ Keluarga & Pelaku Usaha",
    desc: "Transformasi penuh sebagai operator modern terpercaya di Kota Depok. Tarif transparan flat rate Rp 50.000/bulan dengan kepastian angkut harian.",
    icon: "⚡",
    highlight: "Ekosistem Kota Modern Tanpa Pusing",
  },
];

export default function TimelineSection() {
  const [activeIdx, setActiveIdx] = useState<number>(4);

  return (
    <section className="border-b-2 border-black bg-white py-20 px-6 relative overflow-hidden">
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="mb-14">
          <div className="inline-block px-3 py-1 bg-black text-white font-black text-xs uppercase tracking-widest mb-4 border-2 border-black shadow-[2px_2px_0_0_#10b981]">
            PERJALANAN 12 TAHUN UPS HERU
          </div>
          <h2 className="text-4xl sm:text-5xl md:text-7xl font-black uppercase tracking-tighter text-black leading-none">
            Dari Gerobak <br />
            <span className="text-emerald-600">ke Geotag.</span>
          </h2>
          <p className="text-lg md:text-xl font-medium text-gray-700 max-w-2xl mt-4 leading-relaxed">
            12 tahun kami bolak-balik jalanan Depok — jauh sebelum kata &ldquo;startup sampah&rdquo; jadi tren. Ini perjalanan nyata kami merawat kota.
          </p>
        </div>

        {/* Timeline Nav / Tab Buttons (Desktop & Tablet) */}
        <div className="hidden md:flex items-center justify-between border-2 border-black bg-[#f4f4f0] p-2 mb-8 shadow-[4px_4px_0_0_#000]">
          {MILESTONES.map((m, idx) => {
            const isActive = activeIdx === idx;
            return (
              <button
                type="button"
                key={m.year}
                onClick={() => setActiveIdx(idx)}
                className={`flex-1 py-3 px-4 text-center font-black uppercase transition-all duration-150 border-2 ${
                  isActive
                    ? "bg-black text-white border-black shadow-[3px_3px_0_0_#10b981] -translate-y-0.5"
                    : "bg-transparent text-gray-600 border-transparent hover:text-black hover:bg-white"
                }`}
              >
                <span className="text-xs block tracking-widest opacity-80">{m.icon} TAHUN</span>
                <span className="text-2xl font-mono tracking-tighter">{m.year}</span>
              </button>
            );
          })}
        </div>

        {/* Highlight Card for Desktop Selected Milestone */}
        <div className="hidden md:block hm-card bg-emerald-50 border-2 border-black p-8 mb-12 shadow-[8px_8px_0_0_#000]">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500 text-black border-2 border-black text-xs font-black uppercase tracking-widest mb-4">
                <span>{MILESTONES[activeIdx].badge}</span>
              </div>
              <h3 className="text-3xl font-black uppercase tracking-tight text-black mb-3">
                {MILESTONES[activeIdx].title}
              </h3>
              <p className="text-lg font-medium text-gray-800 leading-relaxed max-w-3xl">
                {MILESTONES[activeIdx].desc}
              </p>
              <div className="mt-6 pt-4 border-t-2 border-black/10 flex items-center gap-3 text-xs font-black uppercase text-emerald-800 tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                <span>Pencapaian: {MILESTONES[activeIdx].highlight}</span>
              </div>
            </div>

            <div className="w-24 h-24 bg-white border-2 border-black rounded-2xl flex items-center justify-center text-5xl shadow-[4px_4px_0_0_#000] shrink-0">
              {MILESTONES[activeIdx].icon}
            </div>
          </div>
        </div>

        {/* Vertical Stepped Cards (Mobile / Responsive Timeline Grid) */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {MILESTONES.map((m, idx) => {
            const isLatest = idx === MILESTONES.length - 1;
            return (
              <div
                key={m.year}
                onClick={() => setActiveIdx(idx)}
                className={`border-2 border-black p-5 cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                  activeIdx === idx
                    ? "bg-yellow-300 shadow-[6px_6px_0_0_#000] -translate-y-1"
                    : isLatest
                    ? "bg-emerald-100/70 shadow-[4px_4px_0_0_#000] hover:bg-emerald-100"
                    : "bg-white shadow-[4px_4px_0_0_#000] hover:bg-gray-50"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-2xl font-black tracking-tighter text-black">
                      {m.year}
                    </span>
                    <span className="text-2xl">{m.icon}</span>
                  </div>
                  <h4 className="text-sm font-black uppercase text-black leading-tight mb-2">
                    {m.title}
                  </h4>
                  <p className="text-xs font-medium text-gray-700 leading-snug line-clamp-3">
                    {m.desc}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-black/20 text-[10px] font-black uppercase tracking-wider text-black">
                  {m.badge} &rarr;
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
