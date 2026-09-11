"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global Layout Error:", error);
  }, [error]);

  return (
    <html lang="id">
      <body className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col items-center justify-center p-6 m-0 antialiased">
        <div className="max-w-lg w-full bg-white rounded-3xl border border-slate-200/80 p-8 shadow-2xl">
          <div className="flex items-center gap-3.5 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center font-bold shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-rose-600">
                Critical Error
              </div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Sistem Terhenti
              </h1>
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 mb-6 font-mono text-xs space-y-2">
            {error.digest && (
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-bold">DIGEST:</span>
                <span className="font-bold text-rose-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {error.digest}
                </span>
              </div>
            )}
            <div className="break-words text-slate-700">
              {error.message || "Aplikasi mengalami kegagalan pada layout utama."}
            </div>
          </div>

          <button
            onClick={() => reset()}
            className="w-full py-3.5 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-bold text-sm shadow-md active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 inline-block mr-1" /> Muat Ulang Aplikasi
          </button>
        </div>
      </body>
    </html>
  );
}
