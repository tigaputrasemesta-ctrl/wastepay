"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HeroQuickCheck() {
  const [kode, setKode] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kode.trim()) return;
    router.push(`/bayar?kode=${encodeURIComponent(kode.trim())}`);
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse ring-4 ring-emerald-500/20" />
          <span className="text-xs font-bold text-slate-900 tracking-wider uppercase">
            Cek Tagihan Cepat & Praktis
          </span>
        </div>
        <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 border border-emerald-200 rounded-full">
          Khusus Warga Depok
        </span>
      </div>

      {/* Quick Check Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Ketik Kode Rumah / ID Pelanggan:
          </label>
          <div className="relative group">
            <input
              type="text"
              value={kode}
              onChange={(e) => setKode(e.target.value.toUpperCase())}
              placeholder="Contoh: DPK-001"
              className="w-full bg-slate-50 border border-slate-200 px-4 py-3 text-sm rounded-2xl text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all uppercase font-medium"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1.5 bottom-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-4 rounded-xl transition-all shadow-sm active:scale-95"
            >
              Cek Tagihan
            </button>
          </div>
        </div>

        {/* Quick sample chips */}
        <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500 pt-1">
          <span>Contoh kode:</span>
          {["DPK-001", "DPK-002", "DPK-003"].map((sample) => (
            <button
              key={sample}
              type="button"
              onClick={() => {
                setKode(sample);
                router.push(`/bayar?kode=${sample}`);
              }}
              className="px-2.5 py-1 border border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/50 text-slate-600 hover:text-emerald-700 rounded-lg text-xs font-mono font-medium transition-colors"
            >
              {sample}
            </button>
          ))}
        </div>
      </form>

      {/* Card Info Mockup */}
      <div className="pt-2">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                WP
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Kartu Anggota UPS HERU</p>
                <p className="text-[11px] text-emerald-700 font-medium">Pengelolaan Sampah Kota Depok</p>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
              ● Layanan Aktif
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="border border-slate-100 p-3 bg-slate-50/70 rounded-xl">
              <span className="text-[10px] text-slate-500 block font-semibold mb-1">JADWAL ANGKUT</span>
              <span className="text-slate-900 font-bold">2× / Minggu (Rutin)</span>
            </div>
            <div className="border border-slate-100 p-3 bg-slate-50/70 rounded-xl">
              <span className="text-[10px] text-slate-500 block font-semibold mb-1">METODE BAYAR</span>
              <span className="text-emerald-700 font-bold">QRIS Instant Otomatis</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
