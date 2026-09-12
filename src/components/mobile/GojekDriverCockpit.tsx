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
import { motion, AnimatePresence } from "framer-motion";
import SlideToConfirm from "./SlideToConfirm";
import { getMapTileConfig, type MapTileType } from "@/lib/map-tile";
import { formatRupiah } from "@/lib/utils";
import { jarakMeter } from "@/lib/geo";
import {
  buildWhatsAppDriverUrl,
  buildNavigationUrl,
  buildCallUrl,
} from "@/lib/driver-actions";
import type { ProximityTugas } from "@/hooks/useProximityPickup";

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
};

const PUSAT_DEPOK: [number, number] = [-6.424838, 106.832667];

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
}: GojekDriverCockpitProps) {
  const [tileMode, setTileMode] = useState<MapTileType>("google-streets");
  const [centerTrigger, setCenterTrigger] = useState(0);
  const [fitTrigger, setFitTrigger] = useState(0);
  const [focusPos, setFocusPos] = useState<[number, number] | null>(null);
  const [showQueueSheet, setShowQueueSheet] = useState(false);
  const [showCapacityPicker, setShowCapacityPicker] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
  const totalCompleted = validTasks.filter((t) => t.status === "diambil").length;
  const progressPercent =
    validTasks.length > 0
      ? Math.round((totalCompleted / validTasks.length) * 100)
      : 0;

  // Route Polyline Trajectory (Driver -> Target -> Rest of stops)
  const routePoints = useMemo(() => {
    const pts: [number, number][] = [];
    if (driverCoords) pts.push(driverCoords);
    for (const t of pendingTasks) {
      pts.push([t.latitude, t.longitude]);
    }
    return pts.length >= 2 ? pts : [];
  }, [driverCoords, pendingTasks]);

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

  return (
    <div
      className={`relative w-full overflow-hidden transition-all duration-300 select-none ${
        isFullscreen
          ? "fixed inset-0 z-50 bg-slate-950 flex flex-col"
          : "h-[75vh] sm:h-[80vh] min-h-[520px] rounded-3xl border border-slate-800 shadow-2xl bg-slate-950 flex flex-col"
      }`}
    >
      {/* ── 1. GOJEK FLOATING TOP NAVIGATION INSTRUCTION BANNER ── */}
      <div className="absolute top-3 inset-x-3 z-[400] pointer-events-none">
        <div className="pointer-events-auto bg-slate-950/95 backdrop-blur-md rounded-2xl p-3 border border-slate-800 shadow-2xl flex items-center justify-between gap-2.5">
          {/* Direction Icon & Next Step Guidance */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xl shadow-lg shadow-emerald-600/40 shrink-0 font-black">
              {isWithinRadius ? "🎯" : "⬆️"}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-white tracking-tight">
                  {distanceToCurrent !== null
                    ? isWithinRadius
                      ? "Tiba di Lokasi! (Siap Angkut)"
                      : `${distanceToCurrent}m lagi`
                    : "Memantau Rute..."}
                </span>
                {currentIsMenunggak && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-rose-600 text-white animate-pulse">
                    ⛔ MENUNGGAK
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 font-medium truncate">
                {currentTask
                  ? `${currentTask.nama} • ${currentTask.alamat}`
                  : "Belum ada antrean tugas"}
              </p>
            </div>
          </div>

          {/* Controls: Sound & Fullscreen */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onToggleSound}
              className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold border transition-colors ${
                soundEnabled
                  ? "bg-emerald-950 text-emerald-400 border-emerald-700"
                  : "bg-slate-900 text-slate-500 border-slate-800"
              }`}
              title={soundEnabled ? "Suara Aktif" : "Mute"}
            >
              {soundEnabled ? "🔊" : "🔇"}
            </button>

            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="w-8 h-8 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 flex items-center justify-center text-xs font-bold transition-all active:scale-95"
              title="Layar Penuh"
            >
              {isFullscreen ? "✕" : "⤢"}
            </button>
          </div>
        </div>
      </div>

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

          {/* Glow Trajectory Route Polyline */}
          {routePoints.length >= 2 && (
            <>
              <Polyline
                positions={routePoints}
                pathOptions={{
                  color: "#059669",
                  weight: 8,
                  opacity: 0.35,
                  lineCap: "round",
                }}
              />
              <Polyline
                positions={routePoints}
                pathOptions={{
                  color: "#00AA13",
                  weight: 4,
                  dashArray: "6, 10",
                  opacity: 0.95,
                  lineCap: "round",
                }}
              />
            </>
          )}

          {/* Posisi Driver Truk dengan Radar Pulse */}
          {driverCoords && (
            <>
              <Marker position={driverCoords} icon={buatPinDriver()} />
              <Circle
                center={driverCoords}
                radius={radiusMeter}
                pathOptions={{
                  color: "#00AA13",
                  fillColor: "#00AA13",
                  fillOpacity: 0.18,
                  weight: 2,
                  dashArray: "4, 6",
                }}
              />
            </>
          )}

          {/* Marker Titik Pelanggan */}
          {validTasks.map((t, idx) => (
            <Marker
              key={`gojek-pin-${t.id}`}
              position={[t.latitude, t.longitude]}
              icon={buatPinRumah(t, idx, currentTask?.id === t.id)}
              eventHandlers={{
                click: () => {
                  setFocusPos([t.latitude, t.longitude]);
                  onSelectTarget?.(t.id);
                },
              }}
            />
          ))}
        </MapContainer>

        {/* ── 3. GOJEK FLOATING RIGHT ACTION BUTTONS (FABS) ── */}
        <div className="absolute right-3 top-20 z-[400] flex flex-col gap-2">
          {/* Layer Selector */}
          <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl p-1 border border-slate-700 shadow-xl flex flex-col gap-1">
            <button
              type="button"
              onClick={() => setTileMode("google-streets")}
              className={`p-2 rounded-xl text-xs font-bold transition-all ${
                tileMode === "google-streets"
                  ? "bg-emerald-500 text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Mode Peta Jalan"
            >
              🗺️
            </button>
            <button
              type="button"
              onClick={() => setTileMode("google-hybrid")}
              className={`p-2 rounded-xl text-xs font-bold transition-all ${
                tileMode === "google-hybrid"
                  ? "bg-emerald-500 text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Mode Satelit Udara"
            >
              🛰️
            </button>
            <button
              type="button"
              onClick={() => setTileMode("dark")}
              className={`p-2 rounded-xl text-xs font-bold transition-all ${
                tileMode === "dark"
                  ? "bg-emerald-500 text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Mode Malam"
            >
              🌙
            </button>
          </div>

          {/* Center on Me */}
          <button
            type="button"
            onClick={() => setCenterTrigger((c) => c + 1)}
            className="w-11 h-11 rounded-2xl bg-slate-900/95 hover:bg-slate-800 active:scale-95 text-white border border-slate-700 shadow-2xl flex items-center justify-center text-lg transition-all"
            title="Pusatkan Lokasi Saya"
          >
            🎯
          </button>

          {/* Fit Route */}
          <button
            type="button"
            onClick={() => setFitTrigger((f) => f + 1)}
            className="w-11 h-11 rounded-2xl bg-slate-900/95 hover:bg-slate-800 active:scale-95 text-white border border-slate-700 shadow-2xl flex items-center justify-center text-sm font-black transition-all"
            title="Tampilkan Seluruh Rute"
          >
            📍
          </button>

          {/* Capacity Truck Badge Toggle */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowCapacityPicker(!showCapacityPicker)}
              className={`w-11 h-11 rounded-2xl border flex flex-col items-center justify-center shadow-xl transition-all ${
                muatanTruk >= 100
                  ? "bg-rose-600 border-rose-400 text-white animate-pulse"
                  : "bg-slate-900/95 border-slate-700 text-slate-200"
              }`}
              title="Kapasitas Muatan Bak Truk"
            >
              <span className="text-[10px]">🚛</span>
              <span className="text-[9px] font-black">{muatanTruk}%</span>
            </button>

            {showCapacityPicker && (
              <div className="absolute right-full mr-2 top-0 bg-slate-900 border border-slate-700 rounded-2xl p-1.5 shadow-2xl w-32 space-y-1">
                {[25, 50, 75, 100].map((persen) => (
                  <button
                    key={persen}
                    type="button"
                    onClick={() => {
                      onMuatanChange(persen);
                      setShowCapacityPicker(false);
                    }}
                    className={`w-full py-1 px-2 rounded-xl text-xs font-bold text-left transition-colors flex items-center justify-between ${
                      muatanTruk === persen
                        ? "bg-emerald-600 text-white"
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
        </div>
      </div>

      {/* ── 4. THE AUTHENTIC GOJEK DRIVER BOTTOM SHEET ── */}
      <motion.div
        layout
        onPanEnd={(e, { offset, velocity }) => {
          if (offset.y < -20 || velocity.y < -300) {
            setShowQueueSheet(true);
          } else if (offset.y > 20 || velocity.y > 300) {
            setShowQueueSheet(false);
          }
        }}
        className="absolute bottom-0 left-0 right-0 z-[500] bg-slate-950 border-t border-slate-800 p-4 shadow-[0_-12px_40px_rgba(0,0,0,0.6)] space-y-3 rounded-t-3xl"
        style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
      >
        {/* Gojek Pull Handle Indicator */}
        <div
          onClick={() => setShowQueueSheet(!showQueueSheet)}
          className="cursor-pointer py-3 -mt-3 -mx-4 mb-1 flex justify-center w-[calc(100%+2rem)]"
        >
          <div className="w-12 h-1.5 bg-slate-600/80 rounded-full" />
        </div>

        {currentTask ? (
          <>
            {/* Row 1: Trip Status & Multi-Drop Counter */}
            <motion.div layout className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    currentIsMenunggak
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse"
                      : isWithinRadius
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      currentIsMenunggak
                        ? "bg-rose-500"
                        : isWithinRadius
                        ? "bg-emerald-400 animate-ping"
                        : "bg-sky-400"
                    }`}
                  />
                  <span>
                    {currentIsMenunggak
                      ? "⛔ JANGAN ANGKUT (MENUNGGAK)"
                      : isWithinRadius
                      ? "🎯 SIAP PICKUP DI LOKASI"
                      : "TUJUAN PENJEMPUTAN"}
                  </span>
                </span>
              </div>

              {/* Progress Count */}
              <button
                type="button"
                onClick={() => setShowQueueSheet(!showQueueSheet)}
                className="text-slate-400 hover:text-white text-[11px] font-bold flex items-center gap-1"
              >
                <span>
                  Stop #{totalCompleted + 1}/{validTasks.length}
                </span>
                <motion.span
                  animate={{ rotate: showQueueSheet ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  ▲
                </motion.span>
              </button>
            </motion.div>

            {/* Row 2: Customer Identity & Gojek Round Action Buttons */}
            <motion.div layout className="flex items-start justify-between gap-3">
              <div className="space-y-0.5 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-white truncate">
                    {currentTask.nama}
                  </h3>
                  <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 shrink-0">
                    {currentTask.kodePelanggan}
                  </span>
                </div>

                <p className="text-xs text-slate-300 line-clamp-1 leading-relaxed">
                  {currentTask.alamat}
                </p>

                {currentTask.patokanLokasi && (
                  <p className="text-[11px] text-amber-300 font-semibold truncate">
                    📍 Patokan: {currentTask.patokanLokasi}
                  </p>
                )}

                {/* Tunggakan Tag if Overdue */}
                {currentIsMenunggak && (
                  <div className="pt-1">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-950/80 text-rose-300 border border-rose-800 text-[10px] font-bold">
                      ⚠️ Menunggak {currentTask.tunggakan?.jumlahBulan} Bulan (
                      {formatRupiah(currentTask.tunggakan?.totalNominal || 0)})
                    </span>
                  </div>
                )}
              </div>

              {/* Gojek Round Circular Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Google Maps Navigation */}
                {navUrl && (
                  <a
                    href={navUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-slate-900 hover:bg-slate-800 active:scale-90 text-slate-100 border border-slate-700 flex items-center justify-center text-base transition-all shadow-md"
                    title="Navigasi Google Maps"
                  >
                    🧭
                  </a>
                )}

                {/* WhatsApp Warga - Gojek Brand Green Circle */}
                {waUrl && (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-[#00AA13] hover:bg-[#00880C] active:scale-90 text-white flex items-center justify-center text-lg transition-all shadow-lg shadow-[#00AA13]/40"
                    title="Chat WhatsApp Warga"
                  >
                    💬
                  </a>
                )}

                {/* Phone Call Button */}
                {telUrl && (
                  <a
                    href={telUrl}
                    className="w-10 h-10 rounded-full bg-sky-600 hover:bg-sky-500 active:scale-90 text-white flex items-center justify-center text-base transition-all shadow-lg shadow-sky-600/40"
                    title="Telepon Langsung"
                  >
                    📞
                  </a>
                )}
              </div>
            </motion.div>

            {/* Row 3: THE ICONIC GOJEK SWIPE SLIDER */}
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
        ) : (
          <motion.div layout className="py-2 text-center text-xs text-slate-400 space-y-1">
            <p className="font-bold text-white">Semua Penjemputan Selesai! 🎉</p>
            <p className="text-[11px]">
              Tidak ada lagi rumah yang menunggu pengangkutan pada jadwal ini.
            </p>
          </motion.div>
        )}

        {/* ── 5. EXPANDABLE MULTI-STOP QUEUE DRAWER (ALA GOSEND SAMEDAY) ── */}
        <AnimatePresence initial={false}>
          {showQueueSheet && pendingTasks.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="pt-3 border-t border-slate-800 space-y-2 max-h-[40vh] overflow-y-auto overscroll-contain">
                <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center justify-between pb-1">
                  <span>Urutan Antrean Pengangkutan ({pendingTasks.length} Titik)</span>
                  <span className="text-emerald-400 font-bold">{progressPercent}% Selesai</span>
                </div>

                <div className="space-y-1.5 pb-2">
                  {pendingTasks.map((t, i) => {
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
                                : "bg-emerald-600 text-white shadow-[0_0_10px_rgba(5,150,105,0.3)]"
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
    </div>
  );
}
