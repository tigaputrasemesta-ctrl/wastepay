"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  Marker,
  Circle,
  Polyline,
  useMap,
} from "react-leaflet";
import Image from "next/image";
import { getMapTileConfig, type MapTileType } from "@/lib/map-tile";
import { formatRupiah } from "@/lib/utils";
import {
  buildWhatsAppDriverUrl,
  buildNavigationUrl,
  buildCallUrl,
} from "@/lib/driver-actions";
import { jarakMeter } from "@/lib/geo";

export type TugasMap = {
  id: number;
  nama: string;
  alamat: string;
  kodePelanggan: string;
  latitude: number;
  longitude: number;
  status: string;
  patokanLokasi?: string | null;
  noTelepon?: string | null;
  fotoRumah?: string | null;
  urutan?: number;
  estimasiVolume?: string;
  catatanKhusus?: string;
  jenisSampah?: string;
};

export type MapAngkutProps = {
  tugas: TugasMap[];
  posSaya?: { lat: number; lng: number; akurasi?: number } | null;
  radiusMeter?: number; // 10 atau 20 meter
  onQuickPickup?: (taskId: number) => Promise<void>;
  onLaporKendala?: (taskId: number, catatan: string) => Promise<void>;
  onSelectTask?: (taskId: number) => void;
  className?: string;
};

const PUSAT_DEPOK: [number, number] = [-6.424838, 106.832667];

/**
 * Pin Marker Dinamis & Estetik untuk Rumah Pelanggan
 * - Nomor urut antrean (#1, #2, #3...)
 * - Badge status: Hijau (Selesai), Biru (Antrean Lunas), Merah (Menunggak)
 * - Gelombang halo berdenyut untuk rumah yang menunggak
 */
