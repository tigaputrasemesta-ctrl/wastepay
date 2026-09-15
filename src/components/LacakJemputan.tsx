"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  Navigation,
  Truck,
  Clock,
  MapPin,
  CheckCircle2,
  Search,
  RefreshCw,
  CircleOff,
  PackageOpen,
} from "lucide-react";
import { jarakMeter, formatJarak } from "@/lib/geo";

// Leaflet butuh window — muat client-side saja.
const MapJemput = dynamic(() => import("@/components/MapJemput"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-slate-50">
      <p className="font-bold text-xs uppercase tracking-wider text-emerald-700 animate-pulse">Memuat Peta…</p>
    </div>
  ),
});

type Titik = { latitude: number; longitude: number };
type LokasiLive = (Titik & { akurasi: number | null; updatedAt: string }) | null;

type JemputResponse = {
  ok: boolean;
  nama: string;
  kodePelanggan: string;
  alamat: string;
  rtRw: string | null;
  patokanLokasi: string | null;
  pickup: Titik | null;
  jadwal: { hari: string; jam: string | null; rute: string | null } | null;
  petugas: { nama: string; jabatan: string | null } | null;
  kendaraan: { id: number; nama: string; platNomor: string | null; jenis: string } | null;
  trukLokasi: LokasiLive;
  petugasLokasi: LokasiLive;
  statusPengangkutan: string | null;
};

// Estimasi kecepatan truk di dalam kota (±20 km/jam).
const KECEPATAN_MS = 5.56;

function formatRelatif(iso: string): string {
  const dt = Date.now() - new Date(iso).getTime();
  if (dt < 60000) return "baru saja";
  if (dt < 3600000) return `${Math.floor(dt / 60000)} menit lalu`;
  if (dt < 86400000) return `${Math.floor(dt / 3600000)} jam lalu`;
  return `${Math.floor(dt / 86400000)} hari lalu`;
}

// Posisi armada dianggap "live" hanya jika tidak lebih tua dari 30 menit.
const FRESH_MS = 30 * 60 * 1000;

function isFresh(iso: string | undefined): boolean {
  return !!iso && Date.now() - new Date(iso).getTime() < FRESH_MS;
}

function statusMeta(d: JemputResponse): {
  teks: string;
  subteks: string;
  tone: "proses" | "selesai" | "info";
} {
  if (d.statusPengangkutan === "diambil") {
    return {
      teks: "Sampah sudah diangkut",
      subteks: "Terima kasih! Sampah Anda sudah diambil hari ini.",
      tone: "selesai",
    };
  }
  if (d.statusPengangkutan === "tidak_diangkut") {
    return {
      teks: "Hari ini tidak diangkut",
      subteks: "Ada kendala di lapangan. Silakan laporkan bila perlu.",
      tone: "info",
    };
  }
  if (d.statusPengangkutan === "kosong") {
    return {
      teks: "Tidak ada sampah",
      subteks: "Petugas mencatat rumah Anda kosong hari ini.",
      tone: "info",
    };
  }

  const live = d.trukLokasi ?? d.petugasLokasi;
  if (live && d.pickup && isFresh(live.updatedAt)) {
    return {
      teks: "Armada menuju lokasi Anda",
      subteks: "Pantau posisi truk secara real-time di peta.",
      tone: "proses",
    };
  }
  if (d.jadwal) {
    return {
      teks: "Menunggu armada berangkat",
      subteks: `Jadwal angkut ${d.jadwal.hari}${d.jadwal.jam ? ` pukul ${d.jadwal.jam}` : ""}.`,
      tone: "info",
    };
  }
  return {
    teks: "Tidak ada jadwal hari ini",
    subteks: "Belum ada jadwal angkut untuk hari ini.",
    tone: "info",
  };
}

