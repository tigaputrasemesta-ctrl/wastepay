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
      <body className="min-h-screen bg-[#f4f4f0] text-black font-sans flex flex-col items-center justify-center p-6 m-0">
        <div className="max-w-lg w-full bg-white border-4 border-black p-8 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-red-600 text-white border-2 border-black flex items-center justify-center font-black">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-widest text-red-600">
                Critical Error
              </div>
              <h1 className="text-2xl font-black uppercase tracking-tight">
                Sistem Terhenti
              </h1>
            </div>
          </div>

          <div className="bg-neutral-100 border-2 border-black p-4 mb-6 font-mono text-xs space-y-2">
            {error.digest && (
              <div className="flex justify-between border-b border-neutral-300 pb-2">
                <span className="text-neutral-500 font-bold">DIGEST:</span>
                <span className="font-bold text-red-600 bg-white px-2 py-0.5 border border-black">
                  {error.digest}
                </span>
              </div>
            )}
            <div className="break-words text-neutral-800">
              {error.message || "Aplikasi mengalami kegagalan pada layout utama."}
            </div>
          </div>

          <button
            onClick={() => reset()}
            className="w-full inline-block px-8 py-3 bg-red-600 text-white border-2 border-black font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors text-center cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 inline-block mr-2" /> Muat Ulang Aplikasi
          </button>
        </div>
      </body>
    </html>
  );
}
