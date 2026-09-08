"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home, Key } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to client console for easier debugging
    console.error("Unhandled Application Error:", error);
  }, [error]);

  const isDbOrEnvError =
    error.message?.includes("database") ||
    error.message?.includes("JWT_SECRET") ||
    error.message?.includes("connect") ||
    error.message?.includes("DATABASE_URL") ||
    Boolean(error.digest?.length);

  return (
    <div className="min-h-screen bg-[#f4f4f0] text-black font-sans flex flex-col items-center justify-center p-6 selection:bg-red-500 selection:text-white">
      <div className="max-w-xl w-full bg-white border-4 border-black p-8 md:p-10 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
        {/* Header Badge */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-red-500 text-white border-2 border-black flex items-center justify-center font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-black uppercase tracking-widest text-red-600">
              Terjadi Kesalahan Server
            </div>
            <h1 className="text-3xl font-black uppercase tracking-tight">
              Sistem Mengalami Kendala
            </h1>
          </div>
        </div>

        {/* Error Details */}
        <div className="bg-neutral-100 border-2 border-black p-4 mb-6 space-y-2 font-mono text-xs">
          {error.digest && (
            <div className="flex justify-between items-center border-b border-neutral-300 pb-2">
              <span className="text-neutral-500 font-bold uppercase">Kode Error (Digest):</span>
              <span className="font-bold text-red-600 bg-white px-2 py-0.5 border border-black">
                {error.digest}
              </span>
            </div>
          )}
          <div className="break-words text-neutral-800">
            {error.message || "Aplikasi mengalami kegagalan memuat data pada server."}
          </div>
        </div>

        {/* Diagnostic Guide if likely environment / database issue */}
        {isDbOrEnvError && (
          <div className="mb-6 p-4 border-2 border-dashed border-amber-600 bg-amber-50 text-xs space-y-2">
            <div className="font-bold text-amber-900 uppercase flex items-center gap-1.5">
              <Key className="w-4 h-4" /> Kemungkinan Penyebab (Vercel / Hosting):
            </div>
            <ul className="list-disc list-inside space-y-1 text-amber-950">
              <li>
                <code className="bg-amber-100 px-1 font-bold">JWT_SECRET</code> belum disetel di Environment Variables Vercel.
              </li>
              <li>
                <code className="bg-amber-100 px-1 font-bold">DATABASE_URL</code> belum tersambung atau database (Supabase/Neon) sedang inaktif.
              </li>
              <li>
                Koneksi pool SSL database membutuhkan <code className="bg-amber-100 px-1 font-bold">DATABASE_SSL_REJECT_UNAUTHORIZED=false</code>.
              </li>
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 pt-2">
          <button
            onClick={() => reset()}
            className="flex-1 hm-btn-red py-3 text-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" /> Coba Muat Ulang
          </button>
          <Link
            href="/"
            className="flex-1 hm-btn py-3 text-sm flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" /> Kembali ke Beranda
          </Link>
        </div>
      </div>
      
      {/* Footer Info */}
      <div className="mt-8 text-center text-xs font-bold uppercase tracking-widest text-neutral-500">
        TPS HERU · Depok 2026
      </div>
    </div>
  );
}
