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
          <h1 className="font-display text-2xl text-bone">TPA</h1>
          <p className="text-sm text-bone-dim mt-1">Tempat Pemrosesan Akhir sampah</p>
        </div>
        <button
          onClick={openCreate}
          className="chamfer-sm bg-vest hover:bg-vest-bright text-asphalt-deep px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Tambah TPA
        </button>
      </div>

      {/* Desktop Table */}
      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-asphalt-deep/40 border-b border-asphalt-line">
                <th className="text-left px-4 py-3 font-medium text-bone-dim">Nama</th>
                <th className="text-left px-4 py-3 font-medium text-bone-dim">Alamat</th>
                <th className="text-left px-4 py-3 font-medium text-bone-dim">Kota</th>
                <th className="text-right px-4 py-3 font-medium text-bone-dim">Jarak (km)</th>
                <th className="text-center px-4 py-3 font-medium text-bone-dim">Status</th>
                <th className="text-center px-4 py-3 font-medium text-bone-dim">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-bone-faint">Memuat...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-bone-faint">Belum ada TPA</td></tr>
              ) : (
                data.map((t) => (
                  <tr key={t.id} className="border-b border-asphalt-line hover:bg-asphalt-raised">
                    <td className="px-4 py-3 font-medium text-bone">{t.nama}</td>
                    <td className="px-4 py-3 text-bone-dim max-w-xs truncate">{t.alamat || "-"}</td>
                    <td className="px-4 py-3 text-bone-dim">{t.kota || "-"}</td>
                    <td className="px-4 py-3 text-right text-bone-dim">{t.jarak ? `${t.jarak} km` : "-"}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${t.aktif ? "bg-emerald-400/10 text-emerald-400 border border-emerald-500/30" : "bg-asphalt-raised text-bone-dim border border-asphalt-line"}`}>
                        {t.aktif ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEdit(t)}
                          className="p-1.5 text-bone-dim hover:bg-asphalt-raised hover:text-sky-300 rounded-lg transition"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteTarget(t)}
                          className="p-1.5 text-danger hover:bg-danger/10 rounded-lg transition"
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
          <div key={t.id} className="panel p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-bone">{t.nama}</h3>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${t.aktif ? "bg-emerald-400/10 text-emerald-400 border border-emerald-500/30" : "bg-asphalt-raised text-bone-dim border border-asphalt-line"}`}>
                {t.aktif ? "Aktif" : "Nonaktif"}
              </span>
            </div>
            <div className="text-xs text-bone-dim space-y-1">
              {t.alamat && <p>📍 {t.alamat}</p>}
              {t.kota && <p>🏙️ {t.kota}</p>}
              {t.jarak && <p>📏 {t.jarak} km</p>}
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={() => openEdit(t)} className="flex-1 text-center text-sm bg-asphalt-raised border border-asphalt-line text-bone hover:border-vest hover:text-vest py-2 rounded-lg transition">Edit</button>
              <button onClick={() => setDeleteTarget(t)} className="flex-1 text-center text-sm bg-danger/10 border border-danger/30 text-red-400 py-2 rounded-lg hover:bg-danger/20 transition">Hapus</button>
            </div>
          </div>
        ))}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-asphalt-deep/70 flex items-center justify-center z-50 p-4">
          <div className="panel w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-asphalt-line">
              <h2 className="font-semibold text-bone">{editing ? "Edit TPA" : "Tambah TPA"}</h2>
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="text-bone-faint hover:text-bone-dim">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-bone-dim mb-1">Nama TPA *</label>
                <input type="text" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} className="w-full px-3 py-2 border border-asphalt-line rounded-lg focus:outline-none focus:ring-2 focus:ring-vest text-sm" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-bone-dim mb-1">Alamat</label>
                <textarea value={form.alamat} onChange={(e) => setForm({ ...form, alamat: e.target.value })} className="w-full px-3 py-2 border border-asphalt-line rounded-lg focus:outline-none focus:ring-2 focus:ring-vest text-sm" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-bone-dim mb-1">Kota</label>
                  <input type="text" value={form.kota} onChange={(e) => setForm({ ...form, kota: e.target.value })} className="w-full px-3 py-2 border border-asphalt-line rounded-lg focus:outline-none focus:ring-2 focus:ring-vest text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-bone-dim mb-1">Jarak (km)</label>
                  <input type="number" step="0.1" value={form.jarak} onChange={(e) => setForm({ ...form, jarak: e.target.value })} className="w-full px-3 py-2 border border-asphalt-line rounded-lg focus:outline-none focus:ring-2 focus:ring-vest text-sm" placeholder="0" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="flex-1 px-4 py-2 border border-asphalt-line rounded-lg text-sm text-bone-dim hover:bg-asphalt-raised">Batal</button>
                <button type="submit" className="flex-1 px-4 py-2 chamfer-sm chamfer-sm bg-vest text-asphalt-deep rounded-lg text-sm hover:bg-vest-bright">{editing ? "Simpan" : "Tambah"}</button>
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
