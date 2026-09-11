"use client";

import { useState, useEffect, useCallback } from "react";
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

const HARI_LIST = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

function ChipCheck({ checked }: { checked: boolean }) {
  return (
    <span
      className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded text-[10px] font-bold leading-none transition-colors ${
        checked ? "bg-emerald-600 text-white" : "border border-slate-300 bg-white text-transparent"
      }`}
    >
      ✓
    </span>
  );
}

function chipCls(checked: boolean) {
  return checked
    ? "flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 font-semibold shadow-xs"
    : "flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 font-medium hover:bg-slate-50";
}

export default function RutePage() {
  const { showToast } = useToast();
  const [rute, setRute] = useState<Rute[]>([]);
  const [kelurahanList, setKelurahanList] = useState<Kelurahan[]>([]);
  const [zonaList, setZonaList] = useState<Zona[]>([]);
  const [petugasList, setPetugasList] = useState<Petugas[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Rute | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Rute | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ nama: "", hari: "Senin,Rabu,Jumat", jam: "", kelurahanId: "", kelurahanIds: [] as string[], zonaId: "", zonaIds: [] as string[], petugasId: "" });

  const fetchData = useCallback(async () => {
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
      showToast("Gagal memuat data", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    (async () => { await fetchData(); })();
  }, [fetchData]);

  function openCreate() {
    setEditing(null);
    setForm({ nama: "", hari: "Senin,Rabu,Jumat", jam: "", kelurahanId: "", kelurahanIds: [], zonaId: "", zonaIds: [], petugasId: "" });
    setShowForm(true);
  }

  function openEdit(r: Rute) {
    setEditing(r);
    
    // Fallback: If it has `zonas`, use them; otherwise use the single `zona` if it exists.
    let currentZonaIds: string[] = [];
    if (r.zonas && r.zonas.length > 0) {
      currentZonaIds = r.zonas.map(z => z.id.toString());
    } else if (r.zona) {
      currentZonaIds = [r.zona.id.toString()];
    }

    let currentKelurahanIds: string[] = [];
    if (r.kelurahans && r.kelurahans.length > 0) {
      currentKelurahanIds = r.kelurahans.map(k => k.id.toString());
    } else if (r.kelurahan) {
      currentKelurahanIds = [r.kelurahan.id.toString()];
    }

    setForm({
      nama: r.nama,
      hari: r.hari,
      jam: r.jam || "",
      kelurahanId: r.kelurahan?.id ? r.kelurahan.id.toString() : "",
      kelurahanIds: currentKelurahanIds,
      zonaId: r.zona?.id ? r.zona.id.toString() : "",
      zonaIds: currentZonaIds,
      petugasId: r.petugas?.id?.toString() || "",
    });
    setShowForm(true);
  }

  function toggleKelurahan(id: string) {
    const isChecked = form.kelurahanIds.includes(id) || form.kelurahanId === id;
    let newKelurahanIds = isChecked 
      ? form.kelurahanIds.filter(x => x !== id) 
      : [...form.kelurahanIds, id];
    
    // Fallback if empty but kelurahanId was set
    if (isChecked && form.kelurahanId === id) {
       newKelurahanIds = form.kelurahanIds.filter(x => x !== id);
    }

    // Auto-fill nama rute jika masih kosong
    let nama = form.nama;
    if (form.nama.trim() === "" && newKelurahanIds.length > 0) {
      const k = kelurahanList.find((x) => x.id.toString() === newKelurahanIds[0]);
      nama = `Angkut ${k?.nama ?? ""}`.trim();
    }

    setForm((f) => ({
      ...f,
      kelurahanId: "",
      kelurahanIds: newKelurahanIds,
      zonaId: "",
      zonaIds: [], // Reset zona if kelurahan changes
      nama,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const url = editing ? `/api/rute/${editing.id}` : "/api/rute";
    const method = editing ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      setShowForm(false);
      setEditing(null);
      showToast(editing ? "Rute berhasil diperbarui" : "Rute berhasil ditambahkan");
      fetchData();
    } else {
      const data = await res.json();
      showToast(data.error || "Gagal menyimpan", "error");
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await fetch(`/api/rute/${deleteTarget.id}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) {
      showToast("Rute berhasil dihapus");
      setDeleteTarget(null);
      fetchData();
    } else {
      showToast("Gagal menghapus rute", "error");
    }
  }

  async function toggleAktif(r: Rute) {
    const res = await fetch(`/api/rute/${r.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aktif: !r.aktif }),
    });
    if (res.ok) {
      showToast(r.aktif ? "Rute dinonaktifkan" : "Rute diaktifkan");
      fetchData();
    } else {
      showToast("Gagal mengubah status", "error");
    }
  }

  async function bukaMap(r: Rute) {
    try {
      const res = await fetch(`/api/jadwal?ruteId=${r.id}`);
      const jadwal = await res.json();
      const withCoords = jadwal.filter(
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

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Rute & Jadwal</h1>
          <p className="text-sm text-gray-600 font-bold mt-1">Atur rute pengangkutan sampah</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm hover:shadow active:scale-[0.98] transition-all flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Tambah Rute
        </button>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/80 text-slate-700 border-b border-slate-200/80 text-xs font-semibold uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Nama Rute</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Kelurahan</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Zona</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Hari</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Jam</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Petugas</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600">Pelanggan</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600">Status</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">Memuat...</td></tr>
              ) : rute.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">Belum ada rute</td></tr>
              ) : (
                rute.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-4 py-3 font-semibold text-slate-900">{r.nama}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200">
                        {r.kelurahans && r.kelurahans.length > 0 
                          ? r.kelurahans.map(k => k.nama).join(", ")
                          : r.kelurahan?.nama ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                        {r.zonas && r.zonas.length > 0 
                          ? r.zonas.map(z => z.nama).join(", ")
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
                        onClick={() => toggleAktif(r)}
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
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                          title="Buka rute di Google Maps"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => openEdit(r)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteTarget(r)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
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
          <div key={r.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-slate-900">{r.nama}</h3>
              <button
                onClick={() => toggleAktif(r)}
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  r.aktif ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 border border-slate-200 text-slate-600"
                }`}
              >
                {r.aktif ? "Aktif" : "Nonaktif"}
              </button>
            </div>
            <div className="text-xs text-slate-600 space-y-1">
              {(r.kelurahans && r.kelurahans.length > 0) ? (
                <p>📍 {r.kelurahans.map(k => k.nama).join(", ")}</p>
              ) : (
                <p>📍 {r.kelurahan?.nama ?? "—"}</p>
              )}
              {(r.zonas && r.zonas.length > 0) ? (
                <p>🗺️ Zona {r.zonas.map(z => z.nama).join(", ")}</p>
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
              <button onClick={() => openEdit(r)} className="flex-1 text-center text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-700 py-2 rounded-xl hover:bg-slate-100 transition">Edit</button>
              <button onClick={() => setDeleteTarget(r)} className="flex-1 text-center text-xs font-semibold bg-rose-50 border border-rose-200 text-rose-600 py-2 rounded-xl hover:bg-rose-100 transition">Hapus</button>
            </div>
          </div>
        ))}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md max-h-[85vh] overflow-y-auto bg-white rounded-3xl border border-slate-200/80 shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 backdrop-blur-sm z-10">
              <h2 className="text-base font-semibold text-slate-900">{editing ? "Edit Rute" : "Tambah Rute"}</h2>
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition" aria-label="Tutup">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama Rute <span className="text-red-500">*</span></label>
                <input type="text" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm bg-white" placeholder="cth: Rute A - RT 01" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Kelurahan <span className="text-red-500">*</span>
                  <span className="ml-1 text-xs font-normal text-slate-400">(bisa pilih lebih dari satu)</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {kelurahanList.map((k) => {
                    const idStr = k.id.toString();
                    const checked = form.kelurahanIds.includes(idStr) || form.kelurahanId === idStr;
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
                  <span className="ml-1 text-xs font-normal text-slate-400">(bisa pilih lebih dari satu)</span>
                </label>
                {form.kelurahanIds.length === 0 && !form.kelurahanId ? (
                  <div className="border border-dashed border-slate-200 rounded-xl px-3 py-4 text-center text-xs text-slate-400 bg-slate-50/50">
                    Pilih kelurahan terlebih dahulu.
                  </div>
                ) : zonaList.filter((z) => form.kelurahanIds.includes(z.kelurahanId.toString()) || z.kelurahanId.toString() === form.kelurahanId).length === 0 ? (
                  <div className="border border-dashed border-slate-200 rounded-xl px-3 py-4 text-center text-xs text-slate-400 bg-slate-50/50">
                    Kelurahan ini belum memiliki zona angkut.
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      {zonaList.filter((z) => form.kelurahanIds.includes(z.kelurahanId.toString()) || z.kelurahanId.toString() === form.kelurahanId).map((z) => {
                        const idStr = z.id.toString();
                        const checked = form.zonaIds.includes(idStr) || form.zonaId === idStr;
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
                                const newZonaIds = checked 
                                  ? form.zonaIds.filter((id) => id !== idStr) 
                                  : [...form.zonaIds, idStr];
                                setForm({ ...form, zonaIds: newZonaIds, zonaId: "" });
                              }}
                            />
                            <ChipCheck checked={checked} />
                            <span className="truncate">{z.nama}</span>
                          </label>
                        );
                      })}
                    </div>
                    <p className="mt-2 text-xs font-medium text-slate-400">{form.zonaIds.length} zona dipilih</p>
                  </>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Hari <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-4 gap-2">
                  {HARI_LIST.map((h) => {
                    const hariList = form.hari.split(",");
                    const checked = hariList.includes(h);
                    return (
                      <label
                        key={h}
                        className={`${chipCls(checked)} text-xs cursor-pointer transition`}
                      >
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={checked}
                          onChange={() => {
                            const newHari = checked ? hariList.filter((d) => d !== h) : [...hariList, h];
                            setForm({ ...form, hari: newHari.join(",") });
                          }}
                        />
                        <ChipCheck checked={checked} />
                        {h.slice(0, 3)}
                      </label>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Jam</label>
                <input type="time" value={form.jam} onChange={(e) => setForm({ ...form, jam: e.target.value })} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm bg-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Petugas</label>
                <select value={form.petugasId} onChange={(e) => setForm({ ...form, petugasId: e.target.value })} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm bg-white">
                  <option value="">Pilih Petugas (angkut)</option>
                  {petugasList.filter((p) => p.aktif !== false && (p.jabatan || "").split(",").includes("angkut")).map((p) => (
                    <option key={p.id} value={p.id}>{p.nama}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition">Batal</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-xs hover:shadow-sm active:scale-95 transition-all">{editing ? "Simpan" : "Tambah"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Hapus Rute"
        message={`Yakin ingin menghapus rute "${deleteTarget?.nama}"? Semua jadwal terkait juga akan terhapus.`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}
