"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";
import {
  MapPin,
  Layers,
  Truck,
  Plus,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronRight,
  Search,
  Building2,
  Users,
  Check,
  CheckCircle2,
  AlertTriangle,
  Compass,
} from "lucide-react";

// Types
type RTItem = {
  id: number;
  nama: string;
  rt?: string | null;
  rw?: string | null;
  zonaId?: number | null;
};

type PetugasItem = {
  id: number;
  nama: string;
  jabatan?: string | null;
  wilayahId?: number | null;
};

type ZonaItem = {
  id: number;
  nama: string;
  keterangan?: string | null;
  warna?: string | null;
  kelurahanId: number;
  _count?: { wilayah: number; petugas: number };
  wilayah: RTItem[];
  petugas: { petugas: { id: number; nama: string; jabatan?: string | null } }[];
};

type KelurahanItem = {
  id: number;
  nama: string;
  kode?: string | null;
  kecamatan?: string | null;
  kota?: string | null;
  _count?: { wilayah: number; petugas: number; pelanggan: number; zona: number };
  zona: ZonaItem[];
  wilayah: RTItem[];
};

const WARNA_PALETTE = [
  { hex: "#10b981", label: "Hijau Emerald" },
  { hex: "#06b6d4", label: "Cyan Langit" },
  { hex: "#3b82f6", label: "Biru Samudera" },
  { hex: "#8b5cf6", label: "Ungu Violet" },
  { hex: "#f59e0b", label: "Kuning Amber" },
  { hex: "#f97316", label: "Oranye Senja" },
  { hex: "#ef4444", label: "Merah Karang" },
  { hex: "#ec4899", label: "Pink Magenta" },
];

