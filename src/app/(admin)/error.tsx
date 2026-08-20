"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin Page Error:", error);
  }, [error]);

  return (
    <div className="p-6 md:p-10 bg-white border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-red-500 text-white border-2 border-black flex items-center justify-center font-bold">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-red-600">
            Error Modul Admin
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight">
            Gagal Memuat Halaman Ini
          </h2>
        </div>
      </div>

      <div className="bg-neutral-100 border-2 border-black p-4 mb-6 font-mono text-xs space-y-2">
        {error.digest && (
          <div className="flex justify-between border-b border-neutral-300 pb-2">
            <span className="text-neutral-500 font-bold uppercase">Kode Error:</span>
            <span className="font-bold text-red-600 bg-white px-2 py-0.5 border border-black">
              {error.digest}
            </span>
          </div>
        )}
        <div className="text-neutral-800 break-words">
          {error.message || "Terjadi kendala saat mengambil data modul dari server."}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => reset()}
          className="hm-btn-red py-2.5 px-6 text-xs flex items-center justify-center gap-2 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" /> Coba Lagi
        </button>
      </div>
    </div>
  );
}
