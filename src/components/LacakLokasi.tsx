"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Profil = {
  id: number;
  nama: string;
  jabatan: string | null;
  wilayahId: number | null;
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
    <div className="panel p-4 flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <span className="w-10 h-10 rounded-full bg-vest/10 flex items-center justify-center text-vest font-semibold text-xs shrink-0">
          {profil.nama.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-bone truncate">{profil.nama}</p>
          <p className="text-[11px] text-bone-faint font-mono">
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
              className="input !w-auto text-sm py-2"
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
            <span className="font-mono text-[11px] text-amber shrink-0">
              🚛 {kendaraanTerpilih.nama}
              {kendaraanTerpilih.platNomor ? ` · ${kendaraanTerpilih.platNomor}` : ""}
            </span>
          )}
          <button
            onClick={lacak ? hentikan : mulai}
            className={`chamfer-sm px-4 py-2.5 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
              lacak
                ? "bg-danger text-white hover:bg-danger/80"
                : "bg-vest text-asphalt-deep hover:bg-vest-bright"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${lacak ? "bg-white animate-pulse" : "bg-asphalt-deep/60"}`} />
            {lacak ? "Hentikan Lacak" : "Mulai Lacak GPS"}
          </button>
          <div className="font-mono text-[11px] text-bone-dim">
            {lacak ? (
              <>
                <span className="text-vest">● LIVE {fmtDurasi()}</span>
                {titik && (
                  <span className="ml-2 block sm:inline">
                    {titik.lat.toFixed(5)}, {titik.lng.toFixed(5)} · ±{Math.round(titik.akurasi)}m
                  </span>
                )}
                <span className="block text-[10px] text-bone-faint">
                  Posisi dikirim tiap 10 dtk · layar dijaga tetap menyala (wake lock)
                </span>
              </>
            ) : (
              <span className="text-bone-faint">{status || "Aktifkan GPS agar posisi terlihat di peta"}</span>
            )}
          </div>
        </>
      ) : (
        <p className="text-xs text-bone-faint font-mono">
          Jabatan ini tidak punya tugas angkut — posisi tidak dikirim.
        </p>
      )}
    </div>
  );
}