export default function LacakJemputan() {
  const [kode, setKode] = useState("");
  const [data, setData] = useState<JemputResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userPos, setUserPos] = useState<Titik | null>(null);
  const [locating, setLocating] = useState(false);
  const kodeRef = useRef("");

  const fetchLacak = useCallback(async (kodeAktif: string) => {
    if (!kodeAktif) return;
    try {
      const res = await fetch(`/api/publik/jemput?kode=${encodeURIComponent(kodeAktif)}`);
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.ok) {
        setData(d);
        setError("");
      } else {
        setError(d.error ?? "Gagal memuat data. Coba lagi.");
        setData(null);
      }
    } catch {
      setError("Koneksi bermasalah. Coba lagi nanti.");
    } finally {
      setLoading(false);
    }
  }, []);

  function mulaiLacak(e?: React.FormEvent) {
    e?.preventDefault();
    const k = kode.trim().toUpperCase();
    if (!k) {
      setError("Masukkan kode pelanggan terlebih dahulu.");
      return;
    }
    kodeRef.current = k;
    setLoading(true);
    setError("");
    fetchLacak(k);
  }

  // Polling posisi armada tiap 15 detik selama melacak.
  useEffect(() => {
    if (!data) return;
    const selesai = data.statusPengangkutan === "diambil" || data.statusPengangkutan === "tidak_diangkut";
    if (selesai) return;
    const id = setInterval(() => fetchLacak(kodeRef.current), 15000);
    return () => clearInterval(id);
  }, [data, fetchLacak]);

  function lokasiSaya() {
    if (!("geolocation" in navigator)) {
      setError("Browser tidak mendukung GPS.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setError("Izin lokasi ditolak. Aktifkan akses lokasi untuk melihat posisi Anda.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  const live = data ? (data.trukLokasi ?? data.petugasLokasi) : null;
  const liveFresh = live && isFresh(live.updatedAt) ? live : null;
  const jarak =
    data?.pickup && liveFresh
      ? jarakMeter([liveFresh.latitude, liveFresh.longitude], [data.pickup.latitude, data.pickup.longitude])
      : null;
  const etaMenit = jarak ? Math.max(1, Math.round(jarak / (KECEPATAN_MS * 60))) : null;

  const meta = data ? statusMeta(data) : null;

  return (
    <div className="max-w-lg mx-auto w-full space-y-4">
      {/* Bar input kode pelanggan */}
      <form onSubmit={mulaiLacak} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={kode}
            onChange={(e) => setKode(e.target.value)}
            placeholder="Masukkan No. WhatsApp / Kode Pelanggan"
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-xs sm:text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:font-normal placeholder:text-slate-400"
            autoComplete="off"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl text-xs font-bold shadow-sm active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Lacak 🔍</span>}
        </button>
      </form>

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
          {error}
        </div>
      )}

      {!data && !loading && !error && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 sm:p-12 text-center shadow-sm space-y-3">
          <div className="w-14 h-14 mx-auto bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center shadow-sm">
            <Truck className="w-7 h-7" />
          </div>
          <h2 className="font-extrabold text-lg text-slate-900">Lacak Armada Sampah Real-Time</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            Ketik nomor WhatsApp atau ID pelanggan Anda di atas untuk memantau rute truk sampah, estimasi waktu tiba (ETA), dan status penjemputan hari ini.
          </p>
        </div>
      )}

      {loading && !data && (
        <div className="h-[48vh] rounded-3xl border border-slate-200 bg-slate-50 flex flex-col items-center justify-center gap-2">
          <div className="w-8 h-8 border-[3px] border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-slate-500">Mencari Posisi Armada di Peta...</p>
        </div>
      )}

      {data && (
        <>
          {/* Peta */}
          <div className="relative h-[48vh] md:h-[54vh] rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            <MapJemput
              pickup={data.pickup}
              truk={liveFresh}
              userPos={userPos}
            />

            {/* Tombol lokasi saya (Gojek-style FAB) */}
            <button
              onClick={lokasiSaya}
              disabled={locating}
              className="absolute right-3.5 top-3.5 z-[1000] flex items-center gap-1.5 bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-full px-3.5 py-2 text-xs font-bold text-slate-800 shadow-md active:scale-95 transition-all disabled:opacity-50"
            >
              <Navigation className="w-3.5 h-3.5 text-emerald-700" />
              <span>{locating ? "Mencari…" : "Lokasi Saya"}</span>
            </button>

            {/* Badge status di atas peta */}
            {meta && (
              <div
                className={`absolute left-3.5 top-3.5 z-[1000] max-w-[calc(100%-9rem)] px-3 py-1.5 rounded-full text-xs font-bold shadow-md flex items-center gap-1.5 ${
                  meta.tone === "selesai"
                    ? "bg-emerald-700 text-white"
                    : meta.tone === "proses"
                    ? "bg-amber-400 text-amber-950"
                    : "bg-white text-slate-800 border border-slate-200"
                }`}
              >
                {meta.tone === "proses" && <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />}
                <span className="truncate">{meta.tone === "proses" ? "● ARMADA DI PERJALANAN" : meta.teks}</span>
              </div>
            )}
          </div>

          {/* Bottom sheet — kartu status ala Gojek */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden space-y-4 p-5">
            {/* Header status */}
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                meta?.tone === "selesai"
                  ? "bg-emerald-100 text-emerald-700"
                  : meta?.tone === "proses"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-slate-100 text-slate-700"
              }`}>
                {meta?.tone === "selesai" ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : meta?.tone === "proses" ? (
                  <Truck className="w-5 h-5" />
                ) : (
                  <Clock className="w-5 h-5" />
                )}
              </div>
              <div className="min-w-0">
                <p className="font-extrabold text-sm text-slate-900 leading-tight">{meta?.teks}</p>
                <p className="text-xs text-slate-500 mt-0.5 truncate">
                  {meta?.subteks}
                </p>
              </div>
            </div>

            {/* ETA + jarak */}
            {jarak != null && etaMenit != null && (
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-3 text-center">
                  <p className="text-2xl font-extrabold text-emerald-800 leading-none tabular-nums">{etaMenit}</p>
                  <p className="text-[10px] font-bold uppercase text-emerald-700 mt-1">Perkiraan Menit</p>
                </div>
                <div className="bg-slate-50 rounded-2xl border border-slate-200/70 p-3 text-center">
                  <p className="text-2xl font-extrabold text-slate-800 leading-none tabular-nums">{formatJarak(jarak)}</p>
                  <p className="text-[10px] font-bold uppercase text-slate-500 mt-1">Jarak dari Rumah</p>
                </div>
              </div>
            )}

            {/* Armada */}
            {data.kendaraan && (
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-lg shrink-0 shadow-sm">
                  🚛
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-xs text-slate-900 truncate">{data.kendaraan.nama}</p>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {data.kendaraan.platNomor ? `Plat: ${data.kendaraan.platNomor} • ` : ""}
                    {data.kendaraan.jenis.replace(/_/g, " ")}
                  </p>
                </div>
              </div>
            )}

            {/* Jadwal dan update waktu */}
            <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-3">
              <span className="flex items-center gap-1.5 font-medium">
                <Clock className="w-3.5 h-3.5" />
                {data.jadwal ? `${data.jadwal.hari}${data.jadwal.jam ? ` · ${data.jadwal.jam}` : ""}` : "Hari ini"}
              </span>
              {liveFresh && <span>Diperbarui {formatRelatif(liveFresh.updatedAt)}</span>}
            </div>

            {/* Aksi cepat */}
            <div className="flex gap-2">
              <a
                href="/pengaduan"
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-xl py-2.5 px-2 text-center flex items-center justify-center gap-1.5 transition-colors"
              >
                <CircleOff className="w-3.5 h-3.5" /> Lapor Kendala
              </a>
              <button
                onClick={() => fetchLacak(kodeRef.current)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-xl py-2.5 px-2 flex items-center justify-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Perbarui
              </button>
              <a
                href="/bayar"
                className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] rounded-xl py-2.5 px-2 text-center flex items-center justify-center gap-1.5 shadow-sm transition-colors"
              >
                <PackageOpen className="w-3.5 h-3.5" /> Bayar
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
