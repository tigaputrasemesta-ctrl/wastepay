"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { formatDate, formatRupiah } from "@/lib/utils";
import { useToast } from "@/components/Toast";
import GeotagPhoto from "@/components/GeotagPhoto";
import ModalApprovalPelanggan from "@/components/ModalApprovalPelanggan";
import ModalStatusPelanggan from "@/components/ModalStatusPelanggan";
import ModalHapusPelanggan from "@/components/ModalHapusPelanggan";
import { Play, Pause } from "lucide-react";

type Kelurahan = { id: number; nama: string; kecamatan?: string | null };
type Paket = { id: number; nama: string; harga: number | null };

const KATEGORI_LIST = [
  { value: "level_1", label: "🏠 Level 1 — Volume Sangat Kecil" },
  { value: "level_2", label: "🏘️ Level 2 — Volume Kecil–Sedang" },
  { value: "level_3", label: "🏪 Level 3 — Volume Sedang" },
  { value: "level_4", label: "🏢 Level 4 — Volume Sedang–Besar" },
  { value: "level_5", label: "🏨 Level 5 — Volume Besar" },
  { value: "level_6", label: "🏭 Level 6 — Volume Sangat Besar" },
  { value: "level_7", label: "🏗️ Level 7 — Volume Ekstra Besar" },
  { value: "level_8", label: "🏬 Level 8 — Volume Komersial Besar" },
  { value: "level_9", label: "🏥 Level 9 — Volume Maksimal" },
  { value: "level_10", label: "🏙️ Level 10 — Volume Korporat" },
];

const STATUS_LIST = [
  { value: "aktif", label: "AKTIF" },
  { value: "calon", label: "CALON" },
  { value: "nonaktif", label: "NONAKTIF" },
  { value: "libur", label: "LIBUR" },
];
type Pelanggan = {
  id: number;
  kodePelanggan?: string;
  nama: string;
  noTelepon: string;
  kategori: string;
  penanggungjawab?: string;
  referal?: string;
  alamat: string;
  rtRw?: string;
  patokanLokasi?: string;
  fotoRumah?: string;
  latitude?: number | null;
  longitude?: number | null;
  koordinatSumber?: string;
  koordinatAkurasi?: number | null;
  customTarif?: number | null;
  status: string;
  catatan?: string | null;
  kelurahanId?: number | null;
  wilayahId?: number | null;
  paketId?: number | null;
  kelurahan?: Kelurahan | null;
  wilayah?: { id: number; nama: string; zonaId?: number | null; zona?: { id: number; nama: string; warna?: string | null } | null } | null;
  paket?: Paket | null;
  createdAt: string;
  _count?: {
    tagihan?: number;
    pembayaran?: number;
  };
};

type ZonaOption = { id: number; nama: string; warna?: string | null; kelurahanId: number };

