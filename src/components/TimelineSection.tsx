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
    <section className="border-b border-slate-200/80 bg-slate-50/50 py-20 px-6 relative overflow-hidden">
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold uppercase tracking-wider rounded-full mb-4">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Perjalanan 12 Tahun Dedikasi
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Dari Gerobak Kayu <br />
            <span className="text-emerald-600">Menuju Era Geotag & GPS.</span>
          </h2>
          <p className="text-base md:text-lg font-normal text-slate-600 max-w-2xl mt-3 leading-relaxed">
            12 tahun konsisten merawat jalanan Kota Depok jauh sebelum teknologi pengelolaan sampah menjadi tren. Ini perjalanan nyata transformasi layanan kami.
          </p>
        </div>

        {/* Timeline Nav / Tab Buttons (Desktop & Tablet) */}
        <div className="hidden md:flex items-center justify-between bg-white rounded-2xl p-1.5 mb-8 border border-slate-200/80 shadow-sm">
          {MILESTONES.map((m, idx) => {
            const isActive = activeIdx === idx;
            return (
              <button
                type="button"
                key={m.year}
                onClick={() => setActiveIdx(idx)}
                className={`flex-1 py-3 px-4 text-center font-bold transition-all duration-150 rounded-xl ${
                  isActive
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <span className="text-[10px] block tracking-widest uppercase opacity-80">{m.icon} {m.year}</span>
                <span className="text-sm font-extrabold truncate block mt-0.5">{m.badge}</span>
              </button>
            );
          })}
        </div>

        {/* Highlight Card for Desktop Selected Milestone */}
        <div className="hidden md:block bg-white rounded-3xl border border-slate-200/80 p-8 mb-8 shadow-sm">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-full mb-4">
                <span>{MILESTONES[activeIdx].badge} • TAHUN {MILESTONES[activeIdx].year}</span>
              </div>
              <h3 className="text-2xl font-extrabold tracking-tight text-slate-900 mb-2">
                {MILESTONES[activeIdx].title}
              </h3>
              <p className="text-base text-slate-600 leading-relaxed max-w-3xl">
                {MILESTONES[activeIdx].desc}
              </p>
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-bold text-emerald-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Tonggak Utama: {MILESTONES[activeIdx].highlight}</span>
              </div>
            </div>

            <div className="w-20 h-20 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center text-4xl shrink-0">
              {MILESTONES[activeIdx].icon}
            </div>
          </div>
        </div>

        {/* Vertical Stepped Cards (Mobile / Responsive Timeline Grid) */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5">
          {MILESTONES.map((m, idx) => {
            const isActive = activeIdx === idx;
            return (
              <div
                key={m.year}
                onClick={() => setActiveIdx(idx)}
                className={`p-4 rounded-2xl cursor-pointer transition-all duration-200 flex flex-col justify-between border ${
                  isActive
                    ? "bg-emerald-50/80 border-emerald-500 shadow-sm ring-2 ring-emerald-500/20"
                    : "bg-white border-slate-200/80 hover:border-slate-300 shadow-sm"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xl font-extrabold tracking-tight text-slate-900">
                      {m.year}
                    </span>
                    <span className="text-xl">{m.icon}</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 leading-tight mb-1.5">
                    {m.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-normal line-clamp-3">
                    {m.desc}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
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
