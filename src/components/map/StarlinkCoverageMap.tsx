"use client";

import "leaflet/dist/leaflet.css";
import "@/lib/leaflet-setup";
import "@/app/coverage/coverage.css";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  Polygon,
  CircleMarker,
  Circle,
  Marker,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import Link from "next/link";
import {
  Search,
  Crosshair,
  Compass,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ChevronRight,
  ShieldCheck,
  Calendar,
  Truck,
  Layers,
  X,
  Sparkles,
  ExternalLink,
  Phone,
  RefreshCw,
  LocateFixed,
} from "lucide-react";
import {
  BLOK_OPERASIONAL_AKTIF,
  KELURAHAN_COVERAGE_LIST,
  QUICK_SEARCH_LOCATIONS,
  checkCoverageLocation,
  type ActiveBlock,
  type KelurahanCoverage,
  type CoverageCheckResult,
} from "@/lib/coverage-shared";
import { KECAMATAN_DEPOK } from "@/lib/kecamatan-depok";
import { DEPOK_BOUNDS } from "@/lib/zona-depok";

// Icon generator untuk Radar Node 23 Blok
function createRadarIcon(status: "AKTIF" | "PERLUASAN") {
  const isAmber = status === "PERLUASAN";
  const html = `
    <div class="starlink-radar-container ${isAmber ? "starlink-radar-amber" : ""}">
      <div class="starlink-radar-wave"></div>
      <div class="starlink-radar-core"></div>
    </div>
  `;
  return L.divIcon({
    className: "starlink-radar-div-icon",
    html,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

// Icon generator untuk User Target Pin (Crosshair GPS)
function createUserTargetIcon() {
  const html = `
    <div class="user-target-marker">
      <div class="user-target-pulse"></div>
      <div class="user-target-center"></div>
    </div>
  `;
  return L.divIcon({
    className: "user-target-div-icon",
    html,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

// Controller internal untuk mengontrol pergerakan kamera Leaflet
function MapCameraController({
  target,
  onMapClick,
}: {
  target: { lat: number; lng: number; zoom?: number } | null;
  onMapClick: (lat: number, lng: number) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (target) {
      map.flyTo([target.lat, target.lng], target.zoom || 14, {
        duration: 1.2,
        easeLinearity: 0.25,
      });
    }
  }, [target, map]);

  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });

  return null;
}

export default function StarlinkCoverageMap() {
  const [coverageData, setCoverageData] = useState<{
    stats: any;
    serviceGrid: [number, number][];
  } | null>(null);

  // State pencarian & seleksi
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Titik pin pengguna aktif & hasil cek
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [verdict, setVerdict] = useState<CoverageCheckResult | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<ActiveBlock | null>(null);

  // Kontrol kamera Leaflet
  const [cameraTarget, setCameraTarget] = useState<{ lat: number; lng: number; zoom?: number } | null>({
    lat: -6.4365,
    lng: 106.833,
    zoom: 13,
  });

  // Toggle Layer di Map
  const [showPolygons, setShowPolygons] = useState(true);
  const [showRadarNodes, setShowRadarNodes] = useState(true);
  const [showServiceDots, setShowServiceDots] = useState(true);
  const [activeTabArea, setActiveTabArea] = useState<string>("SEMUA");

  // Fetch data agregasi live
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const res = await fetch("/api/publik/coverage");
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted) {
          setCoverageData({
            stats: data.stats,
            serviceGrid: data.serviceGrid || [],
          });
        }
      } catch {
        // Fallback handled gracefully
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filter pencarian suggestions
  const searchSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return QUICK_SEARCH_LOCATIONS.slice(0, 5);
    const q = searchQuery.toLowerCase();
    return QUICK_SEARCH_LOCATIONS.filter(
      (loc) =>
        loc.label.toLowerCase().includes(q) ||
        loc.kelurahan.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Handle klik di peta langsung
  const handleMapClick = useCallback((lat: number, lng: number) => {
    setUserLocation({ lat, lng });
    setSelectedBlock(null);
    const res = checkCoverageLocation(lat, lng);
    setVerdict(res);
  }, []);

  // Handle pilih suggestion pencarian
  const handleSelectLocation = (loc: { lat: number; lng: number; label: string }) => {
    setSearchQuery(loc.label);
    setIsSearchFocused(false);
    setUserLocation({ lat: loc.lat, lng: loc.lng });
    setSelectedBlock(null);
    setCameraTarget({ lat: loc.lat, lng: loc.lng, zoom: 15 });
    const res = checkCoverageLocation(loc.lat, loc.lng);
    setVerdict(res);
  };

  // Handle Geolocation GPS pengguna
  const handleUseGps = () => {
    if (!navigator.geolocation) {
      setGpsError("Browser Anda tidak mendukung deteksi lokasi GPS.");
      return;
    }
    setIsGpsLoading(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsGpsLoading(false);
        const { latitude: lat, longitude: lng } = pos.coords;
        setUserLocation({ lat, lng });
        setSelectedBlock(null);
        setCameraTarget({ lat, lng, zoom: 15 });
        const res = checkCoverageLocation(lat, lng);
        setVerdict(res);
      },
      (err) => {
        setIsGpsLoading(false);
        if (err.code === 1) {
          setGpsError("Izin akses lokasi ditolak. Silakan izinkan browser atau ketik nama area Anda.");
        } else {
          setGpsError("Tidak dapat mendeteksi posisi GPS saat ini. Silakan pilih area pada peta.");
        }
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Handle klik pada blok operasional (radar node)
  const handleBlockClick = (block: ActiveBlock) => {
    setSelectedBlock(block);
    setUserLocation({ lat: block.lat, lng: block.lng });
    setCameraTarget({ lat: block.lat, lng: block.lng, zoom: 15 });
    const res = checkCoverageLocation(block.lat, block.lng);
    setVerdict(res);
  };

  // Filter tombol shortcut
  const handleQuickJump = (area: string) => {
    setActiveTabArea(area);
    switch (area) {
      case "SEMUA":
        setCameraTarget({ lat: -6.405, lng: 106.825, zoom: 12 });
        break;
      case "KALIBARU":
        setCameraTarget({ lat: -6.4385, lng: 106.8355, zoom: 14 });
        break;
      case "CILODONG":
        setCameraTarget({ lat: -6.4345, lng: 106.836, zoom: 14 });
        break;
      case "KALIMULYA":
        setCameraTarget({ lat: -6.4335, lng: 106.823, zoom: 14 });
        break;
      case "JATIMULYA":
        setCameraTarget({ lat: -6.442, lng: 106.827, zoom: 14 });
        break;
      case "SUKMAJAYA":
        setCameraTarget({ lat: -6.402, lng: 106.84, zoom: 14 });
        break;
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#070b14] text-slate-100 select-none">
      {/* ── TOP HEADER / STARLINK COMMAND HUD ── */}
      <header className="absolute top-0 inset-x-0 z-30 pointer-events-none p-3 sm:p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 w-full max-w-7xl mx-auto">
          {/* Brand Logo & Live Status Badge */}
          <div className="pointer-events-auto flex items-center gap-2.5 sm:gap-3 bg-[#0a0f1d]/90 backdrop-blur-md border border-slate-700/60 px-3.5 py-2 rounded-2xl shadow-2xl">
            <Link href="/" className="flex items-center gap-2.5 group">
              <img
                src="/ups-heru-logo.jpg"
                alt="UPS HERU Logo"
                className="h-8 w-8 sm:h-9 sm:w-9 object-contain rounded-xl shadow-md group-hover:scale-105 transition-transform"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm sm:text-base font-extrabold tracking-tight text-white">
                    UPS HERU<span className="text-emerald-400">.</span>
                  </span>
                  <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold uppercase tracking-wider border border-emerald-500/40">
                    Coverage Grid
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium truncate hidden sm:block">
                  Peta Jangkauan Pengangkutan Sampah Kota Depok
                </p>
              </div>
            </Link>
          </div>

          {/* Quick Nav Links (Desktop) */}
          <nav className="pointer-events-auto hidden md:flex items-center gap-1.5 bg-[#0a0f1d]/85 backdrop-blur-md border border-slate-700/60 px-2 py-1.5 rounded-2xl shadow-2xl text-xs font-semibold">
            <Link
              href="/"
              className="px-3 py-1.5 text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-xl transition-all"
            >
              Beranda
            </Link>
            <Link
              href="/lacak"
              className="px-3 py-1.5 text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-xl transition-all"
            >
              Lacak Truk
            </Link>
            <Link
              href="/bayar"
              className="px-3 py-1.5 text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-xl transition-all"
            >
              Cek Tagihan
            </Link>
            <Link
              href="/tarif"
              className="px-3 py-1.5 text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-xl transition-all"
            >
              Tarif Resmi
            </Link>
            <Link
              href="/daftar"
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/40 transition-all flex items-center gap-1.5 ml-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Daftar Warga Baru</span>
            </Link>
          </nav>
        </div>

        {/* ── SEARCH & GPS INTERACTIVE BAR (STARLINK STYLE) ── */}
        <div className="w-full max-w-xl mx-auto pointer-events-auto relative">
          <div className="relative flex items-center bg-[#0d1527]/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl shadow-black/80 transition-all focus-within:border-emerald-500/80 focus-within:ring-2 focus-within:ring-emerald-500/20">
            <div className="pl-3.5 pr-2 text-slate-400">
              <Search className="w-4 h-4 text-emerald-400" />
            </div>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              placeholder="Cari alamat, kelurahan, atau perumahan di Depok..."
              className="w-full py-2.5 sm:py-3 bg-transparent text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none"
            />

            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="p-1.5 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            <div className="pr-1.5 pl-1 flex items-center">
              <button
                type="button"
                onClick={handleUseGps}
                disabled={isGpsLoading}
                className="px-3 py-1.5 sm:py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 hover:text-emerald-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all active:scale-95 whitespace-nowrap"
                title="Gunakan posisi GPS saya"
              >
                {isGpsLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <LocateFixed className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span className="hidden sm:inline">GPS Saya</span>
              </button>
            </div>
          </div>

          {/* Autocomplete Suggestions Dropdown */}
          {isSearchFocused && searchSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-[#0c1424] border border-slate-700/90 rounded-2xl shadow-2xl overflow-hidden z-50">
              <div className="px-3 py-1.5 bg-slate-900/60 border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Rekomendasi Area & Landmark Depok</span>
                <button
                  type="button"
                  onClick={() => setIsSearchFocused(false)}
                  className="text-slate-400 hover:text-white"
                >
                  Tutup
                </button>
              </div>
              <ul className="divide-y divide-slate-800/60 max-h-60 overflow-y-auto hud-scrollbar">
                {searchSuggestions.map((loc) => (
                  <li key={loc.label}>
                    <button
                      type="button"
                      onClick={() => handleSelectLocation(loc)}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-slate-800/70 transition-colors flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{loc.label}</p>
                          <p className="text-[10px] text-slate-400 truncate">
                            Kec. Cilodong • Kel. {loc.kelurahan}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                          loc.status === "AKTIF"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        }`}
                      >
                        {loc.status === "AKTIF" ? "Terlayani" : "Perluasan"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* GPS Error Toast */}
          {gpsError && (
            <div className="mt-2 p-2.5 bg-red-950/80 border border-red-500/50 rounded-xl text-xs text-red-200 flex items-center justify-between">
              <span>{gpsError}</span>
              <button
                type="button"
                onClick={() => setGpsError(null)}
                className="text-red-400 hover:text-white ml-2"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* ── QUICK SECTOR JUMP PILLS ── */}
        <div className="pointer-events-auto flex items-center gap-1.5 overflow-x-auto max-w-2xl mx-auto py-1 px-1 hud-scrollbar">
          {[
            { id: "SEMUA", label: "⚡ Seluruh Depok" },
            { id: "KALIBARU", label: "🟢 Kalibaru (Pusat)" },
            { id: "CILODONG", label: "🟢 Cilodong" },
            { id: "KALIMULYA", label: "🟢 Kalimulya" },
            { id: "JATIMULYA", label: "🟢 Jatimulya" },
            { id: "SUKMAJAYA", label: "🟡 Sukmajaya" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleQuickJump(tab.id)}
              className={`px-3 py-1 rounded-full text-[11px] font-extrabold whitespace-nowrap transition-all border ${
                activeTabArea === tab.id
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/80 shadow-md shadow-emerald-950"
                  : "bg-[#0b1222]/80 text-slate-300 border-slate-700/60 hover:bg-slate-800/80 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* ── MAP CANVAS (LEAFLET STARLINK OBSIDIAN DARK) ── */}
      <div className="w-full h-full dark-starlink-tiles">
        <MapContainer
          center={[-6.4365, 106.833]}
          zoom={13}
          minZoom={11}
          maxZoom={18}
          zoomControl={false}
          className="w-full h-full"
        >
          {/* Base Dark Tiles: Carto Dark Matter with fallback */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
            maxZoom={19}
          />

          {/* Map Camera Controller */}
          <MapCameraController target={cameraTarget} onMapClick={handleMapClick} />

          {/* LAYER 1: Polygon Kecamatan Depok (Batas Resmi BPS) */}
          {showPolygons &&
            KECAMATAN_DEPOK.map((k) => {
              const isCilodong = k.nama.toUpperCase() === "CILODONG";
              const isSukmajaya =
                k.nama.toUpperCase() === "SUKMA JAYA" || k.nama.toUpperCase() === "SUKMAJAYA";

              const color = isCilodong ? "#10b981" : isSukmajaya ? "#f59e0b" : "#475569";
              const fillOpacity = isCilodong ? 0.22 : isSukmajaya ? 0.12 : 0.04;
              const weight = isCilodong ? 2.5 : isSukmajaya ? 1.8 : 1.0;

              return (
                <Polygon
                  key={k.kode}
                  positions={k.koordinat}
                  pathOptions={{
                    color,
                    fillColor: color,
                    fillOpacity,
                    weight,
                    dashArray: isCilodong ? undefined : "4, 6",
                  }}
                  eventHandlers={{
                    click: (e) => {
                      handleMapClick(e.latlng.lat, e.latlng.lng);
                    },
                  }}
                >
                  <Tooltip
                    direction="center"
                    permanent={isCilodong}
                    className={
                      isCilodong
                        ? "starlink-tooltip"
                        : isSukmajaya
                        ? "starlink-tooltip starlink-tooltip-amber"
                        : "starlink-tooltip"
                    }
                  >
                    <span>
                      {isCilodong
                        ? "🟢 KEC. CILODONG (AKTIF PENUH)"
                        : isSukmajaya
                        ? "🟡 KEC. SUKMAJAYA (PERLUASAN)"
                        : `Kec. ${k.nama}`}
                    </span>
                  </Tooltip>
                </Polygon>
              );
            })}

          {/* LAYER 2: Privacy-Safe Service Density Dots (Starlink Grid) */}
          {showServiceDots &&
            coverageData?.serviceGrid?.map((pt, idx) => (
              <CircleMarker
                key={`grid-${idx}`}
                center={pt}
                radius={2.5}
                pathOptions={{
                  color: "#34d399",
                  fillColor: "#10b981",
                  fillOpacity: 0.65,
                  weight: 0.5,
                }}
              />
            ))}

          {/* LAYER 3: 23 Radar Nodes (Blok Operasional Aktif) */}
          {showRadarNodes &&
            BLOK_OPERASIONAL_AKTIF.map((block) => (
              <Marker
                key={block.id}
                position={[block.lat, block.lng]}
                icon={createRadarIcon(block.status)}
                eventHandlers={{
                  click: () => handleBlockClick(block),
                }}
              >
                <Tooltip direction="top" offset={[0, -12]} className="starlink-tooltip">
                  <div className="text-center font-sans">
                    <p className="font-extrabold text-white text-[11px]">{block.nama}</p>
                    <p className="text-[10px] text-emerald-400">
                      {block.pelangganCount} Rumah Terlayani • {block.jadwal}
                    </p>
                  </div>
                </Tooltip>
              </Marker>
            ))}

          {/* LAYER 4: Pin Lokasi Pengguna Aktif (User Target Radar) */}
          {userLocation && (
            <>
              <Marker position={[userLocation.lat, userLocation.lng]} icon={createUserTargetIcon()} />
              <Circle
                center={[userLocation.lat, userLocation.lng]}
                radius={180}
                pathOptions={{
                  color: "#38bdf8",
                  fillColor: "#0284c7",
                  fillOpacity: 0.15,
                  weight: 1.5,
                  dashArray: "3, 5",
                }}
              />
            </>
          )}
        </MapContainer>
      </div>

      {/* ── FLOATING STARLINK VERDICT CARD / DRAWER ── */}
      {verdict && (
        <aside
          aria-label="Hasil Cek Cakupan Layanan"
          className="absolute bottom-4 left-3 right-3 sm:left-6 sm:right-auto sm:w-[420px] z-30 pointer-events-auto bg-[#0a0f1d]/95 backdrop-blur-2xl border border-slate-700/90 rounded-3xl p-4 sm:p-5 shadow-2xl shadow-black transition-all animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          {/* Card Header & Close */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full animate-pulse ${
                  verdict.status === "AKTIF"
                    ? "bg-emerald-400"
                    : verdict.status === "PERLUASAN"
                    ? "bg-amber-400"
                    : "bg-cyan-400"
                }`}
              />
              <span
                className={`text-[11px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                  verdict.status === "AKTIF"
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    : verdict.status === "PERLUASAN"
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    : "bg-slate-700/40 text-slate-300 border-slate-600/50"
                }`}
              >
                {verdict.statusLabel}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                setVerdict(null);
                setUserLocation(null);
              }}
              className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Tutup panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Area & Subtitle */}
          <div className="space-y-1 mb-3.5">
            <h2 className="text-base sm:text-lg font-black text-white tracking-tight leading-snug">
              {verdict.zonaTerdekat || `Kelurahan ${verdict.kelurahan}`}
            </h2>
            <p className="text-xs text-slate-400 font-medium">
              Kec. {verdict.kecamatan} • Berjarak ±{verdict.jarakMeter}m dari armada aktif terdekat
            </p>
          </div>

          {/* Specs Micro-Grid (Starlink Style) */}
          <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-900/80 border border-slate-800 rounded-2xl mb-3.5 text-xs">
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3 h-3 text-emerald-400" />
                <span>Jadwal Angkut</span>
              </p>
              <p className="font-extrabold text-white text-[11px] sm:text-xs truncate">
                {verdict.jadwalPengangkutan}
              </p>
            </div>

            <div className="space-y-0.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Truck className="w-3 h-3 text-cyan-400" />
                <span>Armada Wilayah</span>
              </p>
              <p className="font-extrabold text-white text-[11px] sm:text-xs truncate">
                {verdict.armada}
              </p>
            </div>
          </div>

          {/* Explanatory Message */}
          <p className="text-xs text-slate-300 font-medium leading-relaxed mb-4">
            {verdict.pesan}
          </p>

          {/* CTA Action Buttons */}
          <div className="space-y-2">
            <Link
              href={verdict.ctaUrl}
              className={`w-full py-2.5 sm:py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 shadow-xl transition-all active:scale-95 ${
                verdict.status === "AKTIF"
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/60"
                  : "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-950/60"
              }`}
            >
              <span>{verdict.ctaText}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <a
              href={verdict.whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 hover:text-white flex items-center justify-center gap-2 transition-all"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Tanya CS WhatsApp (24 Jam)</span>
              <ExternalLink className="w-3 h-3 opacity-60 ml-0.5" />
            </a>
          </div>
        </aside>
      )}

      {/* ── FLOATING STATS & LEGEND PILL (BOTTOM RIGHT) ── */}
      <footer className="absolute bottom-4 right-3 sm:right-6 z-20 pointer-events-none hidden md:flex flex-col items-end gap-2 text-xs">
        {/* Layer Controls Bar */}
        <div className="pointer-events-auto bg-[#0a0f1d]/90 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-2xl shadow-xl flex items-center gap-2 text-[11px] font-bold text-slate-300">
          <Layers className="w-3.5 h-3.5 text-slate-400" />
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
            <input
              type="checkbox"
              checked={showPolygons}
              onChange={(e) => setShowPolygons(e.target.checked)}
              className="accent-emerald-500 w-3 h-3 rounded"
            />
            <span>Wilayah</span>
          </label>
          <span className="text-slate-700">|</span>
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
            <input
              type="checkbox"
              checked={showRadarNodes}
              onChange={(e) => setShowRadarNodes(e.target.checked)}
              className="accent-emerald-500 w-3 h-3 rounded"
            />
            <span>23 Blok</span>
          </label>
          <span className="text-slate-700">|</span>
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
            <input
              type="checkbox"
              checked={showServiceDots}
              onChange={(e) => setShowServiceDots(e.target.checked)}
              className="accent-emerald-500 w-3 h-3 rounded"
            />
            <span>Titik Layanan</span>
          </label>
        </div>

        {/* Legend & Stats Pill */}
        <div className="pointer-events-auto bg-[#0a0f1d]/90 backdrop-blur-md border border-slate-800 px-3.5 py-2 rounded-2xl shadow-xl flex items-center gap-3 text-[11px] font-bold">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500" />
            <span className="text-slate-300">Terlayani Aktif</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500" />
            <span className="text-slate-300">Area Perluasan</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-600" />
            <span className="text-slate-400">Usulan Survei</span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="flex items-center gap-1.5 text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>560+ Rumah Terlayani</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
