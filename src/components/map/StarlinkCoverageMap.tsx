"use client";

import "leaflet/dist/leaflet.css";
import "@/lib/leaflet-setup";
import "@/app/coverage/coverage.css";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
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
  Plus,
  Minus,
  RotateCcw,
} from "lucide-react";
import {
  BLOK_OPERASIONAL_AKTIF,
  QUICK_SEARCH_LOCATIONS,
  checkCoverageLocation,
  type ActiveBlock,
  type CoverageCheckResult,
  type NearbyClusterRecommendation,
} from "@/lib/coverage-shared";

// Generator icon pin klaster warga terdaftar
function createClusterPin(block: ActiveBlock, isSelected = false) {
  const isAmber = block.status === "PERLUASAN";
  const cleanName = block.nama.replace("Blok ", "");
  const html = `
    <div class="clean-cluster-pin ${isAmber ? "clean-cluster-pin-amber" : ""} ${isSelected ? "clean-cluster-pin-selected" : ""}">
      <div class="clean-cluster-pin-inner">
        <span>🏡</span>
        <span>${cleanName}</span>
        <span class="clean-cluster-pin-count">${block.pelangganCount} KK</span>
      </div>
    </div>
  `;
  return L.divIcon({
    className: "clean-cluster-div-icon",
    html,
    iconSize: [0, 0],
    iconAnchor: [45, 12],
  });
}

