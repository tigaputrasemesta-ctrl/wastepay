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
  const msg = (error?.message || "").toLowerCase();
  const name = error?.name || "";
  const isChunkError =
    msg.includes("failed to load chunk") ||
    msg.includes("loading chunk") ||
    msg.includes("chunkloaderror") ||
    msg.includes("failed to fetch dynamically imported module") ||
    msg.includes("dynamically imported module") ||
    msg.includes("importing a module script failed") ||
    msg.includes("error loading dynamically imported module") ||
    msg.includes("loading css chunk") ||
    msg.includes("failed to load resource") ||
    msg.includes("load failed") ||
    name === "ChunkLoadError";

  useEffect(() => {
    console.error("Admin Page Error:", error);
    if (isChunkError && typeof window !== "undefined") {
      const now = Date.now();
      const lastReload = Number(sessionStorage.getItem("admin_chunk_reloaded_at") || "0");
      // Otomatis reload 1x jika terdeteksi mismatch chunk versi build baru (cooldown 10 detik)
      if (now - lastReload > 10000) {
        sessionStorage.setItem("admin_chunk_reloaded_at", String(now));
        window.location.reload();
      }
    }
  }, [error, isChunkError]);

  const handleRetry = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("admin_chunk_reloaded_at");
      window.location.reload();
      return;
    }
    reset();
  };

  return (
    <div className="p-6 md:p-8 bg-white rounded-3xl border border-slate-200/80 shadow-sm">
      <div className="flex items-center gap-3.5 mb-6">
        <div className="w-11 h-11 bg-rose-50 text-rose-600 border border-rose-200 rounded-2xl flex items-center justify-center font-bold shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-rose-600">
            {isChunkError ? "Pembaruan Versi Sistem" : "Error Modul Admin"}
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            {isChunkError ? "Versi Baru Tersedia" : "Gagal Memuat Halaman Ini"}
          </h2>
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6 font-mono text-xs space-y-2">
        {error.digest && (
          <div className="flex justify-between border-b border-slate-200 pb-2">
            <span className="text-slate-500 font-bold uppercase">Kode Error:</span>
            <span className="font-bold text-rose-600 bg-white px-2 py-0.5 rounded border border-slate-200">
              {error.digest}
            </span>
          </div>
        )}
        <div className="text-slate-700 break-words">
          {isChunkError
            ? "Aplikasi telah diperbarui ke versi baru di server. Silakan muat ulang untuk memperbarui cache."
            : error.message || "Terjadi kendala saat mengambil data modul dari server."}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleRetry}
          className="py-2.5 px-5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" /> {isChunkError ? "Perbarui & Muat Ulang" : "Coba Lagi"}
        </button>
      </div>
    </div>
  );
}
