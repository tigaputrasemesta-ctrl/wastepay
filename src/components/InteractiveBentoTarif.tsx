"use client";

import { useState } from "react";
import Link from "next/link";
import { formatRupiah } from "@/lib/utils";

type KategoriItem = {
  kategori: string;
  label: string;
  tarif: number;
};

export default function InteractiveBentoTarif({ tarifList }: { tarifList: KategoriItem[] }) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const activeItem = tarifList[selectedIdx] || tarifList[0] || { kategori: "R1", label: "Rumah Tangga Kecil", tarif: 25000 };

  return (
    <div className="rounded-2xl bg-[#0f131a] border border-lime-400/20 p-6 lg:p-8 space-y-6 shadow-xl relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-lime-400/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4 relative z-10">
        <div>
          <span className="font-mono text-xs text-lime-400 uppercase tracking-widest">— HITUNG IURAN KAMU —</span>
          <h3 className="font-display text-2xl font-bold text-white mt-1">Berapa Biaya Iuran Rumah / Usaha Kamu?</h3>
        </div>
        <span className="text-xs font-mono text-slate-300 bg-white/5 px-3 py-1 rounded-full border border-white/10">
          GRATIS SURVEI & AKTIVASI
        </span>
      </div>

      {/* Category Pills Selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none relative z-10">
        {tarifList.map((item, idx) => (
          <button
            key={item.kategori}
            onClick={() => setSelectedIdx(idx)}
            className={`px-4 py-2 rounded-xl text-xs font-mono whitespace-nowrap transition-all ${
              selectedIdx === idx
                ? "bg-lime-400 text-[#090b0e] font-bold shadow-[0_0_15px_rgba(183,225,60,0.3)]"
                : "bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Active Category Details Showcase */}
      <div className="grid sm:grid-cols-3 gap-4 pt-2 relative z-10">
        <div className="p-4 rounded-xl bg-[#090b0e] border border-white/10 space-y-1">
          <span className="text-[10px] font-mono text-slate-400 uppercase block">KATEGORI PILIHAN</span>
          <p className="font-display text-lg font-bold text-white">{activeItem.label}</p>
          <span className="text-[11px] font-mono text-lime-400">Kode Kategori: {activeItem.kategori}</span>
        </div>

        <div className="p-4 rounded-xl bg-[#090b0e] border border-lime-400/30 space-y-1">
          <span className="text-[10px] font-mono text-slate-400 uppercase block">IURAN HANYA</span>
          <p className="font-display text-3xl font-extrabold text-lime-400">
            {formatRupiah(activeItem.tarif)}
            <span className="text-xs text-slate-400 font-mono font-normal"> /bulan</span>
          </p>
          <span className="text-[10px] font-mono text-slate-400">Fixed rate, gak bakal naik mendadak</span>
        </div>

        <div className="p-4 rounded-xl bg-[#090b0e] border border-white/10 space-y-1 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-mono text-slate-400 uppercase block">JADWAL PENGAMBILAN</span>
            <p className="font-display text-base font-bold text-emerald-400">Rutin 2x – 3x / Minggu</p>
          </div>
          <Link
            href={`/daftar?kategori=${encodeURIComponent(activeItem.kategori)}`}
            className="w-full text-center bg-lime-400 hover:bg-lime-300 text-[#090b0e] font-mono text-xs font-bold py-2.5 rounded-lg transition-all mt-2"
          >
            Daftar Kategori Ini →
          </Link>
        </div>
      </div>
    </div>
  );
}
