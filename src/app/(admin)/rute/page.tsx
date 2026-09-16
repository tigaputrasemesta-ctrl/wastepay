"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { useToast } from "@/components/Toast";
import ConfirmDialog from "@/components/ConfirmDialog";

type Kelurahan = { id: number; nama: string; kecamatan?: string | null };
type Zona = { id: number; nama: string; kelurahanId: number };
type Petugas = { id: number; nama: string; aktif?: boolean; jabatan?: string | null };
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
      const [ruteRes, kelurahanRes, zonaRes, petugasRes] = await Promise.all([
        fetch("/api/rute"),
        fetch("/api/kelurahan"),
        fetch("/api/zona"),
        fetch("/api/petugas"),
      ]);
      setRute(await ruteRes.json());
      setKelurahanList(await kelurahanRes.json());
      setZonaList(await zonaRes.json());
      const petugasData = await petugasRes.json();
      setPetugasList(Array.isArray(petugasData) ? petugasData : []);
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
    setRuteForm({ nama: "", hari: "Senin,Rabu,Jumat", jam: "", kelurahanId: "", kelurahanIds: [], zonaId: "", zonaIds: [], petugasId: "" });
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
      petugasId: r.petugas?.id?.toString() || "",
    });
    setShowRuteForm(true);
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
      zonaId: "",
      zonaIds: [],
      nama,
    }));
  }

  async function handleRuteSubmit(e: React.FormEvent) {
    e.preventDefault();
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
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Petugas</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600">Pelanggan</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600">Status</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingRute ? (
                    <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-600">Memuat rute...</td></tr>
                  ) : rute.length === 0 ? (
                    <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-600">Belum ada rute</td></tr>
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
      {/* MODAL FORM RUTE */}
      {/* ========================================================================= */}
      {showRuteForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md max-h-[85vh] overflow-y-auto bg-white rounded-3xl border border-slate-200/80 shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 backdrop-blur-sm z-10">
              <h2 className="text-base font-semibold text-slate-900">{editingRute ? "Edit Rute" : "Tambah Rute"}</h2>
              <button onClick={() => { setShowRuteForm(false); setEditingRute(null); }} className="p-1.5 text-slate-600 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition" aria-label="Tutup">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleRuteSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama Rute <span className="text-red-500">*</span></label>
                <input type="text" value={ruteForm.nama} onChange={(e) => setRuteForm({ ...ruteForm, nama: e.target.value })} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm bg-white" placeholder="cth: Rute Sukmajaya 1" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Kelurahan <span className="text-red-500">*</span>
                  <span className="ml-1 text-xs font-normal text-slate-600">(bisa pilih lebih dari satu)</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {kelurahanList.map((k) => {
                    const idStr = k.id.toString();
                    const checked = ruteForm.kelurahanIds.includes(idStr) || ruteForm.kelurahanId === idStr;
                    return (
                      <label
                        key={k.id}
                        className={`${chipCls(checked)} text-xs cursor-pointer transition`}
                        title={k.kecamatan ?? ""}
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
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Zona Angkut
                  <span className="ml-1 text-xs font-normal text-slate-600">(bisa pilih lebih dari satu)</span>
                </label>
                {ruteForm.kelurahanIds.length === 0 && !ruteForm.kelurahanId ? (
                  <div className="border border-dashed border-slate-200 rounded-xl px-3 py-4 text-center text-xs text-slate-600 bg-slate-50/50">
                    Pilih kelurahan terlebih dahulu.
                  </div>
                ) : zonaList.filter((z) => ruteForm.kelurahanIds.includes(z.kelurahanId.toString()) || z.kelurahanId.toString() === ruteForm.kelurahanId).length === 0 ? (
                  <div className="border border-dashed border-slate-200 rounded-xl px-3 py-4 text-center text-xs text-slate-600 bg-slate-50/50">
                    Kelurahan ini belum memiliki zona angkut.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {zonaList.filter((z) => ruteForm.kelurahanIds.includes(z.kelurahanId.toString()) || z.kelurahanId.toString() === ruteForm.kelurahanId).map((z) => {
                      const idStr = z.id.toString();
                      const checked = ruteForm.zonaIds.includes(idStr) || ruteForm.zonaId === idStr;
                      return (
                        <label
                          key={z.id}
                          className={`${chipCls(checked)} text-xs cursor-pointer transition`}
                        >
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={checked}
                            onChange={() => {
                              const newZonas = checked
                                ? ruteForm.zonaIds.filter((x) => x !== idStr)
                                : [...ruteForm.zonaIds, idStr];
                              setRuteForm((f) => ({ ...f, zonaIds: newZonas, zonaId: "" }));
                            }}
                          />
                          <ChipCheck checked={checked} />
                          <span className="truncate">{z.nama}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Hari Pengangkutan <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-4 gap-1.5">
                  {HARI_LIST.map((h) => {
                    const activeDays = ruteForm.hari.split(",").map((s) => s.trim()).filter(Boolean);
                    const isSelected = activeDays.includes(h);
                    return (
                      <button
                        type="button"
                        key={h}
                        onClick={() => {
                          const updated = isSelected ? activeDays.filter((x) => x !== h) : [...activeDays, h];
                          setRuteForm({ ...ruteForm, hari: updated.join(",") });
                        }}
                        className={`py-1.5 text-xs font-semibold rounded-lg border transition ${
                          isSelected ? "bg-emerald-700 text-white border-emerald-700" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {h.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Estimasi Jam</label>
                <input type="text" value={ruteForm.jam} onChange={(e) => setRuteForm({ ...ruteForm, jam: e.target.value })} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm bg-white" placeholder="cth: 08:00 - 11:00" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Petugas Armada</label>
                <select value={ruteForm.petugasId} onChange={(e) => setRuteForm({ ...ruteForm, petugasId: e.target.value })} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm bg-white">
                  <option value="">-- Pilih Petugas --</option>
                  {petugasList.map((p) => (
                    <option key={p.id} value={p.id}>{p.nama}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => { setShowRuteForm(false); setEditingRute(null); }} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition">Batal</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-sm font-semibold shadow-sm hover:shadow transition">{editingRute ? "Simpan Perubahan" : "Tambah Rute"}</button>
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
