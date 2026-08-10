"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/Toast";
import ConfirmDialog from "@/components/ConfirmDialog";

type Wilayah = { id: number; nama: string };
type Petugas = { id: number; nama: string; aktif?: boolean };
type Rute = {
  id: number;
  nama: string;
  hari: string;
  jam?: string;
  aktif: boolean;
  wilayah: Wilayah;
  petugas?: Petugas;
  _count: { jadwal: number };
};
type JadwalItem = {
  pelanggan?: { latitude?: number | null; longitude?: number | null };
};

const HARI_LIST = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

export default function RutePage() {
  const { showToast } = useToast();
  const [rute, setRute] = useState<Rute[]>([]);
  const [wilayahList, setWilayahList] = useState<Wilayah[]>([]);
  const [petugasList, setPetugasList] = useState<Petugas[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Rute | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Rute | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ nama: "", hari: "Senin,Rabu,Jumat", jam: "", wilayahId: "", petugasId: "" });

  const fetchData = useCallback(async () => {
    try {
      const [ruteRes, wilayahRes, petugasRes] = await Promise.all([
        fetch("/api/rute"),
        fetch("/api/wilayah"),
        fetch("/api/petugas"),
      ]);
      setRute(await ruteRes.json());
      setWilayahList(await wilayahRes.json());
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
    setForm({ nama: "", hari: "Senin,Rabu,Jumat", jam: "", wilayahId: "", petugasId: "" });
    setShowForm(true);
  }

  function openEdit(r: Rute) {
    setEditing(r);
    setForm({
      nama: r.nama,
      hari: r.hari,
      jam: r.jam || "",
      wilayahId: r.wilayah.id.toString(),
      petugasId: r.petugas?.id?.toString() || "",
    });
    setShowForm(true);
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
          <h1 className="font-black uppercase tracking-tighter text-2xl text-black font-black">Rute & Jadwal</h1>
          <p className="text-sm text-gray-600 font-bold mt-1">Atur rute pengangkutan sampah</p>
        </div>
        <button
          onClick={openCreate}
          className="shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:-translate-y-1 transition-all bg-green-400 hover:bg-green-300 text-black px-4 py-2 rounded-none text-sm font-medium transition flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Tambah Rute
        </button>
      </div>

      {/* Desktop Table */}
      <div className="hm-card bg-white p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-black text-white font-black border-b border-2 border-black">
                <th className="text-left px-4 py-3 font-medium text-gray-600 font-bold">Nama Rute</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 font-bold">Wilayah</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 font-bold">Hari</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 font-bold">Jam</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 font-bold">Petugas</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600 font-bold">Pelanggan</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600 font-bold">Status</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600 font-bold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400 font-bold">Memuat...</td></tr>
              ) : rute.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400 font-bold">Belum ada rute</td></tr>
              ) : (
                rute.map((r) => (
                  <tr key={r.id} className="border-b border-2 border-black hover:bg-gray-100 border-2 border-black">
                    <td className="px-4 py-3 font-medium text-black font-black">{r.nama}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-none-full text-xs font-medium bg-sky-400/10 text-sky-400 border border-sky-500/30">{r.wilayah.nama}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {r.hari.split(",").map((h) => (
                          <span key={h} className="bg-gray-100 border-2 border-black text-gray-600 font-bold px-2 py-0.5 rounded-none text-xs">{h.slice(0, 3)}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-bold text-xs">{r.jam || "-"}</td>
                    <td className="px-4 py-3 text-gray-600 font-bold">{r.petugas?.nama || "-"}</td>
                    <td className="px-4 py-3 text-center text-gray-600 font-bold text-xs">{r._count.jadwal}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleAktif(r)}
                        className={`inline-flex items-center px-2 py-0.5 rounded-none-full text-xs font-medium transition ${
                          r.aktif
                            ? "bg-emerald-400/10 text-emerald-400 border border-emerald-500/30"
                            : "bg-gray-100 border-2 border-black text-gray-600 font-bold border-2 border-black"
                        }`}
                      >
                        {r.aktif ? "Aktif" : "Nonaktif"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => bukaMap(r)}
                          className="p-1.5 text-green-600 hover:bg-green-400/5 rounded-none transition"
                          title="Buka rute di Google Maps"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => openEdit(r)}
                          className="p-1.5 text-gray-600 font-bold hover:bg-indigo-50 rounded-none transition"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteTarget(r)}
                          className="p-1.5 text-red-600 hover:bg-danger/5 rounded-none transition"
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
          <div key={r.id} className="hm-card bg-white p-0 overflow-hidden p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-black font-black">{r.nama}</h3>
              <button
                onClick={() => toggleAktif(r)}
                className={`inline-flex items-center px-2 py-0.5 rounded-none-full text-xs font-medium ${
                  r.aktif ? "bg-green-400/10 text-emerald-800" : "bg-gray-100 border-2 border-black text-black font-black"
                }`}
              >
                {r.aktif ? "Aktif" : "Nonaktif"}
              </button>
            </div>
            <div className="text-xs text-gray-600 font-bold space-y-1">
              <p>📍 {r.wilayah.nama}</p>
              <p>📅 {r.hari}</p>
              {r.jam && <p>⏰ {r.jam}</p>}
              <p>👤 {r.petugas?.nama || "Belum ada petugas"}</p>
              <p>👥 {r._count.jadwal} pelanggan</p>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={() => bukaMap(r)} className="flex-1 text-center text-sm bg-green-400/10 border border-vest/30 text-green-600 py-2 rounded-none hover:bg-green-400/20 transition">🗺️ Map</button>
              <button onClick={() => openEdit(r)} className="flex-1 text-center text-sm bg-gray-100 border-2 border-black border-2 border-black text-black font-black py-2 rounded-none hover:border-vest hover:text-green-600 transition">Edit</button>
              <button onClick={() => setDeleteTarget(r)} className="flex-1 text-center text-sm bg-danger/10 border border-danger/30 text-red-400 py-2 rounded-none hover:bg-danger/20 transition">Hapus</button>
            </div>
          </div>
        ))}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="hm-card bg-white p-0 overflow-hidden w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-2 border-black">
              <h2 className="font-semibold text-black font-black">{editing ? "Edit Rute" : "Tambah Rute"}</h2>
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="text-gray-400 font-bold hover:text-gray-600 font-bold">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 font-bold mb-1">Nama Rute *</label>
                <input type="text" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} className="w-full px-3 py-2 border-2 border-black rounded-none focus:outline-none focus:ring-2 focus:ring-black text-sm" placeholder="Rute A - RT 01" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 font-bold mb-1">Wilayah *</label>
                <select value={form.wilayahId} onChange={(e) => setForm({ ...form, wilayahId: e.target.value })} className="w-full px-3 py-2 border-2 border-black rounded-none focus:outline-none focus:ring-2 focus:ring-black text-sm" required>
                  <option value="">Pilih Wilayah</option>
                  {wilayahList.map((w) => <option key={w.id} value={w.id}>{w.nama}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 font-bold mb-1">Hari *</label>
                <div className="grid grid-cols-4 gap-2">
                  {HARI_LIST.map((h) => {
                    const hariList = form.hari.split(",");
                    const checked = hariList.includes(h);
                    return (
                      <label
                        key={h}
                        className={`flex items-center justify-center px-2 py-2 border rounded-none text-xs cursor-pointer transition ${
                          checked
                            ? "bg-green-400/15 border-vest text-green-600 font-semibold"
                            : "bg-hm-card bg-white p-0 overflow-hidden border-2 border-black text-gray-600 font-bold hover:bg-gray-100 border-2 border-black"
                        }`}
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
                        {h.slice(0, 3)}
                      </label>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 font-bold mb-1">Jam</label>
                <input type="time" value={form.jam} onChange={(e) => setForm({ ...form, jam: e.target.value })} className="w-full px-3 py-2 border-2 border-black rounded-none focus:outline-none focus:ring-2 focus:ring-black text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 font-bold mb-1">Petugas</label>
                <select value={form.petugasId} onChange={(e) => setForm({ ...form, petugasId: e.target.value })} className="w-full px-3 py-2 border-2 border-black rounded-none focus:outline-none focus:ring-2 focus:ring-black text-sm">
                  <option value="">Pilih Petugas</option>
                  {petugasList.filter((p) => p.aktif !== false).map((p) => (
                    <option key={p.id} value={p.id}>{p.nama}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="flex-1 px-4 py-2 border-2 border-black rounded-none text-sm text-gray-600 font-bold hover:bg-gray-100 border-2 border-black">Batal</button>
                <button type="submit" className="flex-1 px-4 py-2 shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:-translate-y-1 transition-all shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:-translate-y-1 transition-all bg-green-400 text-black rounded-none text-sm hover:bg-green-300">{editing ? "Simpan" : "Tambah"}</button>
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
