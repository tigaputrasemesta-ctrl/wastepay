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
  ShieldCheck,
  Calendar,
  Truck,
  X,
  Sparkles,
  Phone,
  RefreshCw,
  LocateFixed,
  Users,
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
      <div className="w-full h-full min-h-[380px] lg:min-h-[540px] bg-slate-100 rounded-3xl flex flex-col items-center justify-center p-6 text-center border border-slate-200">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-600 mb-3" />
        <p className="text-sm font-extrabold text-slate-800">
          Memuat Peta Wilayah Layanan Depok...
        </p>
        <p className="text-xs text-slate-500 mt-1 max-w-xs">
          Menginisialisasi 23 blok operasional dan titik armada.
        </p>
      </div>
    ),
  }
);

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

  // Filter kelurahan untuk daftar blok di kolom kiri
  const [selectedKelurahan, setSelectedKelurahan] = useState<string>("SEMUA");
  const [filterBlockQuery, setFilterBlockQuery] = useState("");

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

    return [...localFiltered, ...geocodeResults].slice(0, 6);
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
  };

  // Handle Geolocation GPS
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
      },
      (err) => {
        setIsGpsLoading(false);
        if (err.code === 1) {
          setGpsError("Izin lokasi ditolak. Silakan ketik nama perumahan/jalan Anda.");
        } else {
          setGpsError("Tidak dapat membaca sinyal GPS. Silakan klik titik rumah Anda di peta.");
        }
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Handle klik pada blok di daftar atau pin peta
  const handleBlockClick = (block: ActiveBlock) => {
    setSelectedBlock(block);
    setUserLocation({ lat: block.lat, lng: block.lng });
    setCameraTarget({ lat: block.lat, lng: block.lng, zoom: 16 });
    const res = checkCoverageLocation(block.lat, block.lng);
    setVerdict(res);
  };

  // Reset kamera ke Depok
  const handleResetCamera = () => {
    setCameraTarget({ lat: -6.4385, lng: 106.8355, zoom: 14 });
    setSelectedBlock(null);
  };

  // Filter daftar 23 blok di kolom kiri
  const filteredBlocks = useMemo(() => {
    return BLOK_OPERASIONAL_AKTIF.filter((b) => {
      const matchKel =
        selectedKelurahan === "SEMUA" ||
        b.kelurahan.toUpperCase() === selectedKelurahan.toUpperCase();
      const matchQuery =
        !filterBlockQuery.trim() ||
        b.nama.toLowerCase().includes(filterBlockQuery.toLowerCase()) ||
        b.kelurahan.toLowerCase().includes(filterBlockQuery.toLowerCase());
      return matchKel && matchQuery;
    });
  }, [selectedKelurahan, filterBlockQuery]);

  return (
    <div className="space-y-8">
      {/* ── BAGIAN 1: ADDRESS-FIRST CHECKER (HERO CHECKER) ── */}
      <section className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-8 shadow-sm">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="text-center space-y-1.5">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
              Cek Apakah Rumah Anda Sudah Masuk Area Layanan
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Ketik nama perumahan, jalan, atau gunakan GPS untuk langsung mengetahui status jadwal angkut.
            </p>
          </div>

          {/* Search & GPS Bar */}
          <div className="relative max-w-2xl mx-auto">
            <div className="flex items-center bg-slate-50 border border-slate-300 rounded-2xl shadow-sm focus-within:border-emerald-600 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all p-1">
              <div className="pl-3 pr-2 text-slate-400">
                {isSearchingGeocode ? (
                  <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
                ) : (
                  <Search className="w-5 h-5 text-emerald-600" />
                )}
              </div>

              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                placeholder="Cari nama perumahan, gang, atau kelurahan di Depok..."
                className="w-full py-2.5 bg-transparent text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none font-medium"
              />

              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={handleUseGps}
                disabled={isGpsLoading}
                className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold rounded-xl flex items-center gap-1.5 transition-all active:scale-95 shrink-0 shadow-sm"
              >
                {isGpsLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <LocateFixed className="w-4 h-4" />
                )}
                <span>Deteksi Lokasi Saya</span>
              </button>
            </div>

            {/* Suggestions Dropdown */}
            {isSearchFocused && combinedSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-50">
                <div className="px-3.5 py-1.5 bg-slate-50 border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Pilihan Lokasi Depok</span>
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

          {/* Quick Area Shortcuts */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1 text-xs text-slate-500">
            <span className="font-semibold text-[11px]">Area Populer:</span>
            {[
              { label: "Blok Setu Kalibaru", lat: -6.44081, lng: 106.83624 },
              { label: "Perumahan Dmiles", lat: -6.43687, lng: 106.83186 },
              { label: "Blok Bakung Cilodong", lat: -6.43454, lng: 106.83601 },
              { label: "Blok Sasak Kalimulya", lat: -6.43476, lng: 106.82466 },
              { label: "Jl. Raya Kebon Duren", lat: -6.43338, lng: 106.82212 },
            ].map((sc) => (
              <button
                key={sc.label}
                type="button"
                onClick={() => handleSelectLocation(sc)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition-colors"
              >
                {sc.label}
              </button>
            ))}
          </div>

          {/* ── REAL-TIME VERDICT BANNER (KONTEKSTUAL CTA) ── */}
          {verdict && (
            <div
              className={`mt-4 p-4 sm:p-5 rounded-2xl border transition-all animate-in fade-in slide-in-from-top-2 duration-200 ${
                verdict.status === "AKTIF"
                  ? "bg-emerald-50/90 border-emerald-300 text-emerald-950"
                  : verdict.status === "PERLUASAN"
                  ? "bg-amber-50/90 border-amber-300 text-amber-950"
                  : "bg-slate-50 border-slate-300 text-slate-900"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
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

                  <h3 className="text-base sm:text-lg font-extrabold tracking-tight">
                    {verdict.status === "AKTIF" ? (
                      <>
                        Rumah Anda Masuk di{" "}
                        <span className="text-emerald-800 underline decoration-emerald-500">
                          {verdict.zonaTerdekat}
                        </span>{" "}
                        (Kel. {verdict.kelurahan})
                      </>
                    ) : (
                      <>
                        Area Terdekat: {verdict.zonaTerdekat} (Kel. {verdict.kelurahan})
                      </>
                    )}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xl">
                    {verdict.pesan}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs font-bold pt-1">
                    <span className="flex items-center gap-1.5 text-slate-700">
                      <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                      Jadwal: {verdict.jadwalPengangkutan}
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-700">
                      <Truck className="w-3.5 h-3.5 text-emerald-700" />
                      Armada: {verdict.armada}
                    </span>
                  </div>
                </div>

                {/* Tombol Aksi Kontekstual */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                  <Link
                    href={verdict.ctaUrl}
                    className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 ${
                      verdict.status === "AKTIF"
                        ? "bg-emerald-700 hover:bg-emerald-800 text-white shadow-emerald-900/20"
                        : "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-900/20"
                    }`}
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
                    <span>Tanya CS WhatsApp</span>
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── BAGIAN 2: SPLIT-VIEW EXPLORER (MODEL 1) ── */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Split-View Explorer</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Peta & Direktori 23 Blok Wilayah Terlayani
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Klik nama blok di daftar kiri untuk menyorot lokasinya di peta, atau klik pin peta untuk melihat rincian jadwal.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <span className="inline-flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-emerald-600" />
              Rute Reguler Aktif
            </span>
            <span className="inline-flex items-center gap-1 ml-2">
              <span className="w-3 h-3 rounded-full bg-amber-500" />
              Area Perluasan
            </span>
          </div>
        </div>

        {/* Grid Split-View: Kiri 5 Kolom (Daftar Blok), Kanan 7 Kolom (Peta Leaflet) */}
        <div className="grid lg:grid-cols-12 gap-6 items-start">
          {/* SISI KIRI: DAFTAR 23 BLOK OPERASIONAL (5 cols) */}
          <div className="lg:col-span-5 order-2 lg:order-1 bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3 flex flex-col max-h-[580px]">
            {/* Filter Sub-Kecamatan & Search */}
            <div className="space-y-2">
              <input
                type="text"
                value={filterBlockQuery}
                onChange={(e) => setFilterBlockQuery(e.target.value)}
                placeholder="Cari nama area (misal: Bakung, Dmiles, Sasak)..."
                className="w-full py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600 font-medium"
              />

              <div className="flex gap-1.5 overflow-x-auto pb-1 clean-scrollbar">
                {["SEMUA", "Kalibaru", "Cilodong", "Kalimulya", "Jatimulya", "Mekar Jaya"].map(
                  (area) => (
                    <button
                      key={area}
                      type="button"
                      onClick={() => setSelectedKelurahan(area)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap border transition-all ${
                        selectedKelurahan === area
                          ? "bg-emerald-800 text-white border-emerald-800 font-extrabold"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {area === "SEMUA" ? "Semua (23)" : area}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Scrollable List of 23 Blocks */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 clean-scrollbar">
              {filteredBlocks.map((block) => {
                const isSelected = selectedBlock?.id === block.id;
                return (
                  <div
                    key={block.id}
                    onClick={() => handleBlockClick(block)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer text-xs ${
                      isSelected
                        ? "bg-emerald-50/90 border-emerald-600 shadow-sm ring-1 ring-emerald-500/30"
                        : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">🏡</span>
                          <h4 className="font-extrabold text-slate-900 truncate">{block.nama}</h4>
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium">
                          Kel. {block.kelurahan} • Kec. {block.kecamatan}
                        </p>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 ${
                          block.status === "AKTIF"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {block.pelangganCount} KK
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-600 pt-1.5 border-t border-slate-100 mt-1.5">
                      <div className="flex items-center gap-1 font-semibold truncate">
                        <Calendar className="w-3 h-3 text-emerald-700" />
                        <span>{block.jadwal}</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-emerald-700 font-extrabold hover:underline">
                          Lihat di Peta →
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer Summary */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 text-[11px] font-semibold">
                Menampilkan {filteredBlocks.length} dari 23 Blok
              </span>
              <Link
                href="/daftar"
                className="text-xs font-extrabold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
              >
                <span>Daftar Warga Baru</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* SISI KANAN: PETA INTERAKTIF LEAFLET (7 cols) */}
          <div className="lg:col-span-7 order-1 lg:order-2 bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm h-[380px] lg:h-[580px]">
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
        </div>
      </section>
    </div>
  );
}
