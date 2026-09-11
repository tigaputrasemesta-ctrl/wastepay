"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Capacitor, CapacitorHttp, registerPlugin } from "@capacitor/core";
import type { BackgroundGeolocationPlugin } from "@capacitor-community/background-geolocation";

const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>(
  "BackgroundGeolocation"
);

/**
 * Background GPS — tetap mengirim posisi walau aplikasi di-background / layar
 * terkunci (Android). Berjalan lewat service foreground native, lalu kirim
 * posisi via CapacitorHttp (HTTP native) supaya tidak di-throttle Android.
 *
 * Catatan penting (Android):
 * - Android 8+ WAJIB menampilkan notifikasi kecil saat GPS background aktif
 *   (tidak bisa 100% diam). Channel dibuat senyap (tanpa suara/getar).
 * - Untuk hasil terbaik, izin lokasi harus "Sepanjang waktu" (Allow all the
 *   time). Kalau belum, tampilkan tombol buka pengaturan.
 */
export default function BackgroundTracker() {
  const [status, setStatus] = useState("Menyiapkan background GPS…");
  const [perluIzin, setPerluIzin] = useState(false);
  const watcherIdRef = useRef<string | null>(null);

  const kirim = useCallback(async (token: string, lat: number, lng: number, akurasi: number) => {
    try {
      const base = window.location.origin;
      await CapacitorHttp.post({
        url: `${base}/api/mobile/tracking`,
        headers: {
          "Content-Type": "application/json",
          "x-tracking-token": token,
        },
        data: JSON.stringify({
          latitude: lat,
          longitude: lng,
          akurasi,
          sumber: "background",
        }),
      });
    } catch {
      // coba lagi di update lokasi berikutnya
    }
  }, []);

  useEffect(() => {
    const tersedia =
      Capacitor.isNativePlatform() &&
      Capacitor.isPluginAvailable("BackgroundGeolocation");

    if (!tersedia) {
      setStatus("Background GPS nonaktif (butuh APK terbaru)");
      return;
    }

    let cancelled = false;

    (async () => {
      // 1) Ambil token tracking (session webview, saat app masih foreground)
      let token = "";
      try {
        const r = await fetch("/api/mobile/tracking-token", { method: "POST" });
        if (!r.ok) {
          setStatus("Gagal ambil token tracking");
          return;
        }
        token = (await r.json()).token;
      } catch {
        setStatus("Gagal ambil token tracking");
        return;
      }

      // 2) Mulai watcher background
      try {
        const id = await BackgroundGeolocation.addWatcher(
          {
            backgroundTitle: "UPS HERU Lapangan",
            backgroundMessage: "GPS aktif untuk pemantauan armada",
            requestPermissions: true,
            distanceFilter: 50, // kirim ulang bila pindah ≥ 50 m (hemat baterai/data)
            stale: false,
          },
          (location, error) => {
            if (cancelled) return;
            if (error) {
              setStatus("Perlu izin lokasi");
              setPerluIzin(true);
              return;
            }
            if (location && token) {
              setPerluIzin(false);
              setStatus("Background GPS aktif");
              void kirim(token, location.latitude, location.longitude, location.accuracy);
            }
          }
        );
        watcherIdRef.current = id;
        setStatus("Background GPS aktif");
      } catch {
        setStatus("Gagal mulai background GPS");
        setPerluIzin(true);
      }
    })();

    return () => {
      cancelled = true;
      const id = watcherIdRef.current;
      if (id) {
        BackgroundGeolocation.removeWatcher({ id }).catch(() => {});
        watcherIdRef.current = null;
      }
    };
  }, [kirim]);

  return (
    <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2 flex items-center justify-between gap-2 mx-3 my-1 shadow-2xs">
      <div className="flex items-center gap-2 min-w-0">
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${
            status === "Background GPS aktif" ? "bg-emerald-500 animate-pulse" : "bg-amber-400"
          }`}
        />
        <span className="text-[10px] font-bold tracking-wider text-slate-700 shrink-0">
          BG GPS
        </span>
        <span className="text-[10px] font-medium text-slate-500 truncate">{status}</span>
      </div>
      {perluIzin && (
        <button
          type="button"
          onClick={() => BackgroundGeolocation.openSettings().catch(() => {})}
          className="shrink-0 px-2.5 py-1 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg text-[10px] font-semibold text-amber-800 transition-colors"
        >
          Buka Pengaturan
        </button>
      )}
    </div>
  );
}
