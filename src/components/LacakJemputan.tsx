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
    <div className="h-full w-full flex items-center justify-center bg-[#e8f0e6]">
      <p className="font-black uppercase tracking-widest text-green-700 animate-pulse">MEMUAT PETA…</p>
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={kode}
            onChange={(e) => setKode(e.target.value)}
            placeholder="KODE PELANGGAN (CONTOH: DPK-001)"
            className="w-full bg-white hm-border pl-9 pr-3 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-green-500/20 uppercase"
            autoComplete="off"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="hm-btn-green shrink-0 px-5 disabled:opacity-50"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "LACAK"}
        </button>
      </form>

      {error && (
        <div className="p-3 border-2 border-red-600 bg-red-50 text-red-700 text-xs font-bold uppercase">
          {error}
        </div>
      )}

      {!data && !loading && !error && (
        <div className="hm-card bg-[#f4f4f0] text-center py-14">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-600 border-2 border-black rounded-full flex items-center justify-center">
            <Truck className="w-8 h-8 text-white" />
          </div>
          <h2 className="font-black text-2xl uppercase tracking-tighter mb-2">Lacak Jemputan Sampah</h2>
          <p className="text-xs font-bold uppercase text-gray-500 max-w-xs mx-auto">
            Masukkan kode pelanggan Anda untuk melihat posisi armada angkut secara langsung, seperti ojek online.
          </p>
        </div>
      )}

      {loading && !data && (
        <div className="h-[50vh] border-2 border-black bg-[#e8f0e6] flex items-center justify-center">
          <p className="font-black uppercase tracking-widest text-green-700 animate-pulse">MENCARI ARMADA…</p>
        </div>
      )}

      {data && (
        <>
          {/* Peta */}
          <div className="relative h-[48vh] md:h-[56vh] border-2 border-black overflow-hidden shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
            <MapJemput
              pickup={data.pickup}
              truk={liveFresh}
              userPos={userPos}
            />

            {/* Tombol lokasi saya (Gojek-style FAB) */}
            <button
              onClick={lokasiSaya}
              disabled={locating}
              className="absolute right-3 top-3 z-[1000] flex items-center gap-1.5 bg-white border-2 border-black px-3 py-2.5 text-[11px] font-black uppercase tracking-wide shadow-[3px_3px_0_0_rgba(0,0,0,1)] active:translate-y-[1px] disabled:opacity-50"
            >
              <Navigation className="w-3.5 h-3.5 text-green-600" />
              {locating ? "Mencari…" : "Lokasi Saya"}
            </button>

            {/* Badge status di atas peta */}
            {meta && (
              <div
                className={`absolute left-3 top-3 z-[1000] px-3 py-2 text-[11px] font-black uppercase tracking-wide border-2 border-black shadow-[3px_3px_0_0_rgba(0,0,0,1)] ${
                  meta.tone === "selesai"
                    ? "bg-green-600 text-white"
                    : meta.tone === "proses"
                    ? "bg-yellow-300 text-black"
                    : "bg-white text-black"
                }`}
              >
                {meta.tone === "proses" ? "● LIVE" : meta.teks}
              </div>
            )}
          </div>

          {/* Bottom sheet — kartu status ala Gojek */}
          <div className="border-2 border-black bg-white shadow-[8px_8px_0_0_rgba(0,0,0,1)] overflow-hidden">
            {/* Header status */}
            <div
              className={`px-4 py-3 flex items-center gap-3 ${
                meta?.tone === "selesai"
                  ? "bg-green-600 text-white"
                  : meta?.tone === "proses"
                  ? "bg-black text-white"
                  : "bg-[#f4f4f0] text-black"
              }`}
            >
              {meta?.tone === "selesai" ? (
                <CheckCircle2 className="w-6 h-6" />
              ) : meta?.tone === "proses" ? (
                <Truck className="w-6 h-6" />
              ) : (
                <Clock className="w-6 h-6" />
              )}
              <div>
                <p className="font-black uppercase tracking-tight leading-tight">{meta?.teks}</p>
                <p className={`text-[10px] font-bold uppercase ${meta?.tone === "proses" ? "text-gray-300" : "opacity-70"}`}>
                  {meta?.subteks}
                </p>
              </div>
            </div>

            <div className="p-4 space-y-3">
              {/* ETA + jarak */}
              {jarak != null && etaMenit != null && (
                <div className="flex items-center gap-4">
                  <div className="flex-1 bg-green-50 border-2 border-green-600 p-3 text-center">
                    <p className="font-black text-2xl text-green-700 leading-none">{etaMenit}</p>
                    <p className="text-[10px] font-black uppercase text-green-700">menit lagi</p>
                  </div>
                  <div className="flex-1 bg-white border-2 border-black p-3 text-center">
                    <p className="font-black text-2xl leading-none">{formatJarak(jarak)}</p>
                    <p className="text-[10px] font-black uppercase text-gray-500">dari rumah Anda</p>
                  </div>
                </div>
              )}

              {/* Armada */}
              {data.kendaraan && (
                <div className="flex items-center gap-3 border-2 border-black p-3 bg-[#f4f4f0]">
                  <div className="w-10 h-10 bg-black text-white flex items-center justify-center text-lg shrink-0">🚛</div>
                  <div className="min-w-0 flex-1">
                    <p className="font-black uppercase text-sm truncate">{data.kendaraan.nama}</p>
                    <p className="text-[11px] font-bold text-gray-600 uppercase">
                      {data.kendaraan.platNomor ? `PLAT ${data.kendaraan.platNomor} · ` : ""}
                      {data.kendaraan.jenis.replace(/_/g, " ").toUpperCase()}
                    </p>
                  </div>
                  {data.petugas && (
                    <div className="text-right shrink-0">
                      <p className="text-[11px] font-black uppercase">{data.petugas.nama}</p>
                      <p className="text-[10px] font-bold text-gray-500 uppercase">petugas</p>
                    </div>
                  )}
                </div>
              )}

              {/* Titik pickup */}
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-black uppercase leading-tight">{data.nama}</p>
                  <p className="text-xs font-bold text-gray-600">
                    {data.alamat}
                    {data.rtRw ? ` · ${data.rtRw}` : ""}
                  </p>
                  {data.patokanLokasi && (
                    <p className="text-[11px] font-bold text-amber-600 mt-0.5">📍 {data.patokanLokasi}</p>
                  )}
                </div>
              </div>

              {/* Info jadwal + pembaruan */}
              {(data.jadwal || liveFresh) && (
                <div className="flex items-center justify-between text-[10px] font-black uppercase text-gray-500 border-t-2 border-dashed border-gray-300 pt-2">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {data.jadwal ? `${data.jadwal.hari}${data.jadwal.jam ? ` · ${data.jadwal.jam}` : ""}` : "Hari ini"}
                  </span>
                  {liveFresh && <span>Diperbarui {formatRelatif(liveFresh.updatedAt)}</span>}
                </div>
              )}

              {/* Aksi cepat */}
              <div className="flex gap-2">
                <a
                  href="/pengaduan"
                  className="flex-1 hm-btn !px-3 !py-2.5 text-[11px] flex items-center justify-center gap-1.5"
                >
                  <CircleOff className="w-3.5 h-3.5" /> Lapor Kendala
                </a>
                <button
                  onClick={() => fetchLacak(kodeRef.current)}
                  className="flex-1 hm-btn !px-3 !py-2.5 text-[11px] flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Perbarui
                </button>
                <a
                  href="/bayar"
                  className="flex-1 hm-btn !px-3 !py-2.5 text-[11px] flex items-center justify-center gap-1.5"
                >
                  <PackageOpen className="w-3.5 h-3.5" /> Bayar
                </a>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
