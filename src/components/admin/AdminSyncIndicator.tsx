"use client";

import { useState } from "react";
import { useOfflineSync } from "@/lib/use-offline-sync";
import {
  HardDriveDownload,
  RefreshCw,
  Wifi,
  WifiOff,
  CheckCircle2,
  Trash2,
  Database,
  X,
} from "lucide-react";

export default function AdminSyncIndicator() {
  const [modalOpen, setModalOpen] = useState(false);
  const {
    isOnline,
    isSyncing,
    lastSync,
    totalPelanggan,
    isOfflineReady,
    lastMessage,
    downloadMaster,
    syncDelta,
    clearCache,
  } = useOfflineSync();

  const formatLastSync = (isoString: string | null) => {
    if (!isoString) return "Belum pernah sinkron";
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <>
      {/* ── Compact Badge di Topbar ── */}
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all border shadow-sm ${
          !isOnline
            ? "bg-amber-50 text-amber-800 border-amber-300"
            : isOfflineReady
            ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
            : "bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100"
        }`}
        title="Penyimpanan Data Lokal di HP"
      >
        {isSyncing ? (
          <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin shrink-0" />
        ) : !isOnline ? (
          <WifiOff className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        ) : isOfflineReady ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        ) : (
          <HardDriveDownload className="w-3.5 h-3.5 text-blue-600 shrink-0" />
        )}

        <span className="hidden sm:inline">
          {isSyncing
            ? "Sinkron..."
            : !isOnline
            ? "Offline (HP)"
            : isOfflineReady
            ? `HP Sync (${totalPelanggan})`
            : "Simpan ke HP"}
        </span>
        <span className="sm:hidden text-[10px]">
          {isSyncing ? "Sync" : isOfflineReady ? "HP" : "Cache"}
        </span>
      </button>

      {/* ── Modal Pengaturan Offline & Sinkronisasi ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden text-slate-800">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Penyimpanan Data di HP (Offline)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Akses cepat 0 detik tanpa tarik ulang Supabase
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs">
              {/* Status Ringkasan */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] text-slate-500 font-medium block">
                    Koneksi Server
                  </span>
                  <div className="flex items-center gap-1.5 mt-1 font-bold">
                    {isOnline ? (
                      <>
                        <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Online</span>
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                        <span className="text-amber-700">Offline</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] text-slate-500 font-medium block">
                    Tersimpan di Memori HP
                  </span>
                  <div className="flex items-center gap-1.5 mt-1 font-bold text-slate-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{totalPelanggan} Pelanggan</span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 font-medium block">
                    Terakhir Sinkronisasi
                  </span>
                  <span className="font-semibold text-slate-700">
                    {formatLastSync(lastSync)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 font-medium block">
                    Metode Update
                  </span>
                  <span className="font-semibold text-emerald-700">
                    Delta Sync (Otomatis)
                  </span>
                </div>
              </div>

              {/* Status Message */}
              {lastMessage && (
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-medium">
                  {lastMessage}
                </div>
              )}

              {/* Tombol Aksi */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  disabled={isSyncing || !isOnline}
                  onClick={syncDelta}
                  className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-sm"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`}
                  />
                  <span>
                    {isSyncing ? "Sedang Menyinkronkan..." : "Sinkron Perubahan Baru (Delta)"}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={isSyncing || !isOnline}
                  onClick={downloadMaster}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  <HardDriveDownload className="w-4 h-4 text-slate-600" />
                  <span>Unduh Ulang Seluruh Data Master</span>
                </button>

                {isOfflineReady && (
                  <button
                    type="button"
                    disabled={isSyncing}
                    onClick={clearCache}
                    className="w-full py-2 px-3 rounded-xl text-red-600 hover:bg-red-50 text-[11px] font-medium flex items-center justify-center gap-1.5 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Bersihkan Cache Memori HP</span>
                  </button>
                )}
              </div>
            </div>

            {/* Modal Footer Note */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-500 leading-relaxed">
              💡 <b>Tips</b>: Data yang tersimpan di HP memungkinkan Admin mencari pelanggan & memeriksa data tanpa koneksi internet serta hemat kuota 99%.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
