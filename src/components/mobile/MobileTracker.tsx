"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type KendaraanOpt = {
  id: number;
  nama: string;
  platNomor: string | null;
  jenis: string;
};

const INTERVAL_KIRIM = 10000; // 10 detik
const INTERVAL_FALLBACK = 30000; // 30 detik

export default function MobileTracker({ kendaraan = [] }: { kendaraan?: KendaraanOpt[] }) {
  const [lacak, setLacak] = useState(false);
  const [kendaraanId, setKendaraanId] = useState("");
  const [status, setStatus] = useState("");
  const [titik, setTitik] = useState<{ lat: number; lng: number; akurasi: number } | null>(null);
  const [durasi, setDurasi] = useState(0);
  const kendaraanTerpilih = kendaraan.find((k) => k.id.toString() === kendaraanId);

  const watchId = useRef<number | null>(null);
  const kirimRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fallbackRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const durasiRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const posRef = useRef<{ lat: number; lng: number; akurasi: number } | null>(null);
  const kendaraanIdRef = useRef("");

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

  const mulai = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setStatus("Perangkat tidak mendukung GPS");
      return;
    }
    setStatus("Mencari sinyal GPS…");
    setDurasi(0);

    const simpan = (pos: GeolocationPosition) => {
      const p = { lat: pos.coords.latitude, lng: pos.coords.longitude, akurasi: pos.coords.accuracy };
      posRef.current = p;
      setTitik(p);
      setStatus(`Sinyal OK — ±${Math.round(p.akurasi)} m`);
      kirimLokasi();
    };

    watchId.current = navigator.geolocation.watchPosition(
      simpan,
      () => setStatus("GPS tidak bisa diakses — periksa izin lokasi"),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );

    fallbackRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(simpan, () => {}, {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 10000,
      });
    }, INTERVAL_FALLBACK);

    kirimRef.current = setInterval(kirimLokasi, INTERVAL_KIRIM);
    durasiRef.current = setInterval(() => setDurasi((d) => d + 1), 1000);
    setLacak(true);
  }, [kirimLokasi]);

  const hentikan = useCallback(() => {
    if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
    if (kirimRef.current) clearInterval(kirimRef.current);
    if (fallbackRef.current) clearInterval(fallbackRef.current);
    if (durasiRef.current) clearInterval(durasiRef.current);
    watchId.current = null;
    kirimRef.current = null;
    fallbackRef.current = null;
    durasiRef.current = null;
    posRef.current = null;
    setLacak(false);
    setTitik(null);
    setDurasi(0);
    setStatus("Pelacakan dihentikan");
  }, []);

  useEffect(() => {
    return () => {
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
      if (kirimRef.current) clearInterval(kirimRef.current);
      if (fallbackRef.current) clearInterval(fallbackRef.current);
      if (durasiRef.current) clearInterval(durasiRef.current);
    };
  }, []);

  const fmtDurasi = () => {
    const m = Math.floor(durasi / 60);
    const s = durasi % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className="bg-white border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-black uppercase tracking-tight">Live Tracking GPS</p>
          <p className="text-[11px] font-bold text-gray-500">
            Posisi dikirim tiap 10 dtk → terlihat di peta admin
          </p>
        </div>
        <span className={`px-2 py-1 text-[10px] font-black uppercase border-2 border-black ${lacak ? "bg-green-600 text-white" : "bg-gray-200 text-gray-600"}`}>
          {lacak ? "● LIVE" : "○ OFF"}
        </span>
      </div>

      {kendaraan.length > 0 && !lacak && (
        <select
          value={kendaraanId}
          onChange={(e) => {
            setKendaraanId(e.target.value);
            kendaraanIdRef.current = e.target.value;
          }}
          className="w-full px-3 py-3 border-2 border-black bg-white text-sm font-bold outline-none"
        >
          <option value="">— Kendaraan (opsional) —</option>
          {kendaraan.map((k) => (
            <option key={k.id} value={k.id}>
              {k.jenis === "dump_truck" ? "🚛" : k.jenis === "pickup" ? "🛺" : "🛞"} {k.nama}
              {k.platNomor ? ` · ${k.platNomor}` : ""}
            </option>
          ))}
        </select>
      )}

      {lacak && kendaraanTerpilih && (
        <p className="text-[11px] font-mono font-bold text-amber-600">
          🚛 {kendaraanTerpilih.nama}
          {kendaraanTerpilih.platNomor ? ` · ${kendaraanTerpilih.platNomor}` : ""}
        </p>
      )}

      <button
        onClick={lacak ? hentikan : mulai}
        className={`w-full py-4 border-2 border-black text-sm font-black uppercase tracking-widest shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition ${
          lacak ? "bg-red-600 text-white" : "bg-green-600 text-white"
        }`}
      >
        {lacak ? "■ Hentikan Lacak" : "▶ Mulai Lacak GPS"}
      </button>

      {lacak && (
        <div className="font-mono text-[11px] font-bold text-gray-700 space-y-0.5">
          <p className="text-green-700">● LIVE {fmtDurasi()}</p>
          {titik && (
            <p>
              {titik.lat.toFixed(5)}, {titik.lng.toFixed(5)} · ±{Math.round(titik.akurasi)}m
            </p>
          )}
          <p className="text-gray-400">{status}</p>
        </div>
      )}
    </div>
  );
}
