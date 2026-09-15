"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Profil = {
  id: number;
  nama: string;
  jabatan: string | null;
};

type KendaraanOpt = {
  id: number;
  nama: string;
  platNomor: string | null;
  jenis: string;
};

const INTERVAL_KIRIM = 10000; // kirim posisi tiap 10 detik
const INTERVAL_FALLBACK = 30000; // cadangan: getCurrentPosition tiap 30 detik

/**
 * Tombol "Mulai Lacak" untuk petugas angkut.
 * Saat aktif:
 *  - Wake Lock → layar tetap menyala (GPS browser berhenti saat layar mati)
 *  - watchPosition GPS akurasi tinggi → posisi dikirim tiap 10 detik
 *  - fallback getCurrentPosition tiap 30 detik (jaga-jaga watchPosition idle)
 *  → posisi truk (petugas + kendaraan terpilih) terlihat realtime di peta
 */
export default function LacakLokasi({
  profil,
  kendaraan = [],
}: {
  profil: Profil;
  kendaraan?: KendaraanOpt[];
}) {
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
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const posRef = useRef<{ lat: number; lng: number; akurasi: number } | null>(null);
  const kendaraanIdRef = useRef<string>("");

  const kirimLokasi = useCallback(async () => {
    const p = posRef.current;
    if (!p) return;
    try {
      await fetch("/api/petugas/lokasi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude: p.lat, longitude: p.lng, akurasi: p.akurasi, sumber: "gps_perangkat" }),
      });
      // Kalau mengemudi kendaraan → posisi kendaraan ikut terkirim (dump truck / pickup)
      const kid = kendaraanIdRef.current;
      if (kid) {
        await fetch("/api/kendaraan/lokasi", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kendaraanId: kid, latitude: p.lat, longitude: p.lng, akurasi: p.akurasi, sumber: "gps_perangkat" }),
        });
      }
    } catch {
      // diam — coba lagi di interval berikutnya
    }
  }, []);

  /** Wake Lock: cegah layar mati selama melacak (penting utk truk berjalan lama). */
  const aktifkanWakeLock = useCallback(async () => {
    try {
      const wl = navigator as Navigator & { wakeLock?: { request: (t: string) => Promise<WakeLockSentinel> } };
      if (wl.wakeLock) {
        wakeLockRef.current = await wl.wakeLock.request("screen");
      }
    } catch {
      // browser tidak mendukung wake lock — layar bisa mati, fallback GPS tetap jalan
    }
  }, []);

  const mulai = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setStatus("Perangkat tidak mendukung GPS");
      return;
    }
    // Kendaraan opsional: tanpa kendaraan ter-pilih, tetap lacak posisi petugas.
    // (Petugas angkut yang belum punya kendaraan ter-asign tetap bisa terlihat di peta.)
    setStatus(
      kendaraan.length > 0 && !kendaraanIdRef.current
        ? "Tanpa kendaraan — posisi petugas saja. Pilih kendaraan bila perlu."
        : "Mencari sinyal GPS…"
    );
    setDurasi(0);

    const simpan = (pos: GeolocationPosition) => {
      const p = { lat: pos.coords.latitude, lng: pos.coords.longitude, akurasi: pos.coords.accuracy };
      posRef.current = p;
      setTitik(p);
      setStatus(`Sinyal OK — akurasi ${Math.round(p.akurasi)} m`);
      kirimLokasi();
    };

    watchId.current = navigator.geolocation.watchPosition(
      simpan,
      () => setStatus("GPS tidak bisa diakses — periksa izin lokasi & pastikan GPS aktif"),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );

    // Cadangan: sebagian browser menghentikan watchPosition saat tidak ada pergerakan/layar redup
    fallbackRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(simpan, () => {}, {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 10000,
      });
    }, INTERVAL_FALLBACK);

    kirimRef.current = setInterval(kirimLokasi, INTERVAL_KIRIM);
    durasiRef.current = setInterval(() => setDurasi((d) => d + 1), 1000);
    aktifkanWakeLock();
    setLacak(true);
  }, [kirimLokasi, aktifkanWakeLock, kendaraan.length]);

  const hentikan = useCallback(async () => {
    if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
    if (kirimRef.current) clearInterval(kirimRef.current);
    if (fallbackRef.current) clearInterval(fallbackRef.current);
    if (durasiRef.current) clearInterval(durasiRef.current);
    try {
      await wakeLockRef.current?.release();
    } catch {
      // ignore
    }
    watchId.current = null;
    kirimRef.current = null;
    fallbackRef.current = null;
    durasiRef.current = null;
    wakeLockRef.current = null;
    posRef.current = null;
    setLacak(false);
    setTitik(null);
    setDurasi(0);
    kendaraanIdRef.current = "";
    setStatus("Pelacakan dihentikan");
  }, []);

  // Kalau tab kembali aktif, minta ulang wake lock (browser melepasnya saat tab di-minimize)
  useEffect(() => {
    if (!lacak) return;
    const onVis = () => {
      if (document.visibilityState === "visible") aktifkanWakeLock();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [lacak, aktifkanWakeLock]);

  useEffect(() => {
    return () => {
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
      if (kirimRef.current) clearInterval(kirimRef.current);
      if (fallbackRef.current) clearInterval(fallbackRef.current);
      if (durasiRef.current) clearInterval(durasiRef.current);
      wakeLockRef.current?.release().catch(() => {});
    };
  }, []);

  const jabat = (profil.jabatan || "").split(",").filter(Boolean);
  const bolehAngkut = jabat.includes("angkut");

  const fmtDurasi = () => {
    const m = Math.floor(durasi / 60);
    const s = durasi % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <span className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800 font-bold text-xs shrink-0">
          {profil.nama.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{profil.nama}</p>
          <p className="text-xs text-slate-500 font-medium">
            {jabat.map((j) => j.toUpperCase()).join(" · ") || "PETUGAS"}
          </p>
        </div>
      </div>

      {bolehAngkut ? (
        <>
          {!lacak && kendaraan.length > 0 && (
            <select
              value={kendaraanId}
              onChange={(e) => {
                setKendaraanId(e.target.value);
                kendaraanIdRef.current = e.target.value;
              }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              <option value="">— Pilih kendaraan yang dikendarai —</option>
              {kendaraan.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.jenis === "dump_truck" ? "🚛" : k.jenis === "pickup" ? "🛺" : "🛞"} {k.nama}
                  {k.platNomor ? ` · ${k.platNomor}` : ""}
                </option>
              ))}
            </select>
          )}
          {lacak && kendaraanTerpilih && (
            <span className="text-xs text-amber-700 font-semibold shrink-0">
              🚛 {kendaraanTerpilih.nama}
              {kendaraanTerpilih.platNomor ? ` · ${kendaraanTerpilih.platNomor}` : ""}
            </span>
          )}
          <button
            onClick={lacak ? hentikan : mulai}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 ${
              lacak
                ? "bg-rose-600 hover:bg-rose-500 text-white active:scale-95"
                : "bg-emerald-700 hover:bg-emerald-800 text-white active:scale-95"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${lacak ? "bg-white animate-pulse" : "bg-white/80"}`} />
            {lacak ? "Hentikan Lacak" : "Mulai Lacak GPS"}
          </button>
          <div className="text-xs text-slate-500 font-medium">
            {lacak ? (
              <>
                <span className="text-emerald-700 font-bold">● LIVE {fmtDurasi()}</span>
                {titik && (
                  <span className="ml-2 block sm:inline font-mono text-[11px]">
                    {titik.lat.toFixed(5)}, {titik.lng.toFixed(5)} · ±{Math.round(titik.akurasi)}m
                  </span>
                )}
                <span className="block text-[11px] text-slate-400 mt-0.5">
                  Posisi dikirim tiap 10 dtk · layar dijaga tetap menyala (wake lock)
                </span>
              </>
            ) : (
              <span>{status || "Aktifkan GPS agar posisi terlihat di peta"}</span>
            )}
          </div>
        </>
      ) : (
        <p className="text-xs text-slate-400">
          Jabatan ini tidak punya tugas angkut — posisi tidak dikirim.
        </p>
      )}
    </div>
  );
}
