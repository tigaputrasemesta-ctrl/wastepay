"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useToast } from "@/components/Toast";
import ConfirmDialog from "@/components/ConfirmDialog";
import CoordinatePicker from "@/components/CoordinatePicker";

type PetugasOpt = { id: number; nama: string };

type Kendaraan = {
  id: number;
  nama: string;
  platNomor: string | null;
  jenis: string;
  kapasitas: number | null;
  aktif: boolean;
  petugas?: PetugasOpt | null;
  _count?: { pengangkutan: number };
};

type Transit = {
  id: number;
  nama: string;
  alamat: string | null;
  latitude: number;
  longitude: number;
  aktif: boolean;
  catatan: string | null;
};

type Tpa = {
  id: number;
  nama: string;
  alamat?: string;
  kota?: string;
  jarak?: number;
  aktif: boolean;
  _count?: { pengangkutan: number };
};

const JENIS_KENDARAAN = [
  { value: "dump_truck", label: "Dump Truck", ikon: "🚛" },
  { value: "pickup", label: "Mobil Pickup", ikon: "🛺" },
  { value: "gerobak", label: "Gerobak", ikon: "🛞" },
];

export default function KendaraanPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500 font-medium">Memuat Armada & Fasilitas...</div>}>
      <ArmadaFasilitasContent />
    </Suspense>
  );
}

function ArmadaFasilitasContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab = tabParam === "transit" ? "transit" : tabParam === "tpa" ? "tpa" : "kendaraan";
  const [activeTab, setActiveTab] = useState<"kendaraan" | "transit" | "tpa">(initialTab);

  const { showToast } = useToast();

  // === STATE KENDARAAN ===
  const [kendaraan, setKendaraan] = useState<Kendaraan[]>([]);
  const [petugasList, setPetugasList] = useState<PetugasOpt[]>([]);
  const [loadingKendaraan, setLoadingKendaraan] = useState(true);
  const [qKendaraan, setQKendaraan] = useState("");
  const [filterJenis, setFilterJenis] = useState("");
  const [showKendaraanForm, setShowKendaraanForm] = useState(false);
  const [editKendaraan, setEditKendaraan] = useState<Kendaraan | null>(null);
  const [kendaraanForm, setKendaraanForm] = useState({
    nama: "",
    platNomor: "",
    jenis: "dump_truck",
    kapasitas: "",
    petugasId: "",
  });

  // === STATE TRANSIT (TPST) ===
  const [transit, setTransit] = useState<Transit[]>([]);
  const [loadingTransit, setLoadingTransit] = useState(true);
  const [qTransit, setQTransit] = useState("");
  const [showTransitForm, setShowTransitForm] = useState(false);
  const [editTransit, setEditTransit] = useState<Transit | null>(null);
  const [transitForm, setTransitForm] = useState({
    nama: "",
    alamat: "",
    latitude: "",
    longitude: "",
    catatan: "",
  });

  // === STATE TPA ===
  const [tpa, setTpa] = useState<Tpa[]>([]);
  const [loadingTpa, setLoadingTpa] = useState(true);
  const [showTpaForm, setShowTpaForm] = useState(false);
  const [editTpa, setEditTpa] = useState<Tpa | null>(null);
  const [deleteTargetTpa, setDeleteTargetTpa] = useState<Tpa | null>(null);
  const [deletingTpa, setDeletingTpa] = useState(false);
  const [tpaForm, setTpaForm] = useState({ nama: "", alamat: "", kota: "", jarak: "" });

  // Sync tab with URL
  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "transit") setActiveTab("transit");
    else if (t === "tpa") setActiveTab("tpa");
    else if (t === "kendaraan") setActiveTab("kendaraan");
  }, [searchParams]);

  // Fetch data
  const fetchKendaraanData = useCallback(async () => {
    try {
      const [kRes, pRes] = await Promise.all([fetch("/api/kendaraan"), fetch("/api/petugas")]);
      setKendaraan(await kRes.json());
      const ps = await pRes.json();
      setPetugasList((Array.isArray(ps) ? ps : ps.petugas ?? []).map((p: { id: number; nama: string }) => ({ id: p.id, nama: p.nama })));
    } catch {
      showToast("Gagal memuat kendaraan", "error");
    } finally {
      setLoadingKendaraan(false);
    }
  }, [showToast]);

  const fetchTransitData = useCallback(async () => {
    try {
      const res = await fetch("/api/transit");
      setTransit(await res.json());
    } catch {
      showToast("Gagal memuat titik transit", "error");
    } finally {
      setLoadingTransit(false);
    }
  }, [showToast]);

  const fetchTpaData = useCallback(async () => {
    try {
      const res = await fetch("/api/tpa");
      setTpa(await res.json());
    } catch {
      showToast("Gagal memuat data TPA", "error");
    } finally {
      setLoadingTpa(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchKendaraanData();
    fetchTransitData();
    fetchTpaData();
  }, [fetchKendaraanData, fetchTransitData, fetchTpaData]);

  // === HANDLERS KENDARAAN ===
  function openKendaraanForm(k?: Kendaraan) {
    setEditKendaraan(k ?? null);
    setKendaraanForm({
      nama: k?.nama ?? "",
      platNomor: k?.platNomor ?? "",
      jenis: k?.jenis ?? "dump_truck",
      kapasitas: k?.kapasitas?.toString() ?? "",
      petugasId: k?.petugas?.id?.toString() ?? "",
    });
    setShowKendaraanForm(true);
  }

  async function saveKendaraan(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(editKendaraan ? `/api/kendaraan/${editKendaraan.id}` : "/api/kendaraan", {
      method: editKendaraan ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(kendaraanForm),
    });
    if (res.ok) {
      showToast(editKendaraan ? "Kendaraan diperbarui" : "Kendaraan ditambahkan");
      setShowKendaraanForm(false);
      fetchKendaraanData();
    } else {
      showToast("Gagal menyimpan kendaraan", "error");
    }
  }

  async function toggleAktifKendaraan(k: Kendaraan) {
    const res = await fetch(`/api/kendaraan/${k.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aktif: !k.aktif }),
    });
    if (res.ok) {
      showToast(k.aktif ? "Kendaraan dinonaktifkan" : "Kendaraan diaktifkan");
      fetchKendaraanData();
    }
  }

  // === HANDLERS TRANSIT ===
  function openTransitForm(t?: Transit) {
    setEditTransit(t ?? null);
    setTransitForm({
      nama: t?.nama ?? "",
      alamat: t?.alamat ?? "",
      latitude: t?.latitude?.toString() ?? "",
      longitude: t?.longitude?.toString() ?? "",
      catatan: t?.catatan ?? "",
    });
    setShowTransitForm(true);
  }

  async function saveTransit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(editTransit ? `/api/transit/${editTransit.id}` : "/api/transit", {
      method: editTransit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(transitForm),
    });
    if (res.ok) {
      showToast(editTransit ? "Titik transit diperbarui" : "Titik transit ditambahkan");
      setShowTransitForm(false);
      fetchTransitData();
    } else {
      showToast("Gagal menyimpan titik transit", "error");
    }
  }

  // === HANDLERS TPA ===
  function openTpaForm(t?: Tpa) {
    setEditTpa(t ?? null);
    setTpaForm({
      nama: t?.nama ?? "",
      alamat: t?.alamat ?? "",
      kota: t?.kota ?? "",
      jarak: t?.jarak?.toString() ?? "",
    });
    setShowTpaForm(true);
  }

  async function saveTpa(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(editTpa ? `/api/tpa/${editTpa.id}` : "/api/tpa", {
      method: editTpa ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tpaForm),
    });
    if (res.ok) {
      showToast(editTpa ? "Data TPA diperbarui" : "TPA berhasil ditambahkan");
      setShowTpaForm(false);
      fetchTpaData();
    } else {
      showToast("Gagal menyimpan data TPA", "error");
    }
  }

  async function confirmDeleteTpa() {
    if (!deleteTargetTpa) return;
    setDeletingTpa(true);
    const res = await fetch(`/api/tpa/${deleteTargetTpa.id}`, { method: "DELETE" });
    setDeletingTpa(false);
    if (res.ok) {
      showToast("TPA berhasil dihapus");
      setDeleteTargetTpa(null);
      fetchTpaData();
    } else {
      showToast("Gagal menghapus TPA", "error");
    }
  }

  const filteredKendaraan = kendaraan.filter((k) => {
    if (filterJenis && k.jenis !== filterJenis) return false;
    if (qKendaraan) {
      const s = qKendaraan.toLowerCase();
      return (
        k.nama.toLowerCase().includes(s) ||
        (k.platNomor && k.platNomor.toLowerCase().includes(s)) ||
        (k.petugas && k.petugas.nama.toLowerCase().includes(s))
      );
    }
    return true;
  });

  const filteredTransit = transit.filter((t) => {
    if (qTransit) {
      const s = qTransit.toLowerCase();
      return (
        t.nama.toLowerCase().includes(s) ||
        (t.alamat && t.alamat.toLowerCase().includes(s)) ||
        (t.catatan && t.catatan.toLowerCase().includes(s))
      );
    }
    return true;
  });

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-none mb-1">
            Armada & Fasilitas Operasional
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Kelola kendaraan armada, titik transit (TPST pemilahan), dan lokasi Tempat Pembuangan Akhir (TPA)
          </p>
        </div>

        {activeTab === "kendaraan" ? (
          <button
            onClick={() => openKendaraanForm()}
            className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm hover:shadow active:scale-[0.98] transition-all flex items-center gap-2 self-start sm:self-auto"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Tambah Kendaraan
          </button>
        ) : activeTab === "transit" ? (
          <button
            onClick={() => openTransitForm()}
            className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm hover:shadow active:scale-[0.98] transition-all flex items-center gap-2 self-start sm:self-auto"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Tambah Titik Transit
          </button>
        ) : (
          <button
            onClick={() => openTpaForm()}
            className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm hover:shadow active:scale-[0.98] transition-all flex items-center gap-2 self-start sm:self-auto"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Tambah Lokasi TPA
          </button>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab("kendaraan")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            activeTab === "kendaraan"
              ? "bg-emerald-700 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <span>🚛 Kendaraan Armada</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${activeTab === "kendaraan" ? "bg-emerald-800 text-white" : "bg-slate-200 text-slate-700"}`}>
            {kendaraan.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("transit")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            activeTab === "transit"
              ? "bg-emerald-700 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <span>📍 Titik Transit (TPST)</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${activeTab === "transit" ? "bg-emerald-800 text-white" : "bg-slate-200 text-slate-700"}`}>
            {transit.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("tpa")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            activeTab === "tpa"
              ? "bg-emerald-700 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <span>🏛️ Lokasi TPA</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${activeTab === "tpa" ? "bg-emerald-800 text-white" : "bg-slate-200 text-slate-700"}`}>
            {tpa.length}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: KENDARAAN ARMADA */}
      {/* ========================================================================= */}
      {activeTab === "kendaraan" && (
        <div className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <input
              type="text"
              placeholder="Cari armada, plat nomor, atau supir..."
              value={qKendaraan}
              onChange={(e) => setQKendaraan(e.target.value)}
              className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs w-64 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
            <select
              value={filterJenis}
              onChange={(e) => setFilterJenis(e.target.value)}
              className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              <option value="">Semua Jenis</option>
              {JENIS_KENDARAAN.map((j) => (
                <option key={j.value} value={j.value}>{j.ikon} {j.label}</option>
              ))}
            </select>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-700 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                  <th className="text-left px-4 py-3">Nama Armada</th>
                  <th className="text-left px-4 py-3">Jenis</th>
                  <th className="text-left px-4 py-3">Plat Nomor</th>
                  <th className="text-left px-4 py-3">Kapasitas</th>
                  <th className="text-left px-4 py-3">Petugas Penanggung Jawab</th>
                  <th className="text-center px-4 py-3">Status</th>
                  <th className="text-center px-4 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingKendaraan ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500 text-xs">Memuat armada...</td></tr>
                ) : filteredKendaraan.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500 text-xs">Belum ada armada terdaftar</td></tr>
                ) : (
                  filteredKendaraan.map((k) => (
                    <tr key={k.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3 font-semibold text-slate-900">{k.nama}</td>
                      <td className="px-4 py-3 text-xs">
                        {JENIS_KENDARAAN.find((j) => j.value === k.jenis)?.ikon}{" "}
                        {JENIS_KENDARAAN.find((j) => j.value === k.jenis)?.label || k.jenis}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">{k.platNomor || "—"}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{k.kapasitas ? `${k.kapasitas} m³` : "—"}</td>
                      <td className="px-4 py-3 text-xs text-slate-700">{k.petugas?.nama || "—"}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleAktifKendaraan(k)}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold transition ${
                            k.aktif ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500 border border-slate-200"
                          }`}
                        >
                          {k.aktif ? "Aktif" : "Nonaktif"}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => openKendaraanForm(k)}
                          className="px-3 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TITIK TRANSIT (TPST) */}
      {/* ========================================================================= */}
      {activeTab === "transit" && (
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Cari titik transit atau alamat..."
            value={qTransit}
            onChange={(e) => setQTransit(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs w-64 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loadingTransit ? (
              <div className="col-span-full py-8 text-center text-xs text-slate-500">Memuat titik transit...</div>
            ) : filteredTransit.length === 0 ? (
              <div className="col-span-full py-8 text-center text-xs text-slate-500">Belum ada titik transit</div>
            ) : (
              filteredTransit.map((t) => (
                <div key={t.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <h3 className="font-bold text-slate-900 text-sm">{t.nama}</h3>
                    <button
                      onClick={() => openTransitForm(t)}
                      className="text-xs text-emerald-700 font-semibold hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                  <p className="text-xs text-slate-600">{t.alamat || "Tanpa alamat spesifik"}</p>
                  {t.catatan && <p className="text-[11px] text-amber-800 bg-amber-50 px-2 py-1 rounded-lg">📝 {t.catatan}</p>}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <a
                      href={`https://www.google.com/maps?q=${t.latitude},${t.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-700 font-semibold hover:underline flex items-center gap-1"
                    >
                      🗺️ Buka Koordinat GPS
                    </a>
                    <span className="font-mono text-slate-400">{t.latitude.toFixed(4)}, {t.longitude.toFixed(4)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: TPA (TEMPAT PEMBUANGAN AKHIR) */}
      {/* ========================================================================= */}
      {activeTab === "tpa" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-700 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                  <th className="text-left px-4 py-3">Nama TPA</th>
                  <th className="text-left px-4 py-3">Alamat</th>
                  <th className="text-left px-4 py-3">Kota / Wilayah</th>
                  <th className="text-left px-4 py-3">Jarak Tempuh</th>
                  <th className="text-center px-4 py-3">Ritasi Pengangkutan</th>
                  <th className="text-center px-4 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingTpa ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500 text-xs">Memuat TPA...</td></tr>
                ) : tpa.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500 text-xs">Belum ada data TPA</td></tr>
                ) : (
                  tpa.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3 font-semibold text-slate-900">{item.nama}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{item.alamat || "—"}</td>
                      <td className="px-4 py-3 text-xs text-slate-700">{item.kota || "—"}</td>
                      <td className="px-4 py-3 text-xs font-mono text-slate-700">{item.jarak ? `${item.jarak} km` : "—"}</td>
                      <td className="px-4 py-3 text-center text-xs font-mono text-slate-600">{item._count?.pengangkutan || 0} rit</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openTpaForm(item)}
                            className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteTargetTpa(item)}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 text-xs font-semibold rounded-lg transition"
                          >
                            Hapus
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
      )}

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}
      {/* Modal Kendaraan */}
      {showKendaraanForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/80 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
              <h2 className="text-base font-semibold text-slate-900">{editKendaraan ? "Edit Kendaraan" : "Tambah Kendaraan"}</h2>
              <button onClick={() => setShowKendaraanForm(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={saveKendaraan} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama Armada <span className="text-red-500">*</span></label>
                <input type="text" value={kendaraanForm.nama} onChange={(e) => setKendaraanForm({ ...kendaraanForm, nama: e.target.value })} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm bg-white" placeholder="cth: Truk Sukmajaya 01" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Plat Nomor</label>
                <input type="text" value={kendaraanForm.platNomor} onChange={(e) => setKendaraanForm({ ...kendaraanForm, platNomor: e.target.value })} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm bg-white uppercase" placeholder="B 1234 XYZ" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Jenis Armada</label>
                <select value={kendaraanForm.jenis} onChange={(e) => setKendaraanForm({ ...kendaraanForm, jenis: e.target.value })} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm bg-white">
                  {JENIS_KENDARAAN.map((j) => (
                    <option key={j.value} value={j.value}>{j.ikon} {j.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Kapasitas (m³)</label>
                <input type="number" step="0.1" value={kendaraanForm.kapasitas} onChange={(e) => setKendaraanForm({ ...kendaraanForm, kapasitas: e.target.value })} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm bg-white" placeholder="cth: 6" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Petugas / Supir Utama</label>
                <select value={kendaraanForm.petugasId} onChange={(e) => setKendaraanForm({ ...kendaraanForm, petugasId: e.target.value })} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm bg-white">
                  <option value="">-- Belum Ditentukan --</option>
                  {petugasList.map((p) => (
                    <option key={p.id} value={p.id}>{p.nama}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowKendaraanForm(false)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition">Batal</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-sm font-semibold shadow-sm hover:shadow transition">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Transit */}
      {showTransitForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-3xl border border-slate-200/80 shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 sticky top-0 z-10">
              <h2 className="text-base font-semibold text-slate-900">{editTransit ? "Edit Titik Transit" : "Tambah Titik Transit"}</h2>
              <button onClick={() => setShowTransitForm(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={saveTransit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama Titik Transit / Lapak <span className="text-red-500">*</span></label>
                <input type="text" value={transitForm.nama} onChange={(e) => setTransitForm({ ...transitForm, nama: e.target.value })} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm bg-white" placeholder="cth: Lapak Pemilahan Sukmajaya" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Alamat Lengkap</label>
                <textarea rows={2} value={transitForm.alamat} onChange={(e) => setTransitForm({ ...transitForm, alamat: e.target.value })} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm bg-white resize-none" placeholder="Jl. Raya..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Koordinat Lokasi GPS <span className="text-red-500">*</span></label>
                <CoordinatePicker
                  latitude={transitForm.latitude}
                  longitude={transitForm.longitude}
                  onChange={(lat, lng) => setTransitForm((f) => ({ ...f, latitude: lat, longitude: lng }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Catatan Tambahan</label>
                <input type="text" value={transitForm.catatan} onChange={(e) => setTransitForm({ ...transitForm, catatan: e.target.value })} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm bg-white" placeholder="Jam operasional, penanggung jawab..." />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowTransitForm(false)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition">Batal</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-sm font-semibold shadow-sm hover:shadow transition">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal TPA */}
      {showTpaForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/80 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
              <h2 className="text-base font-semibold text-slate-900">{editTpa ? "Edit Data TPA" : "Tambah Lokasi TPA"}</h2>
              <button onClick={() => setShowTpaForm(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={saveTpa} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama TPA <span className="text-red-500">*</span></label>
                <input type="text" value={tpaForm.nama} onChange={(e) => setTpaForm({ ...tpaForm, nama: e.target.value })} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm bg-white" placeholder="cth: TPA Cipayung" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Alamat</label>
                <input type="text" value={tpaForm.alamat} onChange={(e) => setTpaForm({ ...tpaForm, alamat: e.target.value })} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm bg-white" placeholder="Jl. Raya Cipayung" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Kota</label>
                <input type="text" value={tpaForm.kota} onChange={(e) => setTpaForm({ ...tpaForm, kota: e.target.value })} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm bg-white" placeholder="Depok" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Estimasi Jarak (km)</label>
                <input type="number" step="0.1" value={tpaForm.jarak} onChange={(e) => setTpaForm({ ...tpaForm, jarak: e.target.value })} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm bg-white" placeholder="cth: 12.5" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowTpaForm(false)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition">Batal</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-sm font-semibold shadow-sm hover:shadow transition">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete TPA */}
      <ConfirmDialog
        open={Boolean(deleteTargetTpa)}
        title="Hapus Data TPA"
        message={`Yakin ingin menghapus data TPA "${deleteTargetTpa?.nama}"?`}
        confirmText="Hapus"
        variant="danger"
        loading={deletingTpa}
        onConfirm={confirmDeleteTpa}
        onCancel={() => setDeleteTargetTpa(null)}
      />
    </div>
  );
}
