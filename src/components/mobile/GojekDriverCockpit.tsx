"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { motion, AnimatePresence } from "framer-motion";
import SlideToConfirm from "./SlideToConfirm";
import QrScannerModal from "./QrScannerModal";
import { getMapTileConfig, type MapTileType } from "@/lib/map-tile";
import { formatRupiah } from "@/lib/utils";
import { jarakMeter } from "@/lib/geo";
import {
  buildWhatsAppDriverUrl,
  buildNavigationUrl,
  buildCallUrl,
} from "@/lib/driver-actions";
import { playSound, speakText, vibrate } from "@/lib/mobile-feedback";
import type { ProximityTugas } from "@/hooks/useProximityPickup";
import { useRoadRoute } from "@/hooks/useRoadRoute";

export type GojekTugas = {
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
  tunggakan?: {
    isMenunggak: boolean;
    jumlahBulan: number;
    totalNominal: number;
    daftarBulan: string[];
    bolehPickup: boolean;
  };
};

export type TripState = "idle" | "running" | "paused" | "completed";

type GojekDriverCockpitProps = {
  tugas: GojekTugas[];
  activeTarget: ProximityTugas | null;
  posSaya?: { lat: number; lng: number; akurasi?: number } | null;
  radiusMeter?: number;
  muatanTruk: number;
  onMuatanChange: (persen: number) => void;
  onQuickPickup: (taskId: number) => Promise<void>;
  onSkipOverdue: (taskId: number, catatan: string) => Promise<void>;
  onOpenFullForm: (tugas: ProximityTugas) => void;
  onSelectTarget?: (taskId: number) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  // Trip status callbacks
  tripState?: TripState;
  tripSeconds?: number;
  onStartTrip?: () => void;
  onPauseTrip?: () => void;
  onResumeTrip?: () => void;
  onCompleteTrip?: () => void;
  // Cockpit top HUD & navigation
  viewMode?: "map" | "list";
  onViewModeChange?: (mode: "map" | "list") => void;
  tanggal?: string;
  onTanggalChange?: (tgl: string) => void;
  selesaiCount?: number;
  totalCount?: number;
  percentComplete?: number;
  onRadiusChange?: (radius: number) => void;
};

const PUSAT_DEPOK: [number, number] = [-6.424838, 106.832667];

