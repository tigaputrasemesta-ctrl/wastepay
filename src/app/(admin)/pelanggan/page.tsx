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
import { 
  Play, 
  Pause, 
  RefreshCw, 
  Eye, 
  Pencil, 
  Trash2, 
  ShieldCheck, 
  Search, 
  SlidersHorizontal, 
  MapPin, 
  Bell, 
  X,
  Plus,
  Download,
  Printer,
  FileText,
  Users,
  ClipboardCheck,
  Tag,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Handshake
} from "lucide-react";
import { getAllCached, getOfflineDB } from "@/lib/offline-storage";

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
  const [refreshing, setRefreshing] = useState(false);
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

  const fetchData = useCallback(async (isManualRefresh = false) => {
    // 1. Coba muat instan dari cache memori HP (IndexedDB) jika belum ada data dan bukan reload manual
    if (!isManualRefresh) {
      try {
        const cached = await getAllCached<Pelanggan>("pelanggan");
        if (cached && cached.length > 0) {
          let list = cached;
          if (search) {
            const q = search.toLowerCase();
            list = list.filter(
              (p) =>
                p.nama?.toLowerCase().includes(q) ||
                p.kodePelanggan?.toLowerCase().includes(q) ||
                p.noTelepon?.includes(q) ||
                p.alamat?.toLowerCase().includes(q)
            );
          }
          if (filterStatus) list = list.filter((p) => p.status === filterStatus);
          if (filterZona) list = list.filter((p) => p.wilayah?.zonaId === parseInt(filterZona));
          if (filterKelurahan) list = list.filter((p) => p.kelurahanId === parseInt(filterKelurahan));

          setPelanggan(list);
          setStatusCounts({
            total: cached.length,
            aktif: cached.filter((p) => p.status === "aktif").length,
            calon: cached.filter((p) => p.status === "calon").length,
            nonaktif: cached.filter((p) => p.status === "nonaktif").length,
            libur: cached.filter((p) => p.status === "libur").length,
          });
          setLoading(false);
        }
      } catch {
        // Abaikan jika IndexedDB belum diisi
      }
    }

    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterKelurahan) params.set("kelurahanId", filterKelurahan);
      if (filterZona) params.set("zonaId", filterZona);
      if (filterStatus) params.set("status", filterStatus);
      if (filterKategori) params.set("kategori", filterKategori);
      // Mencegah cache browser / edge
      params.set("_t", Date.now().toString());
      const qs = params.toString();

      const [pelangganRes, kelurahanRes, zonaRes, optionsRes] = await Promise.all([
        fetch(`/api/pelanggan?${qs}`, { cache: "no-store" }),
        fetch("/api/kelurahan", { cache: "no-store" }),
        fetch("/api/zona", { cache: "no-store" }),
        fetch("/api/publik/daftar-options", { cache: "no-store" }),
      ]);

      if (!pelangganRes.ok) {
        const errJson = await pelangganRes.json().catch(() => ({}));
        throw new Error(errJson?.error || `Gagal memuat pelanggan (${pelangganRes.status})`);
      }

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

      if (Array.isArray(pelangganData)) {
        setPelanggan(pelangganData);
        // Sinkronkan ke cache lokal IndexedDB agar muat instan berikutnya selalu terbarui
        if (!search && !filterKelurahan && !filterZona && !filterStatus && !filterKategori) {
          getOfflineDB().then((db) => {
            const tx = db.transaction(["pelanggan", "metadata"], "readwrite");
            const pStore = tx.objectStore("pelanggan");
            pStore.clear();
            pelangganData.forEach((item) => pStore.put(item));
            const metaStore = tx.objectStore("metadata");
            const now = new Date().toISOString();
            metaStore.put({ key: "totalPelangganCached", value: pelangganData.length, updatedAt: now });
            metaStore.put({ key: "lastSyncToken", value: now, updatedAt: now });
          }).catch(() => {});
        }
      }
      setKelurahanList(Array.isArray(kelurahanData) ? kelurahanData : []);
      setZonaList(Array.isArray(zonaData) ? zonaData : []);

      if (isManualRefresh) {
        showToast("Data pelanggan berhasil diperbarui", "success");
      }
    } catch (error) {
      console.warn("[Pelanggan] Jaringan offline/gagal, tetap menggunakan data HP:", error);
      showToast(isManualRefresh ? "Gagal memuat data terbaru dari server" : "Menggunakan data tersimpan di HP (Mode Offline)", "info");
    } finally {
      setLoading(false);
      setRefreshing(false);
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
      fetchData(true);
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

  const handleExportExcel = async () => {
    const exportQuery = new URLSearchParams({
      ...(filterStatus ? { status: filterStatus } : {}),
      ...(filterKategori ? { kategori: filterKategori } : {}),
      ...(filterKelurahan ? { kelurahanId: filterKelurahan } : {}),
    }).toString();
    const exportUrl = `/api/pelanggan/export?${exportQuery}`;

    try {
      const { Capacitor } = await import("@capacitor/core");
      if (Capacitor.isNativePlatform()) {
        const { Share } = await import("@capacitor/share");
        await Share.share({
          title: "Ekspor Data Pelanggan UPS HERU",
          text: `Data ${pelanggan.length} pelanggan UPS HERU Kota Depok`,
          url: window.location.origin + exportUrl,
          dialogTitle: "Bagikan atau Simpan File Data Pelanggan",
        });
        showToast("Dialog bagikan file terbuka", "success");
        return;
      }
    } catch {
      // Fallback ke web share API
    }

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Ekspor Data Pelanggan UPS HERU",
          url: window.location.origin + exportUrl,
        });
        showToast("Tautan ekspor dibagikan", "success");
        return;
      } catch {
        // Abaikan pembatalan share oleh pengguna
      }
    }

    window.open(exportUrl, "_blank");
    showToast("Mengunduh berkas data pelanggan...", "success");
  };

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 leading-none mb-1">
            Pusat Pengelolaan Pelanggan
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-normal">
            Kelola data pelanggan aktif, verifikasi survei calon pendaftar, dan cetak stiker barcode
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => {
              setRefreshing(true);
              fetchData(true);
            }}
            disabled={refreshing}
            className="px-3 py-2 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition flex items-center gap-1.5 shadow-xs active:scale-98 disabled:opacity-50"
            title="Muat ulang data pelanggan terbaru dari server"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${refreshing ? "animate-spin" : ""}`} />
            <span>{refreshing ? "Memuat..." : "Muat Ulang"}</span>
          </button>
          <Link
            href="/registrasi"
            className="px-3 py-2 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition flex items-center gap-1.5 shadow-xs"
          >
            <FileText size={14} className="text-slate-500" />
            <span>Formulir</span>
          </Link>
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100/70 text-emerald-800 text-xs font-medium transition flex items-center gap-1.5 shadow-xs active:scale-98"
            title="Ekspor ke Excel / CSV"
          >
            <Download size={14} className="text-emerald-700" />
            <span>Ekspor Excel</span>
          </button>
          <Link
            href={`/pelanggan-cetak?${new URLSearchParams({
              ...(filterStatus ? { status: filterStatus } : {}),
              ...(filterKategori ? { kategori: filterKategori } : {}),
              ...(filterKelurahan ? { kelurahanId: filterKelurahan } : {}),
            }).toString()}`}
            className="px-3 py-2 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition flex items-center gap-1.5 shadow-xs"
          >
            <Printer size={14} className="text-slate-500" />
            <span>Cetak</span>
          </Link>
          <button
            onClick={openCreate}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl text-xs font-medium shadow-xs transition-all flex items-center gap-1.5 active:scale-98"
          >
            <Plus size={14} strokeWidth={2} />
            <span>Tambah Pelanggan</span>
          </button>
        </div>
      </div>

      {/* Main Module Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-slate-200/80 pb-2 overflow-x-auto">
        <button
          onClick={() => { setMainTab("data"); setFilterStatus(""); setPage(1); }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all shrink-0 ${
            mainTab === "data"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
          }`}
        >
          <Users size={15} strokeWidth={1.75} />
          <span>Data Pelanggan</span>
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-mono tabular-nums ${mainTab === "data" ? "bg-slate-800 text-slate-200" : "bg-slate-200/80 text-slate-700"}`}>
            {pelanggan.length}
          </span>
        </button>

        <button
          onClick={() => { setMainTab("approval"); setFilterStatus("calon"); setPage(1); }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all shrink-0 ${
            mainTab === "approval"
              ? "bg-amber-600 text-white shadow-xs"
              : "text-amber-800 bg-amber-50/70 hover:bg-amber-100/70 border border-amber-200/80"
          }`}
        >
          <ClipboardCheck size={15} strokeWidth={1.75} />
          <span>Survei & Approval</span>
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-mono tabular-nums ${mainTab === "approval" ? "bg-amber-700 text-amber-100" : "bg-amber-100 text-amber-800"}`}>
            {calonList.length}
          </span>
        </button>

        <button
          onClick={() => { setMainTab("sticker"); setPage(1); }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all shrink-0 ${
            mainTab === "sticker"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
          }`}
        >
          <Tag size={15} strokeWidth={1.75} />
          <span>Cetak Stiker Barcode</span>
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-mono tabular-nums ${mainTab === "sticker" ? "bg-slate-800 text-slate-200" : "bg-slate-200/80 text-slate-700"}`}>
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
        <div className="mb-6 p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 border border-amber-200/60">
              <Bell size={18} strokeWidth={2} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-900 text-sm">
                  {calonList.length} Pendaftar Baru Menunggu Approval
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-200/60">
                  Perlu Ditinjau
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5 font-normal">
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
              className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-98 text-white text-xs font-medium transition shadow-xs flex items-center justify-center gap-1.5"
            >
              <span>{filterStatus === "calon" ? "Lihat Semua Pelanggan" : "Tinjau Pendaftar Baru"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Quick Status Tabs */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 text-xs">
        <button
          type="button"
          onClick={() => { setFilterStatus(""); setPage(1); }}
          className={`px-3 py-1.5 rounded-xl font-medium transition shrink-0 flex items-center gap-1.5 ${
            filterStatus === ""
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white border border-slate-200/80 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <span>Semua</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono tabular-nums ${
            filterStatus === "" ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-600"
          }`}>
            {totalCount}
          </span>
        </button>
        <button
          type="button"
          onClick={() => { setFilterStatus("calon"); setPage(1); }}
          className={`px-3 py-1.5 rounded-xl font-medium transition shrink-0 flex items-center gap-1.5 ${
            filterStatus === "calon"
              ? "bg-amber-600 text-white shadow-xs"
              : "bg-amber-50/80 border border-amber-200/80 text-amber-800 hover:bg-amber-100/60"
          }`}
        >
          <span>Menunggu Approval</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono tabular-nums font-medium ${
            filterStatus === "calon" ? "bg-amber-800 text-amber-100" : "bg-amber-100 text-amber-900"
          }`}>
            {calonCount}
          </span>
        </button>
        <button
          type="button"
          onClick={() => { setFilterStatus("aktif"); setPage(1); }}
          className={`px-3 py-1.5 rounded-xl font-medium transition shrink-0 flex items-center gap-1.5 ${
            filterStatus === "aktif"
              ? "bg-emerald-700 text-white shadow-xs"
              : "bg-white border border-slate-200/80 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <span>Aktif</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono tabular-nums font-medium ${
            filterStatus === "aktif" ? "bg-emerald-800 text-white" : "bg-slate-100 text-slate-700"
          }`}>
            {aktifCount}
          </span>
        </button>
        <button
          type="button"
          onClick={() => { setFilterStatus("nonaktif"); setPage(1); }}
          className={`px-3 py-1.5 rounded-xl font-medium transition shrink-0 flex items-center gap-1.5 ${
            filterStatus === "nonaktif"
              ? "bg-slate-800 text-white shadow-xs"
              : "bg-white border border-slate-200/80 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <span>Nonaktif</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono tabular-nums font-medium ${
            filterStatus === "nonaktif" ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700"
          }`}>
            {nonaktifCount}
          </span>
        </button>
        {liburCount > 0 && (
          <button
            type="button"
            onClick={() => { setFilterStatus("libur"); setPage(1); }}
            className={`px-3 py-1.5 rounded-xl font-medium transition shrink-0 flex items-center gap-1.5 ${
              filterStatus === "libur"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-white border border-slate-200/80 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <span>Libur</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono tabular-nums font-medium ${
              filterStatus === "libur" ? "bg-amber-800 text-white" : "bg-amber-100 text-amber-900"
            }`}>
              {liburCount}
            </span>
          </button>
        )}
      </div>

      {/* Search + Filter mode */}
      <div className="mb-5">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" strokeWidth={1.75} />
            <input
              type="text"
              placeholder="Cari nama, alamat, no. WhatsApp, kode..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-12 py-2 border border-slate-200/80 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs font-normal text-slate-800 placeholder:text-slate-400 transition-all shadow-xs"
            />
            {searchInput ? (
              <button
                onClick={() => { setSearchInput(""); setSearch(""); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="hidden sm:flex items-center gap-0.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[10px] font-mono text-slate-400 bg-slate-100 border border-slate-200/60 px-1.5 py-0.5 rounded">
                <span>⌘</span>K
              </div>
            )}
          </div>
          <button
            onClick={() => setShowFilter((v) => !v)}
            className={`flex items-center gap-2 px-3.5 py-2 border rounded-xl font-medium text-xs transition-all shadow-xs ${
              showFilter || [filterKelurahan, filterStatus, filterKategori].filter(Boolean).length > 0
                ? "bg-slate-900 border-slate-900 text-white"
                : "bg-white border-slate-200/80 text-slate-700 hover:bg-slate-50"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span>Filter</span>
            {[filterKelurahan, filterZona, filterStatus, filterKategori].filter(Boolean).length > 0 && (
              <span className="bg-emerald-600 text-white px-1.5 py-0.2 rounded-full text-[10px] font-semibold">
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

      {/* Adaptive Dual-View: Desktop Table (hidden md:block) & Mobile Smart Cards (md:hidden) */}
      <div className="space-y-4">
        {/* DESKTOP TABLE VIEW (>= md: 768px) */}
        <div className="hidden md:block bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 text-slate-500 font-semibold text-[11px] uppercase tracking-wider border-b border-slate-200/80">
                <th className="px-4 py-3 whitespace-nowrap">Kode</th>
                <th className="px-4 py-3 whitespace-nowrap">Nama Pelanggan</th>
                <th className="px-4 py-3 whitespace-nowrap">No. WhatsApp</th>
                <th className="px-4 py-3 whitespace-nowrap">Alamat & Wilayah</th>
                <th className="px-4 py-3 whitespace-nowrap">Tarif</th>
                <th className="px-4 py-3 whitespace-nowrap">Status</th>
                <th className="px-4 py-3 whitespace-nowrap">Tanggal</th>
                <th className="px-4 py-3 text-center whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {paginatedPelanggan.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400 font-normal text-xs">
                    Belum ada data pelanggan yang sesuai kriteria pencarian
                  </td>
                </tr>
              ) : (
                paginatedPelanggan.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-block text-[11px] font-mono font-medium text-slate-700 bg-slate-100/90 border border-slate-200/70 px-2 py-0.5 rounded-md">
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
                            width={34}
                            height={34}
                            className="w-8 h-8 object-cover rounded-lg border border-slate-200/80 shrink-0 shadow-xs"
                          />
                        ) : (
                          <div className="w-8 h-8 border border-emerald-200/60 bg-emerald-50/60 text-emerald-800 rounded-lg shrink-0 flex items-center justify-center text-xs font-semibold">
                            {p.nama ? p.nama.charAt(0).toUpperCase() : "?"}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-slate-900 text-xs tracking-tight">
                            {p.nama}
                          </div>
                          {p.referal && (
                            <div className="mt-0.5">
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50/80 px-1.5 py-0.5 rounded border border-emerald-200/60" title={`Referral: ${p.referal}`}>
                                <Handshake size={11} className="shrink-0" />
                                <span className="truncate max-w-[130px]">{p.referal}</span>
                              </span>
                            </div>
                          )}
                          {p.latitude && p.longitude && (
                            <a
                              href={`https://www.google.com/maps?q=${p.latitude},${p.longitude}`}
                              target="_blank"
                              className="text-[10px] text-slate-400 hover:text-emerald-600 transition flex items-center gap-1 mt-0.5"
                            >
                              <MapPin size={10} className="shrink-0 text-slate-400" />
                              <span>{p.latitude.toFixed(4)}, {p.longitude.toFixed(4)}</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-mono text-xs whitespace-nowrap">
                      {p.noTelepon || "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-[240px]">
                      <div className="text-xs truncate font-normal text-slate-800" title={p.alamat}>
                        {p.alamat}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <div className="inline-flex items-center px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-medium text-slate-600">
                          {p.kelurahan?.nama ?? "—"}
                        </div>
                        {p.wilayah?.zona ? (
                          <div className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-50 border border-slate-200/80 rounded text-[10px] font-medium text-slate-700">
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: p.wilayah.zona.warna || "#10b981" }}
                            />
                            <span className="truncate max-w-[120px]">{p.wilayah.zona.nama}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-amber-600 font-medium">
                            Belum ada zona
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex flex-col gap-0.5 items-start">
                        {p.customTarif ? (
                          <>
                            <span className="text-xs font-semibold text-amber-700 font-mono tabular-nums">{formatRupiah(p.customTarif)}</span>
                            <span className="inline-flex items-center px-1.5 py-0.2 bg-amber-50 text-amber-700 border border-amber-200/70 rounded text-[9px] font-medium">
                              Kustom
                            </span>
                          </>
                        ) : p.paket ? (
                          <>
                            <span className="text-xs font-semibold text-purple-700 font-mono tabular-nums">{formatRupiah(p.paket.harga || 0)}</span>
                            <span className="inline-flex items-center px-1.5 py-0.2 bg-purple-50 text-purple-700 border border-purple-200/70 rounded text-[9px] font-medium">
                              {p.paket.nama.split(" ").slice(0, 2).join(" ")}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-xs font-semibold text-slate-800 font-mono tabular-nums">
                              {formatRupiah(kategoriTarifList.find(x => x.kategori === p.kategori)?.tarif || 0)}
                            </span>
                            <span className="inline-flex items-center px-1.5 py-0.2 bg-slate-100 text-slate-600 border border-slate-200/70 rounded text-[9px] font-medium">
                              {p.kategori.replace('_', ' ')}
                            </span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {p.status === "calon" ? (
                        <div className="flex flex-col gap-1 items-start">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Menunggu Approval
                          </span>
                          {p.fotoRumah && p.latitude ? (
                            <span className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                              <span>✓</span> Sudah Disurvei
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-normal">
                              Belum Survei
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-0.5 items-start">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                            p.status === "aktif" ? "bg-emerald-50 text-emerald-800 border border-emerald-200/60" :
                            p.status === "libur" ? "bg-amber-50 text-amber-800 border border-amber-200/60" :
                            "bg-slate-100 text-slate-600 border border-slate-200/80"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              p.status === "aktif" ? "bg-emerald-500" :
                              p.status === "libur" ? "bg-amber-500" :
                              "bg-slate-400"
                            }`} />
                            {p.status === "aktif" ? "Aktif" : p.status === "nonaktif" ? "Nonaktif" : p.status === "libur" ? "Libur" : p.status}
                          </span>
                          {p.status === "nonaktif" && (
                            <span className="text-[9px] text-slate-400 font-normal">
                              Tagihan/pickup jeda
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs font-normal whitespace-nowrap">
                      {formatDate(p.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        {p.status === "calon" ? (
                          <button
                            type="button"
                            onClick={() => setApprovalTarget(p)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white text-xs font-medium shadow-xs transition"
                            title="Approval Admin Pusat & Tetapkan Zona Pickup"
                          >
                            <ShieldCheck size={13} />
                            <span>Approval</span>
                          </button>
                        ) : p.status === "aktif" ? (
                          <button
                            type="button"
                            onClick={() => setStatusTarget({ pelanggan: p, initialTargetStatus: "nonaktif" })}
                            className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200/80 bg-white hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 text-slate-500 transition-colors shadow-xs"
                            title="Jeda / Nonaktifkan Layanan"
                          >
                            <Pause size={12} className="fill-current" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setStatusTarget({ pelanggan: p, initialTargetStatus: "aktif" })}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-emerald-200/80 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-medium transition-colors shadow-xs"
                            title="Aktifkan Kembali Layanan"
                          >
                            <Play size={10} className="fill-current" />
                            <span>Aktifkan</span>
                          </button>
                        )}
                        <Link
                          href={`/pelanggan/${p.id}`}
                          className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200/80 bg-white hover:bg-slate-50 hover:text-slate-900 text-slate-500 transition-colors shadow-xs"
                          title="Lihat Detail"
                        >
                          <Eye size={13} strokeWidth={1.75} />
                        </Link>
                        <button
                          type="button"
                          onClick={() => openEdit(p)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200/80 bg-white hover:bg-slate-50 hover:text-slate-900 text-slate-500 transition-colors shadow-xs"
                          title="Edit Data"
                        >
                          <Pencil size={13} strokeWidth={1.75} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(p)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200/80 bg-white hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-slate-400 transition-colors shadow-xs"
                          title="Hapus atau Nonaktifkan"
                        >
                          <Trash2 size={13} strokeWidth={1.75} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE SMART CARDS VIEW (< md: 768px, Bebas Scroll Horizontal) */}
        <div className="md:hidden space-y-3">
          {paginatedPelanggan.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center text-xs font-normal text-slate-500 shadow-xs">
              Belum ada data pelanggan yang sesuai kriteria pencarian
            </div>
          ) : (
            paginatedPelanggan.map((p) => (
              <div key={p.id} className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3">
                {/* Header Card */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {p.fotoRumah ? (
                      <Image
                        src={p.fotoRumah}
                        alt={`Foto ${p.nama}`}
                        unoptimized
                        width={40}
                        height={40}
                        className="w-10 h-10 object-cover rounded-xl border border-slate-200/80 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-emerald-50/70 border border-emerald-200/70 flex items-center justify-center font-semibold text-emerald-800 text-xs shrink-0">
                        {p.nama ? p.nama.charAt(0).toUpperCase() : "?"}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h4 className="font-semibold text-slate-900 text-sm truncate">{p.nama}</h4>
                      <span className="inline-block text-[10px] font-mono font-medium text-slate-600 bg-slate-100 border border-slate-200/60 px-1.5 py-0.2 rounded mt-0.5">
                        {p.kodePelanggan}
                      </span>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 flex items-center gap-1 ${
                    p.status === "aktif" ? "bg-emerald-50 text-emerald-800 border border-emerald-200/60" :
                    p.status === "calon" ? "bg-amber-50 text-amber-800 border border-amber-200/60" :
                    p.status === "libur" ? "bg-amber-50 text-amber-800 border border-amber-200/60" :
                    "bg-slate-100 text-slate-600 border border-slate-200"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      p.status === "aktif" ? "bg-emerald-500" :
                      p.status === "calon" ? "bg-amber-500 animate-pulse" :
                      p.status === "libur" ? "bg-amber-500" :
                      "bg-slate-400"
                    }`} />
                    {p.status === "aktif" ? "Aktif" : p.status === "calon" ? "Calon" : p.status}
                  </span>
                </div>

                {/* Info Card */}
                <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-2">
                  <p className="line-clamp-2 text-slate-800 font-normal">{p.alamat} {p.rtRw ? `(RT/RW: ${p.rtRw})` : ""}</p>
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-medium text-slate-700">
                      {p.kelurahan?.nama || "—"}
                    </span>
                    {p.wilayah?.zona && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-50 text-slate-700 text-[10px] font-medium border border-slate-200/80 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.wilayah.zona.warna || "#10b981" }} />
                        {p.wilayah.zona.nama}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-medium font-mono tabular-nums border border-emerald-200/60">
                      {formatRupiah(p.customTarif || p.paket?.harga || 0)}
                    </span>
                  </div>
                </div>

                {/* Mobile Quick Actions (One-Thumb Target) */}
                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100">
                  {p.noTelepon ? (
                    <a
                      href={`https://wa.me/${p.noTelepon.replace(/^0/, "62")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2 px-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-medium text-xs flex items-center justify-center gap-1.5 border border-emerald-200/70 active:scale-98 transition-all"
                    >
                      <MessageCircle size={13} />
                      <span>WhatsApp</span>
                    </a>
                  ) : (
                    <div className="py-2 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">No WA</div>
                  )}

                  {p.status === "calon" ? (
                    <button
                      type="button"
                      onClick={() => setApprovalTarget(p)}
                      className="py-2 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center justify-center gap-1.5 shadow-xs active:scale-98 transition-all"
                    >
                      <ShieldCheck size={13} />
                      <span>Setujui</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openEdit(p)}
                      className="py-2 px-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-medium text-xs flex items-center justify-center gap-1.5 active:scale-98 transition-all"
                    >
                      <Pencil size={13} />
                      <span>Edit</span>
                    </button>
                  )}

                  <Link
                    href={`/pelanggan/${p.id}`}
                    className="py-2 px-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs flex items-center justify-center gap-1.5 border border-slate-200/80 active:scale-98 transition-all"
                  >
                    <Eye size={13} />
                    <span>Detail</span>
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination Controls Terpadu */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2.5 border border-slate-200/80 rounded-2xl bg-white shadow-xs text-xs font-normal text-slate-600">
            <div>
              Halaman <span className="font-semibold text-slate-900 font-mono">{page}</span> dari <span className="font-semibold text-slate-900 font-mono">{totalPages}</span>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200/80 rounded-lg text-xs font-medium text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition-colors shadow-xs"
              >
                <ChevronLeft size={13} />
                <span>Prev</span>
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200/80 rounded-lg text-xs font-medium text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition-colors shadow-xs"
              >
                <span>Next</span>
                <ChevronRight size={13} />
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
          fetchData(true);
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
          fetchData(true);
        }}
        showToast={showToast}
      />

      {/* Modal Hapus atau Nonaktifkan */}
      <ModalHapusPelanggan
        pelanggan={deleteTarget}
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onSuccess={() => {
          fetchData(true);
        }}
        showToast={showToast}
      />
    </div>
  );
}
