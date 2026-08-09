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
    <div className="space-y-5">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-[var(--neon-cyan)] pb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-[var(--neon-pink)] animate-pulse shadow-[0_0_8px_var(--neon-pink)]" />
          <span className="font-mono text-xs text-[var(--neon-cyan)] font-bold tracking-[0.2em] uppercase glitch-text">
            CEK TAGIHAN KAGAK PAKE LAMA
          </span>
        </div>
        <span className="text-[9px] font-mono text-[var(--neon-yellow)] bg-[rgba(252,238,10,0.1)] px-2 py-1 border border-[var(--neon-yellow)] tracking-widest uppercase shadow-[0_0_5px_rgba(252,238,10,0.3)]">
          // KHUSUS WARGA DEPOK
        </span>
      </div>

      {/* Quick Check Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[10px] font-mono tracking-widest text-[var(--neon-cyan)] mb-2 uppercase">
            &gt; KETIK KODE RUMAH LU DIMARI :
          </label>
          <div className="relative group">
            <input
              type="text"
              value={kode}
              onChange={(e) => setKode(e.target.value.toUpperCase())}
              placeholder="CONTOH: DPK-001"
              className="w-full bg-[rgba(0,243,255,0.02)] border border-[var(--neon-cyan)] px-4 py-3 text-sm font-mono text-white placeholder-[rgba(0,243,255,0.3)] focus:border-[var(--neon-pink)] focus:ring-1 focus:ring-[var(--neon-pink)] outline-none transition-all uppercase shadow-[inset_0_0_10px_rgba(0,243,255,0.1)]"
              style={{ clipPath: "polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))" }}
            />
            <button
              type="submit"
              className="absolute right-1 top-1 bottom-1 bg-[var(--neon-cyan)] hover:bg-[var(--neon-pink)] text-black font-mono text-xs font-bold px-4 transition-all uppercase hover:shadow-[0_0_15px_var(--neon-pink)]"
              style={{ clipPath: "polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))" }}
            >
              CEK_COY 
            </button>
          </div>
        </div>

        {/* Quick sample chips */}
        <div className="flex items-center gap-2 flex-wrap text-[9px] font-mono text-slate-500 pt-1 uppercase tracking-widest">
          <span>COBAIN KODE INI NGAB:</span>
          {["DPK-001", "DPK-002", "DPK-003"].map((sample) => (
            <button
              key={sample}
              type="button"
              onClick={() => {
                setKode(sample);
                router.push(`/bayar?kode=${sample}`);
              }}
              className="px-2 py-0.5 border border-slate-700 hover:border-[var(--neon-cyan)] text-slate-400 hover:text-[var(--neon-cyan)] transition-colors hover:shadow-[0_0_5px_var(--neon-cyan)] hover:bg-[rgba(0,243,255,0.1)]"
            >
              [{sample}]
            </button>
          ))}
        </div>
      </form>

      {/* Card Info Mockup */}
      <div className="pt-2">
        <div className="relative bg-[rgba(0,0,0,0.5)] border border-[var(--neon-lime)] p-4 shadow-[0_0_10px_rgba(57,255,20,0.1)] before:content-[''] before:absolute before:-top-1 before:-left-1 before:w-2 before:h-2 before:bg-[var(--neon-lime)] before:shadow-[0_0_5px_var(--neon-lime)]" style={{ clipPath: "polygon(0 15px, 15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)" }}>
          
          {/* Scanline inside card */}
          <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(57,255,20,0.05)_50%)] bg-[length:100%_4px] pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[var(--neon-lime)] text-black flex items-center justify-center font-mono font-black text-xs shadow-[0_0_10px_var(--neon-lime)]" style={{ clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%)" }}>
                  DB
                </div>
                <div>
                  <p className="text-xs font-mono font-bold text-white uppercase tracking-widest">KARTU ANGGOTA LU</p>
                  <p className="text-[8px] font-mono text-[var(--neon-lime)] uppercase tracking-[0.2em]">&gt; PENGELOLA SAMPAH DEPOK</p>
                </div>
              </div>
              <span className="text-[9px] font-mono text-black font-bold bg-[var(--neon-lime)] px-2 py-0.5 shadow-[0_0_10px_var(--neon-lime)] animate-pulse">
                [ NYALA TERUS ]
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
              <div className="border border-slate-800 p-2 bg-[rgba(255,255,255,0.02)] border-l-[var(--neon-cyan)] border-l-2">
                <span className="text-[8px] text-[var(--neon-cyan)] block uppercase mb-1">&gt; JADWAL ANGKUT LU</span>
                <span className="text-white font-bold">2X / MINGGU, MANTAP</span>
              </div>
              <div className="border border-slate-800 p-2 bg-[rgba(255,255,255,0.02)] border-l-[var(--neon-pink)] border-l-2">
                <span className="text-[8px] text-[var(--neon-pink)] block uppercase mb-1">&gt; STATUS IURAN COY</span>
                <span className="text-white font-bold blink">BELOM BAYAR LU</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