/** Format detik ke jam:menit:detik */
export function formatTripDuration(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Pin Pengemudi Truk Gojek Style */
function buatPinDriver() {
  const html = `
    <div style="transform:translate(-50%,-50%);position:relative;cursor:pointer">
      <div style="
        position: absolute;
        width: 52px;
        height: 52px;
        top: -26px;
        left: -26px;
        border-radius: 50%;
        background: rgba(0, 170, 19, 0.25);
        border: 2px solid #00AA13;
        animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
      "></div>
      <div style="
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: #00AA13;
        border: 3px solid #ffffff;
        box-shadow: 0 4px 16px rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
      ">
        🚛
      </div>
    </div>
  `;
  return L.divIcon({ className: "gojek-driver-pin", html, iconSize: [1, 1] });
}

/** Pin Rumah Pelanggan Khas Gojek / Grab Multi-Drop */
function buatPinRumah(t: GojekTugas, index: number, isTarget: boolean) {
  const isMenunggak = Boolean(t.tunggakan?.isMenunggak);
  const isSelesai = t.status === "diambil";

  let bgColor = "#00880C"; // Gojek Forest Green
  let border = "border: 2.5px solid #ffffff;";
  let pulseHtml = "";
  let icon = `#${index + 1}`;

  if (isMenunggak && t.status === "terjadwal") {
    bgColor = "#DC2626"; // Red
    border = "border: 2.5px solid #FECDD3;";
    icon = "⛔";
    pulseHtml = `
      <div style="
        position: absolute;
        width: 48px;
        height: 48px;
        top: -24px;
        left: -24px;
        border-radius: 50%;
        background: rgba(220, 38, 38, 0.35);
        border: 1.5px solid #f87171;
        animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
      "></div>
    `;
  } else if (isSelesai) {
    bgColor = "#059669";
    icon = "✓";
  } else if (isTarget) {
    bgColor = "#00AA13"; // Bright Gojek Green
    pulseHtml = `
      <div style="
        position: absolute;
        width: 50px;
        height: 50px;
        top: -25px;
        left: -25px;
        border-radius: 50%;
        background: rgba(0, 170, 19, 0.3);
        border: 2px solid #00AA13;
        animation: ping 1.8s infinite;
      "></div>
    `;
  }

  const highlightScale = isTarget ? "transform: scale(1.25); filter: drop-shadow(0 6px 12px rgba(0,170,19,0.5));" : "";

  const html = `
    <div style="transform:translate(-50%,-100%);text-align:center;cursor:pointer;position:relative;${highlightScale}">
      ${pulseHtml}
      <div style="
        width: 32px;
        height: 32px;
        margin: 0 auto;
        border-radius: 50%;
        background: ${bgColor};
        ${border}
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 900;
        color: #ffffff;
      ">
        ${icon}
      </div>
      <div style="
        margin-top: 2px;
        font-family: ui-sans-serif, system-ui, sans-serif;
        font-size: 9px;
        font-weight: 800;
        color: #ffffff;
        background: ${isMenunggak && t.status === "terjadwal" ? "#991B1B" : "#111827"};
        border: 1px solid rgba(255,255,255,0.25);
        border-radius: 9999px;
        padding: 1px 6px;
        white-space: nowrap;
        box-shadow: 0 2px 6px rgba(0,0,0,0.4);
        max-width: 90px;
        overflow: hidden;
        text-overflow: ellipsis;
      ">
        ${t.nama.replace(/["&<>]/g, "")}
      </div>
    </div>
  `;
  return L.divIcon({ className: "gojek-stop-pin", html, iconSize: [1, 1] });
}

/** Map Controller for Camera Movements */
function MapCamera({
  points,
  driverPos,
  centerTrigger,
  fitTrigger,
  focusPos,
}: {
  points: [number, number][];
  driverPos: [number, number] | null;
  centerTrigger: number;
  fitTrigger: number;
  focusPos: [number, number] | null;
}) {
  const map = useMap();
  const initDone = useRef(false);

  useEffect(() => {
    if (initDone.current) return;
    const all = driverPos ? [...points, driverPos] : points;
    if (all.length >= 2) {
      map.fitBounds(all, { padding: [40, 40], maxZoom: 16 });
      initDone.current = true;
    } else if (all.length === 1) {
      map.setView(all[0], 16);
      initDone.current = true;
    } else {
      map.setView(PUSAT_DEPOK, 14);
      initDone.current = true;
    }
  }, [points, driverPos, map]);

  useEffect(() => {
    if (centerTrigger > 0 && driverPos) {
      map.flyTo(driverPos, 17, { animate: true, duration: 0.7 });
    }
  }, [centerTrigger, driverPos, map]);

  useEffect(() => {
    if (fitTrigger > 0) {
      const all = driverPos ? [...points, driverPos] : points;
      if (all.length >= 2) {
        map.fitBounds(all, { padding: [40, 40] });
      } else if (all.length === 1) {
        map.setView(all[0], 16);
      }
    }
  }, [fitTrigger, points, driverPos, map]);

  useEffect(() => {
    if (focusPos) {
      map.flyTo(focusPos, 18, { animate: true, duration: 0.6 });
    }
  }, [focusPos, map]);

  return null;
}

export default function GojekDriverCockpit({
  tugas,
  activeTarget,
  posSaya,
  radiusMeter = 20,
  muatanTruk,
  onMuatanChange,
  onQuickPickup,
  onSkipOverdue,
  onOpenFullForm,
  onSelectTarget,
  soundEnabled,
  onToggleSound,
  tripState = "idle",
  tripSeconds = 0,
  onStartTrip,
  onPauseTrip,
  onResumeTrip,
  onCompleteTrip,
  viewMode = "map",
  onViewModeChange,
  tanggal,
  onTanggalChange,
  selesaiCount,
  totalCount,
  percentComplete,
  onRadiusChange,
}: GojekDriverCockpitProps) {
  const [tileMode, setTileMode] = useState<MapTileType>("google-streets");
  const [centerTrigger, setCenterTrigger] = useState(0);
  const [fitTrigger, setFitTrigger] = useState(0);
  const [focusPos, setFocusPos] = useState<[number, number] | null>(null);

  // Showing & Hiding: 3 mode ("compact", "expanded", "hidden")
  const [sheetMode, setSheetMode] = useState<"compact" | "expanded" | "hidden">("compact");
  const [guidanceMode, setGuidanceMode] = useState<"compact" | "expanded" | "hidden">("compact");
  const [showCapacityPicker, setShowCapacityPicker] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [previewFoto, setPreviewFoto] = useState<string | null>(null);

  const driverCoords: [number, number] | null = posSaya
    ? [posSaya.lat, posSaya.lng]
    : null;

  // Filter tugas yang punya koordinat
  const validTasks = useMemo(
    () => tugas.filter((t) => t.latitude && t.longitude),
    [tugas]
  );
  const pendingTasks = useMemo(
    () => validTasks.filter((t) => t.status === "terjadwal"),
    [validTasks]
  );

  // Searching & Finding di antrean tugas
  const filteredQueue = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return pendingTasks;
    return pendingTasks.filter(
      (t) =>
        t.nama.toLowerCase().includes(q) ||
        t.kodePelanggan.toLowerCase().includes(q) ||
        t.alamat.toLowerCase().includes(q)
    );
  }, [pendingTasks, searchQuery]);

  // Target task (dari activeTarget atau pending task terdekat)
  const currentTask: GojekTugas | null = useMemo(() => {
    if (activeTarget) {
      const found = validTasks.find((t) => t.id === activeTarget.id);
      if (found) return found;
    }
    return pendingTasks[0] || validTasks[0] || null;
  }, [activeTarget, validTasks, pendingTasks]);

  // Jarak ke target saat ini
  const distanceToCurrent = useMemo(() => {
    if (!currentTask || !driverCoords) return null;
    return jarakMeter(driverCoords, [currentTask.latitude, currentTask.longitude]);
  }, [currentTask, driverCoords]);

  const isWithinRadius =
    distanceToCurrent !== null && distanceToCurrent <= radiusMeter;

  const currentIsMenunggak = Boolean(currentTask?.tunggakan?.isMenunggak);

  // Progres rute
  const totalCompleted = validTasks.filter((t) => t.status !== "terjadwal").length;
  const progressPercent =
    validTasks.length > 0
      ? Math.round((totalCompleted / validTasks.length) * 100)
      : 0;

  // 1. Tentukan tujuan berikutnya (pelanggan teratas di antrean)
  const nextDestination = pendingTasks[0] 
    ? [pendingTasks[0].latitude, pendingTasks[0].longitude] as [number, number] 
    : undefined;

  // 2. Ambil rute jalan raya nyata via OSRM
  const realRoadRoute = useRoadRoute(driverCoords, nextDestination);

  // Polyline rute dinamis (In-App Navigation) ke pelanggan pertama
  const routePoints = useMemo(() => {
    if (realRoadRoute.length > 0) {
      return realRoadRoute; // Gunakan rute jalan raya OSRM
    }
    // Fallback: Garis lurus biasa (as the crow flies)
    if (driverCoords && nextDestination) {
      return [driverCoords, nextDestination];
    }
    return [];
  }, [realRoadRoute, driverCoords, nextDestination]);

  // 3. Garis rute sisa antrean (Pelanggan 1 -> 2 -> 3 dst)
  const queuePoints = useMemo(() => {
    if (pendingTasks.length < 2) return [];
    const pts: [number, number][] = [];
    for (const t of pendingTasks) {
      pts.push([t.latitude, t.longitude]);
    }
    return pts;
  }, [pendingTasks]);

  // URLs Tindakan Gojek
  const waUrl = currentTask
    ? buildWhatsAppDriverUrl({
        phone: currentTask.noTelepon,
        nama: currentTask.nama,
        alamat: currentTask.alamat,
        patokan: currentTask.patokanLokasi,
        isMenunggak: currentIsMenunggak,
      })
    : null;

  const navUrl = currentTask
    ? buildNavigationUrl(currentTask.latitude, currentTask.longitude)
    : null;

  const telUrl = currentTask
    ? buildCallUrl(currentTask.noTelepon)
    : null;

  const tileConfig = useMemo(() => getMapTileConfig(tileMode), [tileMode]);

  // Handler hasil scan QR/Barcode
  function handleScanResult(code: string) {
    const match = validTasks.find(
      (t) =>
        t.kodePelanggan.toLowerCase() === code.toLowerCase() ||
        String(t.id) === code
    );
    if (match) {
      setFocusPos([match.latitude, match.longitude]);
      onSelectTarget?.(match.id);
      setSheetMode("compact");
      speakText(`Target ditemukan: ${match.nama}`);
      playSound("success");
      vibrate("success");
    } else {
      speakText(`Kode ${code} tidak ada di rute ini.`);
      alert(`Kode pelanggan "${code}" tidak ditemukan dalam antrean rute hari ini.`);
    }
  }

  return (
    <div
      className={`relative w-full overflow-hidden transition-all duration-300 select-none ${
        isFullscreen
          ? "fixed inset-0 z-[60] bg-slate-950 flex flex-col pt-safe pb-safe"
          : "h-full flex-1 w-full bg-slate-950 flex flex-col"
      }`}
    >
      {/* ── 1. GOJEK FLOATING DESTINATION GUIDANCE PILL (Hide / Open & Compact Toggle) ── */}
      {currentTask && sheetMode !== "expanded" && (
        <>
          {/* Mode 1: Hidden Mini-Button (Restorable with 1 tap) */}
          {guidanceMode === "hidden" && (
            <div className="absolute top-2 left-2 z-[400] pointer-events-auto animate-in fade-in duration-150">
              <button
                type="button"
                onClick={() => setGuidanceMode("compact")}
                className="px-2.5 py-1 bg-slate-950/90 hover:bg-slate-900 backdrop-blur-md text-white border border-slate-700 rounded-xl text-[10px] font-bold shadow-lg flex items-center gap-1.5 active:scale-95 transition-all"
                title="Tampilkan info target pelanggan"
              >
                <span>🎯 Target: {currentTask.nama.split(" ")[0]}</span>
                {distanceToCurrent !== null && (
                  <span className="text-emerald-400 font-mono text-[9px]">{distanceToCurrent}m</span>
                )}
                <span className="text-slate-400">▾</span>
              </button>
            </div>
          )}

          {/* Mode 2: Compact Single-Line Pill (Zero Obtrusion & Clean Margin) */}
          {guidanceMode === "compact" && (
            <div className="absolute top-2 left-2 right-14 sm:right-16 z-[400] pointer-events-none animate-in fade-in duration-150">
              <div className="pointer-events-auto bg-slate-950/90 backdrop-blur-md rounded-xl px-2.5 py-1.5 border border-slate-800 shadow-xl flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <div className="w-5.5 h-5.5 rounded-lg bg-gradient-to-br from-emerald-700 to-teal-700 flex items-center justify-center text-white text-[10px] shadow-sm shrink-0 font-black">
                    <span aria-hidden="true">{isWithinRadius ? "🎯" : "⬆️"}</span>
                  </div>
                  <div className="min-w-0 flex-1 flex items-center gap-1.5 truncate">
                    <span className="text-xs font-black text-white truncate max-w-[120px] sm:max-w-xs">
                      {currentTask.nama}
                    </span>
                    {distanceToCurrent !== null && (
                      <span className="text-[10px] font-bold text-emerald-400 font-mono shrink-0">
                        {isWithinRadius ? "Tiba!" : `${distanceToCurrent}m`}
                      </span>
                    )}
                    {currentIsMenunggak && (
                      <span className="px-1.5 py-0.2 rounded text-[8px] font-black bg-rose-600 text-white animate-pulse shrink-0">
                        MENUNGGAK
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setFocusPos([currentTask.latitude, currentTask.longitude]);
                      if (sheetMode === "hidden") setSheetMode("compact");
                    }}
                    className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-white text-[9px] font-bold rounded-lg border border-slate-700 active:scale-95"
                    title="Fokus ke Rumah Pelanggan"
                  >
                    Fokus
                  </button>
                  <button
                    type="button"
                    onClick={() => setGuidanceMode("expanded")}
                    className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[9px] font-bold rounded-lg border border-slate-700"
                    title="Buka Detail Alamat"
                  >
                    Detail ▾
                  </button>
                  <button
                    type="button"
                    onClick={() => setGuidanceMode("hidden")}
                    className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white text-[10px] rounded-lg transition-colors"
                    title="Sembunyikan Target"
                    aria-label="Sembunyikan target"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Mode 3: Expanded Full Guidance Card (Detailed Info & Alerts) */}
          {guidanceMode === "expanded" && (
            <div className="absolute top-2 left-2 right-14 sm:right-16 z-[400] pointer-events-none space-y-1 animate-in fade-in duration-150">
              <div className="pointer-events-auto bg-slate-950/95 backdrop-blur-md rounded-xl p-2.5 border border-slate-800 shadow-xl space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-700 to-teal-700 flex items-center justify-center text-white text-xs shadow-md shrink-0 font-black">
                      <span aria-hidden="true">{isWithinRadius ? "🎯" : "⬆️"}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-black text-white tracking-tight truncate max-w-[130px] sm:max-w-xs">
                          {currentTask.nama}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-400 font-mono shrink-0">
                          {distanceToCurrent !== null
                            ? isWithinRadius
                              ? "Tiba!"
                              : `${distanceToCurrent}m`
                            : ""}
                        </span>
                        {currentIsMenunggak ? (
                          <span className="px-1.5 py-0.2 rounded text-[8px] font-black bg-rose-600 text-white animate-pulse">
                            MENUNGGAK
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded text-[8px] font-black bg-emerald-700/80 text-white">
                            LUNAS
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                        {currentTask.patokanLokasi ? `📍 ${currentTask.patokanLokasi}` : currentTask.alamat}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setFocusPos([currentTask.latitude, currentTask.longitude]);
                        if (sheetMode === "hidden") setSheetMode("compact");
                      }}
                      className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-bold rounded-lg border border-slate-700 active:scale-95 transition-transform"
                      title="Fokus ke Rumah Pelanggan"
                    >
                      Fokus
                    </button>
                    <button
                      type="button"
                      onClick={() => setGuidanceMode("compact")}
                      className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-bold rounded-lg border border-slate-700"
                      title="Ciutkan Panel"
                    >
                      Ciutkan ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => setGuidanceMode("hidden")}
                      className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white text-[10px] rounded-lg"
                      title="Sembunyikan Target"
                      aria-label="Sembunyikan target"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Warning Alert inside Expanded Card */}
                {muatanTruk >= 75 && (
                  <div className="bg-amber-500/90 text-slate-950 px-2 py-0.5 rounded-lg text-[10px] font-extrabold flex items-center justify-between">
                    <span>⚠️ Truk {muatanTruk}% — Segera ke Titik Transit bila penuh!</span>
                    <span className="text-xs">🚛</span>
                  </div>
                )}

                {currentIsMenunggak && (
                  <div className="bg-rose-700/90 text-white px-2 py-0.5 rounded-lg text-[10px] font-extrabold flex items-center justify-between animate-pulse">
                    <span>
                      ⛔ Menunggak {currentTask.tunggakan?.jumlahBulan} bln ({formatRupiah(currentTask.tunggakan?.totalNominal || 0)}). Jangan angkut!
                    </span>
                    <span className="text-xs">⚠️</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── 2. FULLSCREEN LEAFLET MAP CANVAS ── */}
      <div className="absolute inset-0 z-0">
        <MapContainer
          center={driverCoords ?? (validTasks[0] ? [validTasks[0].latitude, validTasks[0].longitude] : PUSAT_DEPOK)}
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

          <MapCamera
            points={validTasks.map((t) => [t.latitude, t.longitude])}
            driverPos={driverCoords}
            centerTrigger={centerTrigger}
            fitTrigger={fitTrigger}
            focusPos={focusPos}
          />

          {/* 1. Rute Antrean Sisa (Pelanggan 1 ke Pelanggan 2, dst) */}
          {queuePoints.length >= 2 && (
            <Polyline
              positions={queuePoints}
              pathOptions={{
                color: "#94A3B8", // Slate / abu-abu terang
                weight: 3,
                dashArray: "4, 8",
                opacity: 0.8,
                lineCap: "round",
              }}
            />
          )}

          {/* 2. Rute Jalan Utama (In-App Navigation ke Pelanggan 1) */}
          {routePoints.length >= 2 && (
            <>
              {/* Outer Glow / Shadow (Lebih tebal) */}
              <Polyline
                positions={routePoints}
                pathOptions={{
                  color: "#059669", // Hijau gelap
                  weight: 10,
                  opacity: 0.35,
                  lineCap: "round",
                  lineJoin: "round",
                }}
              />
              {/* Inner Solid Line (Garis jalan utama yang solid, bukan putus-putus) */}
              <Polyline
                positions={routePoints}
                pathOptions={{
                  color: "#00AA13", // Hijau terang (Gojek)
                  weight: 5,
                  opacity: 1,
                  lineCap: "round",
                  lineJoin: "round",
                }}
              />
            </>
          )}

          {/* Radar Proximity Circle (Driver Geofence) */}
          {driverCoords && (
            <>
              <Circle
                center={driverCoords}
                radius={radiusMeter}
                pathOptions={{
                  color: "#00AA13",
                  fillColor: "#00AA13",
                  fillOpacity: 0.12,
                  weight: 2,
                  dashArray: "4, 6",
                }}
              />
              <Marker position={driverCoords} icon={buatPinDriver()} />
            </>
          )}

          {/* Customer House Markers */}
          {validTasks.map((t, idx) => (
            <Marker
              key={`pin-${t.id}`}
              position={[t.latitude, t.longitude]}
              icon={buatPinRumah(t, idx, currentTask?.id === t.id)}
              eventHandlers={{
                click: () => {
                  setFocusPos([t.latitude, t.longitude]);
                  onSelectTarget?.(t.id);
                  if (sheetMode === "hidden") setSheetMode("compact");
                },
              }}
            />
          ))}
        </MapContainer>

        {/* ── 3. FLOATING ACTION BUTTONS (FABS) ── */}
        <div className="absolute right-2 top-2 z-[400] flex flex-col gap-1.5">
          {/* Layer Mode Cycle Button */}
          <button
            type="button"
            onClick={() => {
              setTileMode((m) =>
                m === "google-streets" ? "google-hybrid" : m === "google-hybrid" ? "dark" : "google-streets"
              );
            }}
            className="w-8.5 h-8.5 rounded-xl bg-slate-900/90 backdrop-blur-md hover:bg-slate-800 active:scale-95 text-white border border-slate-700 shadow-md flex items-center justify-center text-xs font-bold transition-all"
            aria-label="Ganti mode peta"
            title={`Mode Peta: ${tileMode === "google-streets" ? "Jalan" : tileMode === "google-hybrid" ? "Satelit" : "Gelap"}`}
          >
            <span aria-hidden="true">{tileMode === "google-streets" ? "🗺️" : tileMode === "google-hybrid" ? "🛰️" : "🌙"}</span>
          </button>

          {/* Center on Me */}
          <button
            type="button"
            onClick={() => setCenterTrigger((c) => c + 1)}
            className="w-8.5 h-8.5 rounded-xl bg-slate-900/90 backdrop-blur-md hover:bg-slate-800 active:scale-95 text-white border border-slate-700 shadow-md flex items-center justify-center text-xs transition-all"
            aria-label="Pusatkan ke lokasi saya"
            title="Pusatkan Lokasi Saya"
          >
            <span aria-hidden="true">🎯</span>
          </button>

          {/* Fit Route */}
          <button
            type="button"
            onClick={() => setFitTrigger((f) => f + 1)}
            className="w-8.5 h-8.5 rounded-xl bg-slate-900/90 backdrop-blur-md hover:bg-slate-800 active:scale-95 text-white border border-slate-700 shadow-md flex items-center justify-center text-xs transition-all"
            aria-label="Tampilkan seluruh rute"
            title="Tampilkan Seluruh Rute"
          >
            <span aria-hidden="true">📍</span>
          </button>

          {/* Capacity Truck Badge Toggle */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowCapacityPicker(!showCapacityPicker)}
              className={`w-8.5 h-8.5 rounded-xl border flex flex-col items-center justify-center shadow-md transition-all active:scale-95 ${
                muatanTruk >= 100
                  ? "bg-rose-600 border-rose-400 text-white animate-pulse"
                  : "bg-slate-900/90 backdrop-blur-md border-slate-700 text-slate-200"
              }`}
              aria-label={`Kapasitas muatan bak truk ${muatanTruk} persen`}
              aria-expanded={showCapacityPicker}
              title="Kapasitas Muatan Bak Truk"
            >
              <span aria-hidden="true" className="text-[9px]">🚛</span>
              <span className="text-[8px] font-black leading-none">{muatanTruk}%</span>
            </button>

            {showCapacityPicker && (
              <div className="absolute right-full mr-1.5 top-0 bg-slate-900 border border-slate-700 rounded-xl p-1 shadow-2xl w-24 space-y-0.5 z-[450]">
                {[25, 50, 75, 100].map((persen) => (
                  <button
                    key={persen}
                    type="button"
                    onClick={() => {
                      onMuatanChange(persen);
                      setShowCapacityPicker(false);
                    }}
                    className={`w-full py-0.5 px-1.5 rounded-lg text-[11px] font-bold text-left transition-colors flex items-center justify-between ${
                      muatanTruk === persen
                        ? "bg-emerald-700 text-white"
                        : "hover:bg-slate-800 text-slate-300"
                    }`}
                  >
                    <span>{persen}%</span>
                    {muatanTruk === persen && <span>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Showing & Hiding: Sembunyikan / Buka Panel Bawah */}
          <button
            type="button"
            onClick={() => {
              setSheetMode((prev) => (prev === "hidden" ? "compact" : "hidden"));
            }}
            className={`w-8.5 h-8.5 rounded-xl backdrop-blur-md active:scale-95 border shadow-md flex items-center justify-center text-xs font-bold transition-all ${
              sheetMode === "hidden"
                ? "bg-emerald-700/90 hover:bg-emerald-800 text-white border-emerald-600 ring-2 ring-emerald-500/40 animate-pulse"
                : "bg-slate-900/90 hover:bg-slate-800 text-slate-300 border-slate-700"
            }`}
            aria-label={sheetMode === "hidden" ? "Buka panel penjemputan" : "Sembunyikan panel penjemputan"}
            title={sheetMode === "hidden" ? "Buka Panel Penjemputan (▲)" : "Sembunyikan Panel Penjemputan (✕)"}
          >
            <span aria-hidden="true">{sheetMode === "hidden" ? "📋" : "✕"}</span>
          </button>
        </div>
      </div>

      {/* ── 4. FLOATING MINI-PILL KETIKA PANEL DI-HIDE (Showing & Hiding: Target & Standby) ── */}
      {sheetMode === "hidden" && (
        <div className="absolute bottom-2 inset-x-3 z-[500] pointer-events-auto animate-in slide-in-from-bottom-2 duration-200">
          <button
            type="button"
            onClick={() => setSheetMode("compact")}
            className="w-full bg-slate-950/95 backdrop-blur-md border border-slate-700 hover:border-emerald-500/60 p-2.5 rounded-2xl text-white shadow-2xl flex items-center justify-between gap-2 active:scale-95 transition-all"
            title={currentTask ? "Buka panel penjemputan" : "Buka panel armada standby"}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 animate-pulse ${
                  currentTask ? "bg-emerald-400" : "bg-amber-400"
                }`}
              />
              <div className="min-w-0 text-left">
                {currentTask ? (
                  <>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-black truncate">{currentTask.nama}</p>
                      {distanceToCurrent !== null && (
                        <span className="text-[10px] font-bold text-emerald-400 font-mono shrink-0">
                          {isWithinRadius ? "🎯 Tiba!" : `${distanceToCurrent}m`}
                        </span>
                      )}
                      {currentIsMenunggak && (
                        <span className="px-1 py-0.2 rounded text-[8px] font-black bg-rose-600 text-white shrink-0">
                          MENUNGGAK
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">
                      {currentTask.patokanLokasi ? `📍 ${currentTask.patokanLokasi}` : currentTask.alamat}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-black text-white">Armada Standby</p>
                      <span className="px-1.5 py-0.2 rounded text-[8px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Standby
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">
                      Tidak ada antrean rute • Peta & GPS aktif
                    </p>
                  </>
                )}
              </div>
            </div>
            <span className="text-[11px] font-bold text-emerald-300 bg-emerald-950/90 px-3 py-1.5 rounded-xl border border-emerald-800/80 shrink-0 flex items-center gap-1 shadow-sm">
              <span>Buka Panel</span>
              <span aria-hidden="true">▲</span>
            </span>
          </button>
        </div>
      )}

      {/* ── 5. AUTHENTIC BOTTOM SHEET (COMPACT & EXPANDED QUEUE) ── */}
      {sheetMode !== "hidden" && (
        <motion.div
          layout
          onPanEnd={(e, { offset, velocity }) => {
            if (offset.y < -20 || velocity.y < -300) {
              setSheetMode("expanded");
            } else if (offset.y > 40 || velocity.y > 400) {
              if (sheetMode === "expanded") {
                setSheetMode("compact");
              } else {
                setSheetMode("hidden");
              }
            }
          }}
          className="absolute bottom-0 left-0 right-0 z-[500] bg-slate-950 border-t border-slate-800 p-3 sm:p-4 shadow-[0_-12px_40px_rgba(0,0,0,0.6)] space-y-2.5 rounded-t-3xl pb-safe"
        >
          {/* Gojek Pull Handle Indicator */}
          <div
            onClick={() => {
              setSheetMode(sheetMode === "expanded" ? "compact" : "expanded");
            }}
            className="cursor-pointer py-1.5 -mt-2 -mx-4 mb-0.5 flex justify-center w-[calc(100%_+_2rem)]"
            title={sheetMode === "expanded" ? "Tutup Antrean" : "Buka Antrean"}
          >
            <div className="w-12 h-1.5 bg-slate-600/80 rounded-full hover:bg-slate-500 transition-colors" />
          </div>

          {currentTask ? (
            <>
              {/* Row 1: Trip Status & Multi-Drop Counter + Explicit Hide / Open Buttons */}
              <motion.div layout className="flex items-center justify-between text-xs gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider truncate ${
                      currentIsMenunggak
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse"
                        : isWithinRadius
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        : "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        currentIsMenunggak
                          ? "bg-rose-500"
                          : isWithinRadius
                          ? "bg-emerald-400 animate-ping"
                          : "bg-sky-400"
                      }`}
                    />
                    <span className="truncate">
                      {currentIsMenunggak
                        ? "⛔ MENUNGGAK"
                        : isWithinRadius
                        ? "🎯 SIAP PICKUP"
                        : "TUJUAN JEMPUT"}
                    </span>
                  </span>
                </div>

                {/* Explicit Action Controls: Toggle Queue Drawer + Hide Panel */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setSheetMode(sheetMode === "expanded" ? "compact" : "expanded");
                    }}
                    aria-expanded={sheetMode === "expanded"}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1 ${
                      sheetMode === "expanded"
                        ? "bg-emerald-700 text-white border-emerald-600 shadow-sm"
                        : "bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700"
                    }`}
                    title={sheetMode === "expanded" ? "Tutup Antrean Rute" : "Buka Antrean Rute"}
                  >
                    <span>Stop #{totalCompleted + 1}/{validTasks.length}</span>
                    <span aria-hidden="true">{sheetMode === "expanded" ? "▼" : "▲"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSheetMode("hidden")}
                    className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 active:scale-95 transition-all flex items-center gap-1"
                    title="Sembunyikan panel (tampilkan peta penuh)"
                  >
                    <span>Sembunyikan</span>
                    <span aria-hidden="true">✕</span>
                  </button>
                </div>
              </motion.div>

              {/* Row 2: Customer Identity & Contact Action Buttons */}
              <motion.div layout className="flex items-start justify-between gap-2 mt-1">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-black text-white truncate max-w-[160px] sm:max-w-sm tracking-wide">
                      {currentTask.nama}
                    </h3>
                    <span className="text-[10px] sm:text-xs font-mono font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-700 shrink-0 shadow-sm">
                      {currentTask.kodePelanggan}
                    </span>
                    {currentTask.fotoRumah && (
                      <button
                        type="button"
                        onClick={() => setPreviewFoto(currentTask.fotoRumah!)}
                        className="text-xs text-emerald-400 underline font-bold shrink-0 p-1 active:scale-95"
                      >
                        [Foto]
                      </button>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm text-slate-300 line-clamp-2 leading-snug">
                    {currentTask.alamat}
                  </p>

                  {currentTask.patokanLokasi && (
                    <p className="text-[11px] sm:text-xs text-amber-300 font-bold truncate bg-amber-950/30 inline-block px-1.5 py-0.5 rounded">
                      📍 Patokan: {currentTask.patokanLokasi}
                    </p>
                  )}

                  {/* Pricing / Tunggakan Tag if Overdue */}
                  {currentIsMenunggak && (
                    <div className="pt-1">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-rose-950/90 text-rose-300 border border-rose-800 text-[10px] font-bold shadow-sm shadow-rose-900/20">
                        ⚠️ Menunggak {currentTask.tunggakan?.jumlahBulan} Bln ({formatRupiah(currentTask.tunggakan?.totalNominal || 0)})
                      </span>
                    </div>
                  )}
                </div>

                {/* Circular Action Buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Google Maps Navigation */}
                  {navUrl && (
                    <a
                      href={navUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-900 hover:bg-slate-800 active:scale-90 text-slate-100 border border-slate-700 flex items-center justify-center text-sm transition-all shadow-md"
                      title="Navigasi Google Maps"
                    >
                      🧭
                    </a>
                  )}

                  {/* WhatsApp Warga */}
                  {waUrl && (
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#00AA13] hover:bg-[#00880C] active:scale-90 text-white flex items-center justify-center text-sm transition-all shadow-lg shadow-[#00AA13]/40"
                      title="Chat WhatsApp Warga"
                    >
                      💬
                    </a>
                  )}

                  {/* Phone Call Button */}
                  {telUrl && (
                    <a
                      href={telUrl}
                      className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-sky-600 hover:bg-sky-500 active:scale-90 text-white flex items-center justify-center text-xs transition-all shadow-lg shadow-sky-600/40"
                      title="Telepon Langsung"
                    >
                      📞
                    </a>
                  )}
                </div>
              </motion.div>

              {/* Row 3: Swipe Slider To Confirm */}
              <motion.div layout className="pt-1">
                {currentIsMenunggak ? (
                  <SlideToConfirm
                    variant="danger"
                    text="Geser Lewati (Menunggak)"
                    successText="Mencatat Lewati..."
                    onConfirm={async () => {
                      const catatan = `Dilewati otomatis: Konsumen menunggak ${
                        currentTask.tunggakan?.jumlahBulan || 1
                      } bulan`;
                      await onSkipOverdue(currentTask.id, catatan);
                    }}
                  />
                ) : (
                  <SlideToConfirm
                    variant="success"
                    text="Geser Jika Sudah Diangkut"
                    successText="Menyelesaikan..."
                    onConfirm={async () => {
                      await onQuickPickup(currentTask.id);
                    }}
                  />
                )}
              </motion.div>
            </>
          ) : validTasks.length === 0 ? (
            <motion.div layout className="space-y-2.5">
              {/* Header: Badge & Explicit Sembunyikan button */}
              <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-800/80">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                  <span>ARMADA STANDBY</span>
                </span>
                <button
                  type="button"
                  onClick={() => setSheetMode("hidden")}
                  className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 active:scale-95 transition-all flex items-center gap-1"
                  title="Sembunyikan panel (tampilkan peta penuh)"
                >
                  <span>Sembunyikan</span>
                  <span aria-hidden="true">✕</span>
                </button>
              </div>

              <div className="py-1.5 text-center space-y-1">
                <div className="w-9 h-9 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 flex items-center justify-center mx-auto text-base shadow-inner">
                  🚛
                </div>
                <p className="font-black text-white text-sm">Armada Standby</p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  Tidak ada jadwal rute penjemputan pada tanggal ini. Peta tetap aktif memantau pergerakan GPS armada Anda.
                </p>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setSheetMode("hidden")}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-bold border border-slate-800 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <span>Sembunyikan Panel & Buka Peta Penuh</span>
                  <span aria-hidden="true">✕</span>
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div layout className="space-y-2.5">
              {/* Header: Badge & Explicit Sembunyikan button */}
              <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-800/80">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  <span>RUTE SELESAI</span>
                </span>
                <button
                  type="button"
                  onClick={() => setSheetMode("hidden")}
                  className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 active:scale-95 transition-all flex items-center gap-1"
                  title="Sembunyikan panel (tampilkan peta penuh)"
                >
                  <span>Sembunyikan</span>
                  <span aria-hidden="true">✕</span>
                </button>
              </div>

              <div className="py-1.5 text-center space-y-1">
                <p className="font-bold text-white text-sm">Semua Penjemputan Selesai! 🎉</p>
                <p className="text-[11px] text-slate-400">
                  Tidak ada lagi rumah yang menunggu pengangkutan pada jadwal ini.
                </p>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setSheetMode("hidden")}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-bold border border-slate-800 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <span>Sembunyikan Panel & Buka Peta Penuh</span>
                  <span aria-hidden="true">✕</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* ── 6. EXPANDABLE MULTI-STOP QUEUE DRAWER DENGAN SEARCHING & FINDING ── */}
          <AnimatePresence initial={false}>
            {sheetMode === "expanded" && pendingTasks.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="pt-3 border-t border-slate-800 space-y-2.5 max-h-[34vh] sm:max-h-[40vh] overflow-y-auto overscroll-contain">
                  {/* Header Drawer */}
                  <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center justify-between pb-1">
                    <span>Urutan Antrean ({pendingTasks.length} Titik) • {progressPercent}% Selesai</span>
                    <button
                      type="button"
                      onClick={() => setSheetMode("compact")}
                      className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-bold border border-slate-700 flex items-center gap-1 active:scale-95 transition-all"
                      title="Tutup Antrean (kembali ke panel ringkas)"
                    >
                      <span>Tutup Antrean</span>
                      <span aria-hidden="true">✕</span>
                    </button>
                  </div>

                  {/* Search Bar inside Drawer (Searching & Finding) */}
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari nama pelanggan, kode, atau alamat..."
                      aria-label="Cari antrean tugas"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        aria-label="Bersihkan pencarian"
                        className="absolute right-2 top-1.5 h-6 w-6 flex items-center justify-center rounded-lg text-xs text-slate-400 hover:text-white"
                      >
                        <span aria-hidden="true">✕</span>
                      </button>
                    )}
                  </div>

                  {/* List Queue */}
                  <div className="space-y-1.5 pb-2">
                    {filteredQueue.map((t, i) => {
                      const isSelected = currentTask?.id === t.id;
                      const d =
                        driverCoords && t.latitude && t.longitude
                          ? jarakMeter(driverCoords, [t.latitude, t.longitude])
                          : null;

                      return (
                        <div
                          key={`queue-${t.id}`}
                          onClick={() => {
                            setFocusPos([t.latitude, t.longitude]);
                            onSelectTarget?.(t.id);
                          }}
                          className={`p-2.5 rounded-2xl transition-all cursor-pointer flex items-center justify-between gap-2 border ${
                            isSelected
                              ? "bg-slate-900 border-emerald-500/60 ring-1 ring-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                              : "bg-slate-900/60 hover:bg-slate-900 border-slate-800"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                                t.tunggakan?.isMenunggak
                                  ? "bg-rose-600 text-white shadow-[0_0_10px_rgba(225,29,72,0.3)]"
                                  : "bg-emerald-700 text-white shadow-[0_0_10px_rgba(4,120,87,0.3)]"
                              }`}
                            >
                              {i + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white truncate">
                                {t.nama}
                              </p>
                              <p className="text-[10px] text-slate-400 truncate">
                                {t.alamat}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {d !== null && (
                              <span className="text-[10px] font-semibold text-slate-300 bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-700">
                                {d}m
                              </span>
                            )}
                            {t.tunggakan?.isMenunggak && (
                              <span className="text-[10px] font-black text-rose-300 bg-rose-950 px-1.5 py-0.5 rounded-lg border border-rose-900">
                                ⛔
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ── 7. QR / BARCODE SCANNER MODAL (Scanning) ── */}
      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleScanResult}
      />

      {/* ── 8. FOTO RUMAH MODAL PREVIEW ── */}
      {previewFoto && (
        <div
          onClick={() => setPreviewFoto(null)}
          className="fixed inset-0 z-[1200] bg-black/90 flex items-center justify-center p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-label="Pratinjau foto rumah pelanggan"
        >
          <div className="relative max-w-sm w-full bg-slate-900 rounded-3xl overflow-hidden border border-slate-700 shadow-2xl p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">Foto Rumah Pelanggan</span>
              <button
                type="button"
                onClick={() => setPreviewFoto(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                ✕ Tutup
              </button>
            </div>
            <div className="relative w-full h-64 rounded-2xl overflow-hidden bg-black">
              <Image
                src={previewFoto}
                alt="Foto Rumah Warga"
                fill
                className="object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
