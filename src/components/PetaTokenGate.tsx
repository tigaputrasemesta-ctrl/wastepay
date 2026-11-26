"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface PetaTokenGateProps {
  tokenInvalid?: boolean;
  tenant?: {
    namaMitra?: string;
    kota?: string;
    warnaTema?: string;
  };
}

export default function PetaTokenGate({ tokenInvalid = false, tenant }: PetaTokenGateProps) {
  const [inputToken, setInputToken] = useState("");
  const router = useRouter();

  const mitraName = (tenant?.namaMitra || "UPS HERU").toUpperCase();
  const cityName = (tenant?.kota || "KOTA DEPOK").toUpperCase();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputToken.trim()) return;
    router.push(`/peta?token=${encodeURIComponent(inputToken.trim())}`);
  };

  return (
    <div className="min-h-screen w-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden select-none">
      {/* Background Decorative Gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
        {/* Brand Icon & Title */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-sky-500/20 border border-emerald-500/30 flex items-center justify-center text-3xl mb-3 shadow-inner shadow-emerald-500/20">
            🗺️
          </div>
          <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2.5 py-0.5 rounded-full mb-1">
            {mitraName} • {cityName}
          </span>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1">
            Peta Navigasi Pelanggan
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
            Akses peta persebaran pelanggan & rute armada kebersihan dilindungi oleh token keamanan.
          </p>
        </div>

        {/* Invalid Token Alert */}
        {tokenInvalid && (
          <div className="mb-5 p-3.5 bg-rose-950/60 border border-rose-800/50 rounded-2xl flex items-start gap-3">
            <span className="text-rose-400 text-lg leading-none mt-0.5">⚠️</span>
            <div className="text-xs text-rose-200">
              <strong className="font-bold block text-rose-300">Token Tidak Valid</strong>
              Token yang disertakan tidak cocok atau sudah kedaluwarsa. Silakan masukkan token yang benar.
            </div>
          </div>
        )}

        {/* Token Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Token Akses Peta
            </label>
            <div className="relative">
              <input
                type="text"
                value={inputToken}
                onChange={(e) => setInputToken(e.target.value)}
                placeholder="Tempel / ketik token di sini..."
                className="w-full bg-slate-950/80 border border-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-2xl py-3 px-4 text-sm text-white placeholder-slate-500 font-mono transition outline-none"
                autoFocus
                required
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">
                🔑
              </span>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition transform active:scale-[0.98]"
          >
            <span>Buka Peta Pelanggan</span>
            <span>➔</span>
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800" />
          </div>
          <span className="relative bg-slate-900 px-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            atau
          </span>
        </div>

        {/* Alternative Links */}
        <div className="space-y-2">
          <Link
            href="/login?redirect=/peta"
            className="w-full py-2.5 px-4 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700/60 transition"
          >
            <span>👤</span>
            <span>Masuk Akun Petugas / Kasir / Admin</span>
          </Link>
          <Link
            href="/peta/tv"
            className="w-full py-2 px-4 text-slate-400 hover:text-emerald-400 rounded-xl text-[11px] font-medium flex items-center justify-center gap-1.5 transition text-center"
          >
            <span>📺</span>
            <span>Buka Mode TV Wallboard (/peta/tv)</span>
          </Link>
        </div>

        {/* Footer info */}
        <div className="mt-6 pt-4 border-t border-slate-800/60 text-center">
          <p className="text-[10px] text-slate-500">
            Hubungi Admin / Penanggung Jawab Wilayah jika Anda belum memiliki tautan token akses.
          </p>
        </div>
      </div>
    </div>
  );
}
