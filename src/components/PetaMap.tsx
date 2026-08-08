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
  const [panelBuka, setPanelBuka] = useState(true);
  const [tab, setTab] = useState<TabKey>("pelanggan");

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
    <div className="relative">
      <div
        className={`grid transition-[grid-template-columns] duration-300 ${
          panelBuka ? "lg:grid-cols-[320px_1fr]" : "lg:grid-cols-[0px_1fr]"
        } gap-4 h-[calc(100vh-220px)] min-h-[480px]`}
      >
        {/* Panel kiri */}
        <div className={`panel flex flex-col overflow-hidden ${panelBuka ? "" : "lg:invisible"}`}>
          {/* Header + pencarian + filter */}
          <div className="p-4 pb-3 border-b border-asphalt-line space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="stencil text-bone">DIREKTORI</p>
              <span className="font-mono text-[10px] text-vest">
                {totalBerkoordinat}/{pelanggan.length} PETA
              </span>
            </div>
            <input
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              placeholder="Cari nama / kode / alamat…"
              className="input !py-1.5 text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={filterWilayah}
                onChange={(e) => setFilterWilayah(e.target.value)}
                className="input !py-1.5 text-xs"
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
                className="input !py-1.5 text-xs"
              >
                <option value="semua">Semua Status</option>
                {Object.entries(STATUS_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            {/* Tab */}
            <div className="grid grid-cols-3 gap-1 pt-0.5">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`stencil text-[10px] py-1.5 border transition-colors relative ${
                    tab === t.key
                      ? "border-vest text-vest bg-vest/10"
                      : "border-asphalt-line text-bone-faint hover:text-bone hover:border-bone/30"
                  }`}
                >
                  {t.label.toUpperCase()}
                  {t.key === "pengaduan" && hitungBaru > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-danger text-[9px] font-mono font-bold text-asphalt-deep flex items-center justify-center">
                      {hitungBaru}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Layer toggle — chip ringkas */}
          <div className="px-4 py-2 border-b border-asphalt-line flex flex-wrap gap-x-3 gap-y-1.5">
            <label className="flex items-center gap-1.5 font-mono text-[10px] text-bone-faint cursor-pointer">
              <input
                type="checkbox"
                checked={tampilkanBatas}
                onChange={(e) => setTampilkanBatas(e.target.checked)}
                className="accent-[#b7e13c]"
              />
              Batas kec
            </label>
            <label className="flex items-center gap-1.5 font-mono text-[10px] text-bone-faint cursor-pointer">
              <input
                type="checkbox"
                checked={tampilkanRt}
                onChange={(e) => setTampilkanRt(e.target.checked)}
                className="accent-[#b7e13c]"
              />
              Titik RT
            </label>
            <label className="flex items-center gap-1.5 font-mono text-[10px] text-bone-faint cursor-pointer">
              <input
                type="checkbox"
                checked={tampilkanCakupan}
                onChange={(e) => setTampilkanCakupan(e.target.checked)}
                className="accent-[#b7e13c]"
              />
              Cakupan 200 m
            </label>
          </div>

          {/* ── Konten tab ── */}
          {tab === "pelanggan" && (
            <div className="flex-1 overflow-y-auto divide-y divide-asphalt-line">
              {daftarPeta.map((p) => {
                const warna = WARNA_STATUS[p.status] ?? "#8b8f98";
                const aktif = selectedId === p.id;
                const zona = zonaPelanggan.get(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => pilihPelanggan(p.id)}
                    className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors ${
                      aktif ? "bg-vest/10" : "hover:bg-asphalt-raised/60"
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rotate-45 shrink-0"
                      style={{ background: warna, border: `1px solid ${warna}` }}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm text-bone truncate">{p.nama}</span>
                      <span className="block font-mono text-[10px] text-bone-faint">
                        {p.kodePelanggan} · {zona ? zona.kelurahan : p.wilayah?.nama ?? "—"}
                      </span>
                    </span>
                  </button>
                );
              })}
              {tanpaKoordinat.map((p) => (
                <button
                  key={p.id}
                  onClick={() => pilihPelanggan(p.id)}
                  className={`w-full text-left px-4 py-2.5 flex items-center gap-3 opacity-60 transition-opacity hover:opacity-100 ${
                    selectedId === p.id ? "bg-vest/10" : ""
                  }`}
                >
                  <span className="w-2.5 h-2.5 border border-dashed border-bone/50 shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-sm text-bone truncate">{p.nama}</span>
                    <span className="block font-mono text-[10px] text-bone-faint">
                      {p.kodePelanggan} · tanpa koordinat
                    </span>
                  </span>
                </button>
              ))}
              {daftar.length === 0 && (
                <p className="p-4 text-xs text-bone-faint">Tidak ada hasil filter.</p>
              )}
            </div>
          )}

          {tab === "pengaduan" && (
            <>
              <div className="px-4 py-2 border-b border-asphalt-line flex items-center justify-between">
                <p className="stencil text-danger flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-danger animate-blink inline-block" />
                  LIVE
                </p>
                <button
                  onClick={() => {
                    setMuatKomplain(true);
                    ambilKomplain().finally(() => setMuatKomplain(false));
                  }}
                  className="font-mono text-[9px] text-bone-faint hover:text-vest transition-colors"
                  aria-label="Muat ulang pengaduan"
                >
                  {muatKomplain ? "MEMUAT…" : "REFRESH"}
                </button>
              </div>
              <div className="px-4 py-2 border-b border-asphalt-line flex flex-wrap gap-1.5">
                {KOMPLAIN_TABS.map((t) => {
                  const n =
                    t.key === "semua"
                      ? komplainDenganPosisi.length
                      : komplainDenganPosisi.filter((k) => k.status === t.key).length;
                  return (
                    <button
                      key={t.key}
                      onClick={() => setKomplainTab(t.key)}
                      className={`font-mono text-[10px] px-2 py-1 border transition-colors ${
                        komplainTab === t.key
                          ? "border-danger text-danger bg-danger/10"
                          : "border-asphalt-line text-bone-faint hover:text-bone"
                      }`}
                    >
                      {t.label} {n}
                    </button>
                  );
                })}
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-asphalt-line">
                {komplainFilter.map((k) => (
                  <button
                    key={k.id}
                    onClick={() => pilihKomplain(k.id)}
                    className={`w-full text-left px-4 py-2.5 flex items-start gap-3 transition-colors ${
                      selectedKomplainId === k.id ? "bg-danger/10" : "hover:bg-asphalt-raised/60"
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rotate-45 shrink-0 mt-0.5"
                      style={{
                        background: KOMPLAIN_WARNA[k.status] ?? "#ff5c5c",
                        boxShadow: `0 0 6px ${KOMPLAIN_WARNA[k.status] ?? "#ff5c5c"}88`,
                      }}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm text-bone truncate">
                        {k.pelanggan.nama}{" "}
                        <span className="text-bone-faint font-mono text-[10px]">
                          ({k.pelanggan.kodePelanggan})
                        </span>
                      </span>
                      <span className="block font-mono text-[10px] text-bone-faint truncate">
                        {KOMPLAIN_LABEL[k.jenis] ?? k.jenis} · {k.status.toUpperCase()}
                      </span>
                      <span className="block font-mono text-[9px] text-bone-dim">
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
                  <p className="p-4 text-xs text-bone-faint">
                    Tidak ada pengaduan
                    {komplainTab !== "semua" ? ` dengan status ${komplainTab}` : ""}.
                  </p>
                )}
              </div>
            </>
          )}

          {tab === "rute" && (
            <>
              <div className="px-4 py-2.5 border-b border-asphalt-line space-y-2">
                <p className="stencil text-[9px] text-bone-faint">PILIH RUTE PENGANGKUTAN</p>
                <select
                  value={ruteId}
                  onChange={(e) => setRuteId(e.target.value)}
                  className="input !py-1.5 text-xs"
                >
                  <option value="semua">— Semua rute —</option>
                  {rute.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nama} · {r.hari} · {r.anggota.length} titik
                    </option>
                  ))}
                </select>
                {ruteTerpilih && (
                  <div className="font-mono text-[10px] text-vest space-y-0.5">
                    <p>
                      {ruteTerpilih.anggota.length} TITIK · {ruteTerpilih.hari}
                      {ruteTerpilih.jam ? ` · ${ruteTerpilih.jam}` : ""}
                    </p>
                    {ruteTerpilih.petugas && <p>PETUGAS: {ruteTerpilih.petugas}</p>}
                    {ruteUrutPanel.length >= 2 && (
                      <p>
                        EST. JARAK:{" "}
                        {formatJarak(
                          ruteUrutPanel.reduce((a, x) => a + x.jarakM, 0)
                        )}{" "}
                        (urutan terdekat)
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-asphalt-line">
                {ruteUrutPanel.map((x, i) => (
                  <div
                    key={x.anggota.id}
                    className="px-4 py-2 flex items-center gap-3"
                  >
                    <span className="w-6 h-6 rotate-45 border border-vest/60 flex items-center justify-center shrink-0">
                      <span className="-rotate-45 font-mono text-[10px] font-bold text-vest">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-bone truncate">{x.anggota.nama}</span>
                      <span className="block font-mono text-[9px] text-bone-dim">
                        {i === 0
                          ? "TITIK AWAL"
                          : `jarak dari titik sebelumnya: ${formatJarak(x.jarakM)}`}
                      </span>
                    </span>
                  </div>
                ))}
                {ruteUrutPanel.length === 0 && (
                  <p className="p-4 text-xs text-bone-faint">
                    {ruteTerpilih
                      ? "Rute ini tidak punya titik berkoordinat."
                      : "Pilih rute untuk melihat urutan kunjungan."}
                  </p>
                )}
              </div>
            </>
          )}

          {/* Direktori petugas online + kendaraan */}
          {(petugas.length > 0 || kendaraan.length > 0 || transit.length > 0) && (
            <div className="border-t border-asphalt-line p-3 space-y-2 max-h-56 overflow-y-auto">
              <p className="stencil text-[10px] text-vest">PETUGAS & KENDARAAN ONLINE</p>
              {petugas.map((p) => {
                const jabat = (p.jabatan || "").split(",").filter(Boolean);
                return (
                  <button
                    key={`dir-${p.petugasId}`}
                    onClick={() => setPusatPetugas([p.latitude, p.longitude])}
                    className="w-full flex items-center gap-2 text-left hover:bg-asphalt-raised rounded px-2 py-1.5 transition group"
                  >
                    <span className="w-2 h-2 rounded-full bg-vest animate-blink shrink-0" />
                    <span className="text-xs text-bone font-medium truncate">🚛 {p.nama}</span>
                    <span className="text-[9px] font-mono text-bone-faint uppercase shrink-0">
                      {jabat.map((j) => j.slice(0, 3)).join("·") || "PETUGAS"}
                    </span>
                    <span className="ml-auto text-[9px] font-mono text-bone-faint shrink-0 group-hover:text-vest">
                      {formatWaktuRelatifPeta(p.updatedAt)} ▶
                    </span>
                  </button>
                );
              })}
              {kendaraan.map((k) => (
                <button
                  key={`dir-k-${k.kendaraanId}`}
                  onClick={() => setPusatPetugas([k.latitude, k.longitude])}
                  className="w-full flex items-center gap-2 text-left hover:bg-asphalt-raised rounded px-2 py-1.5 transition group"
                >
                  <span className="text-xs shrink-0">{k.jenis === "dump_truck" ? "🚛" : "🛺"}</span>
                  <span className="text-xs text-bone font-medium truncate">
                    {k.nama}
                    {k.platNomor ? <span className="font-mono text-[9px] text-bone-faint"> · {k.platNomor}</span> : null}
                  </span>
                  <span className="text-[9px] font-mono text-bone-faint uppercase shrink-0">
                    {k.jenis === "dump_truck" ? "DUMP" : k.jenis === "pickup" ? "PICKUP" : "GERODA"}
                  </span>
                  <span className="ml-auto text-[9px] font-mono text-bone-faint shrink-0 group-hover:text-vest">▶</span>
                </button>
              ))}
              {transit.filter((t) => t.aktif).map((t) => (
                <button
                  key={`dir-t-${t.id}`}
                  onClick={() => setPusatPetugas([t.latitude, t.longitude])}
                  className="w-full flex items-center gap-2 text-left hover:bg-asphalt-raised rounded px-2 py-1.5 transition group"
                >
                  <span className="text-xs text-amber shrink-0">▲</span>
                  <span className="text-xs text-bone font-medium truncate">{t.nama}</span>
                  <span className="text-[9px] font-mono text-bone-faint uppercase shrink-0">LAPAK</span>
                  <span className="ml-auto text-[9px] font-mono text-bone-faint shrink-0 group-hover:text-vest">▶</span>
                </button>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="p-3 border-t border-asphalt-line font-mono text-[10px] text-bone-faint">
            <span className="flex items-center gap-2">
              {hitungBaru > 0 ? (
                <span className="text-danger font-bold">{hitungBaru} PENGADUAN BARU</span>
              ) : (
                <span>PENGADUAN AMAN</span>
              )}
              <span className="text-bone-dim">
                · {daftarPeta.length} DI PETA · {tanpaKoordinat.length} TANPA KOORDINAT
              </span>
            </span>
            {tab === "pengaduan" && lastRefresh && (
              <span className="block mt-1 text-bone-dim">
                UPDATE {new Date(lastRefresh).toLocaleTimeString("id-ID")} WIB (auto 15 dtk)
              </span>
            )}
            {petugas.length > 0 && (
              <span className="block mt-1 text-bone-dim">
                🚛 {petugas.length} PETUGAS ONLINE{lastPetugas ? ` · UPDATE ${new Date(lastPetugas).toLocaleTimeString("id-ID")} WIB (auto 10 dtk)` : ""}
              </span>
            )}
          </div>
        </div>

        {/* Peta */}
        <div className="panel overflow-hidden relative chamfer">
          <MapView
            pelanggan={peta}
            komplain={komplainFilter}
            petugas={petugas}
            kendaraan={kendaraan}
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
            invalidateKey={panelBuka ? 1 : 2}
            warnaStatus={WARNA_STATUS}
          />
          {/* Tombol ciutkan panel */}
          <button
            onClick={() => setPanelBuka((b) => !b)}
            className="absolute top-3 right-3 z-[1000] stencil text-[10px] px-2.5 py-1.5 bg-asphalt-deep/90 border border-asphalt-line text-vest hover:bg-asphalt-raised transition-colors"
            aria-label={panelBuka ? "Ciutkan panel" : "Buka panel"}
          >
            {panelBuka ? "« PANEL" : "» PANEL"}
          </button>
          {!panelBuka && (
            <div className="absolute top-12 right-3 z-[1000] max-w-[240px] pointer-events-none">
              <div className="bg-asphalt-deep/80 border border-asphalt-line px-3 py-2 font-mono text-[10px] text-bone-faint">
                {ruteAktif.length} rute · {ruteTerpilih ? ruteTerpilih.nama : "semua pelanggan"} ·{" "}
                {RT_RTRW_DEPOK.length} titik RT RTRW
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
