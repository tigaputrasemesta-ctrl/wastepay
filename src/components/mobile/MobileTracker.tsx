"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";

const INTERVAL_KIRIM = 10000; // 10 detik
const KEY_KENDARAAN = "o2w_kendaraan_id";

type KendaraanOpt = {
  id: number;
  nama: string;
  platNomor: string | null;
  jenis: string;
  petugas?: { id: number; nama: string } | null;
};

/**
 * GPS selalu aktif (auto-start saat aplikasi terbuka, di semua halaman /m).
 * - Native (@capacitor/geolocation) bila APK sudah memuat plugin → lebih stabil
 * - Fallback ke navigator.geolocation di web / APK lama
 * Posisi dikirim tiap 10 detik ke /api/petugas/lokasi (+ /api/kendaraan/lokasi
 * bila ada kendaraan terpilih) sehingga selalu terlihat di peta admin.
 */
export default function MobileTracker() {
  const [kendaraan, setKendaraan] = useState<KendaraanOpt[]>([]);
  const [kendaraanId, setKendaraanId] = useState("");
  const [titik, setTitik] = useState<{ lat: number; lng: number; akurasi: number } | null>(null);
  const [status, setStatus] = useState("Menyiapkan GPS…");

  const posRef = useRef<{ lat: number; lng: number; akurasi: number } | null>(null);
  const kendaraanIdRef = useRef("");
  const kirimRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchRef = useRef<string | number | null>(null);

  const kirimLokasi = useCallback(async () => {
    const p = posRef.current;
    if (!p) return;
    try {
      await fetch("/api/petugas/lokasi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude: p.lat, longitude: p.lng, akurasi: p.akurasi, sumber: "gps_perangkat" }),
      });
      const kid = kendaraanIdRef.current;
      if (kid) {
        await fetch("/api/kendaraan/lokasi", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kendaraanId: kid, latitude: p.lat, longitude: p.lng, akurasi: p.akurasi, sumber: "gps_perangkat" }),
        });
      }
    } catch {
      // coba lagi di interval berikutnya
    }
  }, []);

  useEffect(() => {
    // Muat kendaraan milik petugas ini + restore pilihan dari localStorage
    (async () => {
      try {
        const [pRes, kRes] = await Promise.all([fetch("/api/petugas/me"), fetch("/api/kendaraan")]);
        const profil = pRes.ok ? await pRes.json() : null;
        const semua: KendaraanOpt[] = kRes.ok ? await kRes.json() : [];
        const milikSaya = semua.filter((k) => k.petugas?.id === profil?.id);
        setKendaraan(milikSaya);
        const saved = typeof localStorage !== "undefined" ? localStorage.getItem(KEY_KENDARAAN) : null;
        const pilih = milikSaya.find((k) => k.id.toString() === saved) ?? milikSaya[0];
        if (pilih) {
          setKendaraanId(pilih.id.toString());
          kendaraanIdRef.current = pilih.id.toString();
        }
      } catch {
        // gagal muat kendaraan → tetap lacak posisi petugas saja
      }
    })();

    let stopped = false;

    const simpan = (lat: number, lng: number, akurasi: number) => {
      const p = { lat, lng, akurasi };
      posRef.current = p;
      setTitik(p);
      setStatus(`GPS aktif ±${Math.round(akurasi)} m`);
      void kirimLokasi();
    };

    const pakaiWeb = () => {
      if (!("geolocation" in navigator)) {
        setStatus("Perangkat tidak mendukung GPS");
        return;
      }
      const id = navigator.geolocation.watchPosition(
        (pos) => simpan(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy),
        () => setStatus("GPS tidak bisa diakses — cek izin lokasi"),
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
      );
      watchRef.current = id;
    };

    const mulai = async () => {
      const pakaiNative = Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("Geolocation");
      if (pakaiNative) {
        try {
          let perm = await Geolocation.checkPermissions();
          if (perm.location !== "granted") {
            perm = await Geolocation.requestPermissions();
          }
          if (perm.location !== "granted") {
            setStatus("Izin lokasi ditolak — aktifkan di pengaturan");
            return;
          }
          const id = await Geolocation.watchPosition(
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000, minimumUpdateInterval: 5000 },
            (pos, err) => {
              if (stopped) return;
              if (err) {
                setStatus("GPS belum tersedia…");
                return;
              }
              if (pos) simpan(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
            }
          );
          watchRef.current = id;
        } catch {
          // plugin gagal / layanan lokasi mati → fallback ke web geolocation
          if (!stopped) pakaiWeb();
        }
      } else {
        pakaiWeb();
      }
      kirimRef.current = setInterval(kirimLokasi, INTERVAL_KIRIM);
    };

    void mulai();

    return () => {
      stopped = true;
      if (watchRef.current != null) {
        if (typeof watchRef.current === "string") {
          Geolocation.clearWatch({ id: watchRef.current }).catch(() => {});
        } else if ("geolocation" in navigator) {
          navigator.geolocation.clearWatch(watchRef.current);
        }
      }
      if (kirimRef.current) clearInterval(kirimRef.current);
    };
  }, [kirimLokasi]);

  const kendaraanTerpilih = kendaraan.find((k) => k.id.toString() === kendaraanId);

  return (
    <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-sm mx-3 my-2 overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3.5 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-2 h-2 rounded-full shrink-0 ${titik ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
          <span className="text-xs font-bold tracking-wide shrink-0">GPS Live</span>
          {titik && (
            <span className="font-mono text-[10px] text-emerald-300 truncate">
              {titik.lat.toFixed(5)}, {titik.lng.toFixed(5)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {kendaraan.length > 0 && (
            <select
              value={kendaraanId}
              onChange={(e) => {
                setKendaraanId(e.target.value);
                kendaraanIdRef.current = e.target.value;
                try {
                  localStorage.setItem(KEY_KENDARAAN, e.target.value);
                } catch {
                  // ignore
                }
              }}
              className="bg-slate-800 text-white border border-slate-700 rounded-lg text-xs font-medium px-2 py-1 max-w-[130px] outline-none"
              title="Kendaraan"
            >
              <option value="">— Kendaraan —</option>
              {kendaraan.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.jenis === "dump_truck" ? "🚛" : k.jenis === "pickup" ? "🛺" : "🛞"} {k.nama}
                </option>
              ))}
            </select>
          )}
          {kendaraanTerpilih && (
            <span className="text-[10px] font-medium text-amber-300 hidden sm:inline">
              {kendaraanTerpilih.nama}
            </span>
          )}
          <span className="text-[10px] text-slate-400 truncate">{status}</span>
        </div>
      </div>
    </div>
  );
}
