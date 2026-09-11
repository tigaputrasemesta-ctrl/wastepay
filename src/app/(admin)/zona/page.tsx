"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";

type Kelurahan = { id: number; nama: string; kecamatan?: string | null; kota?: string | null };
type Petugas = { id: number; nama: string; jabatan?: string | null; wilayahId: number };
type Zona = {
  id: number;
  nama: string;
  keterangan?: string | null;
  warna?: string | null;
  kelurahanId: number;
  kelurahan?: { id: number; nama: string };
  _count?: { wilayah: number; petugas: number };
};

const WARNA_OPTIONS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899"];

export default function ZonaPage() {
  const [kelurahanList, setKelurahanList] = useState<Kelurahan[]>([]);
  const [petugasList, setPetugasList] = useState<Petugas[]>([]);
  const [zonaList, setZonaList] = useState<Zona[]>([]);
  const [filterKelurahan, setFilterKelurahan] = useState<number | "">("");
  const [loading, setLoading] = useState(true);

  // Form create/edit
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Zona | null>(null);
  const [form, setForm] = useState({ nama: "", keterangan: "", warna: "#ef4444", kelurahanId: "" });
  const [selectedPetugas, setSelectedPetugas] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Zona | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { showToast } = useToast();

  const angkutPetugas = useMemo(
    () => petugasList.filter((p) => (p.jabatan || "").split(",").includes("angkut")),
    [petugasList]
  );

  const fetchAll = useCallback(async () => {
    try {
      const [kel, pet, zona] = await Promise.all([
        fetch("/api/kelurahan").then((r) => r.json()),
        fetch("/api/petugas").then((r) => r.json()),
        fetch("/api/zona").then((r) => r.json()),
      ]);
      setKelurahanList(Array.isArray(kel) ? kel : []);
      setPetugasList(Array.isArray(pet) ? pet : []);
      setZonaList(Array.isArray(zona) ? zona : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const filteredZona = useMemo(
    () =>
      zonaList.filter((z) => (filterKelurahan === "" ? true : z.kelurahanId === Number(filterKelurahan))),
    [zonaList, filterKelurahan]
  );

  function openCreate() {
    setEditing(null);
    setForm({ nama: "", keterangan: "", warna: "#ef4444", kelurahanId: filterKelurahan === "" ? "" : String(filterKelurahan) });
    setSelectedPetugas([]);
    setShowForm(true);
  }

  function openEdit(z: Zona) {
    setEditing(z);
    setForm({
      nama: z.nama,
      keterangan: z.keterangan || "",
      warna: z.warna || "#ef4444",
      kelurahanId: String(z.kelurahanId),
    });
    // Isi petugas yang sudah ditugaskan
    fetch(`/api/zona/${z.id}`)
      .then((r) => r.json())
      .then((d) => setSelectedPetugas((d.petugas || []).map((x: { petugasId: number }) => x.petugasId)))
      .catch(() => setSelectedPetugas([]));
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nama || !form.kelurahanId) {
      showToast("Nama zona dan kelurahan wajib diisi", "error");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        nama: form.nama,
        keterangan: form.keterangan,
        warna: form.warna,
        kelurahanId: parseInt(form.kelurahanId),
        petugasIds: selectedPetugas,
      };
      const res = editing
        ? await fetch(`/api/zona/${editing.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/zona", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      if (res.ok) {
        showToast(editing ? "Zona diperbarui" : "Zona ditambahkan");
        setShowForm(false);
        fetchAll();
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || "Gagal menyimpan zona", "error");
      }
    } catch {
      showToast("Terjadi kesalahan jaringan", "error");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/zona/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Zona dihapus");
        setDeleteTarget(null);
        fetchAll();
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || "Gagal menghapus zona", "error");
      }
    } catch {
      showToast("Terjadi kesalahan jaringan", "error");
    } finally {
      setDeleting(false);
    }
  }

  function togglePetugas(id: number) {
    setSelectedPetugas((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Zona Angkut</h1>
          <p className="text-sm text-gray-600 font-bold mt-1">
            Zona area pengambilan sampah di dalam tiap kelurahan. Satu kelurahan bisa punya beberapa zona custom,
            dan nanti tiap zona bisa ditugaskan petugas angkut yang berbeda.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="shadow-sm hover:shadow-md active:scale-[0.98] transition-all bg-green-400 hover:bg-green-300 text-black px-4 py-2 rounded-none text-sm font-bold"
        >
          + Tambah Zona
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm font-bold text-gray-600">Filter Kelurahan:</label>
        <select
          value={String(filterKelurahan)}
          onChange={(e) => setFilterKelurahan(e.target.value === "" ? "" : Number(e.target.value))}
          className="px-3 py-2 border border-slate-200/80 rounded-none text-sm bg-white"
        >
          <option value="">Semua Kelurahan</option>
          {kelurahanList.map((k) => (
            <option key={k.id} value={k.id}>{k.nama}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 font-bold">Memuat zona...</p>
      ) : filteredZona.length === 0 ? (
        <div className="hm-card bg-white p-8 text-center">
          <p className="text-sm text-gray-400 font-bold">
            Belum ada zona. Buat zona custom pertama untuk membagi area pengambilan di tiap kelurahan.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredZona.map((z) => (
            <div key={z.id} className="relative bg-black text-white rounded-none p-4 border border-slate-200/80">
              <div className="flex items-start gap-3">
                <span
                  className="w-4 h-4 mt-1 shrink-0 border border-slate-200/80"
                  style={{ backgroundColor: z.warna || "#ef4444" }}
                  title={z.warna || ""}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-bold pr-6">{z.nama}</p>
                  <p className="text-xs text-gray-400 font-bold mt-0.5">{z.kelurahan?.nama || `Kelurahan #${z.kelurahanId}`}</p>
                  {z.keterangan && <p className="text-xs text-gray-300 font-bold mt-1">{z.keterangan}</p>}
                </div>
              </div>
              <div className="flex gap-2 mt-3 text-[11px] font-bold">
                <span className="bg-white text-black px-2 py-1 border border-slate-200/80">{z._count?.wilayah ?? 0} RT</span>
                <span className="bg-white text-black px-2 py-1 border border-slate-200/80">{z._count?.petugas ?? 0} Petugas Angkut</span>
              </div>
              <div className="absolute top-3 right-3 flex gap-1">
                <button onClick={() => openEdit(z)} className="text-white hover:text-green-400 p-1" title="Edit">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="square" strokeLinejoin="miter" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </button>
                <button onClick={() => setDeleteTarget(z)} className="text-white hover:text-red-400 p-1" title="Hapus">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="square" strokeLinejoin="miter" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="hm-card bg-white overflow-hidden w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="font-semibold text-black font-black">{editing ? "Edit Zona" : "Tambah Zona"}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">Kelurahan *</label>
                <select
                  value={form.kelurahanId}
                  onChange={(e) => setForm({ ...form, kelurahanId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200/80 rounded-none text-sm bg-white"
                  required
                >
                  <option value="">Pilih kelurahan...</option>
                  {kelurahanList.map((k) => (
                    <option key={k.id} value={k.id}>{k.nama}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">Nama Zona *</label>
                <input
                  type="text"
                  value={form.nama}
                  onChange={(e) => setForm({ ...form, nama: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200/80 rounded-none text-sm"
                  placeholder="misal: Zona A - RT 01-05"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">Keterangan</label>
                <input
                  type="text"
                  value={form.keterangan}
                  onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200/80 rounded-none text-sm"
                  placeholder="misal: gang sempit, pakai gerobak"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">Warna (marker peta)</label>
                <div className="flex gap-2 flex-wrap">
                  {WARNA_OPTIONS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm({ ...form, warna: c })}
                      className={`w-8 h-8 border-2 ${form.warna === c ? "border-black ring-2 ring-black" : "border-gray-300"}`}
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">
                  Petugas Angkut (opsional, bisa &gt;1)
                </label>
                {angkutPetugas.length === 0 ? (
                  <p className="text-xs text-gray-400 font-bold">
                    Belum ada petugas dengan jabatan <b>angkut</b>. Tambahkan dulu di menu Petugas.
                  </p>
                ) : (
                  <div className="space-y-1 max-h-40 overflow-y-auto border border-slate-200/80 p-2">
                    {angkutPetugas.map((p) => (
                      <label key={p.id} className="flex items-center gap-2 text-sm font-bold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedPetugas.includes(p.id)}
                          onChange={() => togglePetugas(p.id)}
                          className="w-4 h-4"
                        />
                        {p.nama}
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 border border-slate-200/80 rounded-xl text-sm text-slate-700 font-medium hover:bg-gray-100">
                  Batal
                </button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-sm hover:shadow active:scale-[0.98] transition-all text-sm hover:bg-green-300 disabled:opacity-50">
                  {saving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Hapus Zona"
        message={`Yakin ingin menghapus zona "${deleteTarget?.nama}"? RT yang ada di zona ini akan kembali menjadi tanpa zona (tidak terhapus).`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}
