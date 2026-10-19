"use client";

import "leaflet/dist/leaflet.css";
import "@/lib/leaflet-setup";
import "@/app/coverage/coverage.css";

import { useEffect, useMemo, useState, useCallback } from "react";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  Polygon,
  Circle,
  Marker,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import Link from "next/link";
import {
  Search,
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
  Home,
  Users,
  Compass,
  Map as MapIcon,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  BLOK_OPERASIONAL_AKTIF,
  KELURAHAN_COVERAGE_LIST,
  QUICK_SEARCH_LOCATIONS,
  checkCoverageLocation,
  type ActiveBlock,
  type KelurahanCoverage,
  type CoverageCheckResult,
  type NearbyClusterRecommendation,
} from "@/lib/coverage-shared";
import { KECAMATAN_DEPOK } from "@/lib/kecamatan-depok";

// Icon generator untuk Klaster Warga Terdaftar (Pill Bersih & Ramah)
function createClusterIcon(block: ActiveBlock, isSelected = false) {
  const isAmber = block.status === "PERLUASAN";
  const cleanName = block.nama.replace("Blok ", "");
  const html = `
    <div class="cluster-badge-container">
      <div class="cluster-badge ${isAmber ? "cluster-badge-amber" : ""} ${isSelected ? "cluster-badge-selected" : ""}">
        <span class="text-xs">🏡</span>
        <span class="cluster-name">${cleanName}</span>
        <span class="cluster-badge-count">${block.pelangganCount} KK</span>
      </div>
    </div>
  `;
  return L.divIcon({
    className: "cluster-div-icon",
    html,
    iconSize: [140, 30],
    iconAnchor: [70, 15],
  });
}

