"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  Marker,
  Circle,
  Popup,
  ZoomControl,
  useMap,
} from "react-leaflet";
import { getMapTileConfig, type MapTileType } from "@/lib/map-tile";
import { formatRupiah } from "@/lib/utils";

export type TugasMap = {
  id: number;
  nama: string;
  alamat: string;
  kodePelanggan: string;
  latitude: number;
  longitude: number;
  status: string;
  patokanLokasi?: string | null;
  tunggakan?: {
    isMenunggak: boolean;
    jumlahBulan: number;
    totalNominal: number;
    daftarBulan: string[];
    bolehPickup: boolean;
  };
};

export type MapAngkutProps = {
  tugas: TugasMap[];
  posSaya?: { lat: number; lng: number; akurasi?: number } | null;
  radiusMeter?: number; // 10 atau 20 meter
  onQuickPickup?: (taskId: number) => Promise<void>;
  onSkipOverdue?: (taskId: number, catatan: string) => Promise<void>;
  onSelectTask?: (taskId: number) => void;
};

const PUSAT_DEPOK: [number, number] = [-6.424838, 106.832667];

/**
 * Pin Marker Dinamis untuk Rumah Pelanggan
 * Membedakan secara visual:
 * - Hijau: Sudah diambil (selesai)
 * - Merah Menyala (Hazard): Menunggak iuran (⛔ JANGAN ANGKUT)
 * - Biru: Terjadwal (Lunas / siap angkut)
 * - Kuning/Abu: Kosong / kendala
 */
