"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getOfflineSyncStatus,
  runFullDownload,
  runDeltaSync,
  clearOfflineStorage,
} from "./offline-storage";

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [totalPelanggan, setTotalPelanggan] = useState<number>(0);
  const [isOfflineReady, setIsOfflineReady] = useState<boolean>(false);
  const [lastMessage, setLastMessage] = useState<string>("");

  const refreshStatus = useCallback(async () => {
    const status = await getOfflineSyncStatus();
    setLastSync(status.lastSync);
    setTotalPelanggan(status.totalPelanggan);
    setIsOfflineReady(status.isOfflineReady);
  }, []);

  // Monitor status online / offline
  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      // Auto delta sync saat koneksi tersambung kembali
      runDeltaSync().then((res) => {
        if (res.ok && res.hasChanges) {
          refreshStatus();
        }
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    refreshStatus();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [refreshStatus]);

  // Periodic background delta sync (setiap 2 menit jika online & tab aktif)
  const isSyncingRef = useRef(false);
  useEffect(() => {
    if (typeof window === "undefined") return;

    const interval = setInterval(async () => {
      if (document.hidden || !navigator.onLine || isSyncingRef.current) return;
      isSyncingRef.current = true;
      try {
        const res = await runDeltaSync();
        if (res.ok && res.hasChanges) {
          await refreshStatus();
        }
      } catch (e) {
        console.warn("[useOfflineSync] Background delta sync error:", e);
      } finally {
        isSyncingRef.current = false;
      }
    }, 120_000); // 2 menit

    return () => clearInterval(interval);
  }, [refreshStatus]);

  // Manual Trigger: Unduh Data Master Penuh
  const handleDownloadMaster = useCallback(async () => {
    setIsSyncing(true);
    setLastMessage("Mengunduh data master...");
    try {
      const res = await runFullDownload();
      if (res.ok) {
        await refreshStatus();
        setLastMessage(`Berhasil menyimpan ${res.count} pelanggan di HP!`);
      } else {
        setLastMessage(res.error || "Gagal mengunduh data master");
      }
      return res;
    } finally {
      setIsSyncing(false);
    }
  }, [refreshStatus]);

  // Manual Trigger: Sinkronisasi Delta Cepat
  const handleSyncDelta = useCallback(async () => {
    setIsSyncing(true);
    setLastMessage("Memeriksa pembaruan...");
    try {
      const res = await runDeltaSync();
      if (res.ok) {
        await refreshStatus();
        setLastMessage(
          res.hasChanges
            ? `Berhasil sinkron ${res.totalChanges} pembaruan!`
            : "Data sudah terbaru (tidak ada perubahan)."
        );
      } else {
        setLastMessage(res.error || "Gagal sinkronisasi");
      }
      return res;
    } finally {
      setIsSyncing(false);
    }
  }, [refreshStatus]);

  // Manual Trigger: Bersihkan Cache HP
  const handleClearCache = useCallback(async () => {
    await clearOfflineStorage();
    await refreshStatus();
    setLastMessage("Cache offline di HP berhasil dibersihkan.");
  }, [refreshStatus]);

  return {
    isOnline,
    isSyncing,
    lastSync,
    totalPelanggan,
    isOfflineReady,
    lastMessage,
    refreshStatus,
    downloadMaster: handleDownloadMaster,
    syncDelta: handleSyncDelta,
    clearCache: handleClearCache,
  };
}
