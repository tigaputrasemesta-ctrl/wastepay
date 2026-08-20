"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { cariRtTerdekat } from "@/lib/geo";
import type { PelangganPeta, KomplainPeta } from "./PetaMap";
import type { PetugasPeta, KendaraanPeta, TransitPeta } from "./MapView";

// Peta Leaflet butuh browser (window). Load client-side saja.
const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-[#0d0e10]">
      <p className="font-display font-black uppercase tracking-[0.3em] text-green-400 animate-pulse">
        MEMUAT PETA…
      </p>
    </div>
  ),
});

const WARNA_STATUS: Record<string, string> = {
  aktif: "#b7e13c",
  calon: "#f5a524",
  nonaktif: "#8b8f98",
  libur: "#8b8f98",
};

// Dianggap "online" bila kirim posisi < 15 menit lalu.
const ONLINE_MS = 15 * 60 * 1000;
function isOnline(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() < ONLINE_MS;
}

type KomplainMentah = Omit<KomplainPeta, "posisi">;

type Props = {
  pelanggan: PelangganPeta[];
  token: string;
};

/**
 * Layar TV / wallboard — peta fullscreen tanpa sidebar & panel.
 * Menampilkan seluruh pelanggan + realtime (petugas, kendaraan, lapak,
 * pengaduan) dengan polling 10 detik ke endpoint publik token `t`.
 */
export default function TvMap({ pelanggan, token }: Props) {
  const [petugas, setPetugas] = useState<PetugasPeta[]>([]);
  const [kendaraan, setKendaraan] = useState<KendaraanPeta[]>([]);
  const [transit, setTransit] = useState<TransitPeta[]>([]);
  const [komplain, setKomplain] = useState<KomplainMentah[]>([]);
  const [lastRefresh, setLastRefresh] = useState<number | null>(null);
  const [sekarang, setSekarang] = useState(() => new Date());

  const ambilData = useCallback(async () => {
    try {
      const res = await fetch(`/api/publik/tv-peta?t=${encodeURIComponent(token)}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      setPetugas(data.petugas ?? []);
      setKendaraan(data.kendaraan ?? []);
      setTransit(data.transit ?? []);
      setKomplain(data.komplain ?? []);
      setLastRefresh(Date.now());
    } catch {
      // diam: polling berikutnya akan coba lagi
    }
  }, [token]);

  useEffect(() => {
    const t0 = setTimeout(() => ambilData(), 0);
    const t = setInterval(() => ambilData(), 10000);
    return () => {
      clearTimeout(t0);
      clearInterval(t);
    };
  }, [ambilData]);

  // Jam realtime untuk header layar besar
  useEffect(() => {
    const t = setInterval(() => setSekarang(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const komplainPosisi = useMemo<KomplainPeta[]>(
    () =>
      komplain.map((k) => {
        const lat = k.pelanggan.latitude;
        const lng = k.pelanggan.longitude;
        const posisi: [number, number] =
          lat != null && lng != null
            ? [lat, lng]
            : (() => {
                const { rt } = cariRtTerdekat([-6.4005, 106.8242]);
                return [rt.lat, rt.lng];
              })();
        return { ...k, posisi };
      }),
    [komplain]
  );

  const pelangganPeta = useMemo(
    () => pelanggan.filter((p) => p.latitude != null && p.longitude != null),
    [pelanggan]
  );

  const petugasOnline = petugas.filter((p) => isOnline(p.updatedAt)).length;
  const kendaraanOnline = kendaraan.filter((k) => isOnline(k.updatedAt)).length;
  const komplainBaru = komplain.filter((k) => k.status === "baru").length;

  const jam = sekarang.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const tanggal = sekarang.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="relative w-screen h-[100dvh] bg-[#0d0e10] overflow-hidden">
      <MapView
        pelanggan={pelangganPeta}
        komplain={komplainPosisi}
        petugas={petugas}
        kendaraan={kendaraan}
        transit={transit}
        pusatPetugas={null}
        selectedId={null}
        setSelectedId={() => {}}
        selectedKomplainId={null}
        setSelectedKomplainId={() => {}}
        tampilkanCakupan={false}
        tampilkanBatas
        tampilkanBatasKelurahan
        tampilkanRt
        ruteTerpilih={null}
        invalidateKey={1}
        warnaStatus={WARNA_STATUS}
      />

      {/* ── Header overlay (layar besar) ── */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1000] flex items-start justify-between gap-4 p-4 sm:p-6">
        <div className="bg-black/70 border-2 border-white/20 px-5 py-3 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-green-400 animate-pulse shadow-[0_0_10px_#4ade80]" />
            <h1 className="font-display font-black uppercase tracking-[0.25em] text-white text-xl sm:text-2xl leading-none">
              Peta Operasional
            </h1>
          </div>
          <p className="font-mono text-[11px] text-green-300/90 mt-2 uppercase tracking-[0.2em]">
            O₂W Hero Zero Waste · Kota Depok · LIVE
          </p>
        </div>

        <div className="bg-black/70 border-2 border-white/20 px-5 py-3 backdrop-blur-sm text-right">
          <div className="font-display font-black text-white text-2xl sm:text-3xl leading-none tabular-nums">
            {jam}
          </div>
          <div className="font-mono text-[11px] text-white/60 uppercase tracking-[0.2em] mt-1">
            {tanggal}
          </div>
        </div>
      </div>

      {/* ── Stats footer (layar besar) ── */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1000] flex flex-wrap items-center gap-2 p-4 sm:p-6">
        <Chip label="Pelanggan" value={pelangganPeta.length} color="text-white" dot="#e5e7eb" />
        <Chip label="Petugas Online" value={petugasOnline} color="text-green-300" dot="#4ade80" />
        <Chip label="Armada Online" value={kendaraanOnline} color="text-yellow-300" dot="#facc15" />
        <Chip label="Pengaduan Baru" value={komplainBaru} color="text-red-300" dot="#ef4444" />
        {lastRefresh && (
          <span className="font-mono text-[10px] text-white/40 uppercase tracking-wider bg-black/50 border border-white/10 px-2 py-1">
            update {new Date(lastRefresh).toLocaleTimeString("id-ID")}
          </span>
        )}
      </div>
    </div>
  );
}

function Chip({
  label,
  value,
  color,
  dot,
}: {
  label: string;
  value: number;
  color: string;
  dot: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 bg-black/70 border-2 border-white/20 px-3 py-1.5 backdrop-blur-sm">
      <span className="w-2 h-2 rounded-full" style={{ background: dot }} />
      <span className={`font-display font-black text-lg tabular-nums leading-none ${color}`}>
        {value}
      </span>
      <span className="font-mono text-[10px] text-white/60 uppercase tracking-wider">{label}</span>
    </span>
  );
}