function buatPinTugas(t: TugasMap) {
  const isMenunggak = Boolean(t.tunggakan?.isMenunggak);
  const isSelesai = t.status === "diambil";
  const isKendala = t.status === "tidak_diangkut";
  const isKosong = t.status === "kosong";

  let bgColor = "#0284c7"; // Sky 600 default
  let icon = "🏠";
  let badgeBorder = "border: 2px solid #ffffff;";
  let pulseAnimation = "";
  let badgeLabel = t.nama.replace(/["&<>]/g, "");

  if (isMenunggak && t.status === "terjadwal") {
    bgColor = "#e11d48"; // Rose 600
    icon = "⛔";
    badgeBorder = "border: 2.5px solid #fecdd3;";
    pulseAnimation = "animation: pulse 1.5s infinite;";
    badgeLabel = `⛔ ${badgeLabel} (${t.tunggakan?.jumlahBulan || 1} bln)`;
  } else if (isSelesai) {
    bgColor = "#059669"; // Emerald 600
    icon = "✓";
    badgeBorder = "border: 2px solid #a7f3d0;";
  } else if (isKendala) {
    bgColor = "#dc2626";
    icon = "✕";
  } else if (isKosong) {
    bgColor = "#d97706";
    icon = "⚠️";
  }

  const html = `
    <div style="transform:translate(-50%,-100%);text-align:center;cursor:pointer;${pulseAnimation}">
      <div style="
        width: 32px;
        height: 32px;
        margin: 0 auto;
        border-radius: 9999px;
        background: ${bgColor};
        ${badgeBorder}
        box-shadow: 0 4px 12px rgba(0,0,0,0.35);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 15px;
        font-weight: 900;
        color: #ffffff;
      ">
        ${icon}
      </div>
      <div style="
        margin-top: 3px;
        font-family: ui-sans-serif, system-ui, sans-serif;
        font-size: 10px;
        font-weight: 800;
        color: #ffffff;
        background: ${isMenunggak && t.status === "terjadwal" ? "#881337" : "#0f172a"};
        border: 1px solid rgba(255,255,255,0.25);
        border-radius: 9999px;
        padding: 2px 8px;
        white-space: nowrap;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      ">
        ${badgeLabel}
      </div>
    </div>
  `;

  return L.divIcon({
    className: "custom-map-pin",
    html,
    iconSize: [1, 1],
    iconAnchor: [0, 0],
    popupAnchor: [0, -38],
  });
}

/** Pin Posisi Truk Driver Lapangan */
function buatPinDriver() {
  const html = `
    <div style="transform:translate(-50%,-50%);position:relative;cursor:pointer">
      <div style="
        position: absolute;
        width: 44px;
        height: 44px;
        top: -22px;
        left: -22px;
        border-radius: 50%;
        background: rgba(16, 185, 129, 0.25);
        border: 1.5px solid #10b981;
        animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
      "></div>
      <div style="
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: #064e3b;
        border: 2.5px solid #ffffff;
        box-shadow: 0 4px 14px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
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

/** Controller Peta Internal untuk aksi Center, FitBounds, dll */
function MapController({
  points,
  posSaya,
  centerTrigger,
}: {
  points: [number, number][];
  posSaya: [number, number] | null;
  centerTrigger: number;
}) {
  const map = useMap();
  const initialFitDone = useRef(false);

  // Fit bounds awal saat rute termuat
  useEffect(() => {
    if (initialFitDone.current) return;
    const all = posSaya ? [...points, posSaya] : points;
    if (all.length >= 2) {
      map.fitBounds(all, { padding: [50, 50], maxZoom: 16 });
      initialFitDone.current = true;
    } else if (all.length === 1) {
      map.setView(all[0], 16);
      initialFitDone.current = true;
    }
  }, [points, posSaya, map]);

  // Center trigger saat tombol Target diklik
  useEffect(() => {
    if (centerTrigger > 0 && posSaya) {
      map.flyTo(posSaya, 17, { animate: true, duration: 0.8 });
    }
  }, [centerTrigger, posSaya, map]);

  return null;
}

export default function MapAngkut({
  tugas,
  posSaya: externalPos,
  radiusMeter = 20,
  onQuickPickup,
  onSkipOverdue,
  onSelectTask,
}: MapAngkutProps) {
  const [internalPos, setInternalPos] = useState<[number, number] | null>(null);
  const [tileMode, setTileMode] = useState<MapTileType>("google-streets");
  const [isExpanded, setIsExpanded] = useState(false);
  const [filterMode, setFilterMode] = useState<"semua" | "antrean" | "menunggak">("semua");
  const [centerTrigger, setCenterTrigger] = useState(0);

  // Fallback GPS lokal jika externalPos tidak disediakan
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

  // Filter tugas pada peta
  const filteredTugas = useMemo(() => {
    if (filterMode === "antrean") {
      return tugas.filter((t) => t.status === "terjadwal");
    }
    if (filterMode === "menunggak") {
      return tugas.filter((t) => t.tunggakan?.isMenunggak);
    }
    return tugas;
  }, [tugas, filterMode]);

  const points = useMemo(
    () => filteredTugas.map((t) => [t.latitude, t.longitude] as [number, number]),
    [filteredTugas]
  );

  const initialCenter: [number, number] = activeDriverPos ?? (points[0] ?? PUSAT_DEPOK);
  const tileConfig = useMemo(() => getMapTileConfig(tileMode), [tileMode]);

  const totalMenunggak = tugas.filter((t) => t.tunggakan?.isMenunggak).length;
  const totalSelesai = tugas.filter((t) => t.status === "diambil").length;

  return (
    <div
      className={`rounded-3xl border border-slate-200/90 shadow-md overflow-hidden transition-all duration-300 bg-white ${
        isExpanded ? "fixed inset-2 z-50 flex flex-col sm:inset-6" : "relative"
      }`}
    >
      {/* ── Modern Map Top Control Bar ── */}
      <div className="bg-slate-900 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-2 shadow-sm shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-sm">
            🗺️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-black tracking-tight text-white">Radar Peta Rute</h2>
              {totalMenunggak > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-500 text-white animate-pulse">
                  {totalMenunggak} Menunggak
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 font-medium">
              {totalSelesai}/{tugas.length} Selesai • Radius: <span className="text-emerald-400 font-bold">{radiusMeter}m</span>
            </p>
          </div>
        </div>

        {/* Toolbar buttons: Layer Switcher & Expand */}
        <div className="flex items-center gap-1.5">
          {/* Layer Selector */}
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
          </div>

          {/* Expand / Minimize Toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all active:scale-95"
            title={isExpanded ? "Kecilkan Peta" : "Perbesar Peta Layar Penuh"}
          >
            {isExpanded ? "✕ Tutup Layar" : "⤢ Perbesar"}
          </button>
        </div>
      </div>

      {/* ── Sub-Filter Bar (Antrean vs Menunggak) ── */}
      <div className="bg-slate-100/90 border-b border-slate-200/80 px-3 py-1.5 flex items-center justify-between text-xs font-bold shrink-0">
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setFilterMode("semua")}
            className={`px-2.5 py-1 rounded-lg text-[11px] transition-all ${
              filterMode === "semua"
                ? "bg-white text-slate-900 shadow-2xs font-extrabold"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Semua ({tugas.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("antrean")}
            className={`px-2.5 py-1 rounded-lg text-[11px] transition-all ${
              filterMode === "antrean"
                ? "bg-white text-emerald-700 shadow-2xs font-extrabold"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Antrean ({tugas.filter((t) => t.status === "terjadwal").length})
          </button>
          {totalMenunggak > 0 && (
            <button
              type="button"
              onClick={() => setFilterMode("menunggak")}
              className={`px-2.5 py-1 rounded-lg text-[11px] transition-all ${
                filterMode === "menunggak"
                  ? "bg-rose-600 text-white shadow-2xs font-extrabold"
                  : "text-rose-600 hover:text-rose-700"
              }`}
            >
              ⛔ Menunggak ({totalMenunggak})
            </button>
          )}
        </div>

        {/* GPS Live Indicator */}
        <div className="flex items-center gap-1.5 text-[10px] text-slate-600">
          <span
            className={`w-2 h-2 rounded-full ${
              activeDriverPos ? "bg-emerald-500 animate-pulse" : "bg-amber-400"
            }`}
          />
          <span className="font-semibold">
            {activeDriverPos ? "GPS Terkunci" : "Mencari GPS..."}
          </span>
        </div>
      </div>

      {/* ── Leaflet Map Container ── */}
      <div className={`w-full relative ${isExpanded ? "flex-1 min-h-0" : "h-[45vh] min-h-[300px]"}`}>
        <MapContainer
          center={initialCenter}
          zoom={16}
          scrollWheelZoom
          zoomControl={false}
          className="h-full w-full"
          style={{ background: "#f8fafc" }}
        >
          <TileLayer
            key={tileMode}
            attribution={tileConfig.attribution}
            url={tileConfig.url}
            subdomains={tileConfig.subdomains}
            maxZoom={tileConfig.maxZoom}
          />

          {/* Marker Pelanggan */}
          {filteredTugas.map((t) => (
            <Marker
              key={`tugas-${t.id}`}
              position={[t.latitude, t.longitude]}
              icon={buatPinTugas(t)}
              eventHandlers={{
                click: () => onSelectTask?.(t.id),
              }}
            >
              <Popup className="custom-driver-popup">
                <div className="p-1 space-y-2 text-slate-900 font-sans min-w-[200px]">
                  {/* Status Badge */}
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
                    {t.tunggakan?.isMenunggak ? (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-100 text-rose-800">
                        ⛔ JANGAN ANGKUT (MENUNGGAK)
                      </span>
                    ) : t.status === "diambil" ? (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-800">
                        ✓ SELESAI PICKUP
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-sky-100 text-sky-800">
                        SIAP PICKUP (LUNAS)
                      </span>
                    )}
                    <span className="text-[10px] font-mono text-slate-400">
                      {t.kodePelanggan}
                    </span>
                  </div>

                  {/* Customer Info */}
                  <div>
                    <p className="font-extrabold text-sm text-slate-900 leading-tight">
                      {t.nama}
                    </p>
                    <p className="text-[11px] text-slate-600 mt-0.5">{t.alamat}</p>
                    {t.patokanLokasi && (
                      <p className="text-[10px] font-bold text-amber-800 mt-0.5">
                        📍 {t.patokanLokasi}
                      </p>
                    )}
                  </div>

                  {/* Tunggakan Details if any */}
                  {t.tunggakan?.isMenunggak && (
                    <div className="p-2 rounded-xl bg-rose-50 text-[10px] font-semibold text-rose-900 border border-rose-200">
                      <p className="font-black">
                        Tunggakan: {t.tunggakan.jumlahBulan} Bulan (
                        {formatRupiah(t.tunggakan.totalNominal)})
                      </p>
                      <p className="text-rose-700 mt-0.5">
                        Instruksi: Lewati penjemputan sampah rumah ini.
                      </p>
                    </div>
                  )}

                  {/* Quick Action in Popup */}
                  {t.status === "terjadwal" && (
                    <div className="pt-1 flex flex-col gap-1.5">
                      {t.tunggakan?.isMenunggak ? (
                        <button
                          type="button"
                          onClick={() =>
                            onSkipOverdue?.(
                              t.id,
                              `Dilewati via Peta: Menunggak ${t.tunggakan?.jumlahBulan} bulan`
                            )
                          }
                          className="w-full py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-xs"
                        >
                          🚫 Lewati Rumah Ini
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onQuickPickup?.(t.id)}
                          className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-xs flex items-center justify-center gap-1.5"
                        >
                          <span>✓</span>
                          <span>Selesai Angkut (1-Tap)</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          window.open(
                            `https://www.google.com/maps?q=${t.latitude},${t.longitude}`,
                            "_system"
                          )
                        }
                        className="w-full py-1.5 text-center text-[10px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 rounded-lg"
                      >
                        🧭 Buka Google Maps
                      </button>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Marker & Radar Geofence Circle Driver */}
          {activeDriverPos && (
            <>
              {/* Lingkaran Radar Proximity Interaktif (10m / 20m) */}
              <Circle
                center={activeDriverPos}
                radius={radiusMeter}
                pathOptions={{
                  color: "#10b981",
                  fillColor: "#34d399",
                  fillOpacity: 0.18,
                  weight: 2,
                  dashArray: "4, 6",
                }}
              />
              {/* Pin Truk Driver */}
              <Marker position={activeDriverPos} icon={buatPinDriver()} interactive={false} />
            </>
          )}

          <ZoomControl position="bottomright" />
          <MapController
            points={points}
            posSaya={activeDriverPos}
            centerTrigger={centerTrigger}
          />
        </MapContainer>

        {/* ── Floating Action Buttons (FAB) on Map ── */}
        <div className="absolute top-3 right-3 z-[400] flex flex-col gap-2">
          {activeDriverPos && (
            <button
              type="button"
              onClick={() => setCenterTrigger((prev) => prev + 1)}
              className="w-10 h-10 rounded-2xl bg-white text-slate-800 border border-slate-200/90 shadow-md flex items-center justify-center font-bold text-lg active:scale-95 transition-all hover:bg-emerald-50 hover:text-emerald-700"
              title="Pusatkan ke Posisi Truk Saya"
            >
              🎯
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