// Icon generator untuk Pin Lokasi Pilihan Pengguna (Clean Blue Pin)
function createUserLocationIcon() {
  const html = `
    <div class="clean-user-marker">
      <div class="clean-user-ripple"></div>
      <div class="clean-user-core"></div>
    </div>
  `;
  return L.divIcon({
    className: "clean-user-div-icon",
    html,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
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
      map.flyTo([target.lat, target.lng], target.zoom || 15, {
        duration: 1.0,
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

  // Basemap style switcher: "voyager" (Street View jernih) | "satellite" (Satelit Esri) | "osm" (Standar)
  const [basemap, setBasemap] = useState<"voyager" | "satellite" | "osm">("voyager");

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
    lat: -6.4385,
    lng: 106.8355,
    zoom: 14,
  });

  // Toggle Layer di Map
  const [showPolygons, setShowPolygons] = useState(true);
  const [showClusterBadges, setShowClusterBadges] = useState(true);
  const [showAuras, setShowAuras] = useState(true);
  const [activeTabArea, setActiveTabArea] = useState<string>("SEMUA");

  // Panel Rekomendasi Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [drawerTab, setDrawerTab] = useState<"terdekat" | "semua">("terdekat");
  const [clusterFilterKecamatan, setClusterFilterKecamatan] = useState<string>("SEMUA");
  const [clusterSearchQuery, setClusterSearchQuery] = useState("");

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
    setDrawerTab("terdekat");
    setIsDrawerOpen(true);
  }, []);

  // Handle pilih suggestion pencarian
  const handleSelectLocation = (loc: { lat: number; lng: number; label: string }) => {
    setSearchQuery(loc.label);
    setIsSearchFocused(false);
    setUserLocation({ lat: loc.lat, lng: loc.lng });
    setSelectedBlock(null);
    setCameraTarget({ lat: loc.lat, lng: loc.lng, zoom: 16 });
    const res = checkCoverageLocation(loc.lat, loc.lng);
    setVerdict(res);
    setDrawerTab("terdekat");
    setIsDrawerOpen(true);
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
        setCameraTarget({ lat, lng, zoom: 16 });
        const res = checkCoverageLocation(lat, lng);
        setVerdict(res);
        setDrawerTab("terdekat");
        setIsDrawerOpen(true);
      },
      (err) => {
        setIsGpsLoading(false);
        if (err.code === 1) {
          setGpsError("Izin lokasi ditolak. Silakan ketik nama perumahan/jalan Anda.");
        } else {
          setGpsError("Tidak dapat membaca sinyal GPS. Silakan klik langsung titik rumah Anda di peta.");
        }
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Handle klik pada klaster warga
  const handleBlockClick = (block: ActiveBlock) => {
    setSelectedBlock(block);
    setUserLocation({ lat: block.lat, lng: block.lng });
    setCameraTarget({ lat: block.lat, lng: block.lng, zoom: 16 });
    const res = checkCoverageLocation(block.lat, block.lng);
    setVerdict(res);
    setDrawerTab("terdekat");
  };

  // Filter tombol shortcut
  const handleQuickJump = (area: string) => {
    setActiveTabArea(area);
    switch (area) {
      case "SEMUA":
        setCameraTarget({ lat: -6.425, lng: 106.832, zoom: 13 });
        break;
      case "KALIBARU":
        setCameraTarget({ lat: -6.4385, lng: 106.8355, zoom: 15 });
        break;
      case "CILODONG":
        setCameraTarget({ lat: -6.4345, lng: 106.836, zoom: 15 });
        break;
      case "KALIMULYA":
        setCameraTarget({ lat: -6.4335, lng: 106.823, zoom: 15 });
        break;
      case "JATIMULYA":
        setCameraTarget({ lat: -6.442, lng: 106.827, zoom: 15 });
        break;
      case "SUKMAJAYA":
        setCameraTarget({ lat: -6.402, lng: 106.84, zoom: 15 });
        break;
    }
  };

  // Rekomendasi klaster aktif: default teratas jika belum ada lokasi pilihan
  const defaultRecommendedBlocks = useMemo(() => {
    return [...BLOK_OPERASIONAL_AKTIF]
      .sort((a, b) => b.pelangganCount - a.pelangganCount)
      .slice(0, 5)
      .map((b) => ({
        id: b.id,
        nama: b.nama,
        kelurahan: b.kelurahan,
        kecamatan: b.kecamatan,
        lat: b.lat,
        lng: b.lng,
        pelangganCount: b.pelangganCount,
        jarakMeter: 0,
        jadwal: b.jadwal,
        armada: b.armada,
        status: b.status,
        alasanRekomendasi: `Klaster warga aktif terpadat (${b.pelangganCount} KK). Jadwal pengangkutan rutin ${b.jadwal}.`,
      }));
  }, []);

  // Filter klaster pada Tab "Jelajahi Semua"
  const filteredAllClusters = useMemo(() => {
    return BLOK_OPERASIONAL_AKTIF.filter((b) => {
      const matchKecamatan =
        clusterFilterKecamatan === "SEMUA" ||
        b.kelurahan.toUpperCase() === clusterFilterKecamatan.toUpperCase();
      const matchQuery =
        !clusterSearchQuery.trim() ||
        b.nama.toLowerCase().includes(clusterSearchQuery.toLowerCase()) ||
        b.kelurahan.toLowerCase().includes(clusterSearchQuery.toLowerCase());
      return matchKecamatan && matchQuery;
    });
  }, [clusterFilterKecamatan, clusterSearchQuery]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-100 text-slate-800 select-none clean-coverage-map">
      {/* ── TOP HEADER / CLEAN SEARCH & BRAND HUD ── */}
      <header className="absolute top-0 inset-x-0 z-30 pointer-events-none p-2.5 sm:p-4 flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-3 w-full max-w-7xl mx-auto">
          {/* Brand Logo & Community Status Badge */}
          <div className="pointer-events-auto flex items-center gap-2.5 bg-white/95 backdrop-blur-md border border-slate-200/90 px-3.5 py-2 rounded-2xl shadow-lg shadow-slate-200/60">
            <Link href="/" className="flex items-center gap-2.5 group">
              <img
                src="/ups-heru-logo.jpg"
                alt="UPS HERU Logo"
                className="h-8 w-8 sm:h-9 sm:w-9 object-contain rounded-xl shadow-sm group-hover:scale-105 transition-transform"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm sm:text-base font-extrabold tracking-tight text-slate-900">
                    UPS HERU<span className="text-emerald-600">.</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-extrabold uppercase tracking-wide border border-emerald-200">
                    Peta Layanan
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 font-semibold truncate hidden sm:block">
                  Cek Area Warga Terdaftar & Jadwal Pengangkutan Depok
                </p>
              </div>
            </Link>
          </div>

          {/* Quick Nav Links (Desktop) */}
          <nav className="pointer-events-auto hidden md:flex items-center gap-1.5 bg-white/95 backdrop-blur-md border border-slate-200/90 px-2 py-1.5 rounded-2xl shadow-lg text-xs font-bold text-slate-600">
            <Link
              href="/"
              className="px-3 py-1.5 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
            >
              Beranda
            </Link>
            <Link
              href="/lacak"
              className="px-3 py-1.5 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
            >
              Lacak Truk
            </Link>
            <Link
              href="/bayar"
              className="px-3 py-1.5 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
            >
              Cek Tagihan
            </Link>
            <Link
              href="/tarif"
              className="px-3 py-1.5 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
            >
              Tarif Resmi
            </Link>
            <Link
              href="/daftar"
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-md shadow-emerald-700/20 transition-all flex items-center gap-1.5 ml-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Daftar Warga Baru</span>
            </Link>
          </nav>
        </div>

        {/* ── SEARCH & GPS INTERACTIVE BAR (HIGH LEGIBILITY) ── */}
        <div className="w-full max-w-xl mx-auto pointer-events-auto relative">
          <div className="relative flex items-center bg-white/95 backdrop-blur-xl border border-slate-300 rounded-2xl shadow-xl shadow-slate-300/40 transition-all focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-500/20">
            <div className="pl-3.5 pr-2 text-slate-400">
              <Search className="w-4 h-4 text-emerald-600" />
            </div>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              placeholder="Cari jalan, perumahan, atau kelurahan di Depok..."
              className="w-full py-2.5 sm:py-3 bg-transparent text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none font-medium"
            />

            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            <div className="pr-1.5 pl-1 flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleUseGps}
                disabled={isGpsLoading}
                className="px-3 py-1.5 sm:py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all active:scale-95 whitespace-nowrap"
                title="Gunakan posisi GPS saya"
              >
                {isGpsLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                ) : (
                  <LocateFixed className="w-3.5 h-3.5 text-emerald-600" />
                )}
                <span className="hidden sm:inline">GPS Saya</span>
              </button>
            </div>
          </div>

          {/* Autocomplete Suggestions Dropdown */}
          {isSearchFocused && searchSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden z-50">
              <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                <span>Rekomendasi Area & Landmark Depok</span>
                <button
                  type="button"
                  onClick={() => setIsSearchFocused(false)}
                  className="text-slate-400 hover:text-slate-700"
                >
                  Tutup
                </button>
              </div>
              <ul className="divide-y divide-slate-100 max-h-60 overflow-y-auto clean-scrollbar">
                {searchSuggestions.map((loc) => (
                  <li key={loc.label}>
                    <button
                      type="button"
                      onClick={() => handleSelectLocation(loc)}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">{loc.label}</p>
                          <p className="text-[10px] text-slate-500 truncate">
                            Kec. Cilodong • Kel. {loc.kelurahan}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                          loc.status === "AKTIF"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {loc.status === "AKTIF" ? "Terlayani Rutin" : "Perluasan"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* GPS Error Toast */}
          {gpsError && (
            <div className="mt-2 p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center justify-between shadow-sm">
              <span>{gpsError}</span>
              <button
                type="button"
                onClick={() => setGpsError(null)}
                className="text-red-400 hover:text-red-700 ml-2"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* ── QUICK AREA JUMP PILLS ── */}
        <div className="pointer-events-auto flex items-center gap-1.5 overflow-x-auto max-w-2xl mx-auto py-1 px-1 clean-scrollbar">
          {[
            { id: "SEMUA", label: "🗺️ Seluruh Depok" },
            { id: "KALIBARU", label: "🏡 Kalibaru (Pusat 447 KK)" },
            { id: "CILODONG", label: "🏡 Cilodong (54 KK)" },
            { id: "KALIMULYA", label: "🏡 Kalimulya (47 KK)" },
            { id: "JATIMULYA", label: "🏡 Jatimulya (26 KK)" },
            { id: "SUKMAJAYA", label: "🟡 Sukmajaya (Perluasan)" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleQuickJump(tab.id)}
              className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-all border shadow-sm ${
                activeTabArea === tab.id
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-emerald-600/30 font-extrabold"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* ── MAP CANVAS (HIGH VISIBILITY STREET TILES) ── */}
      <div className="w-full h-full">
        <MapContainer
          center={[-6.4385, 106.8355]}
          zoom={14}
          minZoom={11}
          maxZoom={18}
          zoomControl={false}
          className="w-full h-full"
        >
          {/* Base Tiles Switcher: Carto Voyager (Jernih) | Esri Satellite | OpenStreetMap */}
          {basemap === "voyager" && (
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              subdomains="abcd"
              maxZoom={19}
            />
          )}

          {basemap === "satellite" && (
            <TileLayer
              attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxZoom={18}
            />
          )}

          {basemap === "osm" && (
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
            />
          )}

          {/* Map Camera Controller */}
          <MapCameraController target={cameraTarget} onMapClick={handleMapClick} />

          {/* LAYER 1: Polygon Kecamatan Depok (Batas Halus, Non-Intrusif) */}
          {showPolygons &&
            KECAMATAN_DEPOK.map((k) => {
              const isCilodong = k.nama.toUpperCase() === "CILODONG";
              const isSukmajaya =
                k.nama.toUpperCase() === "SUKMA JAYA" || k.nama.toUpperCase() === "SUKMAJAYA";

              const color = isCilodong ? "#059669" : isSukmajaya ? "#d97706" : "#94a3b8";
              const fillOpacity = isCilodong ? 0.05 : isSukmajaya ? 0.04 : 0.02;
              const weight = isCilodong ? 1.8 : isSukmajaya ? 1.5 : 1.0;

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
                  <Tooltip direction="center" className="clean-map-tooltip">
                    <span>
                      {isCilodong
                        ? "Kec. Cilodong (Terlayani Penuh)"
                        : isSukmajaya
                        ? "Kec. Sukmajaya (Area Perluasan)"
                        : `Kec. ${k.nama}`}
                    </span>
                  </Tooltip>
                </Polygon>
              );
            })}

          {/* LAYER 2: Lingkar Cakupan Halus (Aura Layanan Terdekat) */}
          {showAuras &&
            BLOK_OPERASIONAL_AKTIF.map((block) => (
              <Circle
                key={`aura-${block.id}`}
                center={[block.lat, block.lng]}
                radius={block.radiusMeter || 500}
                pathOptions={{
                  color: block.status === "PERLUASAN" ? "#f59e0b" : "#10b981",
                  fillColor: block.status === "PERLUASAN" ? "#f59e0b" : "#10b981",
                  fillOpacity: 0.07,
                  weight: 1.2,
                }}
              />
            ))}

          {/* LAYER 3: 23 Klaster Warga Terdaftar (Pills Bersih Ramah) */}
          {showClusterBadges &&
            BLOK_OPERASIONAL_AKTIF.map((block) => {
              const isSelected = selectedBlock?.id === block.id;
              return (
                <Marker
                  key={block.id}
                  position={[block.lat, block.lng]}
                  icon={createClusterIcon(block, isSelected)}
                  eventHandlers={{
                    click: () => handleBlockClick(block),
                  }}
                >
                  <Tooltip direction="top" offset={[0, -14]} className="clean-map-tooltip">
                    <div className="text-center font-sans space-y-0.5">
                      <p className="font-extrabold text-slate-900 text-xs">{block.nama}</p>
                      <p className="text-[10px] text-emerald-700 font-bold">
                        {block.pelangganCount} KK Aktif Terdaftar • {block.jadwal}
                      </p>
                      <p className="text-[9px] text-slate-500">
                        {block.armada} • Kel. {block.kelurahan}
                      </p>
                    </div>
                  </Tooltip>
                </Marker>
              );
            })}

          {/* LAYER 4: Pin Titik Lokasi Pilihan Pengguna */}
          {userLocation && (
            <>
              <Marker position={[userLocation.lat, userLocation.lng]} icon={createUserLocationIcon()} />
              <Circle
                center={[userLocation.lat, userLocation.lng]}
                radius={160}
                pathOptions={{
                  color: "#2563eb",
                  fillColor: "#3b82f6",
                  fillOpacity: 0.12,
                  weight: 1.5,
                  dashArray: "3, 5",
                }}
              />
            </>
          )}
        </MapContainer>
      </div>

      {/* ── SIDE PANEL / DRAWER: REKOMENDASI AREA SEKITAR WARGA TERDAFTAR ── */}
      <aside
        aria-label="Panel Rekomendasi Area Sekitar Warga Terdaftar"
        className={`absolute top-24 sm:top-20 left-3 sm:left-6 z-30 pointer-events-auto w-[calc(100vw-24px)] sm:w-[380px] md:w-[420px] max-h-[calc(100vh-140px)] bg-white/95 backdrop-blur-2xl border border-slate-200/90 rounded-3xl shadow-2xl flex flex-col transition-all duration-300 ${
          isDrawerOpen ? "translate-y-0 opacity-100" : "-translate-y-6 opacity-0 pointer-events-none"
        }`}
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              🏡
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 leading-tight">
                Area Warga Terdaftar
              </h2>
              <p className="text-[10px] text-slate-500 font-medium">
                560+ Rumah Sudah Berlangganan Aktif di Depok
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsDrawerOpen(false)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Sembunyikan panel rekomendasi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher: Rekomendasi Terdekat vs Jelajahi Semua */}
        <div className="px-4 pt-3 pb-2 flex gap-1.5 bg-slate-50/70 border-b border-slate-100 text-xs font-bold">
          <button
            type="button"
            onClick={() => setDrawerTab("terdekat")}
            className={`flex-1 py-1.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              drawerTab === "terdekat"
                ? "bg-white text-emerald-700 shadow-sm border border-slate-200/80 font-extrabold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Rekomendasi Terdekat</span>
          </button>

          <button
            type="button"
            onClick={() => setDrawerTab("semua")}
            className={`flex-1 py-1.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              drawerTab === "semua"
                ? "bg-white text-emerald-700 shadow-sm border border-slate-200/80 font-extrabold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <span>Semua Klaster (23)</span>
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 clean-scrollbar">
          {drawerTab === "terdekat" ? (
            <div>
              {/* Context Banner */}
              <div className="mb-3 p-3 bg-emerald-50/80 border border-emerald-200/70 rounded-2xl text-xs text-emerald-900 leading-relaxed">
                {verdict ? (
                  <p>
                    <span className="font-extrabold text-emerald-800">Lokasi Anda Terpilih:</span>{" "}
                    Berikut klaster warga terdaftar yang berada di sekitar posisi Anda. Truk pengangkut sudah rutin melintasi area ini!
                  </p>
                ) : (
                  <p>
                    <span className="font-extrabold text-emerald-800">Tips:</span> Klik titik rumah Anda di peta atau gunakan tombol <b>GPS Saya</b> untuk melihat klaster tetangga terdekat yang sudah berlangganan.
                  </p>
                )}
              </div>

              {/* List Rekomendasi Terdekat */}
              <div className="space-y-2.5">
                {(verdict?.rekomendasiSekitar || defaultRecommendedBlocks).map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 bg-white border border-slate-200 rounded-2xl hover:border-emerald-500/80 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">🏡</span>
                          <h3 className="text-xs font-black text-slate-900 group-hover:text-emerald-700 transition-colors truncate">
                            {item.nama}
                          </h3>
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium">
                          Kel. {item.kelurahan} • Kec. {item.kecamatan}
                        </p>
                      </div>

                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 shrink-0">
                        {item.pelangganCount} KK Aktif
                      </span>
                    </div>

                    {item.jarakMeter > 0 && (
                      <div className="mb-2 inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                        <MapPin className="w-3 h-3" />
                        <span>±{item.jarakMeter} meter dari titik pilihan Anda</span>
                      </div>
                    )}

                    <p className="text-[11px] text-slate-600 font-medium leading-snug mb-3">
                      {item.alasanRekomendasi}
                    </p>

                    <div className="flex items-center justify-between text-[10px] pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-1 text-slate-500 font-bold truncate">
                        <Calendar className="w-3 h-3 text-emerald-600" />
                        <span>{item.jadwal}</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setCameraTarget({ lat: item.lat, lng: item.lng, zoom: 16 });
                            const targetBlock = BLOK_OPERASIONAL_AKTIF.find((b) => b.id === item.id);
                            if (targetBlock) setSelectedBlock(targetBlock);
                          }}
                          className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors"
                        >
                          Lihat di Peta
                        </button>
                        <Link
                          href={`/daftar?kelurahan=${encodeURIComponent(item.kelurahan)}&zona=${encodeURIComponent(item.nama)}`}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold shadow-sm transition-colors flex items-center gap-1"
                        >
                          <span>Daftar</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Filter Sub-Kecamatan & Search */}
              <div className="space-y-2">
                <input
                  type="text"
                  value={clusterSearchQuery}
                  onChange={(e) => setClusterSearchQuery(e.target.value)}
                  placeholder="Cari nama area (misal: Bakung, Dmiles, Sasak)..."
                  className="w-full py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600"
                />

                <div className="flex gap-1 overflow-x-auto pb-1 clean-scrollbar">
                  {["SEMUA", "Kalibaru", "Cilodong", "Kalimulya", "Jatimulya", "Mekar Jaya"].map((area) => (
                    <button
                      key={area}
                      type="button"
                      onClick={() => setClusterFilterKecamatan(area)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap border transition-all ${
                        clusterFilterKecamatan === area
                          ? "bg-slate-800 text-white border-slate-800 font-extrabold"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {area === "SEMUA" ? "Semua Area" : area}
                    </button>
                  ))}
                </div>
              </div>

              {/* List Klaster Semua */}
              <div className="space-y-2">
                {filteredAllClusters.map((block) => (
                  <div
                    key={block.id}
                    onClick={() => handleBlockClick(block)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                      selectedBlock?.id === block.id
                        ? "bg-emerald-50/60 border-emerald-500 shadow-sm"
                        : "bg-white border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs">🏡</span>
                          <p className="text-xs font-bold text-slate-900 truncate">{block.nama}</p>
                        </div>
                        <p className="text-[10px] text-slate-500">
                          Kel. {block.kelurahan} • {block.jadwal}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 shrink-0">
                        {block.pelangganCount} KK
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer CTA */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-600 font-bold text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Retribusi Resmi Depok</span>
          </div>
          <Link
            href="/daftar"
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-sm text-xs flex items-center gap-1 transition-colors"
          >
            <span>Daftar Warga Baru</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </aside>

      {/* ── TOGGLE BUTTON TO RE-OPEN DRAWER IF CLOSED ── */}
      {!isDrawerOpen && (
        <button
          type="button"
          onClick={() => setIsDrawerOpen(true)}
          className="absolute top-24 left-4 z-30 pointer-events-auto bg-white/95 backdrop-blur-md border border-slate-200 px-3.5 py-2 rounded-2xl shadow-xl text-xs font-extrabold text-slate-800 hover:text-emerald-700 hover:border-emerald-500 transition-all flex items-center gap-2"
        >
          <span>🏡</span>
          <span>Lihat Rekomendasi Area Warga Terdaftar (23)</span>
          <ChevronRight className="w-4 h-4 text-emerald-600" />
        </button>
      )}

      {/* ── FLOATING VERDICT CARD (HASIL CEK KOORDINAT / ALAMAT) ── */}
      {verdict && (
        <aside
          aria-label="Hasil Pengecekan Lokasi Anda"
          className="absolute bottom-4 left-3 right-3 sm:left-auto sm:right-6 sm:w-[420px] z-30 pointer-events-auto bg-white/95 backdrop-blur-2xl border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-2xl shadow-slate-400/30 transition-all animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          {/* Card Header & Close */}
          <div className="flex items-start justify-between gap-3 mb-2.5">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  verdict.status === "AKTIF"
                    ? "bg-emerald-500"
                    : verdict.status === "PERLUASAN"
                    ? "bg-amber-500"
                    : "bg-blue-500"
                }`}
              />
              <span
                className={`text-[11px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full border ${
                  verdict.status === "AKTIF"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : verdict.status === "PERLUASAN"
                    ? "bg-amber-50 text-amber-800 border-amber-200"
                    : "bg-blue-50 text-blue-800 border-blue-200"
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
              className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Tutup panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Area Title & Distance */}
          <div className="space-y-0.5 mb-3">
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-snug">
              {verdict.zonaTerdekat || `Kelurahan ${verdict.kelurahan}`}
            </h2>
            <p className="text-xs text-slate-500 font-semibold">
              Kec. {verdict.kecamatan} • Berjarak ±{verdict.jarakMeter}m dari armada aktif terdekat
            </p>
          </div>

          {/* Specs Micro-Grid */}
          <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-2xl mb-3 text-xs">
            <div className="space-y-0.5">
              <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3 h-3 text-emerald-600" />
                <span>Jadwal Angkut</span>
              </p>
              <p className="font-extrabold text-slate-900 text-[11px] sm:text-xs truncate">
                {verdict.jadwalPengangkutan}
              </p>
            </div>

            <div className="space-y-0.5">
              <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Truck className="w-3 h-3 text-blue-600" />
                <span>Armada Wilayah</span>
              </p>
              <p className="font-extrabold text-slate-900 text-[11px] sm:text-xs truncate">
                {verdict.armada}
              </p>
            </div>
          </div>

          {/* Explanatory Message */}
          <p className="text-xs text-slate-700 font-medium leading-relaxed mb-3.5">
            {verdict.pesan}
          </p>

          {/* Rekomendasi Tetangga Sekitar */}
          {verdict.rekomendasiSekitar && verdict.rekomendasiSekitar.length > 0 && (
            <div className="mb-3.5 p-2.5 bg-slate-100/80 rounded-2xl border border-slate-200/80">
              <p className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                <span>🏡</span>
                <span>Klaster Warga Terdaftar Terdekat:</span>
              </p>
              <div className="space-y-1">
                {verdict.rekomendasiSekitar.slice(0, 2).map((rec) => (
                  <div key={rec.id} className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-800 truncate">{rec.nama}</span>
                    <span className="text-[10px] text-emerald-700 font-extrabold ml-2 shrink-0">
                      {rec.pelangganCount} KK (±{rec.jarakMeter}m)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CTA Action Buttons */}
          <div className="space-y-2">
            <Link
              href={verdict.ctaUrl}
              className={`w-full py-2.5 sm:py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 ${
                verdict.status === "AKTIF"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-700/20"
                  : "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-700/20"
              }`}
            >
              <span>{verdict.ctaText}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <a
              href={verdict.whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 flex items-center justify-center gap-2 transition-all"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              <span>Tanya CS WhatsApp (24 Jam)</span>
              <ExternalLink className="w-3 h-3 opacity-60 ml-0.5" />
            </a>
          </div>
        </aside>
      )}

      {/* ── FLOATING BASEMAP & LAYER CONTROLS (BOTTOM RIGHT) ── */}
      <footer className="absolute bottom-4 right-3 sm:right-6 z-20 pointer-events-none hidden md:flex flex-col items-end gap-2 text-xs">
        {/* Basemap Switcher (Jalan vs Satelit vs OSM) */}
        <div className="pointer-events-auto bg-white/95 backdrop-blur-md border border-slate-200 px-3 py-1.5 rounded-2xl shadow-lg flex items-center gap-2 text-[11px] font-bold text-slate-700">
          <MapIcon className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-400">Peta:</span>
          <button
            type="button"
            onClick={() => setBasemap("voyager")}
            className={`px-2 py-0.5 rounded-lg transition-colors ${
              basemap === "voyager"
                ? "bg-emerald-600 text-white font-extrabold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            Jalan Terang
          </button>
          <button
            type="button"
            onClick={() => setBasemap("satellite")}
            className={`px-2 py-0.5 rounded-lg transition-colors ${
              basemap === "satellite"
                ? "bg-emerald-600 text-white font-extrabold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            Satelit
          </button>
          <button
            type="button"
            onClick={() => setBasemap("osm")}
            className={`px-2 py-0.5 rounded-lg transition-colors ${
              basemap === "osm"
                ? "bg-emerald-600 text-white font-extrabold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            OSM
          </button>
        </div>

        {/* Layer Controls Bar */}
        <div className="pointer-events-auto bg-white/95 backdrop-blur-md border border-slate-200 px-3 py-1.5 rounded-2xl shadow-lg flex items-center gap-3 text-[11px] font-bold text-slate-700">
          <Layers className="w-3.5 h-3.5 text-slate-400" />
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900">
            <input
              type="checkbox"
              checked={showClusterBadges}
              onChange={(e) => setShowClusterBadges(e.target.checked)}
              className="accent-emerald-600 w-3.5 h-3.5 rounded"
            />
            <span>23 Klaster Warga</span>
          </label>
          <span className="text-slate-300">|</span>
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900">
            <input
              type="checkbox"
              checked={showAuras}
              onChange={(e) => setShowAuras(e.target.checked)}
              className="accent-emerald-600 w-3.5 h-3.5 rounded"
            />
            <span>Lingkar Jangkauan</span>
          </label>
          <span className="text-slate-300">|</span>
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900">
            <input
              type="checkbox"
              checked={showPolygons}
              onChange={(e) => setShowPolygons(e.target.checked)}
              className="accent-emerald-600 w-3.5 h-3.5 rounded"
            />
            <span>Batas Wilayah</span>
          </label>
        </div>
      </footer>
    </div>
  );
}
