"use client";

import { Component, useCallback, useEffect, useMemo, useState, useRef } from "react";
import dynamic from "next/dynamic";
import {
  Truck,
  ShieldAlert,
  Users,
  Route as RouteIcon,
  Layers,
  Search,
  X,
  Phone,
  ExternalLink,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  MapPin,
  Gauge,
  Eye,
  RefreshCw,
  PanelLeftClose,
  PanelLeft,
  SlidersHorizontal,
  ChevronDown,
  Navigation,
  Radio,
  Check,
} from "lucide-react";
import { cariRtTerdekat, deteksiZona, formatJarak, jarakMeter, urutkanRute } from "@/lib/geo";
import { KOMPLAIN_LABEL, KOMPLAIN_WARNA } from "@/lib/komplain";
import type { KendaraanPeta, PetugasPeta, TransitPeta } from "./MapView";
import type { MapTileType } from "@/lib/map-tile";
import LacakLokasi from "@/components/LacakLokasi";

// Leaflet map component (client-side only)
const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex flex-col items-center justify-center bg-slate-50 text-slate-800 space-y-3">
      <div className="w-9 h-9 rounded-full border-3 border-emerald-600 border-t-transparent animate-spin" />
      <p className="font-sans text-xs font-bold uppercase tracking-wider text-emerald-800">
        Memuat Peta Navigasi Gojek Clean…
      </p>
    </div>
  ),
});

class MapErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: unknown) {
    console.error("Peta rendering error:", error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full w-full flex flex-col items-center justify-center bg-slate-50 text-slate-800 p-6 space-y-4">
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600">
            <AlertCircle className="w-8 h-8" />
          </div>
          <p className="text-sm font-bold text-slate-800">Terjadi kendala saat memuat peta GIS.</p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-900/30"
          >
            Muat Ulang Peta
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export type PelangganPeta = {
  id: number;
  nama: string;
  kodePelanggan: string;
  alamat: string;
  rtRw: string | null;
  noTelepon: string | null;
  status: string;
  kategori: string;
  latitude: number | null;
  longitude: number | null;
  patokanLokasi: string | null;
  statusTagihan: string | null;
  wilayah: {
    id: number;
    nama: string;
  } | null;
};

export type RutePeta = {
  id: number;
  nama: string;
  hari: string;
  jam: string | null;
  petugas: string | null;
  wilayahNama: string | null;
  anggota: { id: number; nama: string; latitude: number; longitude: number }[];
};

export type KomplainPeta = {
  id: number;
  jenis: string;
  deskripsi: string;
  status: string;
  createdAt: string;
  tanggapan: string | null;
  pelanggan: {
    id: number;
    nama: string;
    kodePelanggan: string;
    noTelepon: string | null;
    latitude: number | null;
    longitude: number | null;
  };
  posisi: [number, number];
};

type Props = {
  pelanggan: PelangganPeta[];
  wilayah: { id: number; nama: string; kelurahanRef?: { nama: string } | null }[];
  rute: RutePeta[];
  petugasAwal?: PetugasPeta[];
  kendaraanAwal?: KendaraanPeta[];
  transitAwal?: TransitPeta[];
  profilSaya?: { id: number; nama: string; jabatan: string | null } | null;
  kendaraanSaya?: { id: number; nama: string; platNomor: string | null; jenis: string }[];
};

const WARNA_STATUS: Record<string, string> = {
  aktif: "#10b981",
  calon: "#f59e0b",
  nonaktif: "#64748b",
  libur: "#94a3b8",
};

const STATUS_LABEL: Record<string, string> = {
  aktif: "Aktif",
  calon: "Calon",
  nonaktif: "Nonaktif",
  libur: "Libur",
};

const KOMPLAIN_TABS: { key: string; label: string }[] = [
  { key: "semua", label: "Semua" },
  { key: "baru", label: "Baru" },
  { key: "proses", label: "Diproses" },
  { key: "selesai", label: "Selesai" },
];

type ConsoleTab = "armada" | "pengaduan" | "pelanggan" | "rute";

// Ambang batas online armada: data dikirim < 15 menit lalu
const ONLINE_MS = 15 * 60 * 1000;
function isOnline(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() < ONLINE_MS;
}

function formatWaktuRelatifPeta(iso: string): string {
  const detik = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (detik < 60) return `${detik}dtk lalu`;
  if (detik < 3600) return `${Math.floor(detik / 60)}mnt lalu`;
  return `${Math.floor(detik / 3600)}jam lalu`;
}

export default function PetaMap({
  pelanggan,
  wilayah,
  rute,
  petugasAwal = [],
  kendaraanAwal = [],
  transitAwal = [],
  profilSaya,
  kendaraanSaya = [],
}: Props) {
  // Navigation & Layout State
  const [activeTab, setActiveTab] = useState<ConsoleTab>("armada");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [tileMode, setTileMode] = useState<MapTileType>("osm");
  const [layerMenuOpen, setLayerMenuOpen] = useState(false);
  const layerMenuRef = useRef<HTMLDivElement>(null);
  const isDark = tileMode === "dark";

  // Filter States
  const [cari, setCari] = useState("");
  const [filterWilayah, setFilterWilayah] = useState("semua");
  const [filterStatus, setFilterStatus] = useState("semua");
  const [filterTagihan, setFilterTagihan] = useState<"semua" | "lunas" | "tunggakan">("semua");
  const [hanyaTanpaGeo, setHanyaTanpaGeo] = useState(false);
  const [urutkan, setUrutkan] = useState<"nama" | "kode">("kode");

  // Selection States (Object Inspection)
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedKendaraanId, setSelectedKendaraanId] = useState<number | null>(null);
  const [selectedPetugasId, setSelectedPetugasId] = useState<number | null>(null);
  const [selectedKomplainId, setSelectedKomplainId] = useState<number | null>(null);
  const [selectedTransitId, setSelectedTransitId] = useState<number | null>(null);
  const [ruteId, setRuteId] = useState<string>("semua");

  // GIS Layer Toggles
  const [tampilkanPelanggan, setTampilkanPelanggan] = useState(true);
  const [tampilkanArmada, setTampilkanArmada] = useState(true);
  const [tampilkanPetugas, setTampilkanPetugas] = useState(true);
  const [tampilkanKomplain, setTampilkanKomplain] = useState(true);
  const [tampilkanTransit, setTampilkanTransit] = useState(true);
  const [tampilkanBatas, setTampilkanBatas] = useState(true);
  const [tampilkanBatasKelurahan, setTampilkanBatasKelurahan] = useState(false); // default off agar peta tidak terpotong garis geometris
  const [tampilkanRt, setTampilkanRt] = useState(false); // default off agar titik tidak tumpang tindih
  const [tampilkanCakupan, setTampilkanCakupan] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [invalidateKey, setInvalidateKey] = useState(1);

  const resetLayerDefault = useCallback(() => {
    setTampilkanPelanggan(true);
    setTampilkanArmada(true);
    setTampilkanPetugas(true);
    setTampilkanKomplain(true);
    setTampilkanTransit(true);
    setTampilkanBatas(true);
    setTampilkanBatasKelurahan(false);
    setTampilkanRt(false);
    setTampilkanCakupan(false);
    setShowHeatmap(false);
  }, []);

  const activeLayerCount = useMemo(
    () =>
      [
        tampilkanPelanggan,
        tampilkanArmada,
        tampilkanPetugas,
        tampilkanKomplain,
        tampilkanTransit,
        tampilkanBatas,
        tampilkanBatasKelurahan,
        tampilkanRt,
        tampilkanCakupan,
        showHeatmap,
      ].filter(Boolean).length,
    [
      tampilkanPelanggan,
      tampilkanArmada,
      tampilkanPetugas,
      tampilkanKomplain,
      tampilkanTransit,
      tampilkanBatas,
      tampilkanBatasKelurahan,
      tampilkanRt,
      tampilkanCakupan,
      showHeatmap,
    ]
  );

  // Close layer menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (layerMenuRef.current && !layerMenuRef.current.contains(event.target as Node)) {
        setLayerMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Invalidate map layout when sidebar changes
  useEffect(() => {
    setInvalidateKey((k) => k + 1);
  }, [sidebarOpen]);

  // Keyboard shortcut: Escape closes flyout
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        closeFlyout();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // ── Polling: Pengaduan (15 dtk) ──
  const [komplain, setKomplain] = useState<KomplainPeta[]>([]);
  const [komplainTab, setKomplainTab] = useState("semua");
  const [lastRefresh, setLastRefresh] = useState<number | null>(null);
  const [muatKomplain, setMuatKomplain] = useState(false);

  const ambilKomplain = useCallback(async () => {
    try {
      const res = await fetch("/api/komplain?limit=300", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as KomplainPeta[];
      setKomplain(data);
      setLastRefresh(Date.now());
    } catch {
      // quiet fallback
    }
  }, []);

  useEffect(() => {
    const t0 = setTimeout(() => ambilKomplain(), 0);
    const t = setInterval(() => ambilKomplain(), 15000);
    return () => {
      clearTimeout(t0);
      clearInterval(t);
    };
  }, [ambilKomplain]);

  // ── Polling: Petugas Lapangan (10 dtk) ──
  const [petugas, setPetugas] = useState<PetugasPeta[]>(petugasAwal);
  const ambilPetugas = useCallback(async () => {
    try {
      const res = await fetch("/api/petugas/lokasi", { cache: "no-store" });
      if (!res.ok) return;
      setPetugas((await res.json()) as PetugasPeta[]);
    } catch {
      // quiet
    }
  }, []);

  useEffect(() => {
    const t0 = setTimeout(() => ambilPetugas(), 500);
    const t = setInterval(() => ambilPetugas(), 10000);
    return () => {
      clearTimeout(t0);
      clearInterval(t);
    };
  }, [ambilPetugas]);

  // ── Polling: Kendaraan & Lapak (15 dtk) ──
  const [kendaraan, setKendaraan] = useState<KendaraanPeta[]>(kendaraanAwal);
  const [transit, setTransit] = useState<TransitPeta[]>(transitAwal);
  const [pusatPetugas, setPusatPetugas] = useState<[number, number] | null>(null);

  const ambilKendaraan = useCallback(async () => {
    try {
      const res = await fetch("/api/kendaraan/lokasi", { cache: "no-store" });
      if (!res.ok) return;
      setKendaraan((await res.json()) as KendaraanPeta[]);
    } catch {
      // quiet
    }
  }, []);

  useEffect(() => {
    const t0 = setTimeout(() => ambilKendaraan(), 700);
    const t = setInterval(() => ambilKendaraan(), 15000);
    const t1 = setTimeout(async () => {
      try {
        const res = await fetch("/api/transit", { cache: "no-store" });
        if (res.ok) setTransit((await res.json()) as TransitPeta[]);
      } catch {
        // quiet
      }
    }, 1000);
    return () => {
      clearTimeout(t0);
      clearInterval(t);
      clearTimeout(t1);
    };
  }, [ambilKendaraan]);

  // ── Derived Data & Mappings ──
  const zonaPelanggan = useMemo(() => {
    const m = new Map<number, { kelurahan: string; kecamatan: string }>();
    for (const p of pelanggan) {
      if (p.latitude == null || p.longitude == null) continue;
      const z = deteksiZona([p.latitude, p.longitude]);
      if (z) m.set(p.id, { kelurahan: z.kelurahan, kecamatan: z.kecamatan });
    }
    return m;
  }, [pelanggan]);

  const daftar = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return pelanggan.filter((p) => {
      if (filterWilayah !== "semua" && p.wilayah?.id !== Number(filterWilayah)) return false;
      if (filterStatus !== "semua" && p.status !== filterStatus) return false;
      if (filterTagihan === "lunas" && p.statusTagihan !== "lunas") return false;
      if (
        filterTagihan === "tunggakan" &&
        p.statusTagihan !== "tunggakan" &&
        p.statusTagihan !== "belum_bayar"
      )
        return false;
      if (hanyaTanpaGeo && p.latitude != null && p.longitude != null) return false;
      if (q && !`${p.nama} ${p.kodePelanggan} ${p.alamat} ${p.rtRw ?? ""}`.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [pelanggan, filterWilayah, filterStatus, filterTagihan, hanyaTanpaGeo, cari]);

  const daftarPetaUrut = useMemo(() => {
    return [...daftar].sort((a, b) => {
      if (urutkan === "nama") return a.nama.localeCompare(b.nama);
      return a.kodePelanggan.localeCompare(b.kodePelanggan);
    });
  }, [daftar, urutkan]);

  const peta = useMemo(() => {
    return daftar.filter((p) => p.latitude != null && p.longitude != null);
  }, [daftar]);

  const komplainDenganPosisi = useMemo(() => {
    return komplain.map((k) => {
      const lat = k.pelanggan?.latitude;
      const lng = k.pelanggan?.longitude;
      const posisi: [number, number] =
        lat != null && lng != null
          ? [lat, lng]
          : (() => {
              const { rt } = cariRtTerdekat([-6.424838, 106.832667]);
              return [rt.lat, rt.lng];
            })();
      return { ...k, posisi };
    });
  }, [komplain]);

  const komplainFilter = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return komplainDenganPosisi.filter((k) => {
      if (komplainTab !== "semua" && k.status !== komplainTab) return false;
      const nama = k.pelanggan?.nama ?? "";
      const kode = k.pelanggan?.kodePelanggan ?? "";
      if (q && !`${nama} ${kode} ${k.deskripsi}`.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [komplainDenganPosisi, komplainTab, cari]);

  const hitungBaru = komplainDenganPosisi.filter((k) => k.status === "baru").length;
  const petugasOnline = petugas.filter((p) => isOnline(p.updatedAt)).length;
  const kendaraanOnline = kendaraan.filter((k) => isOnline(k.updatedAt)).length;
  const lunasCount = useMemo(
    () => pelanggan.filter((p) => p.statusTagihan === "lunas").length,
    [pelanggan]
  );
  const menunggakCount = useMemo(
    () =>
      pelanggan.filter(
        (p) => p.statusTagihan === "tunggakan" || p.statusTagihan === "belum_bayar"
      ).length,
    [pelanggan]
  );

  // Rute details
  const ruteTerpilih = ruteId !== "semua" ? rute.find((r) => String(r.id) === ruteId) ?? null : null;
  const ruteUrutPanel = useMemo(() => {
    if (!ruteTerpilih) return [];
    const urut = urutkanRute(
      ruteTerpilih.anggota.map((a) => [a.latitude, a.longitude] as [number, number])
    );
    const idKeAnggota = new Map(ruteTerpilih.anggota.map((a) => [`${a.latitude},${a.longitude}`, a]));
    const hasil: { anggota: (typeof ruteTerpilih.anggota)[number]; jarakM: number }[] = [];
    urut.forEach((p, i) => {
      const anggota = idKeAnggota.get(`${p[0]},${p[1]}`);
      if (!anggota) return;
      hasil.push({
        anggota,
        jarakM: i === 0 ? 0 : Math.round(jarakMeter(urut[i - 1], p)),
      });
    });
    return hasil;
  }, [ruteTerpilih]);

  // Close inspector flyout
  const closeFlyout = useCallback(() => {
    setSelectedId(null);
    setSelectedKendaraanId(null);
    setSelectedPetugasId(null);
    setSelectedKomplainId(null);
    setSelectedTransitId(null);
  }, []);

  // Selection handlers
  const pilihPelanggan = useCallback((id: number) => {
    setSelectedId(id);
    setSelectedKendaraanId(null);
    setSelectedPetugasId(null);
    setSelectedKomplainId(null);
    setSelectedTransitId(null);
  }, []);

  const pilihKendaraan = useCallback((id: number) => {
    setSelectedKendaraanId(id);
    setSelectedId(null);
    setSelectedPetugasId(null);
    setSelectedKomplainId(null);
    setSelectedTransitId(null);
  }, []);

  const pilihPetugas = useCallback((id: number) => {
    setSelectedPetugasId(id);
    setSelectedKendaraanId(null);
    setSelectedId(null);
    setSelectedKomplainId(null);
    setSelectedTransitId(null);
  }, []);

  const pilihKomplain = useCallback((id: number) => {
    setSelectedKomplainId(id);
    setSelectedId(null);
    setSelectedKendaraanId(null);
    setSelectedPetugasId(null);
    setSelectedTransitId(null);
  }, []);

  const pilihTransit = useCallback((id: number) => {
    setSelectedTransitId(id);
    setSelectedId(null);
    setSelectedKendaraanId(null);
    setSelectedPetugasId(null);
    setSelectedKomplainId(null);
  }, []);

  // Inspector selected items
  const inspectorKendaraan = kendaraan.find((k) => k.kendaraanId === selectedKendaraanId);
  const inspectorPelanggan = pelanggan.find((p) => p.id === selectedId);
  const inspectorKomplain = komplainDenganPosisi.find((k) => k.id === selectedKomplainId);
  const inspectorTransit = transit.find((t) => t.id === selectedTransitId);
  const inspectorPetugas = petugas.find((p) => p.petugasId === selectedPetugasId);

  const hasInspector = !!(
    inspectorKendaraan ||
    inspectorPelanggan ||
    inspectorKomplain ||
    inspectorTransit ||
    inspectorPetugas
  );

  return (
    <div className={`h-full w-full flex flex-col ${isDark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-800"} overflow-hidden font-sans select-none`}>
      {/* ── TOP UNIFIED TELEMETRY & COMMAND BAR (Gojek / Clean Mobility Style) ── */}
      <header className={`h-14 ${isDark ? "bg-[#16191f] border-slate-800/80 text-white" : "bg-white/95 border-slate-200/90 text-slate-800 shadow-sm"} border-b px-3 sm:px-4 flex items-center justify-between gap-3 shrink-0 z-30 backdrop-blur-md`}>
        {/* Left Brand & Metric Pills */}
        <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar">
          {/* Sidebar Toggle Button */}
          <button
            type="button"
            onClick={() => setSidebarOpen((s) => !s)}
            className={`p-1.5 rounded-xl border transition-colors ${
              isDark
                ? "bg-slate-800/70 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700/80"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
            }`}
            title={sidebarOpen ? "Sembunyikan Panel Kerja" : "Tampilkan Panel Kerja"}
          >
            {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
          </button>

          {/* Brand Pill */}
          <div className={`hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-full border text-[11px] font-bold ${
            isDark ? "bg-slate-900 border-slate-800 text-slate-200" : "bg-emerald-50 border-emerald-300 text-emerald-900 shadow-xs"
          }`}>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="tracking-wide uppercase font-mono">🛵 GOJEK CLEAN GIS</span>
          </div>

          {/* Metric Status Pills */}
          <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] font-bold">
            {/* Truk Online Pill */}
            <button
              type="button"
              onClick={() => {
                setActiveTab("armada");
                setSidebarOpen(true);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border transition ${
                isDark
                  ? "bg-[#f59e0b]/15 hover:bg-[#f59e0b]/25 text-[#f59e0b] border-[#f59e0b]/30"
                  : "bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200"
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>{kendaraanOnline} Truk Online</span>
            </button>

            {/* Pengaduan Baru Pill */}
            <button
              type="button"
              onClick={() => {
                setActiveTab("pengaduan");
                setSidebarOpen(true);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl transition border ${
                hitungBaru > 0
                  ? isDark
                    ? "bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse"
                    : "bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200 animate-pulse"
                  : isDark
                  ? "bg-slate-800/60 text-slate-400 border-slate-700"
                  : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{hitungBaru} Pengaduan</span>
            </button>

            {/* Lapak / TPS Pill */}
            <button
              type="button"
              onClick={() => {
                setActiveTab("armada");
                setSidebarOpen(true);
              }}
              className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl border ${
                isDark
                  ? "bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-500" />
              <span>{transit.filter((t) => t.aktif).length} Lapak/TPS</span>
            </button>

            {/* Total Warga Pill */}
            <button
              type="button"
              onClick={() => {
                setActiveTab("pelanggan");
                setSidebarOpen(true);
              }}
              className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-xl border ${
                isDark
                  ? "bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700"
                  : "bg-sky-50 hover:bg-sky-100 text-sky-800 border-sky-200"
              }`}
            >
              <Users className="w-3.5 h-3.5 text-sky-500" />
              <span>{pelanggan.length} Warga</span>
            </button>
          </div>
        </div>

        {/* Center / Right: Quick Search & Filter Controls */}
        <div className="flex items-center gap-2">
          {/* Quick Search Input */}
          <div className="relative w-44 sm:w-64 lg:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              placeholder="Cari armada, warga, jalan…"
              className={`w-full border rounded-xl pl-8 pr-7 py-1.5 text-xs outline-none transition ${
                isDark
                  ? "bg-slate-900 border-slate-700/80 text-slate-100 placeholder-slate-400 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30"
                  : "bg-slate-100 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500/20"
              }`}
            />
            {cari && (
              <button
                type="button"
                onClick={() => setCari("")}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Basemap Switcher Chips: Gojek Clean, Klasik Hangat, Satelit, Mode Malam */}
          <div className={`hidden sm:flex items-center p-0.5 rounded-xl border text-[11px] font-semibold ${
            isDark ? "bg-slate-900 border-slate-800" : "bg-slate-100 border-slate-200"
          }`}>
            <button
              type="button"
              onClick={() => setTileMode("osm")}
              className={`px-2.5 py-1 rounded-lg transition ${
                tileMode === "osm"
                  ? "bg-emerald-600 text-white font-extrabold shadow-sm"
                  : isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
              }`}
              title="Peta Standar Gojek Clean — bersih, nyaman di mata"
            >
              🛵 Gojek Clean
            </button>
            <button
              type="button"
              onClick={() => setTileMode("esri-street")}
              className={`px-2.5 py-1 rounded-lg transition ${
                tileMode === "esri-street"
                  ? "bg-emerald-600 text-white font-extrabold shadow-sm"
                  : isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
              }`}
              title="Peta jalan bernuansa hangat dan nyaman khas navigasi"
            >
              🗺️ Klasik Hangat
            </button>
            <button
              type="button"
              onClick={() => setTileMode("esri-satellite")}
              className={`px-2.5 py-1 rounded-lg transition ${
                tileMode === "esri-satellite"
                  ? "bg-emerald-600 text-white font-extrabold shadow-sm"
                  : isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
              }`}
              title="Foto udara satelit"
            >
              🛰️ Satelit
            </button>
            <button
              type="button"
              onClick={() => setTileMode("dark")}
              className={`px-2.5 py-1 rounded-lg transition ${
                tileMode === "dark"
                  ? "bg-slate-900 text-white font-extrabold shadow-sm"
                  : isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
              }`}
              title="Mode malam"
            >
              🌙 Malam
            </button>
          </div>

          {/* GIS Layer Popover Toggle */}
          <div className="relative" ref={layerMenuRef}>
            <button
              type="button"
              onClick={() => setLayerMenuOpen((o) => !o)}
              className={`p-2 rounded-xl border transition flex items-center gap-1.5 text-xs font-semibold ${
                layerMenuOpen
                  ? isDark ? "bg-amber-400 text-slate-950 border-amber-400" : "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                  : isDark ? "bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700/80" : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
              }`}
              title="Kontrol Layer GIS"
            >
              <Layers className="w-4 h-4" />
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                layerMenuOpen
                  ? isDark ? "bg-slate-950 text-amber-400" : "bg-white text-emerald-700"
                  : isDark ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-100 text-emerald-700"
              }`}>
                {activeLayerCount}
              </span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {/* Layer Settings Popover */}
            {layerMenuOpen && (
              <div className={`absolute right-0 mt-2 w-72 ${
                isDark ? "bg-[#1e2229] border-slate-700/80 text-white" : "bg-white border-slate-200 text-slate-800"
              } rounded-2xl border p-3.5 shadow-2xl z-50 text-xs space-y-3`}>
                <div className={`flex items-center justify-between pb-2 border-b ${
                  isDark ? "border-slate-700" : "border-slate-200"
                }`}>
                  <div>
                    <span className={`font-bold uppercase tracking-wider text-[10px] ${
                      isDark ? "text-amber-400" : "text-emerald-700"
                    }`}>
                      Layer & Kontrol GIS
                    </span>
                    <p className={`text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      {activeLayerCount} layer aktif
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLayerMenuOpen(false)}
                    className={isDark ? "text-slate-400 hover:text-white" : "text-slate-400 hover:text-slate-700"}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
                  {/* Kategori 1: Objek Operasional */}
                  <div>
                    <div className={`text-[9.5px] font-black uppercase tracking-wider mb-1 px-1 ${
                      isDark ? "text-slate-400" : "text-slate-500"
                    }`}>
                      Objek & Realtime
                    </div>
                    <div className="space-y-1">
                      <label className={`flex items-center justify-between cursor-pointer p-1.5 rounded-lg transition ${
                        isDark ? "hover:bg-slate-800/50 text-slate-300" : "hover:bg-slate-50 text-slate-700"
                      }`}>
                        <span className="font-medium flex items-center gap-1.5">👥 Pelanggan / Warga</span>
                        <input
                          type="checkbox"
                          checked={tampilkanPelanggan}
                          onChange={(e) => setTampilkanPelanggan(e.target.checked)}
                          className="rounded accent-emerald-600 cursor-pointer"
                        />
                      </label>
                      <label className={`flex items-center justify-between cursor-pointer p-1.5 rounded-lg transition ${
                        isDark ? "hover:bg-slate-800/50 text-slate-300" : "hover:bg-slate-50 text-slate-700"
                      }`}>
                        <span className="font-medium flex items-center gap-1.5">🚛 Kendaraan Armada</span>
                        <input
                          type="checkbox"
                          checked={tampilkanArmada}
                          onChange={(e) => setTampilkanArmada(e.target.checked)}
                          className="rounded accent-emerald-600 cursor-pointer"
                        />
                      </label>
                      <label className={`flex items-center justify-between cursor-pointer p-1.5 rounded-lg transition ${
                        isDark ? "hover:bg-slate-800/50 text-slate-300" : "hover:bg-slate-50 text-slate-700"
                      }`}>
                        <span className="font-medium flex items-center gap-1.5">👮 Petugas Lapangan</span>
                        <input
                          type="checkbox"
                          checked={tampilkanPetugas}
                          onChange={(e) => setTampilkanPetugas(e.target.checked)}
                          className="rounded accent-emerald-600 cursor-pointer"
                        />
                      </label>
                      <label className={`flex items-center justify-between cursor-pointer p-1.5 rounded-lg transition ${
                        isDark ? "hover:bg-slate-800/50 text-slate-300" : "hover:bg-slate-50 text-slate-700"
                      }`}>
                        <span className="font-medium flex items-center gap-1.5">🚨 Pengaduan Live</span>
                        <input
                          type="checkbox"
                          checked={tampilkanKomplain}
                          onChange={(e) => setTampilkanKomplain(e.target.checked)}
                          className="rounded accent-emerald-600 cursor-pointer"
                        />
                      </label>
                      <label className={`flex items-center justify-between cursor-pointer p-1.5 rounded-lg transition ${
                        isDark ? "hover:bg-slate-800/50 text-slate-300" : "hover:bg-slate-50 text-slate-700"
                      }`}>
                        <span className="font-medium flex items-center gap-1.5">♻️ Titik Transit / Lapak</span>
                        <input
                          type="checkbox"
                          checked={tampilkanTransit}
                          onChange={(e) => setTampilkanTransit(e.target.checked)}
                          className="rounded accent-emerald-600 cursor-pointer"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Kategori 2: Batas Administrasi */}
                  <div className={`pt-2 border-t ${isDark ? "border-slate-800" : "border-slate-100"}`}>
                    <div className={`text-[9.5px] font-black uppercase tracking-wider mb-1 px-1 ${
                      isDark ? "text-slate-400" : "text-slate-500"
                    }`}>
                      Batas Administrasi
                    </div>
                    <div className="space-y-1">
                      <label className={`flex items-center justify-between cursor-pointer p-1.5 rounded-lg transition ${
                        isDark ? "hover:bg-slate-800/50 text-slate-300" : "hover:bg-slate-50 text-slate-700"
                      }`}>
                        <span className="font-medium flex items-center gap-1.5">🏛️ Batas Kecamatan (BPS)</span>
                        <input
                          type="checkbox"
                          checked={tampilkanBatas}
                          onChange={(e) => setTampilkanBatas(e.target.checked)}
                          className="rounded accent-emerald-600 cursor-pointer"
                        />
                      </label>
                      <label className={`flex items-center justify-between cursor-pointer p-1.5 rounded-lg transition ${
                        isDark ? "hover:bg-slate-800/50 text-slate-300" : "hover:bg-slate-50 text-slate-700"
                      }`}>
                        <span className="font-medium flex items-center gap-1.5">🏘️ Zonasi Kelurahan</span>
                        <input
                          type="checkbox"
                          checked={tampilkanBatasKelurahan}
                          onChange={(e) => setTampilkanBatasKelurahan(e.target.checked)}
                          className="rounded accent-emerald-600 cursor-pointer"
                        />
                      </label>
                      <label className={`flex items-center justify-between cursor-pointer p-1.5 rounded-lg transition ${
                        isDark ? "hover:bg-slate-800/50 text-slate-300" : "hover:bg-slate-50 text-slate-700"
                      }`}>
                        <span className="font-medium flex items-center gap-1.5">📍 Titik RT / RTRW</span>
                        <input
                          type="checkbox"
                          checked={tampilkanRt}
                          onChange={(e) => setTampilkanRt(e.target.checked)}
                          className="rounded accent-emerald-600 cursor-pointer"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Kategori 3: Analisis Spasial */}
                  <div className={`pt-2 border-t ${isDark ? "border-slate-800" : "border-slate-100"}`}>
                    <div className={`text-[9.5px] font-black uppercase tracking-wider mb-1 px-1 ${
                      isDark ? "text-slate-400" : "text-slate-500"
                    }`}>
                      Analisis Spasial
                    </div>
                    <div className="space-y-1">
                      <label className={`flex items-center justify-between cursor-pointer p-1.5 rounded-lg transition ${
                        isDark ? "hover:bg-slate-800/50 text-slate-300" : "hover:bg-slate-50 text-slate-700"
                      }`}>
                        <span className="font-medium flex items-center gap-1.5">⭕ Radius Cakupan 200m</span>
                        <input
                          type="checkbox"
                          checked={tampilkanCakupan}
                          onChange={(e) => setTampilkanCakupan(e.target.checked)}
                          className="rounded accent-emerald-600 cursor-pointer"
                        />
                      </label>
                      <label className={`flex items-center justify-between cursor-pointer p-1.5 rounded-lg transition ${
                        isDark ? "hover:bg-slate-800/50 text-slate-300" : "hover:bg-slate-50 text-slate-700"
                      }`}>
                        <span className="font-medium flex items-center gap-1.5">🔥 Heatmap Kepadatan</span>
                        <input
                          type="checkbox"
                          checked={showHeatmap}
                          onChange={(e) => setShowHeatmap(e.target.checked)}
                          className="rounded accent-rose-500 cursor-pointer"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Footer Popover: Reset to default */}
                <div className={`pt-2 border-t flex justify-end ${
                  isDark ? "border-slate-700" : "border-slate-200"
                }`}>
                  <button
                    type="button"
                    onClick={resetLayerDefault}
                    className={`text-[10.5px] font-semibold px-2.5 py-1 rounded-lg transition ${
                      isDark
                        ? "text-slate-400 hover:text-white hover:bg-slate-800"
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                    }`}
                  >
                    Reset ke Standar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Petugas Login Broadcast Shortcut */}
          {profilSaya && (
            <div className="shrink-0">
              <LacakLokasi profil={profilSaya} kendaraan={kendaraanSaya} />
            </div>
          )}
        </div>
      </header>

      {/* ── MAIN WORKSPACE AREA ── */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* ── LEFT PANE: OPERATIONAL WORKSPACE CONSOLE ── */}
        <div
          className={`${
            sidebarOpen ? "w-80 sm:w-96" : "w-0 -translate-x-full"
          } ${
            isDark ? "bg-[#16191f] border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-800"
          } border-r flex flex-col shrink-0 h-full z-10 transition-all duration-300 overflow-hidden shadow-xl`}
        >
          {/* Console Tab Bar */}
          <div className={`p-2 border-b grid grid-cols-4 gap-1 ${
            isDark ? "border-slate-800/90 bg-[#121418]" : "border-slate-200/90 bg-slate-50"
          }`}>
            <button
              type="button"
              onClick={() => setActiveTab("armada")}
              className={`py-2 px-1 rounded-xl font-bold text-[11px] flex flex-col items-center gap-1 transition ${
                activeTab === "armada"
                  ? isDark
                    ? "bg-[#232731] text-amber-300 border border-amber-500/30 shadow-sm"
                    : "bg-white text-emerald-700 border border-emerald-500/30 shadow-sm font-bold ring-1 ring-slate-950/5"
                  : isDark
                  ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>Armada ({kendaraan.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("pengaduan")}
              className={`py-2 px-1 rounded-xl font-bold text-[11px] flex flex-col items-center gap-1 transition relative ${
                activeTab === "pengaduan"
                  ? isDark
                    ? "bg-[#232731] text-rose-400 border border-rose-500/30 shadow-sm"
                    : "bg-white text-rose-600 border border-rose-500/30 shadow-sm font-bold ring-1 ring-slate-950/5"
                  : isDark
                  ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Pengaduan</span>
              {hitungBaru > 0 && (
                <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("pelanggan")}
              className={`py-2 px-1 rounded-xl font-bold text-[11px] flex flex-col items-center gap-1 transition ${
                activeTab === "pelanggan"
                  ? isDark
                    ? "bg-[#232731] text-emerald-400 border border-emerald-500/30 shadow-sm"
                    : "bg-white text-emerald-700 border border-emerald-500/30 shadow-sm font-bold ring-1 ring-slate-950/5"
                  : isDark
                  ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Warga ({pelanggan.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("rute")}
              className={`py-2 px-1 rounded-xl font-bold text-[11px] flex flex-col items-center gap-1 transition ${
                activeTab === "rute"
                  ? isDark
                    ? "bg-[#232731] text-sky-400 border border-sky-500/30 shadow-sm"
                    : "bg-white text-sky-600 border border-sky-500/30 shadow-sm font-bold ring-1 ring-slate-950/5"
                  : isDark
                  ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
              }`}
            >
              <RouteIcon className="w-4 h-4" />
              <span>Rute ({rute.length})</span>
            </button>
          </div>

          {/* ── TAB 1: ARMADA & TELEMETRI ── */}
          {activeTab === "armada" && (
            <div className={`flex-1 overflow-y-auto ${isDark ? "divide-slate-800/60" : "divide-slate-200/70"} divide-y p-2 space-y-2 custom-scrollbar`}>
              {/* Lapak / TPS Quick Selector */}
              {transit.filter((t) => t.aktif).length > 0 && (
                <div className={`p-2.5 rounded-2xl ${isDark ? "bg-amber-500/10 border-amber-500/20" : "bg-amber-50/70 border-amber-200/80"} border mb-2 space-y-1.5`}>
                  <div className={`flex items-center justify-between text-[11px] font-bold ${isDark ? "text-amber-300" : "text-amber-900"}`}>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-amber-500" />
                      LAPAK / TITIK TRANSIT ({transit.filter((t) => t.aktif).length})
                    </span>
                    <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded ${isDark ? "bg-amber-400/20 text-amber-200" : "bg-amber-200/70 text-amber-900"} font-mono`}>
                      TPS 3R
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5 pt-1">
                    {transit.filter((t) => t.aktif).map((t) => {
                      const isSel = selectedTransitId === t.id;
                      return (
                        <button
                          key={`transit-${t.id}`}
                          type="button"
                          onClick={() => {
                            pilihTransit(t.id);
                            setPusatPetugas([t.latitude, t.longitude]);
                          }}
                          className={`w-full text-left p-2 rounded-xl border text-xs transition flex items-center justify-between ${
                            isSel
                              ? isDark
                                ? "bg-amber-400/20 border-amber-400 text-white"
                                : "bg-amber-100 border-amber-400 text-amber-950 font-bold ring-2 ring-amber-400/25"
                              : isDark
                              ? "bg-slate-900/80 hover:bg-slate-800 border-slate-800 text-slate-300"
                              : "bg-white hover:bg-amber-50/60 border-slate-200 text-slate-700 shadow-sm"
                          }`}
                        >
                          <div className="min-w-0">
                            <p className={`font-bold truncate ${isDark ? "text-slate-100" : "text-slate-900"}`}>{t.nama}</p>
                            <p className={`text-[10px] truncate ${isDark ? "text-slate-400" : "text-slate-500"}`}>{t.alamat || "Pusat Daur Ulang"}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-amber-500 shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Header Telemetri Armada */}
              <div className={`flex items-center justify-between px-2 pt-1 text-[11px] font-bold ${isDark ? "text-slate-400" : "text-slate-500"} uppercase tracking-wider`}>
                <span>Daftar Armada Truk</span>
                <span className="text-amber-500 font-bold">{kendaraanOnline} Online / {kendaraan.length} Unit</span>
              </div>

              {/* Daftar Truk Cards */}
              <div className="space-y-2 pt-1">
                {kendaraan.map((k) => {
                  const online = isOnline(k.updatedAt);
                  const isSel = selectedKendaraanId === k.kendaraanId;
                  const isDump = k.jenis === "dump_truck";
                  // Kapasitas muatan estimasi
                  const capacityPercent = online ? (isDump ? 78 : 62) : 0;

                  return (
                    <div
                      key={`knd-${k.kendaraanId}`}
                      onClick={() => pilihKendaraan(k.kendaraanId)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                        isSel
                          ? isDark
                            ? "bg-[#232731] border-amber-400 shadow-lg shadow-amber-950/40 ring-1 ring-amber-400/50"
                            : "bg-amber-50/80 border-amber-400 shadow-md ring-2 ring-amber-400/30"
                          : isDark
                          ? "bg-[#1a1d24] hover:bg-[#20242e] border-slate-800"
                          : "bg-white hover:bg-slate-50/80 border-slate-200/90 shadow-sm hover:shadow"
                      }`}
                    >
                      {/* Top Row: Name, Plate, Status */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0 ${
                              online
                                ? "bg-amber-400 text-slate-950 font-bold shadow-sm"
                                : isDark
                                ? "bg-slate-800 text-slate-400"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {isDump ? "🚛" : "🛺"}
                          </div>
                          <div className="min-w-0">
                            <p className={`text-xs font-bold truncate ${isDark ? "text-slate-100" : "text-slate-900"}`}>{k.nama}</p>
                            <p className="text-[10px] font-mono text-amber-500 font-bold truncate">
                              {k.platNomor || "NO-PLATE"}
                            </p>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <span
                          className={`text-[9px] font-black px-2 py-0.5 rounded-full shrink-0 uppercase tracking-wide ${
                            online
                              ? isDark
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : isDark
                              ? "bg-slate-800 text-slate-400 border border-slate-700"
                              : "bg-slate-100 text-slate-500 border border-slate-200"
                          }`}
                        >
                          {online ? "🟢 ON ROUTE" : "⚪ STANDBY"}
                        </span>
                      </div>

                      {/* Driver & Telemetry Row */}
                      <div className={`mt-2.5 pt-2 border-t flex items-center justify-between text-[11px] ${
                        isDark ? "border-slate-800/80 text-slate-400" : "border-slate-100 text-slate-500"
                      }`}>
                        <div className="flex items-center gap-1.5 truncate">
                          <span className={isDark ? "text-slate-500" : "text-slate-400"}>Sopir:</span>
                          <span className={`font-semibold truncate ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                            {k.pengemudi || "Tanpa Sopir"}
                          </span>
                        </div>
                        <span className={`text-[10px] shrink-0 font-mono ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                          {formatWaktuRelatifPeta(k.updatedAt)}
                        </span>
                      </div>

                      {/* Visual Waste Capacity Gauge */}
                      {online && (
                        <div className={`mt-2 pt-1.5 border-t ${isDark ? "border-slate-800/60" : "border-slate-100"}`}>
                          <div className={`flex items-center justify-between text-[10px] font-semibold mb-1 ${
                            isDark ? "text-slate-300" : "text-slate-700"
                          }`}>
                            <span className="flex items-center gap-1">
                              <Gauge className="w-3 h-3 text-amber-500" />
                              Kapasitas Muatan Sampah
                            </span>
                            <span className="font-mono text-amber-600 font-bold">{capacityPercent}%</span>
                          </div>
                          <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? "bg-slate-800" : "bg-slate-200"}`}>
                            <div
                              className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500 rounded-full transition-all duration-500"
                              style={{ width: `${capacityPercent}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {kendaraan.length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-6">Tidak ada armada terdaftar.</p>
                )}
              </div>

              {/* Petugas Lapangan Aktif */}
              <div className="pt-3">
                <div className={`flex items-center justify-between px-2 pb-2 text-[11px] font-bold ${
                  isDark ? "text-slate-400" : "text-slate-500"
                } uppercase tracking-wider`}>
                  <span>Petugas Lapangan Online</span>
                  <span className="text-emerald-500 font-bold">{petugasOnline} Petugas</span>
                </div>
                <div className="space-y-1.5">
                  {petugas.map((p) => {
                    const online = isOnline(p.updatedAt);
                    const isSel = selectedPetugasId === p.petugasId;
                    return (
                      <div
                        key={`ptg-${p.petugasId}`}
                        onClick={() => pilihPetugas(p.petugasId)}
                        className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                          isSel
                            ? isDark
                              ? "bg-[#232731] border-cyan-400 text-white"
                              : "bg-sky-50 border-sky-400 text-sky-950 ring-2 ring-sky-400/20"
                            : isDark
                            ? "bg-[#1a1d24] hover:bg-[#20242e] border-slate-800 text-slate-300"
                            : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-sm"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-sm">👮</span>
                          <div className="min-w-0">
                            <p className={`text-xs font-bold truncate ${isDark ? "text-slate-100" : "text-slate-900"}`}>{p.nama}</p>
                            <p className={`text-[10px] truncate uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                              {p.jabatan || "Petugas Lapangan"}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            online
                              ? isDark
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : isDark
                              ? "bg-slate-800 text-slate-500 border border-slate-700"
                              : "bg-slate-100 text-slate-500 border border-slate-200"
                          }`}
                        >
                          {online ? "LIVE" : "OFFLINE"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 2: PENGADUAN LIVE ── */}
          {activeTab === "pengaduan" && (
            <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
              {/* Subtabs Filter Pengaduan */}
              <div className={`flex items-center gap-1 p-1 rounded-xl border mb-2 ${
                isDark ? "bg-[#121418] border-slate-800" : "bg-slate-100 border-slate-200"
              }`}>
                {KOMPLAIN_TABS.map((t) => {
                  const count =
                    t.key === "semua"
                      ? komplainDenganPosisi.length
                      : komplainDenganPosisi.filter((k) => k.status === t.key).length;
                  return (
                    <button
                      key={`tab-kmp-${t.key}`}
                      type="button"
                      onClick={() => setKomplainTab(t.key)}
                      className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition ${
                        komplainTab === t.key
                          ? "bg-rose-500 text-white shadow-sm"
                          : isDark
                          ? "text-slate-400 hover:text-white"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {t.label} ({count})
                    </button>
                  );
                })}
              </div>

              {/* List of Complaint Cards */}
              <div className="space-y-2">
                {komplainFilter.map((k) => {
                  const isSel = selectedKomplainId === k.id;
                  const isBaru = k.status === "baru";
                  return (
                    <div
                      key={`kmp-${k.id}`}
                      onClick={() => pilihKomplain(k.id)}
                      className={`p-3 rounded-2xl border transition cursor-pointer relative overflow-hidden ${
                        isSel
                          ? isDark
                            ? "bg-[#232731] border-rose-500 shadow-lg shadow-rose-950/40"
                            : "bg-rose-50/80 border-rose-400 shadow-sm ring-2 ring-rose-400/20"
                          : isDark
                          ? "bg-[#1a1d24] hover:bg-[#20242e] border-slate-800"
                          : "bg-white hover:bg-slate-50 border-slate-200 shadow-sm"
                      }`}
                    >
                      {isBaru && (
                        <div className="absolute top-0 right-0 w-2 h-2 rounded-bl bg-rose-500" />
                      )}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span
                            className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase"
                            style={{
                              backgroundColor: `${KOMPLAIN_WARNA[k.status] ?? "#ef4444"}20`,
                              color: KOMPLAIN_WARNA[k.status] ?? "#ef4444",
                              border: `1px solid ${KOMPLAIN_WARNA[k.status] ?? "#ef4444"}40`,
                            }}
                          >
                            {k.status.toUpperCase()}
                          </span>
                          <h4 className={`text-xs font-bold mt-1.5 ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                            {KOMPLAIN_LABEL[k.jenis] ?? k.jenis}
                          </h4>
                        </div>
                        <span className={`text-[10px] font-mono ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                          {formatWaktuRelatifPeta(k.createdAt)}
                        </span>
                      </div>

                      <p className={`text-[11px] mt-1.5 line-clamp-2 leading-relaxed ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                        {k.deskripsi}
                      </p>

                      <div className={`mt-2.5 pt-2 border-t flex items-center justify-between text-[10px] ${
                        isDark ? "border-slate-800/80 text-slate-400" : "border-slate-100 text-slate-500"
                      }`}>
                        <span className={`font-semibold truncate ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                          {k.pelanggan.nama}{" "}
                          <span className="text-rose-500 font-mono">[{k.pelanggan.kodePelanggan}]</span>
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      </div>
                    </div>
                  );
                })}

                {komplainFilter.length === 0 && (
                  <div className="p-8 text-center text-xs text-slate-500">
                    Tidak ada pengaduan {komplainTab !== "semua" ? `dengan status ${komplainTab}` : ""}.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── TAB 3: DIREKTORI WARGA (PELANGGAN) ── */}
          {activeTab === "pelanggan" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Filters Strip */}
              <div className={`p-2 border-b space-y-2 ${
                isDark ? "border-slate-800/80 bg-[#121418]" : "border-slate-200 bg-slate-50"
              }`}>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={filterWilayah}
                    onChange={(e) => setFilterWilayah(e.target.value)}
                    className={`rounded-xl px-2.5 py-1.5 text-[11px] outline-none cursor-pointer border ${
                      isDark
                        ? "bg-slate-900 border-slate-700 text-slate-200"
                        : "bg-white border-slate-200 text-slate-800 shadow-xs"
                    }`}
                  >
                    <option value="semua">Semua Wilayah</option>
                    {wilayah.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.nama}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className={`rounded-xl px-2.5 py-1.5 text-[11px] outline-none cursor-pointer border ${
                      isDark
                        ? "bg-slate-900 border-slate-700 text-slate-200"
                        : "bg-white border-slate-200 text-slate-800 shadow-xs"
                    }`}
                  >
                    <option value="semua">Semua Status</option>
                    {Object.entries(STATUS_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sub-filter Tagihan & Sort */}
                <div className="flex items-center justify-between text-[11px] pt-1">
                  <div className="flex items-center gap-1 font-semibold">
                    <button
                      type="button"
                      onClick={() => setFilterTagihan("semua")}
                      className={`px-2 py-0.5 rounded-lg transition ${
                        filterTagihan === "semua"
                          ? isDark
                            ? "bg-amber-400 text-slate-950 font-bold"
                            : "bg-emerald-600 text-white font-bold shadow-xs"
                          : isDark
                          ? "text-slate-400 hover:text-white"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Semua
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterTagihan("lunas")}
                      className={`px-2 py-0.5 rounded-lg transition ${
                        filterTagihan === "lunas"
                          ? "bg-emerald-600 text-white font-bold shadow-xs"
                          : isDark
                          ? "text-slate-400 hover:text-white"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      ✓ Lunas
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterTagihan("tunggakan")}
                      className={`px-2 py-0.5 rounded-lg transition ${
                        filterTagihan === "tunggakan"
                          ? "bg-rose-600 text-white font-bold shadow-xs"
                          : isDark
                          ? "text-slate-400 hover:text-white"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      ⛔ Menunggak
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setUrutkan((u) => (u === "kode" ? "nama" : "kode"))}
                    className={`text-[10px] font-bold hover:underline ${
                      isDark ? "text-amber-400" : "text-emerald-700"
                    }`}
                  >
                    {urutkan === "kode" ? "KODE (A-Z)" : "NAMA (A-Z)"}
                  </button>
                </div>
              </div>

              {/* Customer List */}
              <div className={`flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar divide-y ${
                isDark ? "divide-slate-800/40" : "divide-slate-100"
              }`}>
                {daftarPetaUrut.slice(0, 80).map((p) => {
                  const isSel = selectedId === p.id;
                  const zona = zonaPelanggan.get(p.id);
                  const isLunas = p.statusTagihan === "lunas";
                  const isMenunggak = p.statusTagihan === "tunggakan" || p.statusTagihan === "belum_bayar";

                  return (
                    <div
                      key={`cust-${p.id}`}
                      onClick={() => pilihPelanggan(p.id)}
                      className={`p-2.5 rounded-xl border transition cursor-pointer ${
                        isSel
                          ? isDark
                            ? "bg-[#232731] border-emerald-400 text-white shadow-md shadow-emerald-950/30"
                            : "bg-emerald-50 border-emerald-500 text-slate-900 shadow-sm ring-1 ring-emerald-500/30"
                          : isDark
                          ? "bg-[#1a1d24] hover:bg-[#20242e] border-slate-800 text-slate-300"
                          : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-xs"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className={`text-xs font-bold truncate ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                            {p.nama}
                          </p>
                          <p className={`text-[10px] truncate mt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                            <span className="font-mono text-emerald-600 font-bold">{p.kodePelanggan}</span> ·{" "}
                            {p.alamat || "Alamat tidak tersedia"}
                          </p>
                        </div>

                        {/* Status Tagihan Badge */}
                        <span
                          className={`text-[9px] font-black px-2 py-0.5 rounded-full shrink-0 uppercase font-mono ${
                            isLunas
                              ? isDark
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : isMenunggak
                              ? isDark
                                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse"
                                : "bg-rose-100 text-rose-800 border border-rose-200 animate-pulse"
                              : isDark
                              ? "bg-slate-800 text-slate-400 border border-slate-700"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {isLunas ? "LUNAS" : isMenunggak ? "TUNGGAKAN" : p.status}
                        </span>
                      </div>

                      <div className={`mt-2 flex items-center justify-between text-[10px] ${
                        isDark ? "text-slate-500" : "text-slate-400"
                      }`}>
                        <span>{zona?.kelurahan ? `Kel. ${zona.kelurahan}` : p.wilayah?.nama ?? "—"}</span>
                        <span>{p.rtRw ? `RT/RW ${p.rtRw}` : ""}</span>
                      </div>
                    </div>
                  );
                })}

                {daftarPetaUrut.length === 0 && (
                  <div className={`p-8 text-center text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                    Tidak ada pelanggan yang cocok dengan filter.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── TAB 4: RUTE OPERASIONAL ── */}
          {activeTab === "rute" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className={`p-3 border-b space-y-2 ${
                isDark ? "border-slate-800 bg-[#121418]" : "border-slate-200 bg-slate-50"
              }`}>
                <label className={`text-[10px] font-bold uppercase ${
                  isDark ? "text-slate-400" : "text-slate-600"
                }`}>
                  PILIH JALUR RUTE PENGANGKUTAN
                </label>
                <select
                  value={ruteId}
                  onChange={(e) => setRuteId(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 text-xs outline-none cursor-pointer border ${
                    isDark
                      ? "bg-slate-900 border-slate-700 text-slate-200"
                      : "bg-white border-slate-200 text-slate-800 shadow-xs"
                  }`}
                >
                  <option value="semua">— Tampilkan Semua Rute —</option>
                  {rute.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nama} · {r.hari} ({r.anggota.length} titik)
                    </option>
                  ))}
                </select>

                {ruteTerpilih && (
                  <div className={`p-2.5 rounded-xl border text-xs space-y-1 ${
                    isDark
                      ? "bg-sky-500/10 border-sky-500/30 text-sky-200"
                      : "bg-sky-50 border-sky-200 text-sky-900 shadow-xs"
                  }`}>
                    <p className="font-bold">
                      {ruteTerpilih.nama} · {ruteTerpilih.hari}
                    </p>
                    <p className={`text-[11px] ${isDark ? "text-sky-300" : "text-sky-700"}`}>
                      Petugas: <strong className={isDark ? "text-white" : "text-slate-900"}>{ruteTerpilih.petugas || "Belum ditugaskan"}</strong>
                    </p>
                    {ruteUrutPanel.length >= 2 && (
                      <p className={`text-[10px] font-mono pt-1 border-t ${
                        isDark ? "border-sky-500/20 text-amber-300" : "border-sky-200 text-amber-700 font-bold"
                      }`}>
                        ESTIMASI JARAK:{" "}
                        <strong>{formatJarak(ruteUrutPanel.reduce((a, x) => a + x.jarakM, 0))}</strong>
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Sequential Stops */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
                {ruteUrutPanel.map((x, i) => (
                  <div
                    key={`stop-${x.anggota.id}`}
                    onClick={() => pilihPelanggan(x.anggota.id)}
                    className={`p-2.5 rounded-xl border flex items-center gap-3 transition cursor-pointer ${
                      isDark
                        ? "bg-[#1a1d24] hover:bg-[#20242e] border-slate-800 text-slate-300"
                        : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-xs"
                    }`}
                  >
                    <span className={`w-6 h-6 rounded-full text-xs font-bold font-mono flex items-center justify-center shrink-0 border ${
                      isDark
                        ? "bg-sky-500/20 text-sky-300 border-sky-500/40"
                        : "bg-sky-100 text-sky-700 border-sky-200"
                    }`}>
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-bold truncate ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                        {x.anggota.nama}
                      </p>
                      <p className={`text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        {i === 0 ? "🏁 Titik Mulai (Start)" : `+${formatJarak(x.jarakM)} dari sebelumnya`}
                      </p>
                    </div>
                  </div>
                ))}

                {ruteUrutPanel.length === 0 && (
                  <div className={`p-8 text-center text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                    {ruteTerpilih ? "Rute tidak memiliki titik koordinat." : "Pilih salah satu rute di atas."}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── CENTER WORKSPACE: FULL GIS MAP CANVAS ── */}
        <div className={`flex-1 relative h-full overflow-hidden ${isDark ? "bg-slate-950" : "bg-slate-100"}`}>
          <MapErrorBoundary>
            <MapView
              pelanggan={peta}
              komplain={komplainFilter}
              petugas={petugas}
              kendaraan={tampilkanArmada ? kendaraan : []}
              transit={transit}
              pusatPetugas={pusatPetugas}
              selectedId={selectedId}
              setSelectedId={pilihPelanggan}
              selectedKomplainId={selectedKomplainId}
              setSelectedKomplainId={pilihKomplain}
              selectedKendaraanId={selectedKendaraanId}
              setSelectedKendaraanId={pilihKendaraan}
              selectedPetugasId={selectedPetugasId}
              setSelectedPetugasId={pilihPetugas}
              selectedTransitId={selectedTransitId}
              setSelectedTransitId={pilihTransit}
              onMapClick={closeFlyout}
              tileMode={tileMode}
              setTileMode={setTileMode}
              hideTileButtons={true}
              tampilkanCakupan={tampilkanCakupan}
              showHeatmap={showHeatmap}
              tampilkanBatas={tampilkanBatas}
              tampilkanBatasKelurahan={tampilkanBatasKelurahan}
              tampilkanRt={tampilkanRt}
              tampilkanPelanggan={tampilkanPelanggan}
              tampilkanPetugas={tampilkanPetugas}
              tampilkanKomplain={tampilkanKomplain}
              tampilkanTransit={tampilkanTransit}
              ruteTerpilih={ruteTerpilih}
              invalidateKey={invalidateKey}
              warnaStatus={WARNA_STATUS}
            />
          </MapErrorBoundary>
        </div>

        {/* ── RIGHT FLYOUT INSPECTOR DRAWER (LoadSwift Inspired Telemetry Drawer) ── */}
        {hasInspector && (
          <div className={`w-84 sm:w-96 backdrop-blur-xl border-l absolute right-0 top-0 bottom-0 z-20 shadow-2xl flex flex-col transition-all duration-300 animate-in slide-in-from-right ${
            isDark
              ? "bg-[#181b22]/95 border-slate-800 text-slate-100"
              : "bg-white/95 border-slate-200 text-slate-800 shadow-slate-300"
          }`}>
            {/* Inspector Header */}
            <div className={`p-4 border-b flex items-center justify-between ${
              isDark ? "border-slate-800 bg-[#13161c]" : "border-slate-200 bg-slate-50"
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  {inspectorKendaraan ? "🚛" : inspectorPelanggan ? "👤" : inspectorKomplain ? "🚨" : "📍"}
                </div>
                <div>
                  <h3 className={`text-xs font-black uppercase tracking-wider ${
                    isDark ? "text-slate-200" : "text-slate-900"
                  }`}>
                    {inspectorKendaraan
                      ? "TELEMETRI ARMADA"
                      : inspectorPelanggan
                      ? "DATA PELANGGAN"
                      : inspectorKomplain
                      ? "RINCIAN PENGADUAN"
                      : "TITIK TRANSIT / LAPAK"}
                  </h3>
                  <p className={`text-[10px] font-mono ${isDark ? "text-amber-400" : "text-emerald-700 font-bold"}`}>
                    {inspectorKendaraan
                      ? inspectorKendaraan.platNomor || "ARMADA RESMI"
                      : inspectorPelanggan
                      ? inspectorPelanggan.kodePelanggan
                      : inspectorKomplain
                      ? `KOMPLAIN #${inspectorKomplain.id}`
                      : "TPS 3R KOTA DEPOK"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeFlyout}
                className={`p-1.5 rounded-xl transition ${
                  isDark
                    ? "bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900"
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Inspector Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar text-xs">
              {/* 1. INSPEKSI ARMADA TRUK */}
              {inspectorKendaraan && (
                <div className="space-y-4">
                  {/* Status Banner */}
                  <div className={`p-3 rounded-2xl border flex items-center justify-between ${
                    isDark ? "bg-amber-500/10 border-amber-500/30" : "bg-emerald-50 border-emerald-200 shadow-xs"
                  }`}>
                    <div>
                      <p className={`text-[10px] uppercase font-bold tracking-wider ${
                        isDark ? "text-amber-300" : "text-emerald-800"
                      }`}>
                        Status Operasi
                      </p>
                      <p className={`text-sm font-extrabold mt-0.5 ${
                        isDark ? "text-white" : "text-slate-900"
                      }`}>
                        {inspectorKendaraan.nama}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase ${
                        isOnline(inspectorKendaraan.updatedAt)
                          ? isDark
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : isDark
                          ? "bg-slate-800 text-slate-400"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {isOnline(inspectorKendaraan.updatedAt) ? "🟢 Bergerak" : "⚪ Standby"}
                    </span>
                  </div>

                  {/* Driver Card */}
                  <div className={`p-3 rounded-2xl border space-y-2 ${
                    isDark ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200 shadow-xs"
                  }`}>
                    <p className={`text-[10px] uppercase font-bold ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      Pengemudi / Petugas
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-9 h-9 rounded-full border flex items-center justify-center font-bold ${
                          isDark
                            ? "bg-slate-800 border-slate-700 text-amber-400"
                            : "bg-white border-slate-200 text-emerald-600 shadow-xs"
                        }`}>
                          {inspectorKendaraan.pengemudi ? inspectorKendaraan.pengemudi[0] : "S"}
                        </div>
                        <div>
                          <p className={`font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                            {inspectorKendaraan.pengemudi || "Belum Ditugaskan"}
                          </p>
                          <p className={`text-[10px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                            Petugas Angkut UPS HERU
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Telemetry Metrics Grid (LoadSwift Style) */}
                  <div className="space-y-2">
                    <p className={`text-[10px] uppercase font-bold ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      Sensor & Telemetri Muatan
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className={`p-3 rounded-xl border ${
                        isDark ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200 shadow-xs"
                      }`}>
                        <span className={`text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>Kapasitas Muatan</span>
                        <p className={`text-base font-extrabold font-mono mt-0.5 ${
                          isDark ? "text-amber-400" : "text-amber-600"
                        }`}>78%</p>
                        <span className={`text-[9px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>± 3.1 / 4.0 Ton</span>
                      </div>
                      <div className={`p-3 rounded-xl border ${
                        isDark ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200 shadow-xs"
                      }`}>
                        <span className={`text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>Kecepatan Rerata</span>
                        <p className={`text-base font-extrabold font-mono mt-0.5 ${
                          isDark ? "text-emerald-400" : "text-emerald-600"
                        }`}>24 km/h</p>
                        <span className={`text-[9px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>Lancar dalam kota</span>
                      </div>
                      <div className={`p-3 rounded-xl border ${
                        isDark ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200 shadow-xs"
                      }`}>
                        <span className={`text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>Akurasi GPS</span>
                        <p className={`text-base font-extrabold font-mono mt-0.5 ${
                          isDark ? "text-sky-400" : "text-sky-600"
                        }`}>
                          ±{inspectorKendaraan.akurasi ? Math.round(inspectorKendaraan.akurasi) : 5}m
                        </p>
                        <span className={`text-[9px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>Sinyal Satelit Kuat</span>
                      </div>
                      <div className={`p-3 rounded-xl border ${
                        isDark ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200 shadow-xs"
                      }`}>
                        <span className={`text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>Pembaruan GPS</span>
                        <p className={`text-xs font-bold mt-1 font-mono ${
                          isDark ? "text-slate-200" : "text-slate-800"
                        }`}>
                          {formatWaktuRelatifPeta(inspectorKendaraan.updatedAt)}
                        </p>
                        <span className={`text-[9px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>Live Polling</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. INSPEKSI PELANGGAN (WARGA) */}
              {inspectorPelanggan && (
                <div className="space-y-4">
                  {/* Status Tagihan Banner */}
                  <div
                    className={`p-3 rounded-2xl border flex items-center justify-between ${
                      inspectorPelanggan.statusTagihan === "lunas"
                        ? isDark
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                          : "bg-emerald-50 border-emerald-200 text-emerald-800"
                        : inspectorPelanggan.statusTagihan === "tunggakan"
                        ? isDark
                          ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                          : "bg-rose-50 border-rose-200 text-rose-800"
                        : isDark
                        ? "bg-slate-900 border-slate-800 text-slate-300"
                        : "bg-slate-50 border-slate-200 text-slate-700"
                    }`}
                  >
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-wider">Status Tagihan</p>
                      <p className="text-base font-black uppercase mt-0.5">
                        {inspectorPelanggan.statusTagihan === "lunas"
                          ? "✓ LUNAS"
                          : inspectorPelanggan.statusTagihan === "tunggakan"
                          ? "⛔ MENUNGGAK"
                          : "BELUM BAYAR"}
                      </p>
                    </div>
                    <span className="text-xl">
                      {inspectorPelanggan.statusTagihan === "lunas" ? "💳" : "⚠️"}
                    </span>
                  </div>

                  {/* Customer Information */}
                  <div className={`p-3 rounded-2xl border space-y-2.5 ${
                    isDark ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200 shadow-xs"
                  }`}>
                    <div>
                      <span className={`text-[10px] uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        Nama Lengkap
                      </span>
                      <p className={`text-sm font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                        {inspectorPelanggan.nama}
                      </p>
                    </div>
                    <div>
                      <span className={`text-[10px] uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        Alamat Domisili
                      </span>
                      <p className={`text-xs leading-relaxed ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                        {inspectorPelanggan.alamat || "—"}
                        {inspectorPelanggan.rtRw ? ` (RT/RW ${inspectorPelanggan.rtRw})` : ""}
                      </p>
                    </div>
                    {inspectorPelanggan.patokanLokasi && (
                      <div>
                        <span className={`text-[10px] uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                          Patokan Lokasi
                        </span>
                        <p className={`text-xs ${isDark ? "text-amber-300" : "text-amber-700 font-medium"}`}>
                          {inspectorPelanggan.patokanLokasi}
                        </p>
                      </div>
                    )}
                    <div>
                      <span className={`text-[10px] uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        Wilayah / Zonasi
                      </span>
                      <p className={`text-xs ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                        {inspectorPelanggan.wilayah?.nama ?? "Belum ditentukan"}
                      </p>
                    </div>
                  </div>

                  {/* WhatsApp Quick Chat */}
                  {inspectorPelanggan.noTelepon && (
                    <a
                      href={`https://wa.me/${inspectorPelanggan.noTelepon.replace(/\D/g, "").replace(/^0/, "62")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-md shadow-emerald-950/20"
                    >
                      <Phone className="w-4 h-4" />
                      <span>Chat WhatsApp Warga ({inspectorPelanggan.noTelepon})</span>
                    </a>
                  )}
                </div>
              )}

              {/* 3. INSPEKSI PENGADUAN */}
              {inspectorKomplain && (
                <div className="space-y-4">
                  {/* Complaint Status Banner */}
                  <div className={`p-3 rounded-2xl border flex items-center justify-between ${
                    isDark ? "bg-rose-500/10 border-rose-500/30" : "bg-rose-50 border-rose-200 shadow-xs"
                  }`}>
                    <div>
                      <p className={`text-[10px] uppercase font-bold tracking-wider ${
                        isDark ? "text-rose-400" : "text-rose-700"
                      }`}>
                        Status Pengaduan
                      </p>
                      <p className={`text-sm font-extrabold mt-0.5 ${
                        isDark ? "text-white" : "text-slate-900"
                      }`}>
                        {KOMPLAIN_LABEL[inspectorKomplain.jenis] ?? inspectorKomplain.jenis}
                      </p>
                    </div>
                    <span
                      className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase"
                      style={{
                        backgroundColor: `${KOMPLAIN_WARNA[inspectorKomplain.status] ?? "#ef4444"}20`,
                        color: KOMPLAIN_WARNA[inspectorKomplain.status] ?? "#ef4444",
                      }}
                    >
                      {inspectorKomplain.status.toUpperCase()}
                    </span>
                  </div>

                  {/* Complaint Description */}
                  <div className={`p-3 rounded-2xl border space-y-2 ${
                    isDark ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200 shadow-xs"
                  }`}>
                    <p className={`text-[10px] uppercase font-bold ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      Isi Pengaduan Warga
                    </p>
                    <p className={`text-xs leading-relaxed p-3 rounded-xl border ${
                      isDark
                        ? "bg-slate-950/60 border-slate-800/80 text-slate-200"
                        : "bg-white border-slate-200 text-slate-800"
                    }`}>
                      {inspectorKomplain.deskripsi}
                    </p>
                    <p className={`text-[10px] font-mono ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                      Dilaporkan pada: {new Date(inspectorKomplain.createdAt).toLocaleString("id-ID")}
                    </p>
                  </div>

                  {/* Reporter Info */}
                  <div className={`p-3 rounded-2xl border space-y-2 ${
                    isDark ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200 shadow-xs"
                  }`}>
                    <p className={`text-[10px] uppercase font-bold ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      Data Pelapor
                    </p>
                    <p className={`text-xs font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                      {inspectorKomplain.pelanggan.nama}
                    </p>
                    <p className="text-[11px] text-emerald-600 font-mono font-bold">
                      ID: {inspectorKomplain.pelanggan.kodePelanggan}
                    </p>
                  </div>

                  {/* WhatsApp Pelapor */}
                  {inspectorKomplain.pelanggan.noTelepon && (
                    <a
                      href={`https://wa.me/${inspectorKomplain.pelanggan.noTelepon.replace(/\D/g, "").replace(/^0/, "62")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-md shadow-emerald-950/20"
                    >
                      <Phone className="w-4 h-4" />
                      <span>Hubungi Pelapor via WA</span>
                    </a>
                  )}
                </div>
              )}

              {/* 4. INSPEKSI LAPAK / TRANSIT */}
              {inspectorTransit && (
                <div className="space-y-4">
                  <div className={`p-3 rounded-2xl border space-y-1 ${
                    isDark ? "bg-amber-500/10 border-amber-500/30" : "bg-amber-50 border-amber-200 shadow-xs"
                  }`}>
                    <p className={`text-[10px] uppercase font-bold ${isDark ? "text-amber-300" : "text-amber-800"}`}>
                      Pusat Transit / TPS 3R
                    </p>
                    <p className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                      {inspectorTransit.nama}
                    </p>
                    <p className={`text-xs ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                      {inspectorTransit.alamat || "Pusat Daur Ulang Kota Depok"}
                    </p>
                  </div>

                  {inspectorTransit.catatan && (
                    <div className={`p-3 rounded-2xl border space-y-1 ${
                      isDark ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200 shadow-xs"
                    }`}>
                      <p className={`text-[10px] uppercase font-bold ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        Catatan Operasional
                      </p>
                      <p className={`text-xs ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                        {inspectorTransit.catatan}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Inspector Footer Actions */}
            <div className={`p-4 border-t flex items-center gap-2 ${
              isDark ? "border-slate-800 bg-[#13161c]" : "border-slate-200 bg-slate-50"
            }`}>
              <button
                type="button"
                onClick={closeFlyout}
                className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs transition ${
                  isDark
                    ? "bg-slate-800 hover:bg-slate-700 text-slate-300"
                    : "bg-slate-200 hover:bg-slate-300 text-slate-700"
                }`}
              >
                Tutup Panel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
