"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/Toast";
import ConfirmDialog from "@/components/ConfirmDialog";

type Tpa = {
  id: number;
  nama: string;
  alamat?: string;
  kota?: string;
  jarak?: number;
  aktif: boolean;
  _count?: { pengangkutan: number };
};

export default function TpaPage() {
  const { showToast } = useToast();
  const [data, setData] = useState<Tpa[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Tpa | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Tpa | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ nama: "", alamat: "", kota: "", jarak: "" });

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/tpa");
      setData(await res.json());
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
    setForm({ nama: "", alamat: "", kota: "", jarak: "" });
    setShowForm(true);
  }

  function openEdit(t: Tpa) {
    setEditing(t);
    setForm({
      nama: t.nama,
      alamat: t.alamat || "",
      kota: t.kota || "",
      jarak: t.jarak?.toString() || "",
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const url = editing ? `/api/tpa/${editing.id}` : "/api/tpa";
    const method = editing ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      setShowForm(false);
      setEditing(null);
      showToast(editing ? "TPA berhasil diperbarui" : "TPA berhasil ditambahkan");
      fetchData();
    } else {
      showToast("Gagal menyimpan", "error");
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await fetch(`/api/tpa/${deleteTarget.id}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) {
      showToast("TPA berhasil dihapus");
      setDeleteTarget(null);
      fetchData();
    } else {
      showToast("Gagal menghapus TPA", "error");
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-none mb-1">TPA</h1>
          <p className="text-sm text-slate-500 font-medium">Tempat Pemrosesan Akhir sampah</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm hover:shadow active:scale-[0.98] transition-all flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Tambah TPA
        </button>
      </div>

      {/* Desktop Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/70 text-slate-600 font-semibold border-b border-slate-200/80 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3">Nama</th>
                <th className="text-left px-4 py-3">Alamat</th>
                <th className="text-left px-4 py-3">Kota</th>
                <th className="text-right px-4 py-3">Jarak (km)</th>
                <th className="text-center px-4 py-3">Status</th>
                <th className="text-center px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400 font-medium">Memuat...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400 font-medium">Belum ada TPA</td></tr>
              ) : (
                data.map((t) => (
                  <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3 font-semibold text-slate-900">{t.nama}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{t.alamat || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{t.kota || "-"}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{t.jarak ? `${t.jarak} km` : "-"}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${t.aktif ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-600 border border-slate-200"}`}>
                        {t.aktif ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEdit(t)}
                          className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteTarget(t)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
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
        {data.map((t) => (
          <div key={t.id} className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-slate-900">{t.nama}</h3>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${t.aktif ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-600 border border-slate-200"}`}>
                {t.aktif ? "Aktif" : "Nonaktif"}
              </span>
            </div>
            <div className="text-xs text-slate-600 space-y-1">
              {t.alamat && <p>📍 {t.alamat}</p>}
              {t.kota && <p>🏙️ {t.kota}</p>}
              {t.jarak && <p>📏 {t.jarak} km</p>}
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={() => openEdit(t)} className="flex-1 text-center text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl transition-all">Edit</button>
              <button onClick={() => setDeleteTarget(t)} className="flex-1 text-center text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 py-2.5 rounded-xl transition-all">Hapus</button>
            </div>
          </div>
        ))}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl overflow-hidden w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
              <h2 className="font-bold text-slate-900 text-base">{editing ? "Edit TPA" : "Tambah TPA"}</h2>
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nama TPA *</label>
                <input type="text" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Alamat</label>
                <textarea value={form.alamat} onChange={(e) => setForm({ ...form, alamat: e.target.value })} className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Kota</label>
                  <input type="text" value={form.kota} onChange={(e) => setForm({ ...form, kota: e.target.value })} className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Jarak (km)</label>
                  <input type="number" step="0.1" value={form.jarak} onChange={(e) => setForm({ ...form, jarak: e.target.value })} className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" placeholder="0" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 font-semibold hover:bg-slate-50 transition-all">Batal</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-xs hover:shadow active:scale-[0.98] transition-all text-sm font-semibold">{editing ? "Simpan" : "Tambah"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Hapus TPA"
        message={`Yakin ingin menghapus ${deleteTarget?.nama}?`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}
