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
    <div className="h-full w-full flex items-center justify-center bg-slate-950">
      <p className="font-bold uppercase tracking-wider text-emerald-400 animate-pulse text-sm">
        Memuat Peta Operasional…
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
    <div className="relative w-screen h-[100dvh] bg-slate-950 overflow-hidden">
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
        <div className="bg-slate-950/85 rounded-2xl border border-white/15 px-5 py-3.5 backdrop-blur-md shadow-2xl">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse ring-4 ring-emerald-400/30" />
            <h1 className="font-extrabold uppercase tracking-wider text-white text-xl sm:text-2xl leading-none">
              Peta Operasional
            </h1>
          </div>
          <p className="text-xs font-semibold text-emerald-400 mt-2 uppercase tracking-wider">
            UPS HERU · Kota Depok · LIVE MONITORING
          </p>
        </div>

        <div className="bg-slate-950/85 rounded-2xl border border-white/15 px-5 py-3.5 backdrop-blur-md shadow-2xl text-right">
          <div className="font-extrabold text-white text-2xl sm:text-3xl leading-none tabular-nums">
            {jam}
          </div>
          <div className="text-xs font-medium text-white/70 uppercase tracking-wider mt-1">
            {tanggal}
          </div>
        </div>
      </div>

      {/* ── Stats footer (layar besar) ── */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1000] flex flex-wrap items-center gap-2 p-4 sm:p-6">
        <Chip label="Pelanggan" value={pelangganPeta.length} color="text-white" dot="#e5e7eb" />
        <Chip label="Petugas Online" value={petugasOnline} color="text-emerald-400" dot="#34d399" />
        <Chip label="Armada Online" value={kendaraanOnline} color="text-amber-400" dot="#fbbf24" />
        <Chip label="Pengaduan Baru" value={komplainBaru} color="text-rose-400" dot="#f87171" />
        {lastRefresh && (
          <span className="text-[10px] font-medium text-white/60 uppercase tracking-wider bg-slate-950/70 border border-white/10 rounded-full px-3 py-1.5 backdrop-blur-sm">
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
    <span className="inline-flex items-center gap-2.5 bg-slate-950/85 rounded-2xl border border-white/15 px-3.5 py-2 backdrop-blur-md shadow-lg">
      <span className="w-2 h-2 rounded-full" style={{ background: dot }} />
      <span className={`font-bold text-lg tabular-nums leading-none ${color}`}>
        {value}
      </span>
      <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">{label}</span>
    </span>
  );
}
