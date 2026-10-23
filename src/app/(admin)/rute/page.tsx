"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { useToast } from "@/components/Toast";
import ConfirmDialog from "@/components/ConfirmDialog";
import {
  Truck,
  Calendar,
  Clock,
  MapPin,
  Layers,
  User,
  Plus,
  X,
  Search,
  Check,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Trash2,
  Edit2,
  ChevronDown,
  Info,
} from "lucide-react";

type Kelurahan = { id: number; nama: string; kecamatan?: string | null };
type Zona = {
  id: number;
  nama: string;
  warna?: string | null;
  kelurahanId: number;
  kelurahan?: { id: number; nama: string; kecamatan?: string | null } | null;
};
type Petugas = { id: number; nama: string; aktif?: boolean; jabatan?: string | null };
type Kendaraan = { id: number; nama: string; platNomor: string | null; jenis: string; kapasitas?: number | null; aktif?: boolean };
type Rute = {
  id: number;
  nama: string;
  hari: string;
  jam?: string;
  aktif: boolean;
  kelurahan?: Kelurahan | null;
  kelurahans?: Kelurahan[];
  zona?: { id: number; nama: string; kelurahanId: number } | null;
  zonas?: { id: number; nama: string; kelurahanId: number }[];
  kendaraanId?: number | null;
  kendaraan?: Kendaraan | null;
  petugas?: Petugas;
  _count: { jadwal: number };
};
type JadwalItem = {
  pelanggan?: { latitude?: number | null; longitude?: number | null };
};

type Pelanggan = {
  id: number;
  nama: string;
  alamat: string;
  noTelepon: string;
  fotoRumah?: string;
  patokanLokasi?: string;
  latitude?: number | null;
  longitude?: number | null;
};
type JadwalPelanggan = {
  id: number;
  hari: string;
  jam?: string;
  aktif: boolean;
  pelanggan: Pelanggan;
  rute: {
    id: number;
    nama: string;
    hari: string;
    jam?: string;
    kelurahan?: { nama: string } | null;
    zona?: { nama: string } | null;
  };
  _count: { pengangkutan: number };
};

const HARI_LIST = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

