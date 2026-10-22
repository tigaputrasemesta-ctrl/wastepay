"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Search,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Calendar,
  Truck,
  X,
  Phone,
  RefreshCw,
  LocateFixed,
  MessageCircle,
} from "lucide-react";
import {
  BLOK_OPERASIONAL_AKTIF,
  QUICK_SEARCH_LOCATIONS,
  checkCoverageLocation,
  type ActiveBlock,
  type CoverageCheckResult,
} from "@/lib/coverage-shared";

// Dynamic import Leaflet Map (SSR False) dengan Skeleton Loader Ringan
const CoverageLeafletMap = dynamic(
  () => import("@/components/coverage/CoverageLeafletMap"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[400px] sm:h-[480px] bg-slate-100 rounded-3xl flex flex-col items-center justify-center p-6 text-center border border-slate-200">
        <RefreshCw className="w-7 h-7 animate-spin text-emerald-600 mb-2" />
        <p className="text-sm font-extrabold text-slate-800">
          Memuat Peta Layanan Depok...
        </p>
      </div>
    ),
  }
);

const KELURAHAN_CENTERS: Record<string, { lat: number; lng: number; zoom: number }> = {
  SEMUA: { lat: -6.4385, lng: 106.8355, zoom: 14 },
  Kalibaru: { lat: -6.4385, lng: 106.8355, zoom: 15 },
  Cilodong: { lat: -6.4345, lng: 106.836, zoom: 15 },
  Kalimulya: { lat: -6.4347, lng: 106.8246, zoom: 15 },
  Jatimulya: { lat: -6.438, lng: 106.825, zoom: 15 },
  "Mekar Jaya": { lat: -6.402, lng: 106.84, zoom: 15 },
};