function buatPinTugas(t: TugasMap, urutan?: number, isSelected?: boolean) {
  const isMenunggak = false; // Diubah: Tidak ada harga/tunggakan
  const isSelesai = t.status === "diambil";
  const isKendala = t.status === "tidak_diangkut";

  let bgColor = "#0284c7"; // Sky 600
  let icon = typeof urutan === "number" ? `#${urutan}` : "🏠";
  let pulseHtml = "";
  let labelText = t.nama.replace(/["&<>]/g, "");

  if (isMenunggak && t.status === "terjadwal") {
    bgColor = "#e11d48"; // Rose 600
    icon = "⛔";
    pulseHtml = `
      <div style="
        position: absolute;
        width: 46px;
        height: 46px;
        top: -23px;
        left: -23px;
        border-radius: 50%;
        background: rgba(225, 29, 72, 0.35);
        border: 1.5px solid #f43f5e;
        animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
      "></div>
    `;
    labelText = `⛔ ${labelText}`;
  } else if (isSelesai) {
    bgColor = "#059669"; // Emerald 600
    icon = "✓";
  } else if (isKendala) {
    bgColor = "#64748b"; // Slate 500
    icon = "✕";
  }

  const selectedRing = isSelected
    ? "outline: 3.5px solid #38bdf8; outline-offset: 2px; transform: scale(1.18);"
    : "";

  const html = `
    <div style="transform:translate(-50%,-100%);text-align:center;cursor:pointer;position:relative;transition:all 0.2s ease;">
      ${pulseHtml}
      <div style="
        width: 32px;
        height: 32px;
        margin: 0 auto;
        border-radius: 9999px;
        background: ${bgColor};
        border: 2.5px solid #ffffff;
        box-shadow: 0 4px 14px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 900;
        color: #ffffff;
        ${selectedRing}
      ">
        ${icon}
      </div>
      <div style="
        margin-top: 2px;
        font-family: ui-sans-serif, system-ui, sans-serif;
        font-size: 9px;
        font-weight: 800;
        color: #ffffff;
        background: ${isMenunggak && t.status === "terjadwal" ? "#881337" : "#0f172a"};
        border: 1px solid rgba(255,255,255,0.25);
        border-radius: 9999px;
        padding: 1.5px 6px;
        white-space: nowrap;
        box-shadow: 0 2px 6px rgba(0,0,0,0.35);
        max-width: 100px;
        overflow: hidden;
        text-overflow: ellipsis;
      ">
        ${labelText}
      </div>
    </div>
  `;

  return L.divIcon({
    className: "custom-map-pin",
    html,
    iconSize: [1, 1],
    iconAnchor: [0, 0],
  });
}

/** Pin Truk Pengemudi dengan Gelombang Radar */
function buatPinDriver() {
  const html = `
    <div style="transform:translate(-50%,-50%);position:relative;cursor:pointer">
      <div style="
        position: absolute;
        width: 48px;
        height: 48px;
        top: -24px;
        left: -24px;
        border-radius: 50%;
        background: rgba(16, 185, 129, 0.25);
        border: 2px solid #10b981;
        animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
      "></div>
      <div style="
        width: 38px;
        height: 38px;
        border-radius: 50%;
        background: #064e3b;
        border: 2.5px solid #ffffff;
        box-shadow: 0 4px 14px rgba(0,0,0,0.45);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 19px;
      ">
        🚛
      </div>
    </div>
  `;

  return L.divIcon({
    className: "custom-driver-pin",
    html,
    iconSize: [1, 1],
    iconAnchor: [0, 0],
  });
}

/** Map Controller for Camera Movements */
function MapController({
  points,
  posSaya,
  centerTrigger,
  fitAllTrigger,
  flyToPos,
}: {
  points: [number, number][];
  posSaya: [number, number] | null;
  centerTrigger: number;
  fitAllTrigger: number;
  flyToPos: [number, number] | null;
}) {
  const map = useMap();
  const initialFitDone = useRef(false);

  // Fit bounds awal
  useEffect(() => {
    if (initialFitDone.current) return;
    const all = posSaya ? [...points, posSaya] : points;
    if (all.length >= 2) {
      map.fitBounds(all, { padding: [40, 40], maxZoom: 16 });
      initialFitDone.current = true;
    } else if (all.length === 1) {
      map.setView(all[0], 16);
      initialFitDone.current = true;
    } else if (all.length === 0) {
      map.setView(PUSAT_DEPOK, 14);
      initialFitDone.current = true;
    }
  }, [points, posSaya, map]);

  // Center ke posisi sopir
  useEffect(() => {
    if (centerTrigger > 0 && posSaya) {
      map.flyTo(posSaya, 17, { animate: true, duration: 0.8 });
    }
  }, [centerTrigger, posSaya, map]);

  // Fit seluruh rute
  useEffect(() => {
    if (fitAllTrigger > 0) {
      const all = posSaya ? [...points, posSaya] : points;
      if (all.length >= 2) {
        map.fitBounds(all, { padding: [50, 50] });
      } else if (all.length === 1) {
        map.setView(all[0], 16);
      }
    }
  }, [fitAllTrigger, points, posSaya, map]);

  // Fly ke pin yang diklik
  useEffect(() => {
    if (flyToPos) {
      map.flyTo(flyToPos, 18, { animate: true, duration: 0.6 });
    }
  }, [flyToPos, map]);

  return null;
}

export default function MapAngkut({
  tugas,
  posSaya: externalPos,
  radiusMeter = 20,
  onQuickPickup,
  onSkipOverdue,
  onSelectTask,
  className = "",
}: MapAngkutProps) {
  const [internalPos, setInternalPos] = useState<[number, number] | null>(null);
  const [tileMode, setTileMode] = useState<MapTileType>("google-streets");
  const [isExpanded, setIsExpanded] = useState(false);
  const [filterMode, setFilterMode] = useState<"semua" | "antrean" | "menunggak" | "selesai">("semua");
  const [selectedTask, setSelectedTask] = useState<TugasMap | null>(null);
  const [centerTrigger, setCenterTrigger] = useState(0);
  const [fitAllTrigger, setFitAllTrigger] = useState(0);
  const [flyToPos, setFlyToPos] = useState<[number, number] | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Fallback GPS lokal
  useEffect(() => {
    if (externalPos) {
      setInternalPos([externalPos.lat, externalPos.lng]);
      return;
    }
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => setInternalPos([pos.coords.latitude, pos.coords.longitude]),
      () => {},
      { enableHighAccuracy: true, maximumAge: 4000, timeout: 12000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [externalPos]);

  const activeDriverPos: [number, number] | null = externalPos
    ? [externalPos.lat, externalPos.lng]
    : internalPos;

  // Filter tugas
  const filteredTugas = useMemo(() => {
    if (filterMode === "antrean") return tugas.filter((t) => t.status === "terjadwal");
    if (filterMode === "menunggak") return tugas.filter((t) => t.tunggakan?.isMenunggak);
    if (filterMode === "selesai") return tugas.filter((t) => t.status === "diambil");
    return tugas;
  }, [tugas, filterMode]);

  // Points untuk bounds
  const points = useMemo(
    () => filteredTugas.map((t) => [t.latitude, t.longitude] as [number, number]),
    [filteredTugas]
  );

  // Route Polyline Points: Driver Pos -> Pending Task #1 -> Pending Task #2 ...
  const routeTrajectory = useMemo(() => {
    const pending = tugas.filter((t) => t.status === "terjadwal");
    const coords: [number, number][] = [];
    if (activeDriverPos) coords.push(activeDriverPos);
    for (const t of pending) {
      coords.push([t.latitude, t.longitude]);
    }
    return coords.length >= 2 ? coords : [];
  }, [tugas, activeDriverPos]);

  const initialCenter: [number, number] = activeDriverPos ?? (points[0] ?? PUSAT_DEPOK);
  const tileConfig = useMemo(() => getMapTileConfig(tileMode), [tileMode]);

  const totalMenunggak = tugas.filter((t) => t.tunggakan?.isMenunggak).length;
  const totalSelesai = tugas.filter((t) => t.status === "diambil").length;
  const totalAntrean = tugas.filter((t) => t.status === "terjadwal").length;

  // Handler saat pin ditekan
  const handlePinClick = (t: TugasMap) => {
    setSelectedTask(t);
    setFlyToPos([t.latitude, t.longitude]);
    onSelectTask?.(t.id);
  };

  // Jarak ke selected task
  const selectedDistance = useMemo(() => {
    if (!selectedTask || !activeDriverPos) return null;
    return jarakMeter(activeDriverPos, [selectedTask.latitude, selectedTask.longitude]);
  }, [selectedTask, activeDriverPos]);

  const selectedIsMenunggak = false; // Fitur tunggakan dihapus
  const selectedWaUrl = selectedTask
    ? buildWhatsAppDriverUrl({
        phone: selectedTask.noTelepon,
        nama: selectedTask.nama,
        alamat: selectedTask.alamat,
        patokan: selectedTask.patokanLokasi,
        isMenunggak: selectedIsMenunggak,
      })
    : null;

  const selectedNavUrl = selectedTask
    ? buildNavigationUrl(selectedTask.latitude, selectedTask.longitude)
    : null;

  const selectedTelUrl = selectedTask
    ? buildCallUrl(selectedTask.noTelepon)
    : null;

  return (
    <div
      className={`rounded-3xl border border-slate-800/90 shadow-2xl overflow-hidden transition-all duration-300 bg-slate-950 flex flex-col ${
        isExpanded
          ? "fixed inset-2 z-50 sm:inset-6 shadow-2xl ring-4 ring-emerald-500/20"
          : "relative h-[55vh] min-h-[420px]"
      } ${className}`}
    >
      {/* ── TOP LOGISTICS NAVIGATION HEADER BAR ── */}
      <div className="bg-slate-900/95 backdrop-blur-md text-white px-3.5 py-2.5 flex items-center justify-between gap-2 border-b border-slate-800 z-10 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-base shadow-md shadow-emerald-600/30 shrink-0">
            🗺️
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black tracking-tight text-white truncate">
                Peta Navigasi Armada
              </h3>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800/60 shrink-0">
                Radar: {radiusMeter}m
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium truncate">
              {totalSelesai}/{tugas.length} Selesai • {totalAntrean} Menunggu
            </p>
          </div>
        </div>

        {/* Action Controls: Layer Switcher & Fullscreen */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Tile Layer Selector */}
          <div className="bg-slate-800 rounded-xl p-0.5 flex border border-slate-700 text-[10px] font-bold">
            <button
              type="button"
              onClick={() => setTileMode("google-streets")}
              className={`px-2 py-1 rounded-lg transition-all ${
                tileMode === "google-streets"
                  ? "bg-emerald-500 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Jalan
            </button>
            <button
              type="button"
              onClick={() => setTileMode("google-hybrid")}
              className={`px-2 py-1 rounded-lg transition-all ${
                tileMode === "google-hybrid"
                  ? "bg-emerald-500 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Satelit
            </button>
            <button
              type="button"
              onClick={() => setTileMode("dark")}
              className={`px-2 py-1 rounded-lg transition-all ${
                tileMode === "dark"
                  ? "bg-emerald-500 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Malam
            </button>
          </div>

          {/* Expand / Minimize Toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all active:scale-95"
            title={isExpanded ? "Kecilkan Peta" : "Mode Layar Penuh"}
          >
            {isExpanded ? "✕ Ciutkan" : "⤢ Penuh"}
          </button>
        </div>
      </div>

      {/* ── FILTER CHIPS STRIP ── */}
      <div className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-800/80 px-3 py-1.5 flex items-center justify-between text-xs font-bold shrink-0 z-10 overflow-x-auto gap-1">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setFilterMode("semua")}
            className={`px-2.5 py-1 rounded-lg text-[11px] transition-all shrink-0 ${
              filterMode === "semua"
                ? "bg-white text-slate-950 font-black shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Semua ({tugas.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("antrean")}
            className={`px-2.5 py-1 rounded-lg text-[11px] transition-all shrink-0 ${
              filterMode === "antrean"
                ? "bg-emerald-500 text-slate-950 font-black shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Antrean ({totalAntrean})
          </button>
          {totalMenunggak > 0 && (
            <button
              type="button"
              onClick={() => setFilterMode("menunggak")}
              className={`px-2.5 py-1 rounded-lg text-[11px] transition-all shrink-0 ${
                filterMode === "menunggak"
                  ? "bg-rose-500 text-white font-black shadow-sm animate-pulse"
                  : "text-rose-400 hover:text-rose-300"
              }`}
            >
              ⛔ Menunggak ({totalMenunggak})
            </button>
          )}
          <button
            type="button"
            onClick={() => setFilterMode("selesai")}
            className={`px-2.5 py-1 rounded-lg text-[11px] transition-all shrink-0 ${
              filterMode === "selesai"
                ? "bg-teal-500 text-slate-950 font-black shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Selesai ({totalSelesai})
          </button>
        </div>

        {/* GPS Live Pill */}
        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 shrink-0 pl-2">
          <span
            className={`w-2 h-2 rounded-full ${
              activeDriverPos ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
            }`}
          />
          <span>{activeDriverPos ? "GPS Terkunci" : "Mencari GPS..."}</span>
        </div>
      </div>

      {/* ── MAP CANVAS CONTAINER ── */}
      <div className="relative flex-1 w-full min-h-0 bg-slate-950">
        <MapContainer
          center={initialCenter}
          zoom={16}
          scrollWheelZoom
          zoomControl={false}
          className="h-full w-full"
          style={{ background: "#090d16" }}
        >
          <TileLayer
            key={tileMode}
            attribution={tileConfig.attribution}
            url={tileConfig.url}
            subdomains={tileConfig.subdomains}
            maxZoom={tileConfig.maxZoom}
          />

          <MapController
            points={points}
            posSaya={activeDriverPos}
            centerTrigger={centerTrigger}
            fitAllTrigger={fitAllTrigger}
            flyToPos={flyToPos}
          />

          {/* Glow Trajectory Route Polyline */}
          {routeTrajectory.length >= 2 && (
            <>
              {/* Outer Glow Halo */}
              <Polyline
                positions={routeTrajectory}
                pathOptions={{
                  color: "#059669",
                  weight: 7,
                  opacity: 0.35,
                  lineCap: "round",
                }}
              />
              {/* Inner Dashed Line */}
              <Polyline
                positions={routeTrajectory}
                pathOptions={{
                  color: "#34d399",
                  weight: 3.5,
                  dashArray: "6, 10",
                  opacity: 0.95,
                  lineCap: "round",
                }}
              />
            </>
          )}

          {/* Posisi Truk Driver */}
          {activeDriverPos && (
            <>
              <Marker position={activeDriverPos} icon={buatPinDriver()} />
              {/* Dynamic Radar Geofence Ring */}
              <Circle
                center={activeDriverPos}
                radius={radiusMeter}
                pathOptions={{
                  color: "#10b981",
                  fillColor: "#10b981",
                  fillOpacity: 0.15,
                  weight: 1.5,
                  dashArray: "4, 6",
                }}
              />
            </>
          )}

          {/* Markers Rumah Pelanggan */}
          {filteredTugas.map((t, idx) => (
            <Marker
              key={`tugas-${t.id}`}
              position={[t.latitude, t.longitude]}
              icon={buatPinTugas(t, idx + 1, selectedTask?.id === t.id)}
              eventHandlers={{
                click: () => handlePinClick(t),
              }}
            />
          ))}
        </MapContainer>

        {/* Floating Standby Banner if 0 tasks */}
        {tugas.length === 0 && (
          <div className="absolute top-3 left-3 right-16 z-[400] bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl p-2.5 text-white shadow-xl flex items-center gap-2.5 pointer-events-none">
            <span className="text-lg">ℹ️</span>
            <div className="text-[11px] leading-tight">
              <p className="font-bold text-slate-100">Peta Siaga: Belum Ada Titik Antrean</p>
              <p className="text-slate-400 text-[10px]">
                Peta aktif melacak posisi GPS armada. Ganti tanggal jadwal untuk rute hari lain.
              </p>
            </div>
          </div>
        )}

        {/* ── FLOATING MAP FAB BUTTONS (Right Side) ── */}
        <div className="absolute right-3 top-3 z-[400] flex flex-col gap-2">
          {/* Center on Driver */}
          <button
            type="button"
            onClick={() => setCenterTrigger((c) => c + 1)}
            className="w-10 h-10 rounded-2xl bg-slate-900/90 hover:bg-slate-800 active:scale-95 text-white border border-slate-700 shadow-xl flex items-center justify-center text-base transition-all"
            title="Pusatkan Lokasi Saya"
          >
            🎯
          </button>

          {/* Fit All Points */}
          <button
            type="button"
            onClick={() => setFitAllTrigger((f) => f + 1)}
            className="w-10 h-10 rounded-2xl bg-slate-900/90 hover:bg-slate-800 active:scale-95 text-white border border-slate-700 shadow-xl flex items-center justify-center text-sm font-bold transition-all"
            title="Tampilkan Seluruh Rute"
          >
            📍
          </button>
        </div>

        {/* ── INTERACTIVE BOTTOM DRAWER FOR SELECTED PIN (ALA GOJEK / GRAB) ── */}
        {selectedTask && (
          <div className="absolute inset-x-3 bottom-3 z-[400] animate-in slide-in-from-bottom-5 duration-200">
            <div
              className={`rounded-3xl p-4 shadow-2xl backdrop-blur-md border transition-all ${
                selectedIsMenunggak
                  ? "bg-slate-950/95 border-rose-500/60 ring-2 ring-rose-500/20 text-white"
                  : "bg-slate-950/95 border-emerald-500/50 ring-2 ring-emerald-500/20 text-white"
              }`}
            >
              {/* Header Drawer */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      selectedTask.status === "diambil"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        : "bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse"
                    }`}
                  >
                    <span>
                      {selectedTask.status === "diambil"
                        ? "✓ SUDAH DIAMBIL"
                        : `URUTAN #${selectedTask.urutan || '-'}`}
                    </span>
                  </span>
                  {selectedDistance !== null && (
                    <span className="text-[10px] font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded-md">
                      📍 {selectedDistance}m lagi
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedTask(null)}
                  className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center font-bold text-xs transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Customer Body */}
              <div className="py-2.5 flex items-start justify-between gap-3">
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-black text-white truncate">
                      {selectedTask.nama}
                    </h4>
                    <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-800/50 shrink-0">
                      {selectedTask.kodePelanggan}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 line-clamp-2">
                    {selectedTask.alamat}
                  </p>

                  <div className="flex flex-wrap gap-2 mt-1">
                    {selectedTask.estimasiVolume && (
                      <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-1 rounded-md flex items-center gap-1">
                        📦 {selectedTask.estimasiVolume}
                      </span>
                    )}
                    {selectedTask.jenisSampah && (
                      <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-1 rounded-md flex items-center gap-1">
                        ♻️ {selectedTask.jenisSampah}
                      </span>
                    )}
                  </div>

                  {selectedTask.catatanKhusus && (
                    <p className="text-[11px] text-amber-300 font-medium mt-1 bg-amber-950/30 p-1.5 rounded-md border border-amber-900/50">
                      📝 {selectedTask.catatanKhusus}
                    </p>
                  )}
                </div>

                {selectedTask.fotoRumah && (
                  <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-700 shrink-0 bg-slate-800 relative shadow-md">
                    <Image
                      src={selectedTask.fotoRumah}
                      alt="Foto Titik Jemput"
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </div>
                )}
              </div>

              {/* Action Buttons Row */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/50 mt-1">
                {/* Navigasi */}
                {selectedNavUrl ? (
                  <a
                    href={selectedNavUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-100 font-bold text-xs flex items-center justify-center gap-1.5 transition-all border border-slate-700 shadow-sm"
                  >
                    <span className="text-sm">🧭</span>
                    <span>Navigasi</span>
                  </a>
                ) : (
                  <div className="py-2.5 text-center text-xs text-slate-500 bg-slate-900 rounded-xl">
                    Tanpa GPS
                  </div>
                )}

                {/* Action Pickup */}
                {selectedTask.status === "terjadwal" ? (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={async () => {
                      setActionLoading(true);
                      try {
                        await onQuickPickup?.(selectedTask.id);
                        setSelectedTask(null);
                      } finally {
                        setActionLoading(false);
                      }
                    }}
                    className="py-2.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs flex items-center justify-center gap-1 transition-all shadow-lg shadow-emerald-600/20"
                  >
                    <span className="text-sm">✓</span>
                    <span>Angkut Sekarang</span>
                  </button>
                ) : (
                  <div className="py-2.5 text-center text-xs text-emerald-400 font-bold bg-emerald-950/60 rounded-xl border border-emerald-800/40">
                    ✓ Sudah Diangkut
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
