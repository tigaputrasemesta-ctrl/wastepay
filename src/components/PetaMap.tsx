"use client";

import { Component, useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { RT_RTRW_DEPOK } from "@/lib/zona-depok";
import { cariRtTerdekat, deteksiZona, formatJarak, jarakMeter, urutkanRute } from "@/lib/geo";
import { KOMPLAIN_LABEL, KOMPLAIN_WARNA } from "@/lib/komplain";
import type { KendaraanPeta, PetugasPeta, TransitPeta } from "./MapView";

// Map di-load client-side saja (leaflet butuh window/browser).
const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-slate-50">
      <p className="font-bold text-xs uppercase tracking-wider text-emerald-700 animate-pulse">Memuat Peta…</p>
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
        <div className="h-full w-full flex flex-col items-center justify-center bg-slate-900 text-white p-6 space-y-3">
          <p className="text-sm font-bold text-rose-400">⚠️ Terjadi kendala saat memuat peta.</p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-500 rounded-xl text-xs font-bold transition shadow-lg"
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
  posisi: [number, number]; // koordinat pelanggan, fallback RT RTRW terdekat
};

type Props = {
  pelanggan: PelangganPeta[];
  wilayah: { id: number; nama: string; kelurahanRef?: { nama: string } | null }[];
  rute: RutePeta[];
  petugasAwal?: PetugasPeta[];
  kendaraanAwal?: KendaraanPeta[];
  transitAwal?: TransitPeta[];
};

const WARNA_STATUS: Record<string, string> = {
  aktif: "#b7e13c",
  calon: "#f5a524",
  nonaktif: "#8b8f98",
  libur: "#8b8f98",
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
  { key: "proses", label: "Proses" },
  { key: "selesai", label: "Selesai" },
];

type TabKey = "pelanggan" | "pengaduan" | "rute";

const TABS: { key: TabKey; label: string }[] = [
  { key: "pelanggan", label: "Pelanggan" },
  { key: "pengaduan", label: "Pengaduan" },
  { key: "rute", label: "Rute" },
];

function formatWaktuRelatifPeta(iso: string): string {
  const detik = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (detik < 60) return `${detik}dtk`;
  if (detik < 3600) return `${Math.floor(detik / 60)}mnt`;
  return `${Math.floor(detik / 3600)}jam`;
}

// Ambang "online": posisi dianggap realtime jika dikirim < 15 menit lalu.
const ONLINE_MS = 15 * 60 * 1000;
function isOnline(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() < ONLINE_MS;
}