export default function CoverageExplorer() {
  // State pencarian & geocoding
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isSearchingGeocode, setIsSearchingGeocode] = useState(false);
  const [geocodeResults, setGeocodeResults] = useState<
    { label: string; lat: number; lng: number; sublabel: string }[]
  >([]);
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Titik pilihan & status jadwal
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [verdict, setVerdict] = useState<CoverageCheckResult | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<ActiveBlock | null>(null);

  // Kontrol kamera peta
  const [cameraTarget, setCameraTarget] = useState<{ lat: number; lng: number; zoom?: number } | null>({
    lat: -6.4385,
    lng: 106.8355,
    zoom: 14,
  });

  // Filter Kelurahan
  const [selectedKelurahan, setSelectedKelurahan] = useState<string>("SEMUA");

  // Ref container peta untuk auto scroll
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced real geocoding search menggunakan OpenStreetMap Depok
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
        // Fallback
      } finally {
        setIsSearchingGeocode(false);
      }
    }, 350);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery]);

  // Autocomplete suggestions
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
    }));

    return [...localFiltered, ...geocodeResults].slice(0, 5);
  }, [searchQuery, geocodeResults]);

  // Handle klik di peta
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
    setCameraTarget({ lat: loc.lat, lng: loc.lng, zoom: 16 });
    const res = checkCoverageLocation(loc.lat, loc.lng);
    setVerdict(res);
    mapContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  // Handle Geolocation GPS
  const handleUseGps = () => {
    if (!navigator.geolocation) {
      setGpsError("Browser Anda tidak mendukung deteksi GPS.");
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
        mapContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      },
      (err) => {
        setIsGpsLoading(false);
        if (err.code === 1) {
          setGpsError("Izin lokasi tidak diberikan. Silakan cari nama jalan atau ketuk peta.");
        } else {
          setGpsError("Sinyal GPS lemah. Silakan klik langsung titik rumah Anda di peta.");
        }
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Handle klik ruas jalan (dari daftar bawah atau pin peta)
  const handleBlockClick = (block: ActiveBlock) => {
    setSelectedBlock(block);
    setUserLocation({ lat: block.lat, lng: block.lng });
    setCameraTarget({ lat: block.lat, lng: block.lng, zoom: 16 });
    const res = checkCoverageLocation(block.lat, block.lng);
    setVerdict(res);
    mapContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  // Handle pilih kelurahan chip
  const handleSelectKelurahan = (kel: string) => {
    setSelectedKelurahan(kel);
    const target = KELURAHAN_CENTERS[kel] || KELURAHAN_CENTERS.SEMUA;
    setCameraTarget(target);
  };

  // Reset kamera ke Depok
  const handleResetCamera = () => {
    setCameraTarget({ lat: -6.4385, lng: 106.8355, zoom: 14 });
    setSelectedBlock(null);
  };

  // Filter daftar ruas jalan berdasarkan chip kelurahan
  const filteredBlocks = useMemo(() => {
    if (selectedKelurahan === "SEMUA") return BLOK_OPERASIONAL_AKTIF;
    return BLOK_OPERASIONAL_AKTIF.filter(
      (b) => b.kelurahan.toUpperCase() === selectedKelurahan.toUpperCase()
    );
  }, [selectedKelurahan]);

  return (
    <div className="space-y-6">
      {/* ── 1. UNIFIED SEARCH & GPS BAR ── */}
      <div className="space-y-3">
        <div className="relative">
          <div className="flex flex-col sm:flex-row items-stretch gap-2">
            <div className="flex-1 flex items-center bg-white border border-slate-300 rounded-2xl shadow-sm focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all p-1">
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
                placeholder="Ketik nama jalan, perumahan, atau kelurahan..."
                aria-label="Cari alamat atau jalan di Depok"
                className="w-full py-2.5 bg-transparent text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none font-medium"
              />

              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Hapus kata kunci"
                  className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleUseGps}
              disabled={isGpsLoading}
              aria-label="Deteksi posisi GPS saat ini"
              className="w-full sm:w-auto px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-extrabold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shrink-0 shadow-sm"
            >
              {isGpsLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <LocateFixed className="w-4 h-4" />
              )}
              <span>Lokasi Saya (GPS)</span>
            </button>
          </div>

          {/* Autocomplete Suggestions Dropdown */}
          {isSearchFocused && combinedSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-50">
              <div className="px-3.5 py-1.5 bg-slate-50 border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Pilihan Lokasi</span>
                <button
                  type="button"
                  onClick={() => setIsSearchFocused(false)}
                  className="text-slate-400 hover:text-slate-700 font-bold"
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
                      className="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 transition-colors flex items-center gap-2.5"
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

        {/* GPS Error Alert */}
        {gpsError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-center justify-between">
            <span>{gpsError}</span>
            <button
              type="button"
              onClick={() => setGpsError(null)}
              className="text-red-400 hover:text-red-700 ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Filter Kelurahan Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 clean-scrollbar">
          <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap pl-0.5">
            Wilayah:
          </span>
          {["SEMUA", "Kalibaru", "Cilodong", "Kalimulya", "Jatimulya", "Mekar Jaya"].map((area) => (
            <button
              key={area}
              type="button"
              onClick={() => handleSelectKelurahan(area)}
              className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap border transition-all ${
                selectedKelurahan === area
                  ? "bg-emerald-800 text-white border-emerald-800 shadow-sm"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {area === "SEMUA" ? "Semua Wilayah" : area}
            </button>
          ))}
        </div>
      </div>

      {/* ── 2. VERDICT / DETAIL JADWAL CARD ── */}
      {verdict ? (
        <div
          className={`p-4 sm:p-5 rounded-2xl border transition-all animate-in fade-in slide-in-from-top-2 duration-200 shadow-sm ${
            verdict.status === "AKTIF"
              ? "bg-emerald-50 border-emerald-300 text-emerald-950"
              : verdict.status === "PERLUASAN"
              ? "bg-amber-50 border-amber-300 text-amber-950"
              : "bg-slate-50 border-slate-300 text-slate-900"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                    verdict.status === "AKTIF"
                      ? "bg-emerald-700 text-white border-emerald-800"
                      : verdict.status === "PERLUASAN"
                      ? "bg-amber-600 text-white border-amber-700"
                      : "bg-slate-600 text-white border-slate-700"
                  }`}
                >
                  {verdict.statusLabel}
                </span>
                <span className="text-xs font-bold text-slate-500">
                  Jarak ±{verdict.jarakMeter}m dari armada
                </span>
              </div>

              <h3 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900">
                {verdict.zonaTerdekat}{" "}
                <span className="text-xs sm:text-sm font-semibold text-slate-600">
                  (Kel. {verdict.kelurahan}, Kec. {verdict.kecamatan})
                </span>
              </h3>

              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-bold pt-0.5">
                <span className="flex items-center gap-1.5 text-slate-800">
                  <Calendar className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>Jadwal: {verdict.jadwalPengangkutan}</span>
                </span>
                <span className="flex items-center gap-1.5 text-slate-800">
                  <Truck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>Armada: {verdict.armada}</span>
                </span>
              </div>
            </div>

            {/* Tombol Aksi */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
              <Link
                href={verdict.ctaUrl}
                className="py-2.5 px-4 rounded-xl text-xs sm:text-sm font-extrabold bg-emerald-700 hover:bg-emerald-800 text-white flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
              >
                <span>{verdict.ctaText}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <a
                href={verdict.whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="py-2.5 px-3 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 flex items-center justify-center gap-1.5 transition-colors"
              >
                <MessageCircle className="w-4 h-4 text-emerald-700" />
                <span>Chat CS</span>
              </a>

              <button
                type="button"
                onClick={() => setVerdict(null)}
                aria-label="Tutup rincian"
                className="hidden sm:flex p-2 text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-500 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span>💡</span>
            <span>Ketik alamat di atas atau klik salah satu pin di peta untuk melihat jadwal penjemputan.</span>
          </span>
        </div>
      )}

      {/* ── 3. INTERACTIVE LEAFLET MAP ── */}
      <div
        ref={mapContainerRef}
        className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm h-[380px] sm:h-[460px]"
      >
        <CoverageLeafletMap
          blocks={BLOK_OPERASIONAL_AKTIF}
          selectedBlock={selectedBlock}
          userLocation={userLocation}
          cameraTarget={cameraTarget}
          onMapClick={handleMapClick}
          onBlockClick={handleBlockClick}
          onResetCamera={handleResetCamera}
        />
      </div>

      {/* ── 4. DAFTAR RUAS JALAN TERLAYANI (CLEAN & SIMPLE GRID) ── */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              Daftar Ruas Jalan Terlayani ({filteredBlocks.length})
            </h2>
            <p className="text-xs text-slate-500">
              Klik nama jalan untuk menyorot lokasi dan jadwal di peta.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {filteredBlocks.map((b) => {
            const isSelected = selectedBlock?.id === b.id;
            return (
              <div
                key={b.id}
                onClick={() => handleBlockClick(b)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer text-xs ${
                  isSelected
                    ? "bg-emerald-50 border-emerald-600 shadow-sm ring-1 ring-emerald-500/30"
                    : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-slate-900 truncate flex items-center gap-1.5">
                      <span className="text-sm">🏡</span>
                      <span>{b.nama}</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Kel. {b.kelurahan}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 ${
                      b.status === "AKTIF"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {b.pelangganCount} KK
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1.5 border-t border-slate-100 mt-1">
                  <span className="font-semibold text-slate-700 truncate">
                    📅 {b.jadwal}
                  </span>
                  <span className="text-emerald-700 font-bold shrink-0">
                    Lihat →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