// Generator icon pin lokasi pengguna (Clean Blue Pin)
function createUserLocationIcon() {
  const html = `
    <div class="clean-user-marker">
      <div class="clean-user-halo"></div>
      <div class="clean-user-core"></div>
    </div>
  `;
  return L.divIcon({
    className: "clean-user-div-icon",
    html,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

// Controller internal untuk kamera & resize Leaflet
function MapCameraController({
  target,
  onMapClick,
}: {
  target: { lat: number; lng: number; zoom?: number } | null;
  onMapClick: (lat: number, lng: number) => void;
}) {
  const map = useMap();

  useEffect(() => {
    // Invalidate size agar tile tidak pecah / abu-abu saat container selesai mount
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);
    return () => clearTimeout(timer);
  }, [map]);

  useEffect(() => {
    if (target) {
      map.flyTo([target.lat, target.lng], target.zoom || 15, {
        duration: 0.9,
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

// Tombol kontrol zoom kustom
function CustomZoomControls({ onReset }: { onReset: () => void }) {
  const map = useMap();

  return (
    <div className="absolute right-4 bottom-24 sm:bottom-6 z-30 pointer-events-auto flex flex-col gap-1.5 shadow-lg">
      <button
        type="button"
        onClick={() => map.zoomIn()}
        className="w-9 h-9 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl flex items-center justify-center font-bold transition-all shadow-sm active:scale-95"
        title="Perbesar Peta"
      >
        <Plus className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => map.zoomOut()}
        className="w-9 h-9 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl flex items-center justify-center font-bold transition-all shadow-sm active:scale-95"
        title="Perkecil Peta"
      >
        <Minus className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={onReset}
        className="w-9 h-9 bg-white hover:bg-slate-50 border border-slate-200 text-emerald-700 rounded-xl flex items-center justify-center font-bold transition-all shadow-sm active:scale-95"
        title="Pusatkan ke Depok"
      >
        <RotateCcw className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function StarlinkCoverageMap() {
  // State pencarian & geocoding
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isSearchingGeocode, setIsSearchingGeocode] = useState(false);
  const [geocodeResults, setGeocodeResults] = useState<
    { label: string; lat: number; lng: number; sublabel: string }[]
  >([]);
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

  // Panel Rekomendasi Sheet state
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [clusterFilterKecamatan, setClusterFilterKecamatan] = useState<string>("SEMUA");
  const [clusterSearchQuery, setClusterSearchQuery] = useState("");

  // Debounced real geocoding search menggunakan Nominatim OSM Depok
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 3) {
      setGeocodeResults([]);
      setIsSearchingGeocode(false);
      return;
    }

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearchingGeocode(true);
      try {
        const q = encodeURIComponent(`${searchQuery} Depok`);
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&countrycodes=id&viewbox=106.72,-6.33,106.91,-6.47&bounded=0&q=${q}&limit=5`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data)) {
          const formatted = data.map((item: any) => ({
            label: item.display_name.split(",")[0],
            sublabel: item.display_name.split(",").slice(1, 4).join(",").trim(),
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
          }));
          setGeocodeResults(formatted);
        }
      } catch {
        // Fallback gracefully
      } finally {
        setIsSearchingGeocode(false);
      }
    }, 400);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery]);

  // Autocomplete suggestions (menggabungkan quick locations lokal + hasil geocoding)
  const combinedSuggestions = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const localFiltered = QUICK_SEARCH_LOCATIONS.filter(
      (loc) =>
        loc.label.toLowerCase().includes(q) ||
        loc.kelurahan.toLowerCase().includes(q)
    ).map((l) => ({
      label: l.label,
      sublabel: `Kel. ${l.kelurahan}`,
      lat: l.lat,
      lng: l.lng,
      isLocal: true,
    }));

    return [...localFiltered, ...geocodeResults].slice(0, 6);
  }, [searchQuery, geocodeResults]);

  // Handle klik di peta langsung
  const handleMapClick = useCallback((lat: number, lng: number) => {
    setUserLocation({ lat, lng });
    setSelectedBlock(null);
    const res = checkCoverageLocation(lat, lng);
    setVerdict(res);
    setIsPanelCollapsed(false);
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
    setIsPanelCollapsed(false);
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
        setIsPanelCollapsed(false);
      },
      (err) => {
        setIsGpsLoading(false);
        if (err.code === 1) {
          setGpsError("Izin lokasi ditolak. Silakan ketik nama jalan/perumahan Anda.");
        } else {
          setGpsError("Tidak dapat membaca sinyal GPS. Silakan klik langsung titik rumah Anda di peta.");
        }
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Handle klik pada klaster warga di peta
  const handleBlockClick = (block: ActiveBlock) => {
    setSelectedBlock(block);
    setUserLocation({ lat: block.lat, lng: block.lng });
    setCameraTarget({ lat: block.lat, lng: block.lng, zoom: 16 });
    const res = checkCoverageLocation(block.lat, block.lng);
    setVerdict(res);
    setIsPanelCollapsed(false);
  };

  // Reset kamera ke pusat Depok
  const handleResetDepok = () => {
    setCameraTarget({ lat: -6.4385, lng: 106.8355, zoom: 14 });
    setSelectedBlock(null);
  };

  // Filter klaster pada list rekomendasi
  const filteredClusters = useMemo(() => {
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
    <div className="relative w-full h-[100dvh] overflow-hidden bg-slate-100 text-slate-800 select-none clean-coverage-map font-sans">
      {/* ── TOP COMPACT HEADER & SEARCH BAR ── */}
      <header className="absolute top-0 inset-x-0 z-30 pointer-events-none p-3 sm:p-4 flex flex-col items-center gap-2">
        <div className="w-full max-w-xl flex items-center gap-2 pointer-events-auto">
          {/* Logo & Back Button */}
          <Link
            href="/"
            className="flex items-center gap-2 bg-white/95 backdrop-blur-md border border-slate-200/90 py-2 px-3 rounded-2xl shadow-md hover:border-emerald-500 transition-all shrink-0 group"
            title="Kembali ke Beranda"
          >
            <img
              src="/ups-heru-logo.jpg"
              alt="UPS HERU Logo"
              className="h-7 w-7 object-contain rounded-lg shadow-sm"
            />
            <span className="text-xs font-black tracking-tight text-slate-900 hidden sm:inline">
              UPS HERU<span className="text-emerald-600">.</span>
            </span>
          </Link>

          {/* Search Box */}
          <div className="relative flex-1">
            <div className="flex items-center bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-lg focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
              <div className="pl-3 pr-2 text-slate-400">
                {isSearchingGeocode ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                ) : (
                  <Search className="w-4 h-4 text-emerald-600" />
                )}
              </div>

              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                placeholder="Cari jalan, perumahan, kelurahan di Depok..."
                className="w-full py-2.5 bg-transparent text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none font-medium"
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

              <button
                type="button"
                onClick={handleUseGps}
                disabled={isGpsLoading}
                className="mr-1.5 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-extrabold rounded-xl flex items-center gap-1 transition-all active:scale-95 shrink-0"
                title="Gunakan posisi GPS saya"
              >
                {isGpsLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <LocateFixed className="w-3.5 h-3.5 text-emerald-600" />
                )}
                <span className="hidden sm:inline">GPS</span>
              </button>
            </div>

            {/* Suggestions Dropdown */}
            {isSearchFocused && combinedSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-50">
                <div className="px-3.5 py-1.5 bg-slate-50 border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Hasil Lokasi di Depok</span>
                  <button
                    type="button"
                    onClick={() => setIsSearchFocused(false)}
                    className="text-slate-400 hover:text-slate-700"
                  >
                    Tutup
                  </button>
                </div>
                <ul className="divide-y divide-slate-100 max-h-56 overflow-y-auto clean-scrollbar">
                  {combinedSuggestions.map((loc, idx) => (
                    <li key={`sugg-${idx}`}>
                      <button
                        type="button"
                        onClick={() => handleSelectLocation(loc)}
                        className="w-full text-left px-3.5 py-2 hover:bg-slate-50 transition-colors flex items-center gap-2.5"
                      >
                        <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">{loc.label}</p>
                          <p className="text-[10px] text-slate-500 truncate">{loc.sublabel}</p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* GPS Error Alert */}
        {gpsError && (
          <div className="pointer-events-auto max-w-xl w-full p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center justify-between shadow-sm">
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
          {/* CartoDB Voyager: Street Map Terang & Jelas (Nama jalan & gang tampak jelas) */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
            maxZoom={19}
          />

          {/* Camera Controller & Map Clicks */}
          <MapCameraController target={cameraTarget} onMapClick={handleMapClick} />

          {/* Custom Zoom & Reset Controls */}
          <CustomZoomControls onReset={handleResetDepok} />

          {/* Lingkar Jangkauan Halus Sekitar Klaster Aktif */}
          {BLOK_OPERASIONAL_AKTIF.map((block) => (
            <Circle
              key={`aura-${block.id}`}
              center={[block.lat, block.lng]}
              radius={380}
              pathOptions={{
                color: block.status === "PERLUASAN" ? "#f59e0b" : "#059669",
                fillColor: block.status === "PERLUASAN" ? "#f59e0b" : "#059669",
                fillOpacity: 0.05,
                weight: 1,
              }}
            />
          ))}

          {/* 23 Pin Klaster Warga Terdaftar (Rapi & Tidak Bertumpuk) */}
          {BLOK_OPERASIONAL_AKTIF.map((block) => {
            const isSelected = selectedBlock?.id === block.id;
            return (
              <Marker
                key={block.id}
                position={[block.lat, block.lng]}
                icon={createClusterPin(block, isSelected)}
                eventHandlers={{
                  click: () => handleBlockClick(block),
                }}
              >
                <Tooltip direction="top" offset={[0, -14]} className="clean-tooltip">
                  <div className="text-center font-sans">
                    <p className="font-extrabold text-slate-900 text-xs">{block.nama}</p>
                    <p className="text-[10px] text-emerald-700 font-bold">
                      {block.pelangganCount} KK Aktif • {block.jadwal}
                    </p>
                    <p className="text-[9px] text-slate-400">
                      {block.armada} • Kel. {block.kelurahan}
                    </p>
                  </div>
                </Tooltip>
              </Marker>
            );
          })}

          {/* Pin Lokasi Pilihan Pengguna (Clean Blue Pin) */}
          {userLocation && (
            <>
              <Marker position={[userLocation.lat, userLocation.lng]} icon={createUserLocationIcon()} />
              <Circle
                center={[userLocation.lat, userLocation.lng]}
                radius={120}
                pathOptions={{
                  color: "#2563eb",
                  fillColor: "#3b82f6",
                  fillOpacity: 0.12,
                  weight: 1.5,
                }}
              />
            </>
          )}
        </MapContainer>
      </div>

      {/* ── UNIFIED REKOMENDASI & HASIL CEK PANEL ── */}
      <section
        aria-label="Panel Rekomendasi Area Warga Terdaftar"
        className={`absolute bottom-0 sm:bottom-6 left-0 sm:left-6 right-0 sm:right-auto sm:w-[400px] z-30 pointer-events-auto bg-white/95 backdrop-blur-2xl border-t sm:border border-slate-200/90 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col transition-all duration-300 ${
          isPanelCollapsed ? "max-h-[58px]" : "max-h-[65dvh] sm:max-h-[calc(100dvh-140px)]"
        }`}
      >
        {/* Panel Header & Minimize Handle */}
        <div
          onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
          className="p-3.5 border-b border-slate-100 flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base">🏡</span>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                {verdict ? "Hasil Cek & Rekomendasi Terdekat" : "Area Warga Terdaftar"}
              </h2>
              <p className="text-[10px] text-emerald-700 font-bold truncate">
                560+ Rumah Aktif Berlangganan di Depok
              </p>
            </div>
          </div>

          <button
            type="button"
            className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title={isPanelCollapsed ? "Perluas Panel" : "Ciutkan Panel"}
          >
            {isPanelCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Panel Body (Tampil jika tidak di-collapse) */}
        {!isPanelCollapsed && (
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 clean-scrollbar">
            {verdict ? (
              /* ── MODE 1: LOKASI DIPILIH (HASIL CEK + REKOMENDASI TERDEKAT) ── */
              <div className="space-y-3">
                {/* Status Badge & Header */}
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full border ${
                        verdict.status === "AKTIF"
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                          : verdict.status === "PERLUASAN"
                          ? "bg-amber-100 text-amber-800 border-amber-300"
                          : "bg-blue-100 text-blue-800 border-blue-300"
                      }`}
                    >
                      {verdict.statusLabel}
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        setVerdict(null);
                        setUserLocation(null);
                      }}
                      className="text-[10px] text-slate-500 hover:text-slate-800 font-bold"
                    >
                      ← Cari Titik Lain
                    </button>
                  </div>

                  <h3 className="text-sm font-black text-slate-900">
                    {verdict.zonaTerdekat || `Kelurahan ${verdict.kelurahan}`}
                  </h3>
                  <p className="text-[11px] text-slate-600 font-medium">
                    Kec. {verdict.kecamatan} • Jarak ±{verdict.jarakMeter}m dari armada aktif terdekat
                  </p>
                </div>

                {/* Jadwal & Armada Info */}
                <div className="grid grid-cols-2 gap-2 p-2 bg-emerald-50/60 border border-emerald-200/60 rounded-xl text-xs">
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-emerald-600" />
                      <span>Jadwal Angkut</span>
                    </p>
                    <p className="font-extrabold text-slate-900 text-[11px] truncate">
                      {verdict.jadwalPengangkutan}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                      <Truck className="w-3 h-3 text-emerald-600" />
                      <span>Armada Penjemput</span>
                    </p>
                    <p className="font-extrabold text-slate-900 text-[11px] truncate">
                      {verdict.armada}
                    </p>
                  </div>
                </div>

                {/* Rekomendasi Area Sekitar Warga Terdaftar Terdekat */}
                {verdict.rekomendasiSekitar && verdict.rekomendasiSekitar.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-extrabold text-slate-700 flex items-center gap-1.5">
                      <span>🏡</span>
                      <span>Rekomendasi Area Warga Terdaftar Terdekat:</span>
                    </p>

                    <div className="space-y-2">
                      {verdict.rekomendasiSekitar.slice(0, 3).map((rec) => (
                        <div
                          key={rec.id}
                          className="p-2.5 bg-white border border-slate-200 rounded-xl hover:border-emerald-500 transition-all text-xs"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-slate-900 truncate">{rec.nama}</span>
                            <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">
                              {rec.pelangganCount} KK (±{rec.jarakMeter}m)
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-snug mb-1.5">
                            {rec.alasanRekomendasi}
                          </p>
                          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                            <span>Jadwal: {rec.jadwal}</span>
                            <Link
                              href={`/daftar?kelurahan=${encodeURIComponent(rec.kelurahan)}&zona=${encodeURIComponent(rec.nama)}`}
                              className="text-emerald-700 font-extrabold hover:underline"
                            >
                              Daftar Ikut di Sini →
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-1.5 pt-1">
                  <Link
                    href={verdict.ctaUrl}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5 shadow-md shadow-emerald-700/20 transition-all active:scale-95"
                  >
                    <span>{verdict.ctaText}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <a
                    href={verdict.whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Tanya CS WhatsApp (24 Jam)</span>
                  </a>
                </div>
              </div>
            ) : (
              /* ── MODE 2: JELAJAHI AREA WARGA TERDAFTAR ── */
              <div className="space-y-3">
                <div className="p-2.5 bg-emerald-50/70 border border-emerald-200/60 rounded-xl text-xs text-emerald-900 leading-relaxed">
                  <p>
                    <span className="font-extrabold">💡 Cara Mudah:</span> Klik titik rumah Anda di peta atau gunakan tombol <b>GPS</b> untuk melihat rekomendasi klaster tetangga terdekat yang sudah rutin diangkut.
                  </p>
                </div>

                {/* Filter Sub-Wilayah */}
                <div className="flex gap-1 overflow-x-auto pb-1 clean-scrollbar">
                  {["SEMUA", "Kalibaru", "Cilodong", "Kalimulya", "Jatimulya", "Mekar Jaya"].map((area) => (
                    <button
                      key={area}
                      type="button"
                      onClick={() => setClusterFilterKecamatan(area)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap border transition-all ${
                        clusterFilterKecamatan === area
                          ? "bg-slate-900 text-white border-slate-900 font-extrabold"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {area === "SEMUA" ? "Semua (23)" : area}
                    </button>
                  ))}
                </div>

                {/* List Klaster Warga */}
                <div className="space-y-2">
                  {filteredClusters.map((block) => (
                    <div
                      key={block.id}
                      onClick={() => handleBlockClick(block)}
                      className="p-2.5 bg-white border border-slate-200 rounded-xl hover:border-emerald-500 hover:shadow-sm transition-all cursor-pointer text-xs"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span>🏡</span>
                          <span className="font-bold text-slate-900 truncate">{block.nama}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 shrink-0">
                          {block.pelangganCount} KK
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500">
                        Kel. {block.kelurahan} • Jadwal: {block.jadwal}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="pt-2">
                  <Link
                    href="/daftar"
                    className="w-full py-2 px-3 rounded-xl text-xs font-extrabold bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>Daftar Warga Baru</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