export default function PetaMap({ pelanggan, wilayah, rute, petugasAwal = [], kendaraanAwal = [], transitAwal = [] }: Props) {
  const [filterWilayah, setFilterWilayah] = useState("semua");
  const [filterStatus, setFilterStatus] = useState("semua");
  const [filterTagihan, setFilterTagihan] = useState<"semua" | "lunas" | "tunggakan">("semua");
  const [cari, setCari] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [ruteId, setRuteId] = useState<string>("semua");
  const [tampilkanCakupan, setTampilkanCakupan] = useState(false);
  const [tampilkanBatas, setTampilkanBatas] = useState(true);
  const [tampilkanBatasKelurahan, setTampilkanBatasKelurahan] = useState(true);
  const [tampilkanRt, setTampilkanRt] = useState(true);
  const [tampilkanArmada, setTampilkanArmada] = useState(true);
  const [tab, setTab] = useState<TabKey>("pelanggan");
  const [bukaLapakList, setBukaLapakList] = useState(true);
  const [urutkan, setUrutkan] = useState<"nama" | "kode">("kode");

  // Mode Layar Penuh GIS (Showing & Hiding)
  const [panelBawahTerbuka, setPanelBawahTerbuka] = useState(true);
  const [invalidateKey, setInvalidateKey] = useState(1);

  // Searching & Finding langsung di Peta
  const [pencarianPeta, setPencarianPeta] = useState("");
  const [bukaSaranPeta, setBukaSaranPeta] = useState(false);

  // ── Pengaduan live (polling) ──
  const [komplain, setKomplain] = useState<KomplainPeta[]>([]);
  const [komplainTab, setKomplainTab] = useState("semua");
  const [selectedKomplainId, setSelectedKomplainId] = useState<number | null>(null);
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
      // diam: polling berikutnya akan coba lagi
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

  // ── Lokasi realtime petugas (polling 10 dtk) ──
  const [petugas, setPetugas] = useState<PetugasPeta[]>(petugasAwal);
  const [lastPetugas, setLastPetugas] = useState<number | null>(null);

  const ambilPetugas = useCallback(async () => {
    try {
      const res = await fetch("/api/petugas/lokasi", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as PetugasPeta[];
      setPetugas(data);
      setLastPetugas(Date.now());
    } catch {
      // diam
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

  // ── Lokasi realtime kendaraan (polling 15 dtk) ──
  const [kendaraan, setKendaraan] = useState<KendaraanPeta[]>(kendaraanAwal);
  const [transit, setTransit] = useState<TransitPeta[]>(transitAwal);
  const [pusatPetugas, setPusatPetugas] = useState<[number, number] | null>(null);

  const ambilKendaraan = useCallback(async () => {
    try {
      const res = await fetch("/api/kendaraan/lokasi", { cache: "no-store" });
      if (!res.ok) return;
      setKendaraan((await res.json()) as KendaraanPeta[]);
    } catch {
      // diam
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
        // diam
      }
    }, 1000);
    return () => {
      clearTimeout(t0);
      clearInterval(t);
      clearTimeout(t1);
    };
  }, [ambilKendaraan]);

  const totalBerkoordinat = pelanggan.filter(
    (p) => p.latitude != null && p.longitude != null
  ).length;

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
      if (q && !`${p.nama} ${p.kodePelanggan} ${p.alamat}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [pelanggan, filterWilayah, filterStatus, cari]);

  const daftarPeta = daftar.filter((p) => p.latitude != null && p.longitude != null);
  const tanpaKoordinat = daftar.filter((p) => p.latitude == null || p.longitude == null);

  const daftarPetaUrut = useMemo(() => {
    return [...daftarPeta].sort((a, b) => {
      if (urutkan === "nama") return a.nama.localeCompare(b.nama);
      return a.kodePelanggan.localeCompare(b.kodePelanggan);
    });
  }, [daftarPeta, urutkan]);

  const tanpaKoordinatUrut = useMemo(() => {
    return [...tanpaKoordinat].sort((a, b) => {
      if (urutkan === "nama") return a.nama.localeCompare(b.nama);
      return a.kodePelanggan.localeCompare(b.kodePelanggan);
    });
  }, [tanpaKoordinat, urutkan]);

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
  const aktifCount = useMemo(
    () => pelanggan.filter((p) => p.status === "aktif").length,
    [pelanggan]
  );

  const saranPeta = useMemo(() => {
    const q = pencarianPeta.trim().toLowerCase();
    if (!q || q.length < 2) return [];
    return pelanggan
      .filter(
        (p) =>
          p.latitude != null &&
          p.longitude != null &&
          (p.nama.toLowerCase().includes(q) ||
            p.kodePelanggan.toLowerCase().includes(q) ||
            p.alamat.toLowerCase().includes(q) ||
            (p.rtRw && p.rtRw.toLowerCase().includes(q)))
      )
      .slice(0, 6);
  }, [pelanggan, pencarianPeta]);

  const peta = useMemo(() => {
    return pelanggan.filter((p) => {
      if (p.latitude == null || p.longitude == null) return false;
      if (filterWilayah !== "semua" && p.wilayah?.id !== Number(filterWilayah)) return false;
      if (filterStatus !== "semua" && p.status !== filterStatus) return false;
      if (filterTagihan === "lunas" && p.statusTagihan !== "lunas") return false;
      if (
        filterTagihan === "tunggakan" &&
        p.statusTagihan !== "tunggakan" &&
        p.statusTagihan !== "belum_bayar"
      )
        return false;
      if (cari.trim()) {
        const q = cari.trim().toLowerCase();
        if (!`${p.nama} ${p.kodePelanggan} ${p.alamat}`.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [pelanggan, filterWilayah, filterStatus, filterTagihan, cari]);

  const ruteTerpilih = ruteId !== "semua" ? rute.find((r) => String(r.id) === ruteId) ?? null : null;
  const ruteAktif = rute.filter((r) => r.anggota.length >= 2);

  // Urutan rute terpilih + jarak antar titik (untuk panel Rute)
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

  const komplainDenganPosisi = useMemo(() => {
    return komplain.map((k) => {
      const lat = k.pelanggan.latitude;
      const lng = k.pelanggan.longitude;
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

  const komplainFilter = useMemo(
    () =>
      komplainTab === "semua"
        ? komplainDenganPosisi
        : komplainDenganPosisi.filter((k) => k.status === komplainTab),
    [komplainDenganPosisi, komplainTab]
  );

  const hitungBaru = komplainDenganPosisi.filter((k) => k.status === "baru").length;

  // Hitung armada yang BENAR-BENAR online (kirim posisi < 15 mnt) — bukan semua yang pernah kirim
  const petugasOnline = petugas.filter((p) => isOnline(p.updatedAt)).length;
  const kendaraanOnline = kendaraan.filter((k) => isOnline(k.updatedAt)).length;
  const totalOnline = petugasOnline + kendaraanOnline;

  const pilihPelanggan = useCallback(
    (id: number) => {
      setSelectedId(id);
      setSelectedKomplainId(null);
      // Jika pelanggan yang dipilih tidak ada di peta karena filter aktif, reset filter agar pin muncul
      const adaDiPeta = peta.some((x) => x.id === id);
      if (!adaDiPeta) {
        setFilterWilayah("semua");
        setFilterStatus("semua");
        setFilterTagihan("semua");
        setCari("");
      }
    },
    [peta]
  );
  const pilihKomplain = useCallback((id: number) => {
    setSelectedKomplainId(id);
    setSelectedId(null);
  }, []);

  return (
    <div className="space-y-4 pb-12">
      {/* ── BAGIAN ATAS: PETA OPERASIONAL DENGAN BANNER, DASHBOARD & PENCARIAN ── */}
      <div className="rounded-2xl border border-slate-200/80 shadow-sm bg-white overflow-hidden">
        {/* Banner Pemantauan Realtime */}
        <div className="bg-slate-900 text-white px-4 py-2 border-b border-slate-800 flex items-center justify-between text-[11px] font-bold flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse ring-4 ring-emerald-400/20" />
            <span className="tracking-wide uppercase">🟢 MONITORING REALTIME ARMADA & CAKUPAN SAMPAH KOTA DEPOK</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setPanelBawahTerbuka((p) => !p);
              setInvalidateKey((k) => k + 1);
            }}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 font-bold text-xs transition-colors flex items-center gap-1.5"
          >
            <span>{panelBawahTerbuka ? "⛶" : "👁️"}</span>
            <span>{panelBawahTerbuka ? "Layar Penuh (Sembunyikan Panel)" : "Buka Panel Bawah"}</span>
          </button>
        </div>

        {/* GIS Floating Dashboard & Filter Bar */}
        <div className="bg-slate-950 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-xs font-semibold flex-wrap">
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-xl font-bold">
              👥 {pelanggan.length} Warga ({aktifCount} Aktif)
            </span>
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-xl font-bold">
              💳 {lunasCount} Lunas
            </span>
            {menunggakCount > 0 && (
              <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2.5 py-1 rounded-xl font-bold animate-pulse">
                ⛔ {menunggakCount} Menunggak
              </span>
            )}
            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-xl font-bold">
              🚛 {kendaraanOnline} Truk Online
            </span>
            <span className="bg-sky-500/20 text-sky-300 border border-sky-500/30 px-2.5 py-1 rounded-xl font-bold">
              👮 {petugasOnline} Petugas Online
            </span>
            <span className="bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-1 rounded-xl font-bold">
              📍 {transit.filter((t) => t.aktif).length} Lapak/TPS
            </span>
          </div>

          {/* Pricing Filter Buttons */}
          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-bold">
            <span className="text-[10px] text-slate-400 px-1.5 uppercase">Tagihan:</span>
            <button
              type="button"
              onClick={() => setFilterTagihan("semua")}
              className={`px-2 py-0.5 rounded-lg transition-colors ${
                filterTagihan === "semua" ? "bg-emerald-700 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Semua
            </button>
            <button
              type="button"
              onClick={() => setFilterTagihan("lunas")}
              className={`px-2 py-0.5 rounded-lg transition-colors ${
                filterTagihan === "lunas" ? "bg-emerald-700 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              ✓ Lunas
            </button>
            <button
              type="button"
              onClick={() => setFilterTagihan("tunggakan")}
              className={`px-2 py-0.5 rounded-lg transition-colors ${
                filterTagihan === "tunggakan" ? "bg-rose-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              ⛔ Menunggak
            </button>
          </div>
        </div>

        {/* Map Canvas - dengan Pencarian Cerdas Mengambang (Searching & Finding) */}
        <div className={`relative transition-all duration-300 ${panelBawahTerbuka ? "h-[65vh] min-h-[500px]" : "h-[85vh] min-h-[620px]"}`}>
          {/* Searching & Finding Floating Input on Map */}
          <div className="absolute top-3 left-3 z-[1000] w-72 sm:w-80">
            <div className="relative">
              <input
                type="text"
                value={pencarianPeta}
                onChange={(e) => {
                  setPencarianPeta(e.target.value);
                  setBukaSaranPeta(true);
                }}
                onFocus={() => setBukaSaranPeta(true)}
                placeholder="🔍 Cari cepat warga di peta..."
                className="w-full bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl px-3.5 py-2 text-xs font-bold text-slate-800 placeholder-slate-400 shadow-lg outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
              {pencarianPeta && (
                <button
                  type="button"
                  onClick={() => {
                    setPencarianPeta("");
                    setBukaSaranPeta(false);
                  }}
                  className="absolute right-3 top-2 text-xs text-slate-400 hover:text-slate-700 font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Dropdown Suggestions */}
            {bukaSaranPeta && saranPeta.length > 0 && (
              <div className="mt-1 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden divide-y divide-slate-100 max-h-60 overflow-y-auto">
                {saranPeta.map((p) => (
                  <button
                    key={`suggest-${p.id}`}
                    type="button"
                    onClick={() => {
                      pilihPelanggan(p.id);
                      setPencarianPeta(p.nama);
                      setBukaSaranPeta(false);
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-emerald-50 flex items-center justify-between gap-2 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{p.nama}</p>
                      <p className="text-[10px] text-slate-500 truncate">{p.alamat}</p>
                    </div>
                    <span
                      className={`text-[9px] font-black px-1.5 py-0.5 rounded shrink-0 ${
                        p.statusTagihan === "lunas"
                          ? "bg-emerald-100 text-emerald-800"
                          : p.statusTagihan === "tunggakan"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {p.statusTagihan === "lunas" ? "LUNAS" : p.statusTagihan === "tunggakan" ? "MENUNGGAK" : p.kodePelanggan}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

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
              tampilkanCakupan={tampilkanCakupan}
              tampilkanBatas={tampilkanBatas}
              tampilkanBatasKelurahan={tampilkanBatasKelurahan}
              tampilkanRt={tampilkanRt}
              ruteTerpilih={ruteTerpilih}
              invalidateKey={invalidateKey}
              warnaStatus={WARNA_STATUS}
            />
          </MapErrorBoundary>
        </div>
      </div>

      {/* ── BAGIAN BAWAH: DASHBOARD ── */}
      {panelBawahTerbuka && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-auto lg:h-[550px]">
        
        {/* KOLOM KIRI (3): HEADER & LAYER */}
        <div className="lg:col-span-3 space-y-4 flex flex-col h-full">
          {/* Info Header */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm relative overflow-hidden flex flex-col flex-shrink-0">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-none flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              PETA DEPOK
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-2 leading-relaxed">
              Sebaran {pelanggan.length} pelanggan · {totalBerkoordinat} berkoordinat · {wilayah.length} wilayah · {rute.length} rute · {kendaraan.length} armada
            </p>
            <div className="flex flex-wrap gap-2 text-xs text-slate-600 font-medium mt-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>Aktif</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200"><span className="w-2 h-2 rounded-full bg-amber-500"></span>Calon</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200"><span className="w-2 h-2 rounded-full bg-slate-400"></span>Nonaktif</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200"><span className="w-2 h-2 rounded-full border border-rose-500"></span>No-Geo</span>
            </div>
            
            {/* Footer Stats mini */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 flex-wrap text-xs">
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg font-semibold">
                📍 {daftarPeta.length} di peta
              </span>
              {tanpaKoordinat.length > 0 && (
                <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg font-semibold">
                  ⚠️ {tanpaKoordinat.length} no-geo
                </span>
              )}
              {hitungBaru > 0 && (
                <span className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg font-semibold animate-pulse">
                  🔥 {hitungBaru} komplain
                </span>
              )}
            </div>
          </div>

          {/* Layer toggle — styled chips */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex-1 flex flex-col justify-center">
            <span className="font-bold uppercase tracking-wider text-xs text-slate-400 block mb-3 border-b border-slate-100 pb-2">LAYER KONTROL</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2 flex-1">
              <button
                type="button"
                onClick={() => setTampilkanBatas((b) => !b)}
                className={`text-xs px-3.5 py-2.5 rounded-xl border transition-all text-left flex items-center justify-between font-medium ${
                  tampilkanBatas
                    ? "border-emerald-300 text-emerald-800 bg-emerald-50/80 font-semibold"
                    : "border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <span>Batas Kecamatan</span> <span>{tampilkanBatas ? "✓" : "○"}</span>
              </button>
              <button
                type="button"
                onClick={() => setTampilkanBatasKelurahan((b) => !b)}
                className={`text-xs px-3.5 py-2.5 rounded-xl border transition-all text-left flex items-center justify-between font-medium ${
                  tampilkanBatasKelurahan
                    ? "border-emerald-300 text-emerald-800 bg-emerald-50/80 font-semibold"
                    : "border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <span>Batas Kelurahan</span> <span>{tampilkanBatasKelurahan ? "✓" : "○"}</span>
              </button>
              <button
                type="button"
                onClick={() => setTampilkanRt((b) => !b)}
                className={`text-xs px-3.5 py-2.5 rounded-xl border transition-all text-left flex items-center justify-between font-medium ${
                  tampilkanRt
                    ? "border-emerald-300 text-emerald-800 bg-emerald-50/80 font-semibold"
                    : "border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <span>Titik Koordinat RT</span> <span>{tampilkanRt ? "✓" : "○"}</span>
              </button>
              <button
                type="button"
                onClick={() => setTampilkanCakupan((b) => !b)}
                className={`text-xs px-3.5 py-2.5 rounded-xl border transition-all text-left flex items-center justify-between font-medium ${
                  tampilkanCakupan
                    ? "border-emerald-300 text-emerald-800 bg-emerald-50/80 font-semibold"
                    : "border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <span>Cakupan Radius 200m</span> <span>{tampilkanCakupan ? "✓" : "○"}</span>
              </button>
              <button
                type="button"
                onClick={() => setTampilkanArmada((b) => !b)}
                className={`text-xs px-3.5 py-2.5 rounded-xl border transition-all text-left flex items-center justify-between font-medium ${
                  tampilkanArmada
                    ? "border-amber-300 text-amber-800 bg-amber-50/80 font-semibold"
                    : "border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <span>Pelacakan Armada</span> <span>{tampilkanArmada ? "✓" : "○"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* KOLOM TENGAH (6): DIREKTORI */}
        <div className="lg:col-span-5 flex flex-col h-full">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col h-full overflow-hidden">
            {/* Header + pencarian + filter */}
            <div className="p-4 border-b border-slate-200/80 bg-slate-50/50 space-y-3 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-xs uppercase tracking-wider text-slate-800">DIREKTORI</p>
                  {(filterWilayah !== "semua" || filterStatus !== "semua" || cari) && (
                    <button
                      onClick={() => {
                        setFilterWilayah("semua");
                        setFilterStatus("semua");
                        setCari("");
                      }}
                      className="text-[10px] font-bold text-amber-400 hover:underline ml-2"
                      title="Reset Filter"
                    >
                      [RESET]
                    </button>
                  )}
                </div>
              </div>

              {/* Input Pencarian */}
              <div className="relative">
                <input
                  value={cari}
                  onChange={(e) => setCari(e.target.value)}
                  placeholder="Cari nama / kode / alamat…"
                  className="w-full bg-white border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-800 placeholder-slate-400 rounded-xl px-3 py-2 pl-9 text-xs outline-none transition-all"
                />
                <svg
                  className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {cari && (
                  <button
                    onClick={() => setCari("")}
                    className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-700"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Dropdown Filters */}
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={filterWilayah}
                  onChange={(e) => setFilterWilayah(e.target.value)}
                  className="bg-white border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-700 rounded-xl px-2.5 py-2 text-xs truncate outline-none cursor-pointer"
                >
                  <option value="semua">Semua Wilayah</option>
                  {wilayah.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.nama} — {w.kelurahanRef?.nama ?? "—"}
                    </option>
                  ))}
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-white border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-700 rounded-xl px-2.5 py-2 text-xs outline-none cursor-pointer"
                >
                  <option value="semua">Semua Status</option>
                  {Object.entries(STATUS_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              {/* Navigasi Tab */}
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl">
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`text-xs py-2 px-3 rounded-lg transition-all relative font-semibold ${
                      tab === t.key
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {t.label}
                    {t.key === "pengaduan" && hitungBaru > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center shadow-sm">
                        {hitungBaru}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Konten tab: Pelanggan ── */}
            {tab === "pelanggan" && (
              <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
                {/* Section Top: Titik Lapak & TPS */}
                {transit.filter((t) => t.aktif).length > 0 && (
                  <div className="border-b border-slate-200/80 flex-shrink-0">
                    <button
                      onClick={() => setBukaLapakList((b) => !b)}
                      className="w-full px-4 py-3 bg-amber-50/70 border-b border-amber-200/60 flex items-center justify-between text-left hover:bg-amber-50 transition"
                    >
                      <span className="text-xs font-bold text-amber-900 flex items-center gap-2">
                        <span>{bukaLapakList ? "▼" : "▶"}</span>
                        <span>▲ TITIK LAPAK & TPS ({transit.filter((t) => t.aktif).length})</span>
                      </span>
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-200/60 border border-amber-300 px-2 py-0.5 rounded-full uppercase">
                        LAPAK READY
                      </span>
                    </button>

                    {bukaLapakList && (
                      <div className="p-2 space-y-1 bg-amber-50/30 border-b border-amber-100">
                        {transit.filter((t) => t.aktif).map((t) => (
                          <button
                            key={`dir-t-top-${t.id}`}
                            onClick={() => setPusatPetugas([t.latitude, t.longitude])}
                            className="w-full flex items-center gap-3 text-left bg-white hover:bg-amber-50/50 border border-amber-200 rounded-xl px-3 py-2 transition group shadow-sm"
                          >
                            <span className="text-sm text-amber-700 font-bold shrink-0">▲</span>
                            <div className="min-w-0 flex-1">
                              <span className="block text-xs text-slate-900 font-semibold truncate">{t.nama}</span>
                              {t.alamat && <span className="block text-[10px] text-slate-500 truncate mt-0.5">{t.alamat}</span>}
                            </div>
                            <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full uppercase shrink-0">
                              LAPAK
                            </span>
                            <span className="ml-auto text-xs text-amber-500 shrink-0 group-hover:translate-x-1 transition-transform font-bold">
                              ▶
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Sorting & Stats Header */}
                <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between text-[11px] font-medium text-slate-500 flex-shrink-0">
                  <span>Terpetakan: <strong className="text-slate-800">{daftarPetaUrut.length}</strong></span>
                  <div className="flex items-center gap-1.5">
                    <span>Sort:</span>
                    <button
                      onClick={() => setUrutkan((s) => (s === "kode" ? "nama" : "kode"))}
                      className="text-emerald-700 hover:text-emerald-800 font-bold hover:underline"
                    >
                      {urutkan === "kode" ? "KODE (A-Z)" : "NAMA (A-Z)"}
                    </button>
                  </div>
                </div>

                {/* Section 1: Terpetakan di Peta (Always Open) */}
                <div className="divide-y divide-slate-100 bg-white flex-1">
                  {daftarPetaUrut.slice(0, 50).map((p) => {
                    const warna = WARNA_STATUS[p.status] ?? "#8b8f98";
                    const aktif = selectedId === p.id;
                    const zona = zonaPelanggan.get(p.id);
                    return (
                      <button
                        key={p.id}
                        onClick={() => pilihPelanggan(p.id)}
                        className={`w-full text-left px-4 py-3 flex items-center justify-between gap-3 transition-colors ${
                          aktif ? "bg-emerald-50/60 border-l-4 border-emerald-500" : "hover:bg-slate-50/80"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                            style={{ background: warna }}
                          />
                          <div className="min-w-0">
                            <span className="block text-xs font-semibold text-slate-900 truncate">{p.nama}</span>
                            <span className="block text-[11px] text-slate-500 truncate mt-0.5">
                              <span className="text-emerald-700 font-semibold font-mono">{p.kodePelanggan}</span> · {zona ? zona.kelurahan : p.wilayah?.nama ?? "—"}
                            </span>
                          </div>
                        </div>
                        <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full shrink-0 uppercase ${
                          p.status === "aktif" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                          p.status === "calon" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                          "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}>
                          {p.status}
                        </span>
                      </button>
                    );
                  })}
                  {daftarPetaUrut.length === 0 && (
                    <div className="p-6 text-center text-xs text-slate-500 space-y-1">
                      <p className="font-semibold text-slate-700">Tidak ada pelanggan berkoordinat</p>
                      <p className="text-[11px]">Silakan ubah kata pencarian atau filter.</p>
                    </div>
                  )}
                  {daftarPetaUrut.length > 50 && (
                    <div className="p-3 text-center text-[11px] text-slate-500 font-medium bg-slate-50 border-t border-slate-200/80">
                      Menampilkan 50 dari {daftarPetaUrut.length} pelanggan.
                      <br />Gunakan pencarian untuk menemukan pelanggan spesifik.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Konten tab: Pengaduan ── */}
            {tab === "pengaduan" && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="px-4 py-3 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/70 flex-shrink-0">
                  <p className="font-bold text-xs uppercase tracking-wider text-rose-600 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse inline-block" />
                    PENGADUAN LIVE
                  </p>
                  <button
                    onClick={() => {
                      setMuatKomplain(true);
                      ambilKomplain().finally(() => setMuatKomplain(false));
                    }}
                    className="text-xs text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-xl font-semibold transition-colors"
                  >
                    {muatKomplain ? "Memuat…" : "Refresh"}
                  </button>
                </div>
                <div className="px-3 py-2 border-b border-slate-200/80 flex flex-wrap gap-2 bg-white flex-shrink-0">
                  {KOMPLAIN_TABS.map((t) => {
                    const n =
                      t.key === "semua"
                        ? komplainDenganPosisi.length
                        : komplainDenganPosisi.filter((k) => k.status === t.key).length;
                    return (
                      <button
                        key={t.key}
                        onClick={() => setKomplainTab(t.key)}
                        className={`text-xs px-3 py-1 rounded-xl transition-all font-semibold ${
                          komplainTab === t.key
                            ? "bg-rose-600 text-white shadow-sm"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {t.label} ({n})
                      </button>
                    );
                  })}
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
                  {komplainFilter.map((k) => (
                    <button
                      key={k.id}
                      onClick={() => pilihKomplain(k.id)}
                      className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors ${
                        selectedKomplainId === k.id ? "bg-rose-50/70 border-l-4 border-rose-500" : "hover:bg-slate-50/80"
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 mt-1"
                        style={{ background: KOMPLAIN_WARNA[k.status] ?? "#ef4444" }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-semibold text-slate-900 truncate">
                          {k.pelanggan.nama}{" "}
                          <span className="text-rose-600 font-mono text-[10px] ml-1 font-semibold">
                            [{k.pelanggan.kodePelanggan}]
                          </span>
                        </span>
                        <span className="block text-[11px] text-slate-500 font-medium truncate mt-0.5">
                          {KOMPLAIN_LABEL[k.jenis] ?? k.jenis} · <span className="text-rose-600 font-semibold">{k.status.toUpperCase()}</span>
                        </span>
                        <span className="block text-[10px] text-slate-400 mt-0.5">
                          {new Date(k.createdAt).toLocaleString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </span>
                    </button>
                  ))}
                  {komplainFilter.length === 0 && (
                    <p className="p-6 text-xs text-slate-400 italic text-center">
                      Tidak ada pengaduan {komplainTab !== "semua" ? `dengan status ${komplainTab}` : ""}.
                    </p>
                  )}
                </div>
                {lastRefresh && (
                  <div className="px-4 py-2 border-t border-slate-200/80 text-[10px] text-slate-400 text-right bg-slate-50/70">
                    UPDATE {new Date(lastRefresh).toLocaleTimeString("id-ID")} WIB (auto 15 dtk)
                  </div>
                )}
              </div>
            )}

            {/* ── Konten tab: Rute ── */}
            {tab === "rute" && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="px-4 py-3 border-b border-slate-200/80 space-y-2 bg-white flex-shrink-0">
                  <p className="font-bold uppercase tracking-wider text-[11px] text-slate-700">PILIH RUTE PENGANGKUTAN</p>
                  <select
                    value={ruteId}
                    onChange={(e) => setRuteId(e.target.value)}
                    className="bg-white border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-700 rounded-xl px-3 py-2 w-full text-xs outline-none cursor-pointer"
                  >
                    <option value="semua">— Semua rute —</option>
                    {rute.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nama} · {r.hari} · {r.anggota.length} titik
                      </option>
                    ))}
                  </select>
                  {ruteTerpilih && (
                    <div className="bg-emerald-50/60 border border-emerald-200 p-3 rounded-2xl space-y-1 text-xs text-emerald-900 mt-2">
                      <p className="font-bold text-xs">
                        {ruteTerpilih.anggota.length} TITIK · {ruteTerpilih.hari}
                        {ruteTerpilih.jam ? ` · ${ruteTerpilih.jam}` : ""}
                      </p>
                      {ruteTerpilih.petugas && <p>PETUGAS: <span className="font-bold text-slate-900">{ruteTerpilih.petugas}</span></p>}
                      {ruteUrutPanel.length >= 2 && (
                        <p className="text-emerald-800 pt-1 border-t border-emerald-200/60 mt-1 text-[11px]">
                          EST. JARAK:{" "}
                          <span className="text-amber-700 font-bold">
                            {formatJarak(
                              ruteUrutPanel.reduce((a, x) => a + x.jarakM, 0)
                            )}
                          </span>{" "}
                          (urutan terdekat)
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
                  {ruteUrutPanel.map((x, i) => (
                    <div
                      key={x.anggota.id}
                      className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50/80 transition"
                    >
                      <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="min-w-0 flex-1 pl-1">
                        <span className="block text-xs font-semibold text-slate-900 truncate">{x.anggota.nama}</span>
                        <span className="block text-[11px] text-slate-500 mt-0.5">
                          {i === 0
                            ? <span className="text-emerald-700 font-semibold">🏁 Titik Awal</span>
                            : `Jarak dari titik sebelumnya: ${formatJarak(x.jarakM)}`}
                        </span>
                      </span>
                    </div>
                  ))}
                  {ruteUrutPanel.length === 0 && (
                    <p className="p-6 text-xs text-slate-400 italic text-center">
                      {ruteTerpilih
                        ? "Rute ini tidak punya titik berkoordinat."
                        : "Pilih rute untuk melihat urutan kunjungan."}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* KOLOM KANAN (4): NO-GEO & ARMADA */}
        <div className="lg:col-span-4 space-y-4 flex flex-col h-full">
          
          {/* NO-GEO PANEL */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden flex flex-col flex-1 max-h-[300px]">
            <div className="px-4 py-3 bg-rose-50/60 border-b border-rose-100 flex items-center justify-between flex-shrink-0">
              <span className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                NO-GEO ({tanpaKoordinatUrut.length})
              </span>
              <span className="text-[10px] text-rose-600/80 font-medium">Belum berkoordinat</span>
            </div>

            <div className="divide-y divide-slate-100 bg-white flex-1 overflow-y-auto custom-scrollbar">
              {tanpaKoordinatUrut.map((p) => (
                <button
                  key={p.id}
                  onClick={() => pilihPelanggan(p.id)}
                  className={`w-full text-left px-4 py-2.5 flex items-center justify-between gap-3 transition-colors ${
                    selectedId === p.id ? "bg-rose-50/70 border-l-4 border-rose-500" : "hover:bg-slate-50/80"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full border border-dashed border-rose-400 shrink-0" />
                    <div className="min-w-0">
                      <span className="block text-xs font-semibold text-slate-900 truncate">{p.nama}</span>
                      <span className="block font-mono text-[10px] text-rose-600 font-semibold truncate mt-0.5">
                        {p.kodePelanggan}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
              {tanpaKoordinatUrut.length === 0 && (
                <p className="p-4 text-xs text-slate-400 italic text-center">Semua terpetakan.</p>
              )}
            </div>
          </div>

          {/* ARMADA ONLINE PANEL */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden flex flex-col flex-1 max-h-[300px]">
            <div className="px-4 py-3 bg-amber-50/60 border-b border-amber-100 flex items-center justify-between flex-shrink-0">
              <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                GPS ONLINE ({totalOnline})
              </span>
              {lastPetugas && (
                <span className="text-[10px] text-amber-700/80 font-medium">{new Date(lastPetugas).toLocaleTimeString("id-ID")} WIB</span>
              )}
            </div>

            <div className="divide-y divide-slate-100 bg-white flex-1 overflow-y-auto custom-scrollbar p-2 space-y-3">
              {petugas.length === 0 && kendaraan.length === 0 && (
                <p className="p-4 text-xs text-slate-400 italic text-center">Tidak ada armada/petugas online.</p>
              )}
              
              {/* Petugas Tracker */}
              {petugas.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 pb-1 border-b border-slate-100">👤 PETUGAS</p>
                  {petugas.map((p) => {
                    const jabat = (p.jabatan || "").split(",").filter(Boolean);
                    const online = isOnline(p.updatedAt);
                    return (
                      <button
                        key={`dir-${p.petugasId}`}
                        onClick={() => setPusatPetugas([p.latitude, p.longitude])}
                        className="w-full flex items-center gap-2 text-left bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 rounded-xl px-3 py-2 transition group shadow-sm"
                      >
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            online ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
                          }`}
                        />
                        <span className="text-xs font-semibold text-slate-900 truncate flex-1">{p.nama}</span>
                        <span className="text-[10px] font-semibold text-slate-600 bg-slate-200/70 px-2 py-0.5 rounded-full uppercase shrink-0">
                          {jabat.map((j) => j.slice(0, 3)).join("·") || "PTG"}
                        </span>
                        <span
                          className={`text-[10px] font-semibold shrink-0 ${
                            online ? "text-emerald-700" : "text-slate-400"
                          }`}
                        >
                          {online ? "ONLINE" : `offline ${formatWaktuRelatifPeta(p.updatedAt)}`} ▶
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Kendaraan Armada */}
              {kendaraan.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 pb-1 border-b border-slate-100">🚛 KENDARAAN</p>
                  {kendaraan.map((k) => {
                    const online = isOnline(k.updatedAt);
                    return (
                      <button
                        key={`dir-k-${k.kendaraanId}`}
                        onClick={() => setPusatPetugas([k.latitude, k.longitude])}
                        className="w-full flex items-center gap-2 text-left bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 rounded-xl px-3 py-2 transition group shadow-sm"
                      >
                        <span className="text-sm shrink-0">{k.jenis === "dump_truck" ? "🚛" : "🛺"}</span>
                        <span className="text-xs font-semibold text-slate-900 truncate flex-1">
                          {k.nama}
                          {k.platNomor ? <span className="font-mono text-[10px] text-slate-500 ml-1">[{k.platNomor}]</span> : null}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-600 bg-slate-200/70 px-2 py-0.5 rounded-full uppercase shrink-0">
                          {k.jenis === "dump_truck" ? "DUMP" : k.jenis === "pickup" ? "PICKUP" : "GEROBAK"}
                        </span>
                        <span
                          className={`text-[10px] font-semibold shrink-0 ${
                            online ? "text-emerald-700" : "text-slate-400"
                          }`}
                        >
                          {online ? "ONLINE" : `offline ${formatWaktuRelatifPeta(k.updatedAt)}`} ▶
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
      )}
    </div>
  );
}