function ChipCheck({ checked }: { checked: boolean }) {
  return (
    <span
      className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded text-[10px] font-bold leading-none transition-colors ${
        checked ? "bg-emerald-700 text-white" : "border border-slate-300 bg-white text-transparent"
      }`}
    >
      ✓
    </span>
  );
}

function chipCls(checked: boolean) {
  return checked
    ? "flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 font-semibold shadow-sm"
    : "flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 font-medium hover:bg-slate-50";
}

export default function RutePage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500 font-medium">Memuat Rute & Jadwal...</div>}>
      <RuteContent />
    </Suspense>
  );
}

function RuteContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "jadwal" ? "jadwal" : "rute";
  const [activeTab, setActiveTab] = useState<"rute" | "jadwal">(initialTab);

  const { showToast } = useToast();

  // === STATE TAB 1: RUTE ===
  const [rute, setRute] = useState<Rute[]>([]);
  const [kelurahanList, setKelurahanList] = useState<Kelurahan[]>([]);
  const [zonaList, setZonaList] = useState<Zona[]>([]);
  const [kendaraanList, setKendaraanList] = useState<Kendaraan[]>([]);
  const [petugasList, setPetugasList] = useState<Petugas[]>([]);
  const [loadingRute, setLoadingRute] = useState(true);
  const [showRuteForm, setShowRuteForm] = useState(false);
  const [editingRute, setEditingRute] = useState<Rute | null>(null);
  const [deleteTargetRute, setDeleteTargetRute] = useState<Rute | null>(null);
  const [deletingRute, setDeletingRute] = useState(false);
  const [ruteForm, setRuteForm] = useState({
    nama: "",
    hari: "Senin,Rabu,Jumat",
    jam: "",
    kelurahanId: "",
    kelurahanIds: [] as string[],
    zonaId: "",
    zonaIds: [] as string[],
    kendaraanId: "",
    petugasId: "",
  });

  // === STATE TAB 2: JADWAL PELANGGAN ===
  const [jadwal, setJadwal] = useState<JadwalPelanggan[]>([]);
  const [pelangganList, setPelangganList] = useState<Pelanggan[]>([]);
  const [loadingJadwal, setLoadingJadwal] = useState(true);
  const [showJadwalForm, setShowJadwalForm] = useState(false);
  const [filterHari, setFilterHari] = useState("");
  const [filterRute, setFilterRute] = useState("");
  const [jadwalForm, setJadwalForm] = useState({ hari: "Senin", jam: "", pelangganId: "", ruteId: "" });
  const [editingJadwal, setEditingJadwal] = useState<JadwalPelanggan | null>(null);
  const [deleteTargetJadwal, setDeleteTargetJadwal] = useState<JadwalPelanggan | null>(null);
  const [deletingJadwal, setDeletingJadwal] = useState(false);

  // Search & Filter Zona inside modal
  const [zonaSearch, setZonaSearch] = useState("");
  const [selectedKelurahanFilter, setSelectedKelurahanFilter] = useState<string>("all_with_zones");

  const PRESET_HARI = [
    { label: "Sen, Rab, Jum", value: "Senin,Rabu,Jumat" },
    { label: "Sel, Kam, Sab", value: "Selasa,Kamis,Sabtu" },
    { label: "Senin - Jumat", value: "Senin,Selasa,Rabu,Kamis,Jumat" },
    { label: "Setiap Hari", value: "Senin,Selasa,Rabu,Kamis,Jumat,Sabtu,Minggu" },
  ];

  // Kelurahan yang memiliki zona
  const kelurahansWithZones = useMemo(() => {
    const counts: Record<number, number> = {};
    zonaList.forEach((z) => {
      counts[z.kelurahanId] = (counts[z.kelurahanId] || 0) + 1;
    });
    return kelurahanList
      .filter((k) => (counts[k.id] || 0) > 0)
      .map((k) => ({ ...k, countZona: counts[k.id] || 0 }))
      .sort((a, b) => b.countZona - a.countZona);
  }, [kelurahanList, zonaList]);

  // Zona yang difilter berdasarkan tab & pencarian
  const displayedZonas = useMemo(() => {
    let list = zonaList;
    if (selectedKelurahanFilter !== "all" && selectedKelurahanFilter !== "all_with_zones") {
      const kelId = parseInt(selectedKelurahanFilter);
      list = list.filter((z) => z.kelurahanId === kelId);
    }
    if (zonaSearch.trim()) {
      const q = zonaSearch.toLowerCase();
      list = list.filter((z) => {
        const matchNama = z.nama.toLowerCase().includes(q);
        const kelNama = z.kelurahan?.nama || kelurahanList.find((k) => k.id === z.kelurahanId)?.nama || "";
        return matchNama || kelNama.toLowerCase().includes(q);
      });
    }
    return list;
  }, [zonaList, selectedKelurahanFilter, zonaSearch, kelurahanList]);

  // Sync tab with URL if changed
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "jadwal") {
      setActiveTab("jadwal");
    } else if (tabParam === "rute") {
      setActiveTab("rute");
    }
  }, [searchParams]);

  // Fetch Master Data Rute
  const fetchRuteData = useCallback(async () => {
    try {
      const [ruteRes, kelurahanRes, zonaRes, petugasRes, kendaraanRes] = await Promise.all([
        fetch("/api/rute"),
        fetch("/api/kelurahan"),
        fetch("/api/zona"),
        fetch("/api/petugas"),
        fetch("/api/kendaraan"),
      ]);
      const ruteData = await ruteRes.json();
      setRute(Array.isArray(ruteData) ? ruteData : []);
      const kelData = await kelurahanRes.json();
      setKelurahanList(Array.isArray(kelData) ? kelData : []);
      const zonaData = await zonaRes.json();
      setZonaList(Array.isArray(zonaData) ? zonaData : []);
      const petugasData = await petugasRes.json();
      setPetugasList(Array.isArray(petugasData) ? petugasData : []);
      const kendaraanData = await kendaraanRes.json();
      setKendaraanList(Array.isArray(kendaraanData) ? kendaraanData : []);
    } catch {
      showToast("Gagal memuat data rute", "error");
    } finally {
      setLoadingRute(false);
    }
  }, [showToast]);

  // Fetch Jadwal Pelanggan Data
  const fetchJadwalData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterHari) params.set("hari", filterHari);
      if (filterRute) params.set("ruteId", filterRute);

      const [jadwalRes, pelangganRes] = await Promise.all([
        fetch(`/api/jadwal?${params}`),
        fetch("/api/pelanggan"),
      ]);
      setJadwal(await jadwalRes.json());
      setPelangganList(await pelangganRes.json());
    } catch {
      showToast("Gagal memuat jadwal pelanggan", "error");
    } finally {
      setLoadingJadwal(false);
    }
  }, [filterHari, filterRute, showToast]);

  useEffect(() => {
    fetchRuteData();
  }, [fetchRuteData]);

  useEffect(() => {
    if (activeTab === "jadwal") {
      fetchJadwalData();
    }
  }, [activeTab, fetchJadwalData]);

  // === HANDLERS RUTE ===
  function openCreateRute() {
    setEditingRute(null);
    setRuteForm({
      nama: "",
      hari: "Senin,Rabu,Jumat",
      jam: "",
      kelurahanId: "",
      kelurahanIds: [],
      zonaId: "",
      zonaIds: [],
      kendaraanId: kendaraanList.length > 0 ? kendaraanList[0].id.toString() : "",
      petugasId: "",
    });
    setZonaSearch("");
    setSelectedKelurahanFilter("all_with_zones");
    setShowRuteForm(true);
  }

  function openEditRute(r: Rute) {
    setEditingRute(r);
    let currentZonaIds: string[] = [];
    if (r.zonas && r.zonas.length > 0) {
      currentZonaIds = r.zonas.map((z) => z.id.toString());
    } else if (r.zona) {
      currentZonaIds = [r.zona.id.toString()];
    }

    let currentKelurahanIds: string[] = [];
    if (r.kelurahans && r.kelurahans.length > 0) {
      currentKelurahanIds = r.kelurahans.map((k) => k.id.toString());
    } else if (r.kelurahan) {
      currentKelurahanIds = [r.kelurahan.id.toString()];
    }

    setRuteForm({
      nama: r.nama,
      hari: r.hari,
      jam: r.jam || "",
      kelurahanId: r.kelurahan?.id ? r.kelurahan.id.toString() : "",
      kelurahanIds: currentKelurahanIds,
      zonaId: r.zona?.id ? r.zona.id.toString() : "",
      zonaIds: currentZonaIds,
      kendaraanId: r.kendaraan?.id?.toString() || r.kendaraanId?.toString() || "",
      petugasId: r.petugas?.id?.toString() || "",
    });
    setZonaSearch("");
    if (currentKelurahanIds.length === 1) {
      setSelectedKelurahanFilter(currentKelurahanIds[0]);
    } else {
      setSelectedKelurahanFilter("all_with_zones");
    }
    setShowRuteForm(true);
  }

  function toggleZona(z: Zona) {
    const zId = z.id.toString();
    const kelIdStr = z.kelurahanId.toString();
    const isChecked = ruteForm.zonaIds.includes(zId) || ruteForm.zonaId === zId;

    let nextZonaIds = isChecked
      ? ruteForm.zonaIds.filter((id) => id !== zId)
      : [...ruteForm.zonaIds, zId];

    let nextKelIds = [...ruteForm.kelurahanIds];
    if (!isChecked && !nextKelIds.includes(kelIdStr)) {
      nextKelIds.push(kelIdStr);
    }

    let nextNama = ruteForm.nama;
    if (!nextNama.trim()) {
      const kel = z.kelurahan?.nama || kelurahanList.find((k) => k.id === z.kelurahanId)?.nama || "";
      nextNama = `Rute ${kel} - ${z.nama}`;
    }

    setRuteForm((f) => ({
      ...f,
      zonaId: "",
      zonaIds: nextZonaIds,
      kelurahanIds: nextKelIds,
      nama: nextNama,
    }));
  }

  function selectAllZonasInKelurahan(kelId: number) {
    const targetZonas = zonaList.filter((z) => z.kelurahanId === kelId);
    const targetIds = targetZonas.map((z) => z.id.toString());
    const kelIdStr = kelId.toString();

    const nextZonaIds = Array.from(new Set([...ruteForm.zonaIds, ...targetIds]));
    const nextKelIds = Array.from(new Set([...ruteForm.kelurahanIds, kelIdStr]));

    let nextNama = ruteForm.nama;
    if (!nextNama.trim()) {
      const kel = kelurahanList.find((k) => k.id === kelId)?.nama || "";
      nextNama = `Rute ${kel} (Semua Zona)`;
    }

    setRuteForm((f) => ({
      ...f,
      zonaId: "",
      zonaIds: nextZonaIds,
      kelurahanIds: nextKelIds,
      nama: nextNama,
    }));
  }

  function deselectAllZonasInKelurahan(kelId: number) {
    const targetZonas = zonaList.filter((z) => z.kelurahanId === kelId);
    const targetIds = new Set(targetZonas.map((z) => z.id.toString()));

    setRuteForm((f) => ({
      ...f,
      zonaIds: f.zonaIds.filter((id) => !targetIds.has(id)),
    }));
  }

  function toggleKelurahan(id: string) {
    const isChecked = ruteForm.kelurahanIds.includes(id) || ruteForm.kelurahanId === id;
    let newKelurahanIds = isChecked
      ? ruteForm.kelurahanIds.filter((x) => x !== id)
      : [...ruteForm.kelurahanIds, id];

    if (isChecked && ruteForm.kelurahanId === id) {
      newKelurahanIds = ruteForm.kelurahanIds.filter((x) => x !== id);
    }

    let nama = ruteForm.nama;
    if (ruteForm.nama.trim() === "" && newKelurahanIds.length > 0) {
      const k = kelurahanList.find((x) => x.id.toString() === newKelurahanIds[0]);
      nama = `Angkut ${k?.nama ?? ""}`.trim();
    }

    setRuteForm((f) => ({
      ...f,
      kelurahanId: "",
      kelurahanIds: newKelurahanIds,
      nama,
    }));
  }

  async function handleRuteSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ruteForm.nama.trim()) {
      showToast("Nama rute wajib diisi", "error");
      return;
    }
    if (!ruteForm.hari.trim()) {
      showToast("Pilih minimal satu hari layanan", "error");
      return;
    }
    const hasKelurahan = ruteForm.kelurahanIds.length > 0 || !!ruteForm.kelurahanId;
    const hasZona = ruteForm.zonaIds.length > 0 || !!ruteForm.zonaId;
    if (!hasKelurahan && !hasZona) {
      showToast("Pilih minimal satu kelurahan atau zona cakupan rute", "error");
      return;
    }

    const url = editingRute ? `/api/rute/${editingRute.id}` : "/api/rute";
    const method = editingRute ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ruteForm),
    });

    if (res.ok) {
      setShowRuteForm(false);
      setEditingRute(null);
      showToast(editingRute ? "Rute berhasil diperbarui" : "Rute berhasil ditambahkan");
      fetchRuteData();
    } else {
      const data = await res.json();
      showToast(data.error || "Gagal menyimpan", "error");
    }
  }

  async function confirmDeleteRute() {
    if (!deleteTargetRute) return;
    setDeletingRute(true);
    const res = await fetch(`/api/rute/${deleteTargetRute.id}`, { method: "DELETE" });
    setDeletingRute(false);
    if (res.ok) {
      showToast("Rute berhasil dihapus");
      setDeleteTargetRute(null);
      fetchRuteData();
    } else {
      showToast("Gagal menghapus rute", "error");
    }
  }

  async function toggleAktifRute(r: Rute) {
    const res = await fetch(`/api/rute/${r.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aktif: !r.aktif }),
    });
    if (res.ok) {
      showToast(r.aktif ? "Rute dinonaktifkan" : "Rute diaktifkan");
      fetchRuteData();
    } else {
      showToast("Gagal mengubah status", "error");
    }
  }

  async function bukaMap(r: Rute) {
    try {
      const res = await fetch(`/api/jadwal?ruteId=${r.id}`);
      const jdwl = await res.json();
      const withCoords = jdwl.filter(
        (j: JadwalItem) => j.pelanggan?.latitude && j.pelanggan?.longitude
      );
      if (withCoords.length === 0) {
        showToast("Belum ada koordinat untuk pelanggan di rute ini", "warning");
        return;
      }
      const waypoints = withCoords.map(
        (j: JadwalItem) => `${j.pelanggan!.latitude},${j.pelanggan!.longitude}`
      );
      window.open(`https://www.google.com/maps/dir/${waypoints.join("/")}`, "_blank");
    } catch {
      showToast("Gagal memuat data rute", "error");
    }
  }

  // === HANDLERS JADWAL PELANGGAN ===
  function openCreateJadwal() {
    setEditingJadwal(null);
    setJadwalForm({ hari: "Senin", jam: "", pelangganId: "", ruteId: rute[0]?.id.toString() || "" });
    setShowJadwalForm(true);
  }

  function openEditJadwal(j: JadwalPelanggan) {
    setEditingJadwal(j);
    setJadwalForm({
      hari: j.hari,
      jam: j.jam || "",
      pelangganId: j.pelanggan.id.toString(),
      ruteId: j.rute.id.toString(),
    });
    setShowJadwalForm(true);
  }

  async function handleJadwalSubmit(e: React.FormEvent) {
    e.preventDefault();
    const url = editingJadwal ? `/api/jadwal/${editingJadwal.id}` : "/api/jadwal";
    const method = editingJadwal ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(jadwalForm),
    });

    if (res.ok) {
      setShowJadwalForm(false);
      showToast(editingJadwal ? "Jadwal berhasil diperbarui" : "Jadwal berhasil ditambahkan");
      fetchJadwalData();
    } else {
      const data = await res.json();
      showToast(data.error || "Gagal menyimpan", "error");
    }
  }

  async function confirmDeleteJadwal() {
    if (!deleteTargetJadwal) return;
    setDeletingJadwal(true);
    const res = await fetch(`/api/jadwal/${deleteTargetJadwal.id}`, { method: "DELETE" });
    setDeletingJadwal(false);
    if (res.ok) {
      showToast("Jadwal berhasil dihapus");
      setDeleteTargetJadwal(null);
      fetchJadwalData();
    } else {
      showToast("Gagal menghapus jadwal", "error");
    }
  }

  return (
    <div className="p-6">
      {/* Header with Sub-tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-none mb-1">
            Rute & Jadwal Operasional
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Kelola master jalur rute armada serta jadwal pengangkutan pelanggan
          </p>
        </div>

        {activeTab === "rute" ? (
          <button
            onClick={openCreateRute}
            className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm hover:shadow active:scale-[0.98] transition-all flex items-center gap-2 self-start sm:self-auto"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Tambah Rute Armada
          </button>
        ) : (
          <button
            onClick={openCreateJadwal}
            className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm hover:shadow active:scale-[0.98] transition-all flex items-center gap-2 self-start sm:self-auto"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Tambah Jadwal Pelanggan
          </button>
        )}
      </div>

      {/* Modern Navigation Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab("rute")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            activeTab === "rute"
              ? "bg-emerald-700 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <span>🚛 Master Rute Armada</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${activeTab === "rute" ? "bg-emerald-800 text-white" : "bg-slate-200 text-slate-700"}`}>
            {rute.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("jadwal")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            activeTab === "jadwal"
              ? "bg-emerald-700 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <span>📅 Plotting Jadwal Pelanggan</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${activeTab === "jadwal" ? "bg-emerald-800 text-white" : "bg-slate-200 text-slate-700"}`}>
            {jadwal.length}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: MASTER RUTE ARMADA */}
      {/* ========================================================================= */}
      {activeTab === "rute" && (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-700 border-b border-slate-200/80 text-xs font-semibold uppercase tracking-wider">
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Nama Rute</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Kelurahan</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Zona</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Hari Layanan</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Jam</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Mobil Armada</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Petugas</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600">Pelanggan</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600">Status</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingRute ? (
                    <tr><td colSpan={10} className="px-4 py-8 text-center text-slate-600">Memuat rute...</td></tr>
                  ) : rute.length === 0 ? (
                    <tr><td colSpan={10} className="px-4 py-8 text-center text-slate-600">Belum ada rute</td></tr>
                  ) : (
                    rute.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/60 transition">
                        <td className="px-4 py-3 font-semibold text-slate-900">{r.nama}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200">
                            {r.kelurahans && r.kelurahans.length > 0
                              ? r.kelurahans.map((k) => k.nama).join(", ")
                              : r.kelurahan?.nama ?? "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                            {r.zonas && r.zonas.length > 0
                              ? r.zonas.map((z) => z.nama).join(", ")
                              : r.zona?.nama ?? "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {r.hari.split(",").map((h) => (
                              <span key={h} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-xs font-medium">{h.slice(0, 3)}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-xs font-medium">{r.jam || "-"}</td>
                        <td className="px-4 py-3 text-slate-700">
                          {r.kendaraan ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <span>{r.kendaraan.jenis === "dump_truck" ? "🚛" : r.kendaraan.jenis === "pickup" ? "🛺" : "🛞"}</span>
                              <span>{r.kendaraan.nama}</span>
                              {r.kendaraan.platNomor && <span className="text-[10px] text-emerald-600 font-mono">({r.kendaraan.platNomor})</span>}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{r.petugas?.nama || "-"}</td>
                        <td className="px-4 py-3 text-center text-slate-600 text-xs font-medium">{r._count.jadwal}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => toggleAktifRute(r)}
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition ${
                              r.aktif
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                                : "bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            {r.aktif ? "Aktif" : "Nonaktif"}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => bukaMap(r)}
                              className="p-1.5 text-slate-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition"
                              title="Buka rute di Google Maps"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                              </svg>
                            </button>
                            <button
                              onClick={() => openEditRute(r)}
                              className="p-1.5 text-slate-600 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                              title="Edit"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => setDeleteTargetRute(r)}
                              className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Hapus"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3 mt-4">
            {rute.map((r) => (
              <div key={r.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-slate-900">{r.nama}</h3>
                  <button
                    onClick={() => toggleAktifRute(r)}
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      r.aktif ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 border border-slate-200 text-slate-600"
                    }`}
                  >
                    {r.aktif ? "Aktif" : "Nonaktif"}
                  </button>
                </div>
                <div className="text-xs text-slate-600 space-y-1">
                  {r.kelurahans && r.kelurahans.length > 0 ? (
                    <p>📍 {r.kelurahans.map((k) => k.nama).join(", ")}</p>
                  ) : (
                    <p>📍 {r.kelurahan?.nama ?? "—"}</p>
                  )}
                  {r.zonas && r.zonas.length > 0 ? (
                    <p>🗺️ Zona {r.zonas.map((z) => z.nama).join(", ")}</p>
                  ) : r.zona?.nama ? (
                    <p>🗺️ Zona {r.zona.nama}</p>
                  ) : null}
                  <p>📅 {r.hari}</p>
                  {r.jam && <p>⏰ {r.jam}</p>}
                  <p>🚛 {r.kendaraan ? `${r.kendaraan.nama}${r.kendaraan.platNomor ? ` (${r.kendaraan.platNomor})` : ""}` : "Belum ada armada"}</p>
                  <p>👤 {r.petugas?.nama || "Belum ada petugas"}</p>
                  <p>👥 {r._count.jadwal} pelanggan</p>
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                  <button onClick={() => bukaMap(r)} className="flex-1 text-center text-xs font-semibold bg-emerald-50 border border-emerald-200 text-emerald-700 py-2 rounded-xl hover:bg-emerald-100 transition">🗺️ Map</button>
                  <button onClick={() => openEditRute(r)} className="flex-1 text-center text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-700 py-2 rounded-xl hover:bg-slate-100 transition">Edit</button>
                  <button onClick={() => setDeleteTargetRute(r)} className="flex-1 text-center text-xs font-semibold bg-rose-50 border border-rose-200 text-rose-600 py-2 rounded-xl hover:bg-rose-100 transition">Hapus</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: JADWAL PELANGGAN */}
      {/* ========================================================================= */}
      {activeTab === "jadwal" && (
        <>
          {/* Filters */}
          <div className="flex gap-3 mb-4 flex-wrap">
            <select
              value={filterHari}
              onChange={(e) => setFilterHari(e.target.value)}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              <option value="">Semua Hari</option>
              {HARI_LIST.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
            <select
              value={filterRute}
              onChange={(e) => setFilterRute(e.target.value)}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              <option value="">Semua Rute</option>
              {rute.map((r) => (
                <option key={r.id} value={r.id}>{r.nama}</option>
              ))}
            </select>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-600 font-semibold text-xs border-b border-slate-200 uppercase tracking-wider">
                    <th className="text-left px-4 py-3.5">Hari</th>
                    <th className="text-left px-4 py-3.5">Pelanggan</th>
                    <th className="text-left px-4 py-3.5">Rute</th>
                    <th className="text-left px-4 py-3.5">Jam</th>
                    <th className="text-center px-4 py-3.5">Pengangkutan</th>
                    <th className="text-center px-4 py-3.5">Status</th>
                    <th className="text-right px-4 py-3.5">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingJadwal ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-600 font-medium text-xs">Memuat jadwal pelanggan...</td></tr>
                  ) : jadwal.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-600 font-medium text-xs">Belum ada jadwal pelanggan</td></tr>
                  ) : (
                    jadwal.map((j) => (
                      <tr key={j.id} className="hover:bg-slate-50/80 transition-colors text-xs">
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                            {j.hari}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            {j.pelanggan.fotoRumah && (
                              <Image
                                src={j.pelanggan.fotoRumah}
                                alt={`Foto rumah ${j.pelanggan.nama}`}
                                unoptimized
                                width={48}
                                height={48}
                                className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                              />
                            )}
                            <div>
                              <div className="font-semibold text-slate-900">{j.pelanggan.nama}</div>
                              <div className="text-xs text-slate-500">{j.pelanggan.alamat}</div>
                              {j.pelanggan.patokanLokasi && (
                                <div className="text-xs text-amber-700 font-medium">📍 {j.pelanggan.patokanLokasi}</div>
                              )}
                              {j.pelanggan.latitude && j.pelanggan.longitude ? (
                                <a
                                  href={`https://www.google.com/maps?q=${j.pelanggan.latitude},${j.pelanggan.longitude}`}
                                  target="_blank"
                                  className="text-xs text-emerald-700 hover:text-emerald-700 font-medium inline-flex items-center gap-0.5"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                  {j.pelanggan.latitude.toFixed(5)}, {j.pelanggan.longitude.toFixed(5)}
                                </a>
                              ) : (
                                <span className="text-xs text-slate-600 font-medium">Tanpa koordinat</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-700 font-medium">
                          {j.rute.nama}
                          {j.rute.zona?.nama && (
                            <span className="ml-1 text-xs text-purple-600">· {j.rute.zona.nama}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600 font-medium text-xs tabular-nums">{j.jam || "-"}</td>
                        <td className="px-4 py-3 text-center text-slate-600 font-medium text-xs tabular-nums">{j._count.pengangkutan}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            j.aktif ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 border border-slate-200 text-slate-600 font-medium"
                          }`}>
                            {j.aktif ? "Aktif" : "Nonaktif"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditJadwal(j)}
                              className="text-slate-600 hover:text-sky-600 transition"
                              title="Edit"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => setDeleteTargetJadwal(j)}
                              className="text-red-600 hover:text-red-400 transition"
                              title="Hapus"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            </div>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* MODAL FORM RUTE (MODERN & ERGONOMIC) */}
      {/* ========================================================================= */}
      {showRuteForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-6 animate-in fade-in duration-150">
          <div className="w-full max-w-2xl max-h-[92vh] bg-white rounded-3xl border border-slate-200/80 shadow-2xl flex flex-col overflow-hidden">
            {/* Header Modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shadow-xs">
                  <Truck className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                    {editingRute ? "Edit Rute Armada" : "Tambah Rute Armada Baru"}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Atur jadwal, armada penjemput, serta cakupan zona operasional
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setShowRuteForm(false); setEditingRute(null); }}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition"
                aria-label="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleRuteSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* BAGIAN 1: IDENTITAS RUTE & JADWAL */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                  <Calendar className="w-4 h-4 text-emerald-700" />
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    1. Identitas & Hari Layanan
                  </h3>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Nama Rute <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={ruteForm.nama}
                    onChange={(e) => setRuteForm({ ...ruteForm, nama: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-sm font-medium bg-white"
                    placeholder="cth: Rute Kalibaru - Dump Truck 01"
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-semibold text-slate-700">
                      Hari Pengangkutan <span className="text-red-500">*</span>
                    </label>
                  </div>

                  {/* Preset Cepat Hari */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
                      Pilihan Cepat:
                    </span>
                    {PRESET_HARI.map((p) => {
                      const isCurrent = ruteForm.hari === p.value;
                      return (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => setRuteForm((f) => ({ ...f, hari: p.value }))}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                            isCurrent
                              ? "bg-emerald-700 text-white shadow-xs"
                              : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                          }`}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Tombol 7 Hari */}
                  <div className="grid grid-cols-7 gap-1.5">
                    {HARI_LIST.map((h) => {
                      const activeDays = ruteForm.hari.split(",").map((s) => s.trim()).filter(Boolean);
                      const isSelected = activeDays.includes(h);
                      return (
                        <button
                          type="button"
                          key={h}
                          onClick={() => {
                            const updated = isSelected
                              ? activeDays.filter((x) => x !== h)
                              : [...activeDays, h];
                            setRuteForm({ ...ruteForm, hari: updated.join(",") });
                          }}
                          className={`py-2 text-xs font-bold rounded-xl border transition flex flex-col items-center justify-center gap-0.5 ${
                            isSelected
                              ? "bg-emerald-700 text-white border-emerald-700 shadow-xs"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                          }`}
                        >
                          <span>{h.slice(0, 3)}</span>
                          <span className={`text-[9px] ${isSelected ? "text-emerald-100" : "text-slate-400"}`}>
                            {isSelected ? "✓" : "—"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Estimasi Jam Operasional (Opsional)
                  </label>
                  <input
                    type="text"
                    value={ruteForm.jam}
                    onChange={(e) => setRuteForm({ ...ruteForm, jam: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-sm bg-white"
                    placeholder="cth: 08:00 - 11:00 (Pagi)"
                  />
                </div>
              </div>

              {/* BAGIAN 2: MOBIL ARMADA & PENGEMUDI */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                  <Truck className="w-4 h-4 text-emerald-700" />
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    2. Unit Armada Pickup & Supir
                  </h3>
                </div>

                <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      Mobil Armada Pickup (Opsional)
                    </label>
                    <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-full">
                      Armada
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Pilih unit kendaraan operasional yang bertugas mengeksekusi penjemputan sampah di zona rute ini.
                  </p>
                  <select
                    value={ruteForm.kendaraanId}
                    onChange={(e) => {
                      const v = e.target.value;
                      const k = kendaraanList.find((x) => x.id.toString() === v);
                      let newNama = ruteForm.nama;
                      if (!newNama.trim() && k) {
                        newNama = `Rute ${k.nama}`;
                      }
                      setRuteForm({ ...ruteForm, kendaraanId: v, nama: newNama });
                    }}
                    className="w-full px-3.5 py-2.5 bg-white border border-emerald-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-sm font-medium text-slate-900"
                  >
                    <option value="">-- Tanpa Armada / Pilih Nanti --</option>
                    {kendaraanList.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.jenis === "dump_truck" ? "🚛 Dump Truck" : k.jenis === "pickup" ? "🛺 Pickup" : "🛞 Gerobak"} — {k.nama} {k.platNomor ? `(${k.platNomor})` : ""} {k.kapasitas ? `[${k.kapasitas} kg]` : ""}
                      </option>
                    ))}
                  </select>
                  {kendaraanList.length === 0 && (
                    <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200/70 rounded-lg p-2">
                      💡 Belum ada armada mobil yang didaftarkan. Anda tetap dapat menyimpan rute ini dan menugaskan armada nanti via menu Armada / Kendaraan.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    Petugas / Supir Utama (Opsional)
                  </label>
                  <select
                    value={ruteForm.petugasId}
                    onChange={(e) => setRuteForm({ ...ruteForm, petugasId: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-sm bg-white"
                  >
                    <option value="">-- Pilih Petugas / Supir (Opsional) --</option>
                    {petugasList.map((p) => (
                      <option key={p.id} value={p.id}>
                        👤 {p.nama} {p.jabatan ? `(${p.jabatan})` : ""}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Bisa dikosongkan. Pengemudi shift di lapangan dapat memilih kendaraan ini langsung dari aplikasi mobile.
                  </p>
                </div>
              </div>

              {/* BAGIAN 3: CAKUPAN ZONA LAYANAN */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                  <MapPin className="w-4 h-4 text-emerald-700" />
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    3. Cakupan Zona Angkut
                  </h3>
                </div>

                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/60 space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        Pilih Zona yang Disisir Armada Ini
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Klik kartu zona di bawah. Kelurahan asal otomatis terhubung ke rute.
                      </p>
                    </div>

                    {/* Quick Search Zona */}
                    <div className="relative w-full sm:w-56">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={zonaSearch}
                        onChange={(e) => setZonaSearch(e.target.value)}
                        placeholder="Cari zona atau kelurahan..."
                        className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-medium"
                      />
                      {zonaSearch && (
                        <button
                          type="button"
                          onClick={() => setZonaSearch("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Filter Tabs Kelurahan */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setSelectedKelurahanFilter("all_with_zones")}
                      className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
                        selectedKelurahanFilter === "all_with_zones"
                          ? "bg-emerald-700 text-white shadow-xs"
                          : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      ✨ Semua Zona ({zonaList.length})
                    </button>
                    {kelurahansWithZones.map((k) => (
                      <button
                        key={k.id}
                        type="button"
                        onClick={() => setSelectedKelurahanFilter(k.id.toString())}
                        className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                          selectedKelurahanFilter === k.id.toString()
                            ? "bg-emerald-700 text-white shadow-xs"
                            : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <span>{k.nama}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                            selectedKelurahanFilter === k.id.toString()
                              ? "bg-emerald-800 text-white"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {k.countZona}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Bulk Actions when filtered */}
                  {selectedKelurahanFilter !== "all_with_zones" && (
                    <div className="flex items-center justify-between text-xs pt-0.5">
                      <span className="text-slate-600 font-medium text-[11px]">
                        Kelurahan: <strong className="text-slate-900">{kelurahanList.find((k) => k.id.toString() === selectedKelurahanFilter)?.nama}</strong>
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => selectAllZonasInKelurahan(parseInt(selectedKelurahanFilter))}
                          className="text-emerald-700 hover:text-emerald-800 font-bold text-xs flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" /> Pilih Semua
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => deselectAllZonasInKelurahan(parseInt(selectedKelurahanFilter))}
                          className="text-slate-500 hover:text-rose-600 font-medium text-xs"
                        >
                          Batal Pilih
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Selected Zona Summary Chips */}
                  {ruteForm.zonaIds.length > 0 && (
                    <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          {ruteForm.zonaIds.length} Zona Terpilih untuk Rute Ini:
                        </span>
                        <button
                          type="button"
                          onClick={() => setRuteForm((f) => ({ ...f, zonaIds: [], zonaId: "" }))}
                          className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold"
                        >
                          Hapus Semua
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                        {ruteForm.zonaIds.map((zId) => {
                          const z = zonaList.find((x) => x.id.toString() === zId);
                          if (!z) return null;
                          const kelNama = z.kelurahan?.nama || kelurahanList.find((k) => k.id === z.kelurahanId)?.nama || "";
                          return (
                            <span
                              key={zId}
                              className="inline-flex items-center gap-1 pl-2 pr-1.5 py-0.5 rounded-lg text-xs font-semibold bg-white border border-emerald-300 text-emerald-900 shadow-xs"
                            >
                              <span className="text-[10px] text-slate-500 font-normal">[{kelNama}]</span>
                              <span>{z.nama}</span>
                              <button
                                type="button"
                                onClick={() => toggleZona(z)}
                                className="p-0.5 hover:bg-emerald-100 rounded text-emerald-700"
                                title="Hapus zona ini"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Zona Grid */}
                  {displayedZonas.length === 0 ? (
                    <div className="border border-dashed border-slate-300 rounded-xl p-6 text-center text-xs text-slate-500 bg-white">
                      Tidak ada zona yang cocok dengan filter atau pencarian Anda.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                      {displayedZonas.map((z) => {
                        const idStr = z.id.toString();
                        const checked = ruteForm.zonaIds.includes(idStr) || ruteForm.zonaId === idStr;
                        const kelNama = z.kelurahan?.nama || kelurahanList.find((k) => k.id === z.kelurahanId)?.nama || "";
                        return (
                          <div
                            key={z.id}
                            onClick={() => toggleZona(z)}
                            className={`p-2.5 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between gap-2 ${
                              checked
                                ? "bg-emerald-50/90 border-emerald-400 text-emerald-950 font-semibold shadow-xs"
                                : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: z.warna || "#10b981" }}
                              />
                              <div className="truncate">
                                <div className="truncate text-slate-900 font-semibold">{z.nama}</div>
                                <div className="text-[10px] text-slate-500 font-normal truncate">
                                  Kel. {kelNama}
                                </div>
                              </div>
                            </div>
                            <ChipCheck checked={checked} />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Accordion Kelurahan Tambahan */}
                  <details
                    open={zonaList.length === 0 || ruteForm.kelurahanIds.length > 0}
                    className="text-xs group border border-slate-200 bg-white rounded-xl p-3"
                  >
                    <summary className="font-semibold text-slate-700 cursor-pointer flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="text-slate-900 font-bold">Cakupan Kelurahan Wilayah Layanan</span>
                        <span className="text-[11px] font-semibold text-emerald-700">
                          {ruteForm.kelurahanIds.length > 0
                            ? `(${ruteForm.kelurahanIds.length} Terpilih)`
                            : "(Wajib minimal 1 jika tanpa zona)"}
                        </span>
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-open:rotate-180 transition" />
                    </summary>
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <p className="text-[11px] text-slate-500 mb-2">
                        Pilih kelurahan yang dilayani oleh rute ini:
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto pr-1">
                        {kelurahanList.map((k) => {
                          const idStr = k.id.toString();
                          const checked = ruteForm.kelurahanIds.includes(idStr) || ruteForm.kelurahanId === idStr;
                          return (
                            <label
                              key={k.id}
                              className={`${chipCls(checked)} text-xs cursor-pointer transition`}
                            >
                              <input
                                type="checkbox"
                                className="hidden"
                                checked={checked}
                                onChange={() => toggleKelurahan(idStr)}
                              />
                              <ChipCheck checked={checked} />
                              <span className="truncate">{k.nama}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </details>
                </div>
              </div>

              {/* Action Buttons Sticky Footer */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => { setShowRuteForm(false); setEditingRute(null); }}
                  className="px-5 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-sm font-bold shadow-sm hover:shadow active:scale-[0.98] transition flex items-center gap-2"
                >
                  <Truck className="w-4 h-4" />
                  <span>{editingRute ? "Simpan Perubahan Rute" : "Buat Rute Armada"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL FORM JADWAL PELANGGAN */}
      {/* ========================================================================= */}
      {showJadwalForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/80 shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
              <h2 className="text-base font-semibold text-slate-900">{editingJadwal ? "Edit Jadwal Pelanggan" : "Tambah Jadwal Pelanggan"}</h2>
              <button onClick={() => { setShowJadwalForm(false); setEditingJadwal(null); }} className="p-1.5 text-slate-600 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition" aria-label="Tutup">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleJadwalSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Pelanggan <span className="text-red-500">*</span></label>
                <select
                  value={jadwalForm.pelangganId}
                  onChange={(e) => setJadwalForm({ ...jadwalForm, pelangganId: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm bg-white"
                  required
                >
                  <option value="">-- Pilih Pelanggan --</option>
                  {pelangganList.map((p) => (
                    <option key={p.id} value={p.id}>{p.nama} — {p.alamat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Rute Armada <span className="text-red-500">*</span></label>
                <select
                  value={jadwalForm.ruteId}
                  onChange={(e) => setJadwalForm({ ...jadwalForm, ruteId: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm bg-white"
                  required
                >
                  <option value="">-- Pilih Rute --</option>
                  {rute.map((r) => (
                    <option key={r.id} value={r.id}>{r.nama} ({r.hari})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Hari <span className="text-red-500">*</span></label>
                  <select
                    value={jadwalForm.hari}
                    onChange={(e) => setJadwalForm({ ...jadwalForm, hari: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm bg-white"
                    required
                  >
                    {HARI_LIST.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Estimasi Jam</label>
                  <input
                    type="text"
                    value={jadwalForm.jam}
                    onChange={(e) => setJadwalForm({ ...jadwalForm, jam: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm bg-white"
                    placeholder="09:00"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => { setShowJadwalForm(false); setEditingJadwal(null); }} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition">Batal</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-sm font-semibold shadow-sm hover:shadow transition">{editingJadwal ? "Simpan Jadwal" : "Tambah Jadwal"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dialog Konfirmasi Hapus Rute */}
      <ConfirmDialog
        open={Boolean(deleteTargetRute)}
        title="Hapus Rute"
        message={`Yakin ingin menghapus rute "${deleteTargetRute?.nama}"? Pelanggan terkait tidak akan memiliki jadwal.`}
        confirmText="Hapus Rute"
        variant="danger"
        loading={deletingRute}
        onConfirm={confirmDeleteRute}
        onCancel={() => setDeleteTargetRute(null)}
      />

      {/* Dialog Konfirmasi Hapus Jadwal */}
      <ConfirmDialog
        open={Boolean(deleteTargetJadwal)}
        title="Hapus Jadwal Pelanggan"
        message={`Yakin ingin menghapus jadwal untuk "${deleteTargetJadwal?.pelanggan.nama}" pada hari ${deleteTargetJadwal?.hari}?`}
        confirmText="Hapus Jadwal"
        variant="danger"
        loading={deletingJadwal}
        onConfirm={confirmDeleteJadwal}
        onCancel={() => setDeleteTargetJadwal(null)}
      />
    </div>
  );
}
