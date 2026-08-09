"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { RT_RTRW_DEPOK } from "@/lib/zona-depok";
import { cariRtTerdekat, deteksiZona, formatJarak, jarakMeter, urutkanRute } from "@/lib/geo";
import { KOMPLAIN_LABEL, KOMPLAIN_WARNA } from "@/lib/komplain";
import type { KendaraanPeta, PetugasPeta, TransitPeta } from "./MapView";

// Map di-load client-side saja (leaflet butuh window/browser).
const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-asphalt-deep">
      <p className="stencil text-vest animate-pulse">MEMUAT PETA…</p>
    </div>
  ),
});

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
    kelurahan: string | null;
    kecamatan: string | null;
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
  wilayah: { id: number; nama: string; kelurahan: string | null; kecamatan: string | null }[];
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
  { key: "diproses", label: "Diproses" },
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

export default function PetaMap({ pelanggan, wilayah, rute, petugasAwal = [], kendaraanAwal = [], transitAwal = [] }: Props) {
  const [filterWilayah, setFilterWilayah] = useState("semua");
  const [filterStatus, setFilterStatus] = useState("semua");
  const [cari, setCari] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [ruteId, setRuteId] = useState<string>("semua");
  const [tampilkanCakupan, setTampilkanCakupan] = useState(false);
  const [tampilkanBatas, setTampilkanBatas] = useState(true);
  const [tampilkanRt, setTampilkanRt] = useState(true);
  const [tampilkanArmada, setTampilkanArmada] = useState(true);
  const [panelBuka, setPanelBuka] = useState(true);
  const [tab, setTab] = useState<TabKey>("pelanggan");
  const [bukaTanpaKoordinat, setBukaTanpaKoordinat] = useState(false);
  const [bukaPetaList, setBukaPetaList] = useState(true);
  const [bukaOnlineList, setBukaOnlineList] = useState(true);
  const [bukaLapakList, setBukaLapakList] = useState(true);
  const [urutkan, setUrutkan] = useState<"nama" | "kode">("kode");

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

  const peta = useMemo(
    () => pelanggan.filter((p) => p.latitude != null && p.longitude != null),
    [pelanggan]
  );

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
              const { rt } = cariRtTerdekat([-6.4005, 106.8242]);
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

  const pilihPelanggan = useCallback((id: number) => {
    setSelectedId(id);
    setSelectedKomplainId(null);
  }, []);
  const pilihKomplain = useCallback((id: number) => {
    setSelectedKomplainId(id);
    setSelectedId(null);
  }, []);

  return (
    <div className="space-y-4 pb-12">
      {/* ── BAGIAN ATAS: PETA FULL ── */}
      <div className="relative h-[65vh] min-h-[500px] rounded-xl overflow-hidden border border-[var(--neon-cyan)]/40 shadow-[0_0_25px_rgba(0,243,255,0.15)] z-0">
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
          tampilkanRt={tampilkanRt}
          ruteTerpilih={ruteTerpilih}
          invalidateKey={1}
          warnaStatus={WARNA_STATUS}
        />
        
        {/* Tombol ciutkan panel (TIDAK DIPAKAI LAGI) - diganti floating info ringan */}
        <div className="absolute top-4 right-4 z-[1000] pointer-events-none">
          <div className="bg-black/70 backdrop-blur-md border border-[var(--neon-cyan)]/50 px-3 py-2 font-mono text-[10px] text-white shadow-[0_0_10px_var(--neon-cyan)] rounded">
            {ruteAktif.length} rute · {ruteTerpilih ? ruteTerpilih.nama : "semua pelanggan"} ·{" "}
            {RT_RTRW_DEPOK.length} titik RT
          </div>
        </div>
      </div>

      {/* ── BAGIAN BAWAH: DASHBOARD ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-auto lg:h-[550px]">
        
        {/* KOLOM KIRI (3): HEADER & LAYER */}
        <div className="lg:col-span-3 space-y-4 flex flex-col h-full">
          {/* Info Header */}
          <div
            className="bg-black/70 border border-[var(--neon-cyan)]/40 p-4 relative overflow-hidden flex flex-col shadow-[0_0_15px_rgba(0,243,255,0.1)] flex-shrink-0"
            style={{ clipPath: "polygon(0 0, calc(100% - 15px) 0, 100% 15px, 100% 100%, 15px 100%, 0 calc(100% - 15px))" }}
          >
            <div className="absolute top-0 left-0 w-1.5 h-full bg-[var(--neon-cyan)] shadow-[0_0_10px_var(--neon-cyan)]"></div>
            <h1 className="font-display text-2xl tracking-wide text-white leading-none drop-shadow-[0_0_5px_rgba(255,255,255,0.5)] flex items-center gap-2">
              <svg className="w-5 h-5 text-[var(--neon-cyan)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              PETA DEPOK
            </h1>
            <p className="font-mono text-[10px] text-[var(--neon-cyan)]/80 mt-1">
              Sebaran {pelanggan.length} pelanggan · {totalBerkoordinat} berkoordinat · {wilayah.length} wilayah · {rute.length} rute · {kendaraan.length} armada
            </p>
            <div className="flex flex-col gap-1.5 font-mono text-[9px] text-[var(--neon-cyan)]/70 mt-3">
              <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 bg-[var(--neon-lime)] shadow-[0_0_5px_var(--neon-lime)]"></span>AKTIF</span>
              <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 bg-[var(--neon-yellow)] shadow-[0_0_5px_var(--neon-yellow)]"></span>CALON</span>
              <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 bg-gray-500"></span>NONAKTIF</span>
              <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 border border-dashed border-[var(--neon-pink)]"></span>NO-GEO</span>
            </div>
            
            {/* Footer Stats mini */}
            <div className="mt-4 pt-3 border-t border-[var(--neon-cyan)]/30 flex items-center gap-2 flex-wrap">
              <span className="px-2 py-1 bg-[var(--neon-lime)] text-black rounded font-bold shadow-[0_0_5px_var(--neon-lime)] text-[9px]">
                📍 {daftarPeta.length} DI PETA
              </span>
              {tanpaKoordinat.length > 0 && (
                <span className="px-2 py-1 bg-[var(--neon-yellow)] text-black rounded font-bold shadow-[0_0_5px_var(--neon-yellow)] text-[9px]">
                  ⚠️ {tanpaKoordinat.length} NO-GEO
                </span>
              )}
              {hitungBaru > 0 && (
                <span className="px-2 py-1 bg-[var(--neon-pink)] text-black rounded font-bold animate-pulse shadow-[0_0_5px_var(--neon-pink)] text-[9px]">
                  🔥 {hitungBaru} KOMPLAIN
                </span>
              )}
            </div>
          </div>

          {/* Layer toggle — styled chips */}
          <div className="bg-black/70 border border-[var(--neon-cyan)]/40 p-4 relative overflow-hidden flex-1 flex flex-col justify-center"
            style={{ clipPath: "polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)" }}>
            <span className="stencil text-[11px] text-[var(--neon-cyan)] block mb-3 tracking-widest border-b border-[var(--neon-cyan)]/20 pb-1">LAYER KONTROL</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5 flex-1">
              <button
                type="button"
                onClick={() => setTampilkanBatas((b) => !b)}
                className={`font-mono text-[10px] px-3 py-2 border rounded transition-colors text-left flex items-center gap-2 ${
                  tampilkanBatas
                    ? "border-[var(--neon-lime)] text-[var(--neon-lime)] bg-[var(--neon-lime)]/10 font-bold shadow-[0_0_5px_var(--neon-lime)]"
                    : "border-[var(--neon-cyan)]/50 text-[var(--neon-cyan)]/90 hover:text-[var(--neon-cyan)] hover:bg-white/5"
                }`}
              >
                <span>{tampilkanBatas ? "✓" : "○"}</span> <span>Batas Kecamatan</span>
              </button>
              <button
                type="button"
                onClick={() => setTampilkanRt((b) => !b)}
                className={`font-mono text-[10px] px-3 py-2 border rounded transition-colors text-left flex items-center gap-2 ${
                  tampilkanRt
                    ? "border-[var(--neon-lime)] text-[var(--neon-lime)] bg-[var(--neon-lime)]/10 font-bold shadow-[0_0_5px_var(--neon-lime)]"
                    : "border-[var(--neon-cyan)]/50 text-[var(--neon-cyan)]/90 hover:text-[var(--neon-cyan)] hover:bg-white/5"
                }`}
              >
                <span>{tampilkanRt ? "✓" : "○"}</span> <span>Titik Koordinat RT</span>
              </button>
              <button
                type="button"
                onClick={() => setTampilkanCakupan((b) => !b)}
                className={`font-mono text-[10px] px-3 py-2 border rounded transition-colors text-left flex items-center gap-2 ${
                  tampilkanCakupan
                    ? "border-[var(--neon-lime)] text-[var(--neon-lime)] bg-[var(--neon-lime)]/10 font-bold shadow-[0_0_5px_var(--neon-lime)]"
                    : "border-[var(--neon-cyan)]/50 text-[var(--neon-cyan)]/90 hover:text-[var(--neon-cyan)] hover:bg-white/5"
                }`}
              >
                <span>{tampilkanCakupan ? "✓" : "○"}</span> <span>Cakupan Radius 200m</span>
              </button>
              <button
                type="button"
                onClick={() => setTampilkanArmada((b) => !b)}
                className={`font-mono text-[10px] px-3 py-2 border rounded transition-colors text-left flex items-center gap-2 ${
                  tampilkanArmada
                    ? "border-[var(--neon-yellow)] text-[var(--neon-yellow)] bg-[var(--neon-yellow)]/10 font-bold shadow-[0_0_5px_var(--neon-yellow)]"
                    : "border-[var(--neon-cyan)]/50 text-[var(--neon-cyan)]/90 hover:text-[var(--neon-cyan)] hover:bg-white/5"
                }`}
              >
                <span>{tampilkanArmada ? "✓" : "○"}</span> <span>Pelacakan Armada</span>
              </button>
            </div>
          </div>
        </div>

        {/* KOLOM TENGAH (6): DIREKTORI */}
        <div className="lg:col-span-5 flex flex-col h-full">
          <div
            className="bg-black/70 border border-[var(--neon-cyan)]/40 flex flex-col h-full overflow-hidden relative shadow-[0_0_15px_rgba(0,243,255,0.1)]"
            style={{ clipPath: "polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)" }}
          >
            {/* Header + pencarian + filter */}
            <div className="p-4 pb-3 border-b border-[var(--neon-cyan)]/30 space-y-3 bg-black/60 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="stencil text-[var(--neon-cyan)] font-bold text-sm tracking-wider">DIREKTORI</p>
                  {(filterWilayah !== "semua" || filterStatus !== "semua" || cari) && (
                    <button
                      onClick={() => {
                        setFilterWilayah("semua");
                        setFilterStatus("semua");
                        setCari("");
                      }}
                      className="text-[9px] font-mono text-[var(--neon-yellow)] hover:underline ml-2"
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
                  className="w-full bg-black/50 border border-[var(--neon-cyan)]/50 focus:border-[var(--neon-cyan)] text-[var(--neon-cyan)] placeholder-[var(--neon-cyan)]/70 rounded px-3 py-2 pl-9 text-xs outline-none transition-colors"
                />
                <svg
                  className="w-4 h-4 text-[var(--neon-cyan)]/60 absolute left-3 top-2.5 pointer-events-none"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {cari && (
                  <button
                    onClick={() => setCari("")}
                    className="absolute right-3 top-2.5 text-xs text-[var(--neon-cyan)]/60 hover:text-[var(--neon-cyan)] font-mono"
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
                  className="bg-black/50 border border-[var(--neon-cyan)]/30 focus:border-[var(--neon-cyan)] text-[var(--neon-cyan)] rounded px-2 py-1.5 text-xs truncate outline-none cursor-pointer"
                >
                  <option value="semua">Semua Wilayah</option>
                  {wilayah.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.nama} — {w.kelurahan}
                    </option>
                  ))}
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-black/50 border border-[var(--neon-cyan)]/30 focus:border-[var(--neon-cyan)] text-[var(--neon-cyan)] rounded px-2 py-1.5 text-xs outline-none cursor-pointer"
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
              <div className="grid grid-cols-3 gap-1 pt-1">
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`stencil text-[11px] py-2 transition-colors relative font-bold ${
                      tab === t.key
                        ? "bg-[var(--neon-cyan)] text-black shadow-[0_0_10px_var(--neon-cyan)]"
                        : "text-[var(--neon-cyan)]/90 hover:text-[var(--neon-cyan)] hover:bg-[var(--neon-cyan)]/10"
                    }`}
                  >
                    {t.label.toUpperCase()}
                    {t.key === "pengaduan" && hitungBaru > 0 && (
                      <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[var(--neon-pink)] text-[10px] font-mono font-bold text-black flex items-center justify-center animate-bounce shadow-[0_0_10px_var(--neon-pink)] border border-black">
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
                  <div className="border-b border-[var(--neon-cyan)]/30 flex-shrink-0">
                    <button
                      onClick={() => setBukaLapakList((b) => !b)}
                      className="w-full px-4 py-3 bg-[var(--neon-cyan)]/5 flex items-center justify-between text-left hover:bg-[var(--neon-cyan)]/10 transition"
                    >
                      <span className="font-mono text-xs font-semibold text-[var(--neon-yellow)] flex items-center gap-2">
                        <span>{bukaLapakList ? "▼" : "▶"}</span>
                        <span>▲ TITIK LAPAK & TPS ({transit.filter((t) => t.aktif).length})</span>
                      </span>
                      <span className="text-[9px] font-mono text-black bg-[var(--neon-yellow)] px-1.5 py-0.5 rounded font-bold uppercase shadow-[0_0_5px_var(--neon-yellow)]">
                        LAPAK READY
                      </span>
                    </button>

                    {bukaLapakList && (
                      <div className="p-2 space-y-1 bg-black/60">
                        {transit.filter((t) => t.aktif).map((t) => (
                          <button
                            key={`dir-t-top-${t.id}`}
                            onClick={() => setPusatPetugas([t.latitude, t.longitude])}
                            className="w-full flex items-center gap-3 text-left bg-[var(--neon-cyan)]/5 hover:bg-[var(--neon-cyan)]/20 border border-[var(--neon-yellow)]/50 rounded px-3 py-2 transition group"
                          >
                            <span className="text-sm text-[var(--neon-yellow)] font-bold shrink-0">▲</span>
                            <div className="min-w-0 flex-1">
                              <span className="block text-xs text-white font-bold truncate">{t.nama}</span>
                              {t.alamat && <span className="block text-[9px] font-mono text-[var(--neon-cyan)]/70 truncate mt-0.5">{t.alamat}</span>}
                            </div>
                            <span className="text-[9px] font-mono text-black bg-[var(--neon-yellow)] px-1.5 py-0.5 rounded uppercase shrink-0 font-bold">
                              LAPAK
                            </span>
                            <span className="ml-auto text-xs font-mono text-[var(--neon-yellow)] shrink-0 group-hover:translate-x-1 transition-transform font-bold">
                              ▶
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Sorting & Stats Header */}
                <div className="px-4 py-2 bg-black/50 border-b border-[var(--neon-cyan)]/30 flex items-center justify-between font-mono text-[10px] text-[var(--neon-cyan)]/90 flex-shrink-0">
                  <span className="font-bold">TERTERAKAN: {daftarPetaUrut.length}</span>
                  <div className="flex items-center gap-1.5">
                    <span>SORT:</span>
                    <button
                      onClick={() => setUrutkan((s) => (s === "kode" ? "nama" : "kode"))}
                      className="text-[var(--neon-cyan)] hover:underline font-bold"
                    >
                      {urutkan === "kode" ? "KODE (A-Z)" : "NAMA (A-Z)"}
                    </button>
                  </div>
                </div>

                {/* Section 1: Terpetakan di Peta (Always Open) */}
                <div className="divide-y divide-[var(--neon-cyan)]/20 bg-black/40 flex-1">
                  {daftarPetaUrut.map((p) => {
                    const warna = WARNA_STATUS[p.status] ?? "#8b8f98";
                    const aktif = selectedId === p.id;
                    const zona = zonaPelanggan.get(p.id);
                    return (
                      <button
                        key={p.id}
                        onClick={() => pilihPelanggan(p.id)}
                        className={`w-full text-left px-4 py-3 flex items-center justify-between gap-3 transition-colors ${
                          aktif ? "bg-[var(--neon-cyan)]/20 border-l-2 border-[var(--neon-cyan)]" : "hover:bg-[var(--neon-cyan)]/10"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className="w-3 h-3 rotate-45 shrink-0 shadow-[0_0_5px_currentColor]"
                            style={{ background: warna, color: warna, border: `1px solid ${warna}` }}
                          />
                          <div className="min-w-0">
                            <span className="block text-xs font-bold text-white truncate">{p.nama}</span>
                            <span className="block font-mono text-[10px] text-[var(--neon-cyan)]/90 truncate mt-0.5">
                              <span className="text-[var(--neon-lime)] font-bold">{p.kodePelanggan}</span> · {zona ? zona.kelurahan : p.wilayah?.nama ?? "—"}
                            </span>
                          </div>
                        </div>
                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded shrink-0 uppercase font-bold text-black ${
                          p.status === "aktif" ? "bg-[var(--neon-lime)] shadow-[0_0_5px_var(--neon-lime)]" :
                          p.status === "calon" ? "bg-[var(--neon-yellow)] shadow-[0_0_5px_var(--neon-yellow)]" :
                          "bg-gray-500 text-white"
                        }`}>
                          {p.status}
                        </span>
                      </button>
                    );
                  })}
                  {daftarPetaUrut.length === 0 && (
                    <div className="p-6 text-center text-xs text-[var(--neon-cyan)]/50 space-y-1">
                      <p className="font-bold text-[var(--neon-cyan)]">Tidak ada pelanggan berkoordinat</p>
                      <p className="text-[10px]">Silakan ubah kata pencarian atau filter.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Konten tab: Pengaduan ── */}
            {tab === "pengaduan" && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="px-4 py-3 border-b border-[var(--neon-pink)]/30 flex items-center justify-between bg-black/40 flex-shrink-0">
                  <p className="stencil text-[var(--neon-pink)] flex items-center gap-2 font-bold text-sm shadow-[0_0_10px_var(--neon-pink)]">
                    <span className="w-2 h-2 rounded-full bg-[var(--neon-pink)] animate-blink inline-block shadow-[0_0_5px_var(--neon-pink)]" />
                    PENGADUAN LIVE
                  </p>
                  <button
                    onClick={() => {
                      setMuatKomplain(true);
                      ambilKomplain().finally(() => setMuatKomplain(false));
                    }}
                    className="font-mono text-[10px] text-[var(--neon-pink)]/70 hover:text-[var(--neon-pink)] transition-colors border border-[var(--neon-pink)]/30 px-3 py-1 rounded hover:bg-[var(--neon-pink)]/10 font-bold"
                  >
                    {muatKomplain ? "MEMUAT…" : "REFRESH"}
                  </button>
                </div>
                <div className="px-3 py-2 border-b border-[var(--neon-pink)]/30 flex flex-wrap gap-2 bg-black/30 flex-shrink-0">
                  {KOMPLAIN_TABS.map((t) => {
                    const n =
                      t.key === "semua"
                        ? komplainDenganPosisi.length
                        : komplainDenganPosisi.filter((k) => k.status === t.key).length;
                    return (
                      <button
                        key={t.key}
                        onClick={() => setKomplainTab(t.key)}
                        className={`font-mono text-[10px] px-2 py-1 border rounded transition-colors ${
                          komplainTab === t.key
                            ? "border-[var(--neon-pink)] text-[var(--neon-pink)] bg-[var(--neon-pink)]/10 font-bold shadow-[0_0_5px_var(--neon-pink)]"
                            : "border-[var(--neon-pink)]/50 text-[var(--neon-pink)]/90 hover:text-[var(--neon-pink)] hover:bg-[var(--neon-pink)]/5"
                        }`}
                      >
                        {t.label} ({n})
                      </button>
                    );
                  })}
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-[var(--neon-pink)]/20 custom-scrollbar">
                  {komplainFilter.map((k) => (
                    <button
                      key={k.id}
                      onClick={() => pilihKomplain(k.id)}
                      className={`w-full text-left px-4 py-3 flex items-start gap-4 transition-colors ${
                        selectedKomplainId === k.id ? "bg-[var(--neon-pink)]/15 border-l-2 border-[var(--neon-pink)]" : "hover:bg-[var(--neon-pink)]/10"
                      }`}
                    >
                      <span
                        className="w-3 h-3 rotate-45 shrink-0 mt-1"
                        style={{
                          background: KOMPLAIN_WARNA[k.status] ?? "var(--neon-pink)",
                          boxShadow: `0 0 8px ${KOMPLAIN_WARNA[k.status] ?? "var(--neon-pink)"}88`,
                        }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold text-white truncate">
                          {k.pelanggan.nama}{" "}
                          <span className="text-[var(--neon-pink)]/80 font-mono text-[10px] ml-1">
                            [{k.pelanggan.kodePelanggan}]
                          </span>
                        </span>
                        <span className="block font-mono text-[11px] text-gray-300 truncate mt-1">
                          {KOMPLAIN_LABEL[k.jenis] ?? k.jenis} · <span className="text-[var(--neon-pink)] font-bold">{k.status.toUpperCase()}</span>
                        </span>
                        <span className="block font-mono text-[10px] text-[var(--neon-cyan)] mt-1">
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
                    <p className="p-6 text-xs text-[var(--neon-pink)]/60 italic text-center">
                      Tidak ada pengaduan {komplainTab !== "semua" ? `dengan status ${komplainTab}` : ""}.
                    </p>
                  )}
                </div>
                {lastRefresh && (
                  <div className="px-4 py-2 border-t border-[var(--neon-pink)]/30 font-mono text-[9px] text-[var(--neon-pink)]/60 text-right bg-black/50">
                    UPDATE {new Date(lastRefresh).toLocaleTimeString("id-ID")} WIB (auto 15 dtk)
                  </div>
                )}
              </div>
            )}

            {/* ── Konten tab: Rute ── */}
            {tab === "rute" && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="px-4 py-3 border-b border-[var(--neon-cyan)]/30 space-y-2 bg-black/40 flex-shrink-0">
                  <p className="stencil text-[11px] text-[var(--neon-cyan)]/90 font-bold tracking-widest">PILIH RUTE PENGANGKUTAN</p>
                  <select
                    value={ruteId}
                    onChange={(e) => setRuteId(e.target.value)}
                    className="bg-black/50 border border-[var(--neon-cyan)]/30 focus:border-[var(--neon-cyan)] text-[var(--neon-cyan)] rounded px-3 py-2 w-full text-xs outline-none cursor-pointer"
                  >
                    <option value="semua">— Semua rute —</option>
                    {rute.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nama} · {r.hari} · {r.anggota.length} titik
                      </option>
                    ))}
                  </select>
                  {ruteTerpilih && (
                    <div className="font-mono text-[10px] text-[var(--neon-lime)] space-y-1 bg-[var(--neon-lime)]/5 border border-[var(--neon-lime)]/30 p-2.5 rounded shadow-[0_0_10px_rgba(57,255,20,0.1)] mt-2">
                      <p className="font-bold text-[12px]">
                        {ruteTerpilih.anggota.length} TITIK · {ruteTerpilih.hari}
                        {ruteTerpilih.jam ? ` · ${ruteTerpilih.jam}` : ""}
                      </p>
                      {ruteTerpilih.petugas && <p>PETUGAS: <span className="text-white font-bold">{ruteTerpilih.petugas}</span></p>}
                      {ruteUrutPanel.length >= 2 && (
                        <p className="text-[var(--neon-lime)]/70 pt-1 border-t border-[var(--neon-lime)]/20 mt-1">
                          EST. JARAK:{" "}
                          <span className="text-[var(--neon-yellow)] font-bold text-[12px] drop-shadow-[0_0_5px_var(--neon-yellow)]">
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
                <div className="flex-1 overflow-y-auto divide-y divide-[var(--neon-cyan)]/20 custom-scrollbar">
                  {ruteUrutPanel.map((x, i) => (
                    <div
                      key={x.anggota.id}
                      className="px-4 py-3 flex items-center gap-3 hover:bg-[var(--neon-cyan)]/10 transition"
                    >
                      <span className="w-7 h-7 rotate-45 border border-[var(--neon-cyan)]/60 flex items-center justify-center shrink-0 bg-[var(--neon-cyan)]/10 shadow-[0_0_5px_var(--neon-cyan)]">
                        <span className="-rotate-45 font-mono text-[11px] font-bold text-[var(--neon-cyan)]">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                      </span>
                      <span className="min-w-0 flex-1 pl-2">
                        <span className="block text-sm font-bold text-white truncate">{x.anggota.nama}</span>
                        <span className="block font-mono text-[10px] text-[var(--neon-cyan)]/70 mt-1">
                          {i === 0
                            ? <span className="text-[var(--neon-yellow)] font-bold">🏁 TITIK AWAL</span>
                            : `jarak dari titik sebelumnya: ${formatJarak(x.jarakM)}`}
                        </span>
                      </span>
                    </div>
                  ))}
                  {ruteUrutPanel.length === 0 && (
                    <p className="p-6 text-xs text-[var(--neon-cyan)]/60 italic text-center">
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
          <div
            className="bg-black/70 border border-[var(--neon-pink)]/50 relative overflow-hidden flex flex-col shadow-[0_0_15px_rgba(255,0,255,0.15)] flex-1 max-h-[300px]"
            style={{ clipPath: "polygon(0 0, calc(100% - 15px) 0, 100% 15px, 100% 100%, 15px 100%, 0 calc(100% - 15px))" }}
          >
            <div className="absolute top-0 right-0 w-1.5 h-full bg-[var(--neon-pink)] shadow-[0_0_10px_var(--neon-pink)]"></div>
            
            <div className="px-4 py-3 bg-[var(--neon-pink)]/10 border-b border-[var(--neon-pink)]/30 flex-shrink-0">
              <span className="font-mono text-xs font-bold text-[var(--neon-pink)] flex items-center justify-between drop-shadow-[0_0_5px_var(--neon-pink)]">
                <span className="flex items-center gap-2"><span className="animate-pulse">⚠️</span> NO-GEO ({tanpaKoordinatUrut.length})</span>
              </span>
              <p className="text-[9px] font-mono text-[var(--neon-pink)]/70 mt-1">Pelanggan belum berkoordinat</p>
            </div>

            <div className="divide-y divide-[var(--neon-pink)]/20 bg-black/40 flex-1 overflow-y-auto custom-scrollbar">
              {tanpaKoordinatUrut.map((p) => (
                <button
                  key={p.id}
                  onClick={() => pilihPelanggan(p.id)}
                  className={`w-full text-left px-4 py-2.5 flex items-center justify-between gap-3 transition-colors ${
                    selectedId === p.id ? "bg-[var(--neon-pink)]/20 border-l-2 border-[var(--neon-pink)]" : "hover:bg-[var(--neon-pink)]/10"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-3 h-3 border border-dashed border-[var(--neon-pink)]/70 shrink-0" />
                    <div className="min-w-0">
                      <span className="block text-xs font-bold text-white truncate">{p.nama}</span>
                      <span className="block font-mono text-[10px] text-[var(--neon-pink)]/90 truncate mt-0.5">
                        <span className="text-[var(--neon-pink)] font-bold">{p.kodePelanggan}</span>
                      </span>
                    </div>
                  </div>
                </button>
              ))}
              {tanpaKoordinatUrut.length === 0 && (
                <p className="p-4 text-xs text-[var(--neon-pink)]/50 italic text-center">Semua terpetakan.</p>
              )}
            </div>
          </div>

          {/* ARMADA ONLINE PANEL */}
          <div
            className="bg-black/70 border border-[var(--neon-yellow)]/50 relative overflow-hidden flex flex-col shadow-[0_0_15px_rgba(255,255,0,0.1)] flex-1 max-h-[300px]"
            style={{ clipPath: "polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)" }}
          >
            <div className="px-4 py-3 bg-[var(--neon-yellow)]/10 border-b border-[var(--neon-yellow)]/30 flex-shrink-0">
              <span className="font-mono text-xs font-bold text-[var(--neon-yellow)] flex items-center justify-between drop-shadow-[0_0_5px_var(--neon-yellow)]">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--neon-yellow)] animate-blink shadow-[0_0_5px_var(--neon-yellow)]" />
                  GPS ONLINE ({petugas.length + kendaraan.length})
                </span>
              </span>
              {lastPetugas && (
                <p className="text-[9px] font-mono text-[var(--neon-yellow)]/70 mt-1">UPDATE {new Date(lastPetugas).toLocaleTimeString("id-ID")} WIB</p>
              )}
            </div>

            <div className="divide-y divide-[var(--neon-yellow)]/20 bg-black/40 flex-1 overflow-y-auto custom-scrollbar p-2 space-y-3">
              {petugas.length === 0 && kendaraan.length === 0 && (
                <p className="p-4 text-xs text-[var(--neon-yellow)]/50 italic text-center">Tidak ada armada/petugas online.</p>
              )}
              
              {/* Petugas Tracker */}
              {petugas.length > 0 && (
                <div className="space-y-1.5">
                  <p className="font-mono text-[9px] text-[var(--neon-yellow)]/90 px-2 font-bold tracking-widest border-b border-[var(--neon-yellow)]/20 pb-1">👤 PETUGAS</p>
                  {petugas.map((p) => {
                    const jabat = (p.jabatan || "").split(",").filter(Boolean);
                    return (
                      <button
                        key={`dir-${p.petugasId}`}
                        onClick={() => setPusatPetugas([p.latitude, p.longitude])}
                        className="w-full flex items-center gap-2 text-left bg-[var(--neon-yellow)]/5 hover:bg-[var(--neon-yellow)]/20 border border-[var(--neon-yellow)]/30 rounded px-3 py-2 transition group"
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-[var(--neon-lime)] animate-blink shrink-0 shadow-[0_0_5px_var(--neon-lime)]" />
                        <span className="text-xs text-white font-bold truncate flex-1">{p.nama}</span>
                        <span className="text-[9px] font-mono text-black bg-[var(--neon-yellow)] px-1.5 py-0.5 rounded uppercase shrink-0 font-bold">
                          {jabat.map((j) => j.slice(0, 3)).join("·") || "PTG"}
                        </span>
                        <span className="text-[9px] font-mono text-[var(--neon-lime)] shrink-0 font-bold">
                          {formatWaktuRelatifPeta(p.updatedAt)} ▶
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Kendaraan Armada */}
              {kendaraan.length > 0 && (
                <div className="space-y-1.5">
                  <p className="font-mono text-[9px] text-[var(--neon-yellow)]/90 px-2 font-bold tracking-widest border-b border-[var(--neon-yellow)]/20 pb-1">🚛 KENDARAAN</p>
                  {kendaraan.map((k) => (
                    <button
                      key={`dir-k-${k.kendaraanId}`}
                      onClick={() => setPusatPetugas([k.latitude, k.longitude])}
                      className="w-full flex items-center gap-2 text-left bg-[var(--neon-yellow)]/5 hover:bg-[var(--neon-yellow)]/20 border border-[var(--neon-yellow)]/30 rounded px-3 py-2 transition group"
                    >
                      <span className="text-sm shrink-0">{k.jenis === "dump_truck" ? "🚛" : "🛺"}</span>
                      <span className="text-xs text-white font-bold truncate flex-1">
                        {k.nama}
                        {k.platNomor ? <span className="font-mono text-[9px] text-[var(--neon-yellow)]/80 ml-1">[{k.platNomor}]</span> : null}
                      </span>
                      <span className="text-[9px] font-mono text-black bg-[var(--neon-yellow)] px-1.5 py-0.5 rounded uppercase shrink-0 font-bold">
                        {k.jenis === "dump_truck" ? "DUMP" : k.jenis === "pickup" ? "PICKUP" : "GEROBAK"}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