export default function ZonasiPage() {
  const { showToast } = useToast();

  const [kelurahanList, setKelurahanList] = useState<KelurahanItem[]>([]);
  const [petugasList, setPetugasList] = useState<PetugasItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [search, setSearch] = useState("");
  const [selectedKecamatan, setSelectedKecamatan] = useState<string>("all");
  const [expandedKelurahans, setExpandedKelurahans] = useState<Record<number, boolean>>({});

  // Modals state
  const [modalKelurahan, setModalKelurahan] = useState<{
    isOpen: boolean;
    data: KelurahanItem | null;
  }>({ isOpen: false, data: null });

  const [formKelurahan, setFormKelurahan] = useState({
    nama: "",
    kode: "",
    kecamatan: "",
    kota: "Kota Depok",
  });

  const [modalZona, setModalZona] = useState<{
    isOpen: boolean;
    data: ZonaItem | null;
    kelurahanId: number | null;
  }>({ isOpen: false, data: null, kelurahanId: null });

  const [formZona, setFormZona] = useState({
    nama: "",
    keterangan: "",
    warna: "#10b981",
    kelurahanId: "",
    petugasIds: [] as number[],
    wilayahIds: [] as number[],
  });

  const [modalRT, setModalRT] = useState<{
    isOpen: boolean;
    kelurahanId: number | null;
    zonaId: number | null;
  }>({ isOpen: false, kelurahanId: null, zonaId: null });

  const [formRT, setFormRT] = useState({
    nama: "",
    rt: "",
    rw: "",
    kelurahanId: "",
    zonaId: "",
  });

  const [modalAturRT, setModalAturRT] = useState<{
    isOpen: boolean;
    zona: ZonaItem | null;
    kelurahan: KelurahanItem | null;
  }>({ isOpen: false, zona: null, kelurahan: null });

  const [selectedRTForZona, setSelectedRTForZona] = useState<number[]>([]);

  // Deletion confirm dialog
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "kelurahan" | "zona" | "wilayah";
    id: number;
    title: string;
    description: string;
  } | null>(null);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Fetch all resources
  const fetchAll = useCallback(async () => {
    try {
      const [kelRes, petRes] = await Promise.all([
        fetch("/api/kelurahan?includeDetail=true"),
        fetch("/api/petugas"),
      ]);

      const kelData = await kelRes.json();
      const petData = await petRes.json();

      const kelList: KelurahanItem[] = Array.isArray(kelData) ? kelData : [];
      setKelurahanList(kelList);
      setPetugasList(Array.isArray(petData) ? petData : []);

      // Default expand all
      setExpandedKelurahans((prev) => {
        const next = { ...prev };
        kelList.forEach((k) => {
          if (next[k.id] === undefined) {
            next[k.id] = true;
          }
        });
        return next;
      });
    } catch (err) {
      console.error(err);
      showToast("Gagal memuat data zonasi & kelurahan", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Petugas Angkut filter
  const petugasAngkut = useMemo(
    () => petugasList.filter((p) => (p.jabatan || "").toLowerCase().includes("angkut")),
    [petugasList]
  );

  // List of distinct Kecamatan
  const distinctKecamatan = useMemo(() => {
    const setKec = new Set<string>();
    kelurahanList.forEach((k) => {
      if (k.kecamatan && k.kecamatan.trim()) {
        setKec.add(k.kecamatan.trim());
      }
    });
    return Array.from(setKec).sort();
  }, [kelurahanList]);

  // Total Metrics
  const metrics = useMemo(() => {
    const totalKecamatan = distinctKecamatan.length;
    const totalKelurahan = kelurahanList.length;
    let totalZona = 0;
    let totalRT = 0;
    let totalPelanggan = 0;

    kelurahanList.forEach((k) => {
      totalZona += k.zona?.length ?? 0;
      totalRT += k.wilayah?.length ?? 0;
      totalPelanggan += k._count?.pelanggan ?? 0;
    });

    return { totalKecamatan, totalKelurahan, totalZona, totalRT, totalPelanggan };
  }, [kelurahanList, distinctKecamatan]);

  // Filtered Kelurahan by Search & Kecamatan
  const filteredKelurahan = useMemo(() => {
    return kelurahanList.filter((k) => {
      // Filter Kecamatan
      if (selectedKecamatan !== "all") {
        if (selectedKecamatan === "lainnya") {
          if (k.kecamatan && k.kecamatan.trim()) return false;
        } else if (k.kecamatan !== selectedKecamatan) {
          return false;
        }
      }

      // Filter Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchKel = k.nama.toLowerCase().includes(q) || (k.kode || "").toLowerCase().includes(q);
        const matchKec = (k.kecamatan || "").toLowerCase().includes(q);
        const matchZona = (k.zona || []).some(
          (z) => z.nama.toLowerCase().includes(q) || (z.keterangan || "").toLowerCase().includes(q)
        );
        const matchRT = (k.wilayah || []).some((w) => w.nama.toLowerCase().includes(q));

        return matchKel || matchKec || matchZona || matchRT;
      }

      return true;
    });
  }, [kelurahanList, selectedKecamatan, search]);

  // Group filtered kelurahan by Kecamatan
  const groupedByKecamatan = useMemo(() => {
    const groups: Record<string, KelurahanItem[]> = {};

    filteredKelurahan.forEach((k) => {
      const kecName = k.kecamatan && k.kecamatan.trim() ? k.kecamatan.trim() : "Lainnya / Belum Ditentukan";
      if (!groups[kecName]) {
        groups[kecName] = [];
      }
      groups[kecName].push(k);
    });

    return groups;
  }, [filteredKelurahan]);

  // Toggle Kelurahan expansion
  const toggleExpandKelurahan = (id: number) => {
    setExpandedKelurahans((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = (open: boolean) => {
    const next: Record<number, boolean> = {};
    kelurahanList.forEach((k) => {
      next[k.id] = open;
    });
    setExpandedKelurahans(next);
  };

  // -------------------------------------------------------------
  // HANDLERS: KELURAHAN
  // -------------------------------------------------------------
  const openCreateKelurahan = () => {
    setFormKelurahan({
      nama: "",
      kode: "",
      kecamatan: selectedKecamatan !== "all" && selectedKecamatan !== "lainnya" ? selectedKecamatan : "",
      kota: "Kota Depok",
    });
    setModalKelurahan({ isOpen: true, data: null });
  };

  const openEditKelurahan = (kel: KelurahanItem) => {
    setFormKelurahan({
      nama: kel.nama,
      kode: kel.kode || "",
      kecamatan: kel.kecamatan || "",
      kota: kel.kota || "Kota Depok",
    });
    setModalKelurahan({ isOpen: true, data: kel });
  };

  const handleSaveKelurahan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formKelurahan.nama.trim()) {
      showToast("Nama kelurahan wajib diisi", "error");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        nama: formKelurahan.nama.trim(),
        kode: formKelurahan.kode.trim() || undefined,
        kecamatan: formKelurahan.kecamatan.trim() || undefined,
        kota: formKelurahan.kota.trim() || undefined,
      };

      const isEdit = Boolean(modalKelurahan.data);
      const url = isEdit ? `/api/kelurahan/${modalKelurahan.data!.id}` : "/api/kelurahan";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast(isEdit ? "Kelurahan berhasil diperbarui" : "Kelurahan baru berhasil ditambahkan");
        setModalKelurahan({ isOpen: false, data: null });
        await fetchAll();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "Gagal menyimpan kelurahan", "error");
      }
    } catch {
      showToast("Terjadi kesalahan jaringan", "error");
    } finally {
      setSaving(false);
    }
  };

  // -------------------------------------------------------------
  // HANDLERS: ZONA
  // -------------------------------------------------------------
  const openCreateZona = (preselectedKelurahanId?: number) => {
    const defaultKelId = preselectedKelurahanId
      ? preselectedKelurahanId.toString()
      : kelurahanList.length > 0
      ? kelurahanList[0].id.toString()
      : "";

    setFormZona({
      nama: "",
      keterangan: "",
      warna: "#10b981",
      kelurahanId: defaultKelId,
      petugasIds: [],
      wilayahIds: [],
    });
    setModalZona({
      isOpen: true,
      data: null,
      kelurahanId: preselectedKelurahanId || null,
    });
  };

  const openEditZona = (zona: ZonaItem) => {
    setFormZona({
      nama: zona.nama,
      keterangan: zona.keterangan || "",
      warna: zona.warna || "#10b981",
      kelurahanId: zona.kelurahanId.toString(),
      petugasIds: (zona.petugas || []).map((p) => p.petugas.id),
      wilayahIds: (zona.wilayah || []).map((w) => w.id),
    });
    setModalZona({
      isOpen: true,
      data: zona,
      kelurahanId: zona.kelurahanId,
    });
  };

  const handleSaveZona = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formZona.nama.trim() || !formZona.kelurahanId) {
      showToast("Nama zona dan Kelurahan wajib dipilih", "error");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        nama: formZona.nama.trim(),
        keterangan: formZona.keterangan.trim() || null,
        warna: formZona.warna,
        kelurahanId: parseInt(formZona.kelurahanId),
        petugasIds: formZona.petugasIds,
        wilayahIds: formZona.wilayahIds,
      };

      const isEdit = Boolean(modalZona.data);
      const url = isEdit ? `/api/zona/${modalZona.data!.id}` : "/api/zona";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast(isEdit ? "Zona berhasil diperbarui" : "Zona baru berhasil ditambahkan");
        setModalZona({ isOpen: false, data: null, kelurahanId: null });
        await fetchAll();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "Gagal menyimpan zona", "error");
      }
    } catch {
      showToast("Terjadi kesalahan jaringan", "error");
    } finally {
      setSaving(false);
    }
  };

  // -------------------------------------------------------------
  // HANDLERS: RT / WILAYAH
  // -------------------------------------------------------------
  const openCreateRT = (kelurahanId: number, zonaId?: number) => {
    setFormRT({
      nama: "",
      rt: "",
      rw: "",
      kelurahanId: kelurahanId.toString(),
      zonaId: zonaId ? zonaId.toString() : "",
    });
    setModalRT({
      isOpen: true,
      kelurahanId,
      zonaId: zonaId || null,
    });
  };

  const handleSaveRT = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalNama = formRT.nama.trim() || (formRT.rt ? `RT ${formRT.rt}${formRT.rw ? ` / RW ${formRT.rw}` : ""}` : "");
    if (!finalNama || !formRT.kelurahanId) {
      showToast("Nama RT / Wilayah dan Kelurahan wajib diisi", "error");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        nama: finalNama,
        rt: formRT.rt.trim() || null,
        rw: formRT.rw.trim() || null,
        kelurahanId: parseInt(formRT.kelurahanId),
        zonaId: formRT.zonaId ? parseInt(formRT.zonaId) : null,
      };

      const res = await fetch("/api/wilayah", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast("RT/Wilayah berhasil ditambahkan");
        setModalRT({ isOpen: false, kelurahanId: null, zonaId: null });
        await fetchAll();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "Gagal menambah RT/Wilayah", "error");
      }
    } catch {
      showToast("Terjadi kesalahan jaringan", "error");
    } finally {
      setSaving(false);
    }
  };

  // -------------------------------------------------------------
  // HANDLERS: ATUR RT ZONA (QUICK RT MAPPING)
  // -------------------------------------------------------------
  const openAturRT = (zona: ZonaItem, kel: KelurahanItem) => {
    setSelectedRTForZona((zona.wilayah || []).map((w) => w.id));
    setModalAturRT({ isOpen: true, zona, kelurahan: kel });
  };

  const handleSaveAturRT = async () => {
    if (!modalAturRT.zona) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/zona/${modalAturRT.zona.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wilayahIds: selectedRTForZona }),
      });

      if (res.ok) {
        showToast(`Cakupan RT untuk ${modalAturRT.zona.nama} berhasil diperbarui`);
        setModalAturRT({ isOpen: false, zona: null, kelurahan: null });
        await fetchAll();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "Gagal memperbarui cakupan RT", "error");
      }
    } catch {
      showToast("Terjadi kesalahan jaringan", "error");
    } finally {
      setSaving(false);
    }
  };

  // -------------------------------------------------------------
  // HANDLERS: CONFIRM DELETE
  // -------------------------------------------------------------
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      let endpoint = "";
      if (deleteTarget.type === "kelurahan") endpoint = `/api/kelurahan/${deleteTarget.id}`;
      if (deleteTarget.type === "zona") endpoint = `/api/zona/${deleteTarget.id}`;
      if (deleteTarget.type === "wilayah") endpoint = `/api/wilayah/${deleteTarget.id}`;

      const res = await fetch(endpoint, { method: "DELETE" });
      if (res.ok) {
        showToast(`${deleteTarget.title} berhasil dihapus`);
        setDeleteTarget(null);
        await fetchAll();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "Gagal menghapus data", "error");
      }
    } catch {
      showToast("Terjadi kesalahan jaringan", "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ── HEADER TITLE & ACTIONS ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200/60 shadow-2xs">
              <Compass className="w-5 h-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Zonasi &amp; Wilayah Operasional
            </h1>
          </div>
          <p className="text-sm text-slate-500 font-medium max-w-3xl">
            Satu pusat pengaturan terpadu berjenjang:{" "}
            <span className="font-semibold text-slate-700">Kecamatan</span> →{" "}
            <span className="font-semibold text-slate-700">Kelurahan</span> →{" "}
            <span className="font-semibold text-emerald-700">Daftar Zona Angkut</span> →{" "}
            <span className="font-semibold text-slate-700">Cakupan RT / Armada</span>.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={openCreateKelurahan}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold shadow-2xs transition active:scale-95"
          >
            <Building2 className="w-4 h-4 text-slate-500" />
            <span>+ Kelurahan</span>
          </button>
          <button
            onClick={() => openCreateZona()}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ Tambah Zona Angkut</span>
          </button>
        </div>
      </div>

      {/* ── STATS METRICS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Kecamatan</span>
            <span className="p-1.5 bg-sky-50 text-sky-700 rounded-lg">
              <Building2 className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">{metrics.totalKecamatan}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Area induk terdaftar</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Kelurahan</span>
            <span className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
              <MapPin className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">{metrics.totalKelurahan}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Pusat penentu zona</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Zona Angkut</span>
            <span className="p-1.5 bg-emerald-700 text-white rounded-lg">
              <Layers className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-extrabold text-emerald-700 mt-2">{metrics.totalZona}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Zona operasional aktif</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">RT / Wilayah</span>
            <span className="p-1.5 bg-purple-50 text-purple-700 rounded-lg">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">{metrics.totalRT}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">{metrics.totalPelanggan} total pelanggan</p>
        </div>
      </div>

      {/* ── FILTER & SEARCH BAR ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari kecamatan, kelurahan, nama zona, RT..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Accordion Expand All */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => expandAll(true)}
              className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Buka Semua
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={() => expandAll(false)}
              className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Tutup Semua
            </button>
          </div>
        </div>

        {/* Kecamatan Chips Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-thin">
          <button
            onClick={() => setSelectedKecamatan("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              selectedKecamatan === "all"
                ? "bg-slate-900 text-white shadow-2xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
            }`}
          >
            Semua Kecamatan ({kelurahanList.length})
          </button>
          {distinctKecamatan.map((kec) => {
            const count = kelurahanList.filter((k) => k.kecamatan === kec).length;
            return (
              <button
                key={kec}
                onClick={() => setSelectedKecamatan(kec)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  selectedKecamatan === kec
                    ? "bg-emerald-700 text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
                }`}
              >
                Kec. {kec} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* ── MAIN CONTENT: HIERARCHICAL VIEW (KECAMATAN -> KELURAHAN -> DAFTAR ZONA) ── */}
      {loading ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center text-slate-400 font-medium">
          <Compass className="w-8 h-8 mx-auto mb-2 animate-spin text-emerald-700 opacity-60" />
          <p className="text-sm">Memuat data hierarki zonasi &amp; wilayah...</p>
        </div>
      ) : Object.keys(groupedByKecamatan).length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-bold text-lg text-slate-800">Tidak ada data ditemukan</p>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            {search
              ? `Tidak ada kelurahan atau zona yang sesuai dengan pencarian "${search}".`
              : "Belum ada kelurahan terdaftar. Mulai dengan menambahkan kelurahan pertama Anda."}
          </p>
          <button
            onClick={openCreateKelurahan}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Kelurahan Pertama</span>
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedByKecamatan).map(([kecName, kelList]) => {
            const totalZonaKec = kelList.reduce((acc, k) => acc + (k.zona?.length ?? 0), 0);
            const totalRTKec = kelList.reduce((acc, k) => acc + (k.wilayah?.length ?? 0), 0);

            return (
              <div key={kecName} className="space-y-4">
                {/* Kecamatan Section Header */}
                <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-slate-100/90 to-slate-50/50 p-3.5 rounded-2xl border border-slate-200/80">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 bg-white rounded-xl shadow-2xs border border-slate-200/60 text-slate-700">
                      <Building2 className="w-4 h-4" />
                    </span>
                    <div>
                      <h2 className="text-base font-extrabold text-slate-900 leading-tight">
                        Kecamatan {kecName}
                      </h2>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Membawahi {kelList.length} Kelurahan • {totalZonaKec} Zona Angkut • {totalRTKec} RT
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold px-3 py-1 bg-white border border-slate-200 rounded-full text-slate-600 shadow-2xs">
                    {kelList.length} Kelurahan
                  </span>
                </div>

                {/* List of Kelurahans under this Kecamatan */}
                <div className="space-y-5">
                  {kelList.map((kel) => {
                    const isExpanded = expandedKelurahans[kel.id] !== false;
                    const kelZonas = kel.zona || [];
                    const kelRTs = kel.wilayah || [];

                    return (
                      <div
                        key={kel.id}
                        className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden transition-all"
                      >
                        {/* ── KELURAHAN CARD HEADER ── */}
                        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60 border-b border-slate-100">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => toggleExpandKelurahan(kel.id)}
                              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition"
                              title={isExpanded ? "Sembunyikan zona" : "Tampilkan zona"}
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-5 h-5" />
                              ) : (
                                <ChevronRight className="w-5 h-5" />
                              )}
                            </button>

                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                                  Kelurahan {kel.nama}
                                </h3>
                                {kel.kode && (
                                  <span className="font-mono text-[11px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md">
                                    {kel.kode}
                                  </span>
                                )}
                                <span className="text-xs font-medium text-slate-500">
                                  • {kel.kecamatan ? `Kec. ${kel.kecamatan}` : "Kecamatan belum diisi"}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 flex-wrap">
                                <span className="font-semibold text-emerald-700 bg-emerald-50/80 px-2 py-0.5 rounded-md border border-emerald-100">
                                  {kelZonas.length} Zona Angkut
                                </span>
                                <span>•</span>
                                <span className="font-medium text-slate-600">
                                  {kelRTs.length} RT / Wilayah
                                </span>
                                <span>•</span>
                                <span className="text-slate-500">
                                  {kel._count?.pelanggan ?? 0} Pelanggan
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons for Kelurahan */}
                          <div className="flex items-center gap-1.5 self-end sm:self-center">
                            <button
                              onClick={() => openCreateZona(kel.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-2xs active:scale-95 transition"
                              title="Tambah Zona Angkut di Kelurahan ini"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Tambah Zona</span>
                            </button>
                            <button
                              onClick={() => openCreateRT(kel.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/80 rounded-xl text-xs font-semibold transition"
                              title="Tambah RT / Wilayah baru"
                            >
                              <span>+ RT</span>
                            </button>
                            <button
                              onClick={() => openEditKelurahan(kel)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition"
                              title="Edit nama/kecamatan kelurahan"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                setDeleteTarget({
                                  type: "kelurahan",
                                  id: kel.id,
                                  title: `Kelurahan ${kel.nama}`,
                                  description: `Hapus kelurahan ini? Pastikan tidak ada data pelanggan atau zona aktif di dalamnya.`,
                                })
                              }
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                              title="Hapus Kelurahan"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* ── KELURAHAN BODY: DAFTAR NAMA-NAMA ZONA ANGKUT ── */}
                        {isExpanded && (
                          <div className="p-4 sm:p-5 space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                              <div className="flex items-center gap-2">
                                <Layers className="w-4 h-4 text-emerald-700" />
                                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                  Daftar Zona Angkut di Kelurahan {kel.nama}
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-400 font-medium">
                                Penentuan zona armada &amp; jadwal pickup
                              </span>
                            </div>

                            {kelZonas.length === 0 ? (
                              <div className="p-6 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 text-center">
                                <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                <p className="text-xs font-bold text-slate-700">
                                  Belum ada zona angkut di Kelurahan {kel.nama}
                                </p>
                                <p className="text-[11px] text-slate-500 mt-0.5 max-w-sm mx-auto">
                                  Setiap pendaftaran pelanggan memerlukan zonasi. Buat zona pertama untuk kelurahan ini.
                                </p>
                                <button
                                  onClick={() => openCreateZona(kel.id)}
                                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Buat Zona Pertama</span>
                                </button>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                                {kelZonas.map((z) => {
                                  const zRTs = z.wilayah || [];
                                  const zPetugas = z.petugas || [];

                                  return (
                                    <div
                                      key={z.id}
                                      className="relative bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs hover:shadow-sm transition-all group flex flex-col justify-between"
                                    >
                                      <div>
                                        {/* Top bar: Warna + Nama + Actions */}
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                          <div className="flex items-center gap-2 min-w-0">
                                            <span
                                              className="w-3.5 h-3.5 rounded-full ring-2 ring-white shadow-xs shrink-0"
                                              style={{ backgroundColor: z.warna || "#10b981" }}
                                              title={z.warna || ""}
                                            />
                                            <h4 className="font-extrabold text-slate-900 text-sm truncate">
                                              {z.nama}
                                            </h4>
                                          </div>

                                          <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                            <button
                                              onClick={() => openEditZona(z)}
                                              className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition"
                                              title="Edit Zona"
                                            >
                                              <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                              onClick={() =>
                                                setDeleteTarget({
                                                  type: "zona",
                                                  id: z.id,
                                                  title: `Zona ${z.nama}`,
                                                  description: `Hapus zona ${z.nama}? Rute dan wilayah terkait akan dilepas dari zona ini.`,
                                                })
                                              }
                                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                              title="Hapus Zona"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        </div>

                                        {/* Keterangan */}
                                        {z.keterangan ? (
                                          <p className="text-xs text-slate-600 mb-3 line-clamp-2 leading-relaxed">
                                            {z.keterangan}
                                          </p>
                                        ) : (
                                          <p className="text-xs text-slate-400 italic mb-3">
                                            Tidak ada catatan khusus
                                          </p>
                                        )}

                                        {/* Cakupan RT */}
                                        <div className="mb-3">
                                          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-1.5">
                                            <span>Cakupan RT ({zRTs.length}):</span>
                                            <button
                                              onClick={() => openAturRT(z, kel)}
                                              className="text-emerald-700 hover:text-emerald-800 hover:underline"
                                            >
                                              Atur RT ↗
                                            </button>
                                          </div>
                                          {zRTs.length === 0 ? (
                                            <p className="text-[11px] text-amber-600 font-medium">
                                              ⏳ Belum ada RT terhubung
                                            </p>
                                          ) : (
                                            <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto pr-1">
                                              {zRTs.map((rt) => (
                                                <span
                                                  key={rt.id}
                                                  className="px-2 py-0.5 bg-slate-100 border border-slate-200/80 rounded-md text-[10px] font-semibold text-slate-700"
                                                >
                                                  {rt.nama}
                                                </span>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      {/* Petugas Armada Penanggung Jawab */}
                                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                                        <div className="flex items-center gap-1.5 truncate">
                                          <Truck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                          {zPetugas.length === 0 ? (
                                            <span className="italic text-slate-400">Belum ada armada</span>
                                          ) : (
                                            <span className="font-medium text-slate-700 truncate">
                                              {zPetugas.map((p) => p.petugas.nama).join(", ")}
                                            </span>
                                          )}
                                        </div>
                                        <span className="text-[10px] font-bold text-emerald-700 shrink-0 ml-1">
                                          {zPetugas.length} Petugas
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Daftar RT Terdaftar di Kelurahan (Quick summary bar) */}
                            {kelRTs.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                                <div className="flex items-center gap-1.5">
                                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                  <span>
                                    Semua RT di Kelurahan ini ({kelRTs.length}):{" "}
                                    <span className="text-slate-700 font-medium">
                                      {kelRTs.map((r) => r.nama).slice(0, 8).join(", ")}
                                      {kelRTs.length > 8 ? ` ...+${kelRTs.length - 8} lainnya` : ""}
                                    </span>
                                  </span>
                                </div>
                                <button
                                  onClick={() => openCreateRT(kel.id)}
                                  className="text-emerald-700 hover:text-emerald-800 font-semibold text-[11px]"
                                >
                                  + Tambah RT Baru
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL: KELURAHAN (CREATE / EDIT) ── */}
      {modalKelurahan.isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl overflow-hidden w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-700" />
                <h3 className="font-extrabold text-slate-900 text-base">
                  {modalKelurahan.data ? "Edit Kelurahan" : "Tambah Kelurahan Baru"}
                </h3>
              </div>
              <button
                onClick={() => setModalKelurahan({ isOpen: false, data: null })}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveKelurahan} className="p-6 space-y-4 text-xs font-medium text-slate-700">
              <div>
                <label className="block font-bold mb-1">Nama Kelurahan *</label>
                <input
                  type="text"
                  required
                  value={formKelurahan.nama}
                  onChange={(e) => setFormKelurahan({ ...formKelurahan, nama: e.target.value })}
                  placeholder="Contoh: Kalibaru"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Kode Singkat (3 Huruf)</label>
                  <input
                    type="text"
                    maxLength={5}
                    value={formKelurahan.kode}
                    onChange={(e) => setFormKelurahan({ ...formKelurahan, kode: e.target.value.toUpperCase() })}
                    placeholder="KAL"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-slate-400">Digunakan di kode pelanggan</span>
                </div>

                <div>
                  <label className="block font-bold mb-1">Kota</label>
                  <input
                    type="text"
                    value={formKelurahan.kota}
                    onChange={(e) => setFormKelurahan({ ...formKelurahan, kota: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Kecamatan</label>
                <input
                  type="text"
                  list="kecamatan-suggestions"
                  value={formKelurahan.kecamatan}
                  onChange={(e) => setFormKelurahan({ ...formKelurahan, kecamatan: e.target.value })}
                  placeholder="Pilih atau ketik nama kecamatan..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
                <datalist id="kecamatan-suggestions">
                  {distinctKecamatan.map((kec) => (
                    <option key={kec} value={kec} />
                  ))}
                </datalist>
                <span className="text-[10px] text-slate-400">
                  Contoh: Cilodong, Pancoran Mas, Sukmajaya, Beji, Tapos
                </span>
              </div>

              <div className="flex gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setModalKelurahan({ isOpen: false, data: null })}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition disabled:opacity-60"
                >
                  {saving ? "Menyimpan…" : "Simpan Kelurahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: ZONA (CREATE / EDIT) ── */}
      {modalZona.isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl overflow-hidden w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-700" />
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    {modalZona.data ? "Edit Zona Angkut" : "Tambah Zona Angkut Baru"}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Atur nama zona, warna marker, cakupan RT, dan petugas armada
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalZona({ isOpen: false, data: null, kelurahanId: null })}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveZona} className="p-6 space-y-4 overflow-y-auto text-xs font-medium text-slate-700">
              {/* Pilihan Kelurahan */}
              <div>
                <label className="block font-bold mb-1">Kelurahan Wilayah Induk *</label>
                <select
                  required
                  value={formZona.kelurahanId}
                  onChange={(e) => setFormZona({ ...formZona, kelurahanId: e.target.value, wilayahIds: [] })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                >
                  <option value="">-- Pilih Kelurahan --</option>
                  {kelurahanList.map((k) => (
                    <option key={k.id} value={k.id}>
                      Kel. {k.nama} {k.kecamatan ? `(Kec. ${k.kecamatan})` : ""}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400">
                  Zona ini akan menjadi pilihan saat pendaftaran pelanggan di kelurahan ini.
                </span>
              </div>

              {/* Nama Zona */}
              <div>
                <label className="block font-bold mb-1">Nama Zona *</label>
                <input
                  type="text"
                  required
                  value={formZona.nama}
                  onChange={(e) => setFormZona({ ...formZona, nama: e.target.value })}
                  placeholder="Contoh: Zona 1 - Griya Kalibaru / RW 01 - RW 05"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* Pilihan Warna Marker */}
              <div>
                <label className="block font-bold mb-1.5">Warna Marker / Label</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {WARNA_PALETTE.map((w) => (
                    <button
                      key={w.hex}
                      type="button"
                      onClick={() => setFormZona({ ...formZona, warna: w.hex })}
                      className={`w-7 h-7 rounded-full transition flex items-center justify-center ring-2 ${
                        formZona.warna === w.hex ? "ring-slate-900 scale-110" : "ring-transparent hover:scale-105"
                      }`}
                      style={{ backgroundColor: w.hex }}
                      title={w.label}
                    >
                      {formZona.warna === w.hex && <Check className="w-4 h-4 text-white drop-shadow-xs" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Keterangan */}
              <div>
                <label className="block font-bold mb-1">Keterangan / Batas Wilayah</label>
                <textarea
                  rows={2}
                  value={formZona.keterangan}
                  onChange={(e) => setFormZona({ ...formZona, keterangan: e.target.value })}
                  placeholder="Catatan rute, akses jalan truk, jadwal angkut reguler..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* Checklist RT Cakupan di Kelurahan Ini */}
              {formZona.kelurahanId && (
                <div className="border border-slate-200/80 rounded-2xl p-3 bg-slate-50/50">
                  <div className="flex items-center justify-between mb-2">
                    <label className="font-bold text-slate-800">Cakupan RT / Wilayah</label>
                    <span className="text-[10px] text-slate-500">
                      {formZona.wilayahIds.length} RT dipilih
                    </span>
                  </div>
                  {(() => {
                    const currentKel = kelurahanList.find((k) => k.id === parseInt(formZona.kelurahanId));
                    const rts = currentKel?.wilayah || [];
                    if (rts.length === 0) {
                      return (
                        <p className="text-[11px] text-slate-400 italic">
                          Belum ada RT terdaftar di kelurahan ini. Anda dapat menambahkannya nanti.
                        </p>
                      );
                    }
                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto pr-1">
                        {rts.map((rt) => {
                          const isChecked = formZona.wilayahIds.includes(rt.id);
                          return (
                            <label
                              key={rt.id}
                              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] cursor-pointer transition ${
                                isChecked
                                  ? "bg-emerald-50 border-emerald-300 text-emerald-800 font-bold"
                                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFormZona({
                                      ...formZona,
                                      wilayahIds: [...formZona.wilayahIds, rt.id],
                                    });
                                  } else {
                                    setFormZona({
                                      ...formZona,
                                      wilayahIds: formZona.wilayahIds.filter((id) => id !== rt.id),
                                    });
                                  }
                                }}
                                className="rounded text-emerald-700 focus:ring-emerald-500"
                              />
                              <span className="truncate">{rt.nama}</span>
                            </label>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Checklist Petugas Angkut */}
              <div className="border border-slate-200/80 rounded-2xl p-3 bg-slate-50/50">
                <div className="flex items-center justify-between mb-2">
                  <label className="font-bold text-slate-800">Petugas Armada Angkut</label>
                  <span className="text-[10px] text-slate-500">
                    {formZona.petugasIds.length} Petugas ditugaskan
                  </span>
                </div>
                {petugasAngkut.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic">Belum ada akun petugas armada</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-32 overflow-y-auto pr-1">
                    {petugasAngkut.map((p) => {
                      const isChecked = formZona.petugasIds.includes(p.id);
                      return (
                        <label
                          key={p.id}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer transition ${
                            isChecked
                              ? "bg-emerald-50 border-emerald-300 text-emerald-800 font-bold"
                              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormZona({
                                  ...formZona,
                                  petugasIds: [...formZona.petugasIds, p.id],
                                });
                              } else {
                                setFormZona({
                                  ...formZona,
                                  petugasIds: formZona.petugasIds.filter((id) => id !== p.id),
                                });
                              }
                            }}
                            className="rounded text-emerald-700 focus:ring-emerald-500"
                          />
                          <span className="truncate">{p.nama}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setModalZona({ isOpen: false, data: null, kelurahanId: null })}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition disabled:opacity-60"
                >
                  {saving ? "Menyimpan…" : "Simpan Zona"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: TAMBAH RT / WILAYAH ── */}
      {modalRT.isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl overflow-hidden w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
              <h3 className="font-extrabold text-slate-900 text-base">Tambah RT / Wilayah Baru</h3>
              <button
                onClick={() => setModalRT({ isOpen: false, kelurahanId: null, zonaId: null })}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveRT} className="p-6 space-y-4 text-xs font-medium text-slate-700">
              <div>
                <label className="block font-bold mb-1">Kelurahan *</label>
                <select
                  required
                  value={formRT.kelurahanId}
                  onChange={(e) => setFormRT({ ...formRT, kelurahanId: e.target.value, zonaId: "" })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                >
                  <option value="">Pilih Kelurahan...</option>
                  {kelurahanList.map((k) => (
                    <option key={k.id} value={k.id}>
                      Kel. {k.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Nomor RT</label>
                  <input
                    type="text"
                    value={formRT.rt}
                    onChange={(e) => setFormRT({ ...formRT, rt: e.target.value })}
                    placeholder="001"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Nomor RW</label>
                  <input
                    type="text"
                    value={formRT.rw}
                    onChange={(e) => setFormRT({ ...formRT, rw: e.target.value })}
                    placeholder="003"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Nama Tampilan Wilayah (Opsional)</label>
                <input
                  type="text"
                  value={formRT.nama}
                  onChange={(e) => setFormRT({ ...formRT, nama: e.target.value })}
                  placeholder="Kosongkan untuk otomatis 'RT 01 / RW 03'"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* Hubungkan ke Zona */}
              <div>
                <label className="block font-bold mb-1">Masukkan ke Zona Angkut (Opsional)</label>
                <select
                  value={formRT.zonaId}
                  onChange={(e) => setFormRT({ ...formRT, zonaId: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                >
                  <option value="">-- Belum ada zona --</option>
                  {kelurahanList
                    .find((k) => k.id === parseInt(formRT.kelurahanId))
                    ?.zona?.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.nama}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setModalRT({ isOpen: false, kelurahanId: null, zonaId: null })}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition disabled:opacity-60"
                >
                  {saving ? "Menyimpan…" : "Simpan RT"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: ATUR RT CAKUPAN ZONA ── */}
      {modalAturRT.isOpen && modalAturRT.zona && modalAturRT.kelurahan && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl overflow-hidden w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Atur Cakupan RT</h3>
                <p className="text-[11px] text-slate-500">
                  {modalAturRT.zona.nama} • Kel. {modalAturRT.kelurahan.nama}
                </p>
              </div>
              <button
                onClick={() => setModalAturRT({ isOpen: false, zona: null, kelurahan: null })}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600">
                Pilih RT mana saja di Kelurahan{" "}
                <span className="font-bold">{modalAturRT.kelurahan.nama}</span> yang masuk ke dalam{" "}
                <span className="font-bold text-emerald-700">{modalAturRT.zona.nama}</span>:
              </p>

              {modalAturRT.kelurahan.wilayah.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-500">
                  Belum ada RT di kelurahan ini.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto p-1">
                  {modalAturRT.kelurahan.wilayah.map((rt) => {
                    const isChecked = selectedRTForZona.includes(rt.id);
                    return (
                      <label
                        key={rt.id}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                          isChecked
                            ? "bg-emerald-50 border-emerald-300 text-emerald-800 font-bold"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRTForZona((prev) => [...prev, rt.id]);
                            } else {
                              setSelectedRTForZona((prev) => prev.filter((id) => id !== rt.id));
                            }
                          }}
                          className="rounded text-emerald-700 focus:ring-emerald-500"
                        />
                        <span className="truncate">{rt.nama}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setModalAturRT({ isOpen: false, zona: null, kelurahan: null })}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveAturRT}
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition disabled:opacity-60"
                >
                  {saving ? "Menyimpan…" : "Simpan Cakupan RT"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRM DELETE DIALOG ── */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Hapus ${deleteTarget?.title || ""}`}
        message={deleteTarget?.description || "Apakah Anda yakin ingin menghapus data ini?"}
        confirmText={deleting ? "Menghapus…" : "Hapus"}
        cancelText="Batal"
        variant="danger"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
