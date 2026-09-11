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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col items-center justify-center p-6 selection:bg-emerald-600 selection:text-white">
      <div className="max-w-xl w-full bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-10 shadow-sm">
        {/* Header Badge */}
        <div className="flex items-center gap-3.5 mb-6">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 border border-rose-100 rounded-2xl flex items-center justify-center font-bold shadow-xs shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-rose-600">
              Terjadi Kendala Sistem
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Gagal Memuat Halaman
            </h1>
          </div>
        </div>

        {/* Error Details */}
        <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-4 mb-6 space-y-2 font-mono text-xs">
          {error.digest && (
            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
              <span className="text-slate-500 font-medium">Digest ID:</span>
              <span className="font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                {error.digest}
              </span>
            </div>
          )}
          <div className="break-words text-slate-700">
            {error.message || "Aplikasi mengalami kendala saat memproses permintaan."}
          </div>
        </div>

        {/* Diagnostic Guide if likely environment / database issue */}
        {isDbOrEnvError && (
          <div className="mb-6 p-4 rounded-2xl border border-amber-200 bg-amber-50/70 text-xs space-y-2">
            <div className="font-semibold text-amber-900 flex items-center gap-1.5">
              <Key className="w-4 h-4 text-amber-700" /> Diagnostik Konfigurasi Server:
            </div>
            <ul className="list-disc list-inside space-y-1 text-amber-800">
              <li>
                Pastikan <code className="bg-amber-100/80 px-1 rounded font-bold">DATABASE_URL</code> dan kredensial database terhubung.
              </li>
              <li>
                Pastikan <code className="bg-amber-100/80 px-1 rounded font-bold">JWT_SECRET</code> telah disetel di Environment Variables.
              </li>
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="flex-1 py-3 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" /> Coba Muat Ulang
          </button>
          <Link
            href="/"
            className="flex-1 py-3 px-5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm border border-slate-200 shadow-sm transition-all flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" /> Kembali ke Beranda
          </Link>
        </div>
      </div>
      
      {/* Footer Info */}
      <div className="mt-8 text-center text-xs font-medium text-slate-400">
        WastePay • Dinas UPS HERU Kota Depok
      </div>
    </div>
  );
}