function StickerBarcodeItem({ p, idx }: { p: Pelanggan; idx: number }) {
  const ref = useRef<SVGSVGElement | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    if (!ref.current || err || !p.kodePelanggan) return;
    let cancelled = false;
    (async () => {
      try {
        const mod = await import("jsbarcode");
        if (!cancelled && ref.current) {
          mod.default(ref.current, p.kodePelanggan!.replace(/-/g, ""), {
            format: "CODE128",
            width: 1.6,
            height: 34,
            displayValue: false,
            margin: 0,
            background: "#ffffff",
            lineColor: "#111111",
          });
        }
      } catch {
        if (!cancelled) setErr(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [p.kodePelanggan, err]);

  return (
    <div
      className="relative w-[92mm] h-[54mm] bg-white text-black p-2.5 flex flex-col overflow-hidden border border-slate-300 rounded-xl shadow-xs print:shadow-none print:border-black print:rounded-none select-none"
      style={{ breakInside: "avoid" }}
    >
      <div className="flex items-center justify-between border-b-2 border-black pb-1">
        <span className="font-extrabold uppercase text-[9px] tracking-wider">UPS HERU DEPOK</span>
        <span className="font-mono font-bold text-[8px] border border-black px-1">
          {p.kategori.replace("level_", "LVL ")}
        </span>
      </div>
      <div className="text-center mt-1.5">
        <span className="font-mono font-bold text-[22px] leading-none tracking-[0.15em]">
          {p.kodePelanggan}
        </span>
      </div>
      <div className="flex justify-center mt-1">
        {err ? (
          <span className="font-mono text-[12px] font-bold tracking-[0.35em]">{p.kodePelanggan}</span>
        ) : (
          <svg ref={ref} className="h-9 w-full max-w-[70mm]" />
        )}
      </div>
      <div className="mt-1 border-t border-black pt-1">
        <p className="font-bold text-[11px] leading-tight uppercase truncate">{p.nama}</p>
        <p className="font-mono text-[8px] leading-tight text-black/80 line-clamp-2">{p.alamat}</p>
        <p className="font-mono text-[8px] mt-0.5">
          {p.rtRw ? `${p.rtRw} · ` : ""}{p.kelurahan?.nama ?? ""}{p.noTelepon ? ` · ${p.noTelepon}` : ""}
        </p>
      </div>
      <span className="absolute bottom-1 right-2 font-mono text-[6px] text-black/40">#{idx + 1}</span>
    </div>
  );
}

export default function PelangganPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500 font-medium">Memuat Data Pelanggan...</div>}>
      <PelangganContent />
    </Suspense>
  );
}

function PelangganContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const statusParam = searchParams.get("status");
  const initialMainTab = tabParam === "sticker" ? "sticker" : (statusParam === "calon" || tabParam === "approval") ? "approval" : "data";

  const { showToast } = useToast();
  const [mainTab, setMainTab] = useState<"data" | "approval" | "sticker">(initialMainTab);
  const [selectedStickers, setSelectedStickers] = useState<Set<number>>(new Set());

  const [pelanggan, setPelanggan] = useState<Pelanggan[]>([]);
  const [kelurahanList, setKelurahanList] = useState<Kelurahan[]>([]);
  const [zonaList, setZonaList] = useState<ZonaOption[]>([]);
  const [kategoriTarifList, setKategoriTarifList] = useState<{kategori: string, tarif: number}[]>([]);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [filterKelurahan, setFilterKelurahan] = useState("");
  const [filterZona, setFilterZona] = useState("");
  const [filterStatus, setFilterStatus] = useState(initialMainTab === "approval" ? "calon" : "");
  const [filterKategori, setFilterKategori] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Pelanggan | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Pelanggan | null>(null);
  const [statusTarget, setStatusTarget] = useState<{
    pelanggan: Pelanggan;
    initialTargetStatus?: "aktif" | "nonaktif" | "libur";
  } | null>(null);
  const [statusCounts, setStatusCounts] = useState({
    total: 0,
    aktif: 0,
    calon: 0,
    nonaktif: 0,
    libur: 0,
  });
  const [approvalTarget, setApprovalTarget] = useState<Pelanggan | null>(null);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 20;
  const [form, setForm] = useState({
    nama: "",
    noTelepon: "",
    kategori: "level_1",
    customTarif: "",
    alamat: "",
    rtRw: "",
    patokanLokasi: "",
    penanggungjawab: "",
    referal: "",
    kelurahanId: "",
    zonaId: "",
    fotoRumah: "",
    latitude: "",
    longitude: "",
    koordinatSumber: "",
    koordinatAkurasi: "",
    status: "aktif",
    catatan: "",
    createdAt: "", // Untuk Ubah Tanggal Langganan
  });

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterKelurahan) params.set("kelurahanId", filterKelurahan);
      if (filterZona) params.set("zonaId", filterZona);
      if (filterStatus) params.set("status", filterStatus);
      if (filterKategori) params.set("kategori", filterKategori);
      const qs = params.toString();

      const [pelangganRes, kelurahanRes, zonaRes, optionsRes] = await Promise.all([
        fetch(`/api/pelanggan${qs ? `?${qs}` : ""}`),
        fetch("/api/kelurahan"),
        fetch("/api/zona"),
        fetch("/api/publik/daftar-options"),
      ]);
      const pelangganData = await pelangganRes.json();
      const kelurahanData = await kelurahanRes.json();
      const zonaData = await zonaRes.json();
      const optionsData = await optionsRes.json();

      if (optionsData?.kategoriTarif) {
        setKategoriTarifList(optionsData.kategoriTarif);
      }

      const cTotal = parseInt(pelangganRes.headers.get("X-Count-Total") || "0");
      const cAktif = parseInt(pelangganRes.headers.get("X-Count-Aktif") || "0");
      const cCalon = parseInt(pelangganRes.headers.get("X-Count-Calon") || "0");
      const cNonaktif = parseInt(pelangganRes.headers.get("X-Count-Nonaktif") || "0");
      const cLibur = parseInt(pelangganRes.headers.get("X-Count-Libur") || "0");

      if (cTotal > 0 || cAktif > 0 || cCalon > 0 || cNonaktif > 0 || cLibur > 0) {
        setStatusCounts({
          total: cTotal,
          aktif: cAktif,
          calon: cCalon,
          nonaktif: cNonaktif,
          libur: cLibur,
        });
      } else if (Array.isArray(pelangganData)) {
        setStatusCounts({
          total: pelangganData.length,
          aktif: pelangganData.filter((p: Pelanggan) => p.status === "aktif").length,
          calon: pelangganData.filter((p: Pelanggan) => p.status === "calon").length,
          nonaktif: pelangganData.filter((p: Pelanggan) => p.status === "nonaktif").length,
          libur: pelangganData.filter((p: Pelanggan) => p.status === "libur").length,
        });
      }

      setPelanggan(Array.isArray(pelangganData) ? pelangganData : []);
      setKelurahanList(Array.isArray(kelurahanData) ? kelurahanData : []);
      setZonaList(Array.isArray(zonaData) ? zonaData : []);
    } catch (error) {
      showToast("Gagal memuat data", "error");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [search, filterKelurahan, filterZona, filterStatus, filterKategori, showToast]);

  // Debounced search
  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput);
      setPage(1); // Reset page on new search
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    (async () => { await fetchData(); })();
  }, [fetchData]);

  function downloadCSV() {
    const headers = [
      "Kode",
      "Nama Pelanggan",
      "No Telepon",
      "Kategori",
      "Alamat",
      "Kelurahan",
      "Zona",
      "Status",
      "Tanggal Daftar",
      "Nominal Tarif (Rp)"
    ];
    
    const rows = pelanggan.map(p => {
      const namaWilayah = p.wilayah?.zona?.nama || p.wilayah?.nama || "-";
      const namaKelurahan = p.kelurahan?.nama || "-";
      let nominal = 0;
      if (p.customTarif) nominal = p.customTarif;
      else if (p.paket) nominal = p.paket.harga || 0;
      else {
        const kt = kategoriTarifList.find(x => x.kategori === p.kategori);
        if (kt) nominal = kt.tarif;
      }

      return [
        p.kodePelanggan || "-",
        `"${p.nama.replace(/"/g, '""')}"`,
        p.noTelepon ? `'${p.noTelepon}` : "-",
        p.kategori,
        `"${p.alamat.replace(/"/g, '""')}"`,
        `"${namaKelurahan}"`,
        `"${namaWilayah}"`,
        p.status,
        p.createdAt ? new Date(p.createdAt).toLocaleDateString("id-ID") : "-",
        nominal
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `data_pelanggan_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function openCreate() {
    setEditing(null);
    setForm({
      nama: "",
      noTelepon: "",
      kategori: "level_1",
      customTarif: "",
      alamat: "",
      rtRw: "",
      patokanLokasi: "",
      penanggungjawab: "",
      referal: "",
      kelurahanId: "",
      zonaId: "",
      fotoRumah: "",
      latitude: "",
      longitude: "",
      koordinatSumber: "",
      koordinatAkurasi: "",
      status: "aktif",
      catatan: "",
      createdAt: "",
    });
    setShowForm(true);
  }

  function openEdit(p: Pelanggan) {
    setEditing(p);
    setForm({
      nama: p.nama,
      noTelepon: p.noTelepon,
      kategori: p.kategori || "level_1",
      customTarif: p.customTarif ? p.customTarif.toString() : "",
      alamat: p.alamat,
      rtRw: p.rtRw || "",
      patokanLokasi: p.patokanLokasi || "",
      penanggungjawab: p.penanggungjawab || "",
      referal: p.referal || "",
      kelurahanId: p.kelurahan?.id ? p.kelurahan.id.toString() : (p.kelurahanId ? p.kelurahanId.toString() : ""),
      zonaId: p.wilayah?.zonaId ? p.wilayah.zonaId.toString() : (p.wilayah?.zona?.id ? p.wilayah.zona.id.toString() : ""),
      fotoRumah: p.fotoRumah || "",
      latitude: p.latitude ? p.latitude.toString() : "",
      longitude: p.longitude ? p.longitude.toString() : "",
      koordinatSumber: p.koordinatSumber || "",
      koordinatAkurasi: p.koordinatAkurasi ? String(p.koordinatAkurasi) : "",
      status: p.status,
      catatan: p.catatan || "",
      createdAt: p.createdAt ? new Date(p.createdAt).toISOString().slice(0, 16) : "",
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const url = editing ? `/api/pelanggan/${editing.id}` : "/api/pelanggan";
    const method = editing ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      setShowForm(false);
      showToast(editing ? "Pelanggan berhasil diperbarui" : "Pelanggan berhasil ditambahkan");
      fetchData();
    } else {
      const data = await res.json();
      showToast(data.error || "Gagal menyimpan", "error");
    }
  }



  function resetFilters() {
    setFilterKelurahan("");
    setFilterZona("");
    setFilterStatus("");
    setFilterKategori("");
    setPage(1);
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 border border-slate-200/80 w-48" />
          <div className="h-10 bg-gray-200 border border-slate-200/80" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-200 border border-slate-200/80" />
          ))}
        </div>
      </div>
    );
  }

  const calonList = pelanggan.filter((p) => p.status === "calon");
  const aktifList = pelanggan.filter((p) => p.status === "aktif");
  const nonaktifList = pelanggan.filter((p) => p.status === "nonaktif");
  const liburList = pelanggan.filter((p) => p.status === "libur");

  const calonCount = statusCounts.calon || calonList.length;
  const aktifCount = statusCounts.aktif || aktifList.length;
  const nonaktifCount = statusCounts.nonaktif || nonaktifList.length;
  const liburCount = statusCounts.libur || liburList.length;
  const totalCount = statusCounts.total || pelanggan.length;

  const paginatedPelanggan = pelanggan.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  const totalPages = Math.ceil(pelanggan.length / ITEMS_PER_PAGE);

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-none mb-1">
            Pusat Pengelolaan Pelanggan
          </h1>
          <p className="text-xs font-medium text-slate-500 mt-1">
            Kelola data pelanggan aktif, verifikasi survei calon pendaftar, dan cetak stiker barcode
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <Link
            href="/registrasi"
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <span>📝 Formulir Lengkap</span>
          </Link>
          <button
            onClick={downloadCSV}
            className="px-3.5 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Data
          </button>
          <button
            onClick={openCreate}
            className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-2 active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Tambah Pelanggan
          </button>
        </div>
      </div>

      {/* Main Module Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => { setMainTab("data"); setFilterStatus(""); setPage(1); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shrink-0 ${
            mainTab === "data"
              ? "bg-emerald-700 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <span>👥 Data Pelanggan</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${mainTab === "data" ? "bg-emerald-800 text-white" : "bg-slate-200 text-slate-700"}`}>
            {pelanggan.length}
          </span>
        </button>

        <button
          onClick={() => { setMainTab("approval"); setFilterStatus("calon"); setPage(1); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shrink-0 ${
            mainTab === "approval"
              ? "bg-amber-600 text-white shadow-sm"
              : "text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200"
          }`}
        >
          <span>📋 Survei & Approval Calon</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${mainTab === "approval" ? "bg-amber-800 text-white" : "bg-amber-200 text-amber-900"}`}>
            {calonList.length}
          </span>
        </button>

        <button
          onClick={() => { setMainTab("sticker"); setPage(1); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shrink-0 ${
            mainTab === "sticker"
              ? "bg-emerald-700 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <span>🏷️ Cetak Stiker Barcode</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${mainTab === "sticker" ? "bg-emerald-800 text-white" : "bg-slate-200 text-slate-700"}`}>
            {selectedStickers.size > 0 ? `${selectedStickers.size} dipilih` : "Cetak"}
          </span>
        </button>
      </div>

      {mainTab === "sticker" ? (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <button
                type="button"
                onClick={() => {
                  const allIds = new Set(pelanggan.map((p) => p.id));
                  setSelectedStickers(allIds);
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition"
              >
                Pilih Semua ({pelanggan.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedStickers(new Set())}
                className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-xl transition"
              >
                Bersihkan Pilihan
              </button>
              <span className="text-slate-500 font-medium">
                {selectedStickers.size} dari {pelanggan.length} pelanggan dipilih untuk dicetak
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                if (selectedStickers.size === 0) {
                  showToast("Pilih minimal satu pelanggan untuk dicetak", "warning");
                  return;
                }
                window.print();
              }}
              disabled={selectedStickers.size === 0}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5 self-stretch sm:self-auto justify-center"
            >
              <span>🖨️ Cetak Stiker ({selectedStickers.size})</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 print:grid-cols-2 print:gap-2">
            {pelanggan.map((p, idx) => {
              const isChecked = selectedStickers.has(p.id);
              return (
                <div
                  key={p.id}
                  onClick={() => {
                    const next = new Set(selectedStickers);
                    if (next.has(p.id)) next.delete(p.id);
                    else next.add(p.id);
                    setSelectedStickers(next);
                  }}
                  className={`p-3 rounded-2xl border-2 transition-all cursor-pointer select-none print:border-0 print:p-0 ${
                    isChecked
                      ? "border-emerald-600 bg-emerald-50/20 shadow-xs"
                      : "border-slate-200 bg-white hover:border-slate-300 opacity-60 print:hidden"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2 print:hidden">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="rounded text-emerald-700 focus:ring-emerald-500"
                      />
                      <span>Pilih untuk Cetak</span>
                    </label>
                    <span className="text-[10px] font-mono text-slate-400">#{idx + 1}</span>
                  </div>
                  <StickerBarcodeItem p={p} idx={idx} />
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <>
          {/* Alert Banner Approval Pelanggan Baru */}
      {calonList.length > 0 && (
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center text-lg font-black shrink-0 shadow-xs">
              🔔
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-sm">
                  {calonList.length} Pendaftar Baru Menunggu Approval Admin Pusat
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900">
                  Perlu Ditinjau
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Periksa hasil survei lapangan, tetapkan <strong>Zona Area Pickup</strong>, dan aktifkan layanan pengangkutan warga.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                setFilterStatus(filterStatus === "calon" ? "" : "calon");
                setPage(1);
              }}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5"
            >
              <span>{filterStatus === "calon" ? "Lihat Semua Pelanggan" : "Tampilkan Menunggu Approval"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Quick Status Tabs */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 text-xs">
        <button
          type="button"
          onClick={() => { setFilterStatus(""); setPage(1); }}
          className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 ${
            filterStatus === ""
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          Semua ({totalCount})
        </button>
        <button
          type="button"
          onClick={() => { setFilterStatus("calon"); setPage(1); }}
          className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 flex items-center gap-1.5 ${
            filterStatus === "calon"
              ? "bg-amber-600 text-white shadow-xs"
              : "bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100"
          }`}
        >
          <span>Menunggu Approval</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
            filterStatus === "calon" ? "bg-amber-800 text-amber-100" : "bg-amber-200 text-amber-900"
          }`}>
            {calonCount}
          </span>
        </button>
        <button
          type="button"
          onClick={() => { setFilterStatus("aktif"); setPage(1); }}
          className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 flex items-center gap-1.5 ${
            filterStatus === "aktif"
              ? "bg-emerald-700 text-white shadow-xs"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          <span>Aktif</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
            filterStatus === "aktif" ? "bg-emerald-800 text-white" : "bg-slate-100 text-slate-700"
          }`}>
            {aktifCount}
          </span>
        </button>
        <button
          type="button"
          onClick={() => { setFilterStatus("nonaktif"); setPage(1); }}
          className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 flex items-center gap-1.5 ${
            filterStatus === "nonaktif"
              ? "bg-slate-800 text-white shadow-xs"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          <span>Nonaktif</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
            filterStatus === "nonaktif" ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700"
          }`}>
            {nonaktifCount}
          </span>
        </button>
        {liburCount > 0 && (
          <button
            type="button"
            onClick={() => { setFilterStatus("libur"); setPage(1); }}
            className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 flex items-center gap-1.5 ${
              filterStatus === "libur"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <span>Libur</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
              filterStatus === "libur" ? "bg-amber-800 text-white" : "bg-amber-100 text-amber-900"
            }`}>
              {liburCount}
            </span>
          </button>
        )}
      </div>

      {/* Search + Filter mode */}
      <div className="mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Cari nama, alamat, atau no telepon..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium text-slate-800 placeholder:text-slate-400 transition-all shadow-sm"
            />
            {searchInput && (
              <button
                onClick={() => { setSearchInput(""); setSearch(""); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-rose-500 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilter((v) => !v)}
            className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl font-semibold text-xs transition-all shadow-sm ${
              showFilter || [filterKelurahan, filterStatus, filterKategori].filter(Boolean).length > 0
                ? "bg-slate-900 border-slate-900 text-white"
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filter
            {[filterKelurahan, filterZona, filterStatus, filterKategori].filter(Boolean).length > 0 && (
              <span className="bg-emerald-700 text-white px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                {[filterKelurahan, filterZona, filterStatus, filterKategori].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        {/* Filter panel */}
        {showFilter && (
          <div className="mt-3 p-4 bg-slate-50 border border-slate-200/80 rounded-2xl shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Kelurahan</label>
                <select
                  value={filterKelurahan}
                  onChange={(e) => { setFilterKelurahan(e.target.value); setFilterZona(""); setPage(1); }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs font-medium text-slate-800"
                >
                  <option value="">Semua Kelurahan</option>
                  {kelurahanList.map((k) => (
                    <option key={k.id} value={k.id}>{k.nama}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Zona Area Pickup</label>
                <select
                  value={filterZona}
                  onChange={(e) => { setFilterZona(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs font-medium text-slate-800"
                >
                  <option value="">Semua Zona</option>
                  {zonaList
                    .filter((z) => !filterKelurahan || z.kelurahanId === Number(filterKelurahan))
                    .map((z) => (
                      <option key={z.id} value={z.id}>{z.nama}</option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs font-medium text-slate-800"
                >
                  <option value="">Semua Status</option>
                  {STATUS_LIST.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Kategori</label>
                <select
                  value={filterKategori}
                  onChange={(e) => { setFilterKategori(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs font-medium text-slate-800"
                >
                  <option value="">Semua Kategori</option>
                  {KATEGORI_LIST.map((k) => (
                    <option key={k.value} value={k.value}>{k.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-200">
              <span className="text-xs font-medium text-slate-500">
                {pelanggan.length} pelanggan tampil
              </span>
              <button
                onClick={resetFilters}
                disabled={[filterKelurahan, filterZona, filterStatus, filterKategori].filter(Boolean).length === 0}
                className="px-3.5 py-1.5 bg-white border border-slate-200 rounded-xl font-semibold text-xs text-slate-600 hover:text-rose-600 hover:border-rose-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Reset Filter
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-x-auto shadow-sm">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="bg-slate-50 text-slate-600 font-bold text-xs border-b border-slate-200">
              <th className="px-4 py-3.5 whitespace-nowrap">Kode</th>
              <th className="px-4 py-3.5 whitespace-nowrap">Nama Pelanggan</th>
              <th className="px-4 py-3.5 whitespace-nowrap">No. Telepon</th>
              <th className="px-4 py-3.5 whitespace-nowrap">Alamat & Wilayah</th>
              <th className="px-4 py-3.5 whitespace-nowrap">Tarif</th>
              <th className="px-4 py-3.5 whitespace-nowrap">Status</th>
              <th className="px-4 py-3.5 whitespace-nowrap">Tanggal</th>
              <th className="px-4 py-3.5 text-center whitespace-nowrap">Aksi</th>
            </tr>
          </thead>
          <tbody className="text-slate-800 divide-y divide-slate-100">
            {paginatedPelanggan.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-slate-600 font-medium text-xs">
                  Belum ada data pelanggan
                </td>
              </tr>
            ) : (
              paginatedPelanggan.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="inline-block text-xs font-mono font-bold text-slate-800 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-lg">
                      {p.kodePelanggan}
                    </span>
                  </td>
                  <td className="px-4 py-3 min-w-[200px]">
                    <div className="flex items-center gap-3">
                      {p.fotoRumah ? (
                        <Image
                          src={p.fotoRumah}
                          alt={`Foto ${p.nama}`}
                          unoptimized
                          width={36}
                          height={36}
                          className="w-9 h-9 object-cover rounded-xl border border-slate-200 shrink-0 shadow-sm"
                        />
                      ) : (
                        <div className="w-9 h-9 border border-slate-200 bg-slate-100 rounded-xl shrink-0 flex items-center justify-center text-slate-600 text-xs font-bold">
                          ?
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-slate-900 text-sm">
                          {p.nama}
                        </div>
                        {p.referal && (
                          <div className="mt-0.5">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200" title={`Referral: ${p.referal}`}>
                              <span aria-hidden="true">🤝</span>
                              <span className="truncate max-w-[130px]">{p.referal}</span>
                            </span>
                          </div>
                        )}
                        {p.latitude && p.longitude && (
                          <a
                            href={`https://www.google.com/maps?q=${p.latitude},${p.longitude}`}
                            target="_blank"
                            className="text-[11px] text-emerald-700 font-medium hover:underline flex items-center gap-0.5 mt-0.5"
                          >
                            📍 {p.latitude.toFixed(5)}, {p.longitude.toFixed(5)}
                          </a>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700 font-medium text-xs whitespace-nowrap">{p.noTelepon}</td>
                  <td className="px-4 py-3 text-slate-700 max-w-[240px]">
                    <div className="text-xs truncate font-medium text-slate-800" title={p.alamat}>{p.alamat}</div>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <div className="inline-flex items-center px-2 py-0.5 bg-slate-100 rounded-md text-[10px] font-semibold text-slate-600">
                        {p.kelurahan?.nama ?? "—"}
                      </div>
                      {p.wilayah?.zona ? (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-200/80 rounded-md text-[10px] font-bold text-emerald-800">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: p.wilayah.zona.warna || "#10b981" }}
                          />
                          <span className="truncate max-w-[120px]">{p.wilayah.zona.nama}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-amber-600 font-semibold">
                          Belum ada zona
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex flex-col gap-1 items-start">
                      {p.customTarif ? (
                        <>
                          <span className="text-xs font-bold text-amber-700">{formatRupiah(p.customTarif)}</span>
                          <span className="inline-flex items-center px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[9px] font-bold">
                            Tarif Kustom
                          </span>
                        </>
                      ) : p.paket ? (
                        <>
                          <span className="text-xs font-bold text-purple-700">{formatRupiah(p.paket.harga || 0)}</span>
                          <span className="inline-flex items-center px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-full text-[9px] font-bold">
                            {p.paket.nama.split(" ").slice(0, 2).join(" ")}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-xs font-bold text-blue-700">
                            {formatRupiah(kategoriTarifList.find(x => x.kategori === p.kategori)?.tarif || 0)}
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-[9px] font-bold">
                            {p.kategori.replace('_', ' ')}
                          </span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {p.status === "calon" ? (
                      <div className="flex flex-col gap-1 items-start">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          Menunggu Approval
                        </span>
                        {p.fotoRumah && p.latitude ? (
                          <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-0.5">
                            <span>✓</span> Disurvei
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium">
                            ⏳ Belum Survei
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-0.5 items-start">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          p.status === "aktif" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                          p.status === "libur" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                          "bg-slate-100 text-slate-700 border border-slate-300"
                        }`}>
                          {p.status === "aktif" ? "Aktif" : p.status === "nonaktif" ? "Nonaktif" : p.status === "libur" ? "Libur" : p.status}
                        </span>
                        {p.status === "nonaktif" && (
                          <span className="text-[9px] text-slate-400 font-medium">
                            Tagihan/pickup jeda
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs font-medium whitespace-nowrap">
                    {formatDate(p.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5">
                      {p.status === "calon" ? (
                        <button
                          type="button"
                          onClick={() => setApprovalTarget(p)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white text-xs font-bold shadow-xs transition"
                          title="Approval Admin Pusat &amp; Tetapkan Zona Pickup"
                        >
                          <span>🛡️ Approval &amp; Zona</span>
                        </button>
                      ) : p.status === "aktif" ? (
                        <button
                          type="button"
                          onClick={() => setStatusTarget({ pelanggan: p, initialTargetStatus: "nonaktif" })}
                          className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-100 hover:text-slate-800 text-slate-500 transition-colors shadow-xs"
                          title="Nonaktifkan Layanan (Disarankan jika berhenti langganan)"
                        >
                          <Pause className="w-3.5 h-3.5 fill-current" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setStatusTarget({ pelanggan: p, initialTargetStatus: "aktif" })}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold transition-colors shadow-xs"
                          title="Aktifkan Kembali Layanan"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Aktifkan</span>
                        </button>
                      )}
                      <Link
                        href={`/pelanggan/${p.id}`}
                        className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 text-slate-600 transition-colors shadow-xs"
                        title="Detail"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </Link>
                      <button
                        type="button"
                        onClick={() => openEdit(p)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 text-slate-600 transition-colors shadow-xs"
                        title="Edit Data"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(p)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-slate-600 transition-colors shadow-xs"
                        title="Hapus atau Nonaktifkan"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
            <div>
              Halaman {page} dari {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 disabled:opacity-40 hover:bg-slate-100 transition-colors shadow-sm"
              >
                Prev
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 disabled:opacity-40 hover:bg-slate-100 transition-colors shadow-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
        </>
      )}

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200/80 shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4.5 bg-slate-900 text-white">
              <h2 className="font-bold text-base tracking-wide">
                {editing ? "Edit Pelanggan" : "Tambah Pelanggan Baru"}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Nama Pelanggan *</label>
                  <input
                    type="text"
                    value={form.nama}
                    onChange={(e) => setForm({ ...form, nama: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium text-slate-900 placeholder:text-slate-400"
                    placeholder="Contoh: Bpk. Budi Santoso"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">No. Telepon / WA *</label>
                  <input
                    type="text"
                    value={form.noTelepon}
                    onChange={(e) => setForm({ ...form, noTelepon: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium text-slate-900 placeholder:text-slate-400"
                    placeholder="081234567890"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Kategori</label>
                  <select
                    value={form.kategori}
                    onChange={(e) => setForm({ ...form, kategori: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium text-slate-900"
                  >
                    <option value="level_1">🏠 Level 1 — Volume Sangat Kecil</option>
                    <option value="level_2">🏘️ Level 2 — Volume Kecil–Sedang</option>
                    <option value="level_3">🏪 Level 3 — Volume Sedang</option>
                    <option value="level_4">🏢 Level 4 — Volume Sedang–Besar</option>
                    <option value="level_5">🏨 Level 5 — Volume Besar</option>
                    <option value="level_6">🏭 Level 6 — Volume Sangat Besar</option>
                    <option value="level_7">🏗️ Level 7 — Volume Ekstra Besar</option>
                    <option value="level_8">🏬 Level 8 — Volume Komersial Besar</option>
                    <option value="level_9">🏥 Level 9 — Volume Maksimal</option>
                    <option value="level_10">🏙️ Level 10 — Volume Korporat</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Tarif Kustom (Rp/bulan, opsional)</label>
                  <input
                    type="number"
                    value={form.customTarif}
                    onChange={(e) => setForm({ ...form, customTarif: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium text-slate-900 placeholder:text-slate-400"
                    placeholder="Kosongkan = pakai tarif Level"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Tanggal Langganan / Siklus Tagihan</label>
                  <input
                    type="datetime-local"
                    value={form.createdAt}
                    onChange={(e) => setForm({ ...form, createdAt: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium text-slate-900"
                    placeholder="Biarkan kosong untuk default"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Tanggal ini menentukan hari jatuh tempo tagihan setiap bulannya.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Kelurahan *</label>
                  <select
                    value={form.kelurahanId}
                    onChange={(e) => setForm({ ...form, kelurahanId: e.target.value, zonaId: "" })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium text-slate-900"
                    required
                  >
                    <option value="">Pilih Kelurahan</option>
                    {kelurahanList.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.nama}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Zona Area Pickup</label>
                  <select
                    value={form.zonaId}
                    onChange={(e) => setForm({ ...form, zonaId: e.target.value })}
                    disabled={!form.kelurahanId}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium text-slate-900 disabled:opacity-50"
                  >
                    <option value="">{form.kelurahanId ? "-- Pilih Zona Pickup --" : "Pilih Kelurahan Terlebih Dahulu"}</option>
                    {zonaList
                      .filter((z) => z.kelurahanId === Number(form.kelurahanId))
                      .map((z) => (
                        <option key={z.id} value={z.id}>
                          {z.nama}
                        </option>
                      ))}
                  </select>
                  <span className="text-[10px] text-slate-400">
                    Otomatis menampilkan zona di kelurahan terpilih
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Status Pelanggan</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium text-slate-900"
                  >
                    <option value="aktif">Aktif</option>
                    <option value="calon">Calon (Menunggu Konfirmasi)</option>
                    <option value="nonaktif">Nonaktif</option>
                    <option value="libur">Libur</option>
                  </select>
                </div>
                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Alamat Lengkap *</label>
                  <textarea
                    value={form.alamat}
                    onChange={(e) => setForm({ ...form, alamat: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium text-slate-900 placeholder:text-slate-400"
                    rows={2}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">RT / RW (Opsional)</label>
                  <input
                    type="text"
                    value={form.rtRw}
                    onChange={(e) => setForm({ ...form, rtRw: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium text-slate-900 placeholder:text-slate-400"
                    placeholder="001/003"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Patokan Lokasi</label>
                  <input
                    type="text"
                    value={form.patokanLokasi}
                    onChange={(e) => setForm({ ...form, patokanLokasi: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium text-slate-900 placeholder:text-slate-400"
                    placeholder="Dekat masjid"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Penanggung Jawab</label>
                  <input
                    type="text"
                    value={form.penanggungjawab}
                    onChange={(e) => setForm({ ...form, penanggungjawab: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium text-slate-900 placeholder:text-slate-400"
                    placeholder="Nama penanggung jawab"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Referal</label>
                  <input
                    type="text"
                    value={form.referal}
                    onChange={(e) => setForm({ ...form, referal: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium text-slate-900 placeholder:text-slate-400"
                    placeholder="Nama yang mereferensikan"
                  />
                </div>
                
                <div className="col-span-1 sm:col-span-2 border-t border-slate-200 pt-5 mt-2">
                  <GeotagPhoto
                    foto={form.fotoRumah}
                    latitude={form.latitude}
                    longitude={form.longitude}
                    koordinatSumber={form.koordinatSumber}
                    koordinatAkurasi={form.koordinatAkurasi}
                    onFotoChange={(foto) => setForm((prev) => ({ ...prev, fotoRumah: foto }))}
                    onKoordinatChange={(lat, lng, sumber, akurasi) =>
                      setForm((prev) => ({ ...prev, latitude: lat, longitude: lng, koordinatSumber: sumber, koordinatAkurasi: akurasi }))
                    }
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200 mt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md active:scale-95 transition-all"
                >
                  {editing ? "Simpan Perubahan" : "Tambah Pelanggan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Approval Pelanggan oleh Admin Pusat */}
      <ModalApprovalPelanggan
        pelanggan={approvalTarget}
        isOpen={Boolean(approvalTarget)}
        onClose={() => setApprovalTarget(null)}
        onSuccess={() => {
          fetchData();
        }}
        showToast={showToast}
      />

      {/* Modal Ubah Status (Aktif / Nonaktif / Libur) */}
      <ModalStatusPelanggan
        pelanggan={statusTarget?.pelanggan ?? null}
        initialTargetStatus={statusTarget?.initialTargetStatus}
        isOpen={Boolean(statusTarget)}
        onClose={() => setStatusTarget(null)}
        onSuccess={() => {
          fetchData();
        }}
        showToast={showToast}
      />

      {/* Modal Hapus atau Nonaktifkan */}
      <ModalHapusPelanggan
        pelanggan={deleteTarget}
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onSuccess={() => {
          fetchData();
        }}
        showToast={showToast}
      />
    </div>
  );
}
