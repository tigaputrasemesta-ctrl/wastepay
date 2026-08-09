"use client";

import { useState, useEffect, useCallback } from "react";
import { formatRupiah, formatDate, KATEGORI_PENGELUARAN } from "@/lib/utils";
import { useUser } from "@/hooks/useUser";
import { useToast } from "@/components/Toast";
import ConfirmDialog from "@/components/ConfirmDialog";

type Pengeluaran = {
  id: number;
  tanggal: string;
  kategori: string;
  jumlah: number;
  keterangan: string;
  bukti?: string;
  dicatatBy: { nama: string };
};

export default function PengeluaranPage() {
  const { user } = useUser();
  const { showToast } = useToast();
  const [pengeluaran, setPengeluaran] = useState<Pengeluaran[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Pengeluaran | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Pengeluaran | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [bulan, setBulan] = useState((new Date().getMonth() + 1).toString());
  const [tahun, setTahun] = useState(new Date().getFullYear().toString());
  const [form, setForm] = useState({ tanggal: "", kategori: "bbm", jumlah: "", keterangan: "" });

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/pengeluaran?bulan=${bulan}&tahun=${tahun}`);
      const data = await res.json();
      setPengeluaran(data.data);
      setTotal(data.total);
    } catch {
      showToast("Gagal memuat data", "error");
    } finally {
      setLoading(false);
    }
  }, [bulan, tahun, showToast]);

  useEffect(() => {
    (async () => { await fetchData(); })();
  }, [fetchData]);

  function openCreate() {
    setEditing(null);
    setForm({ tanggal: "", kategori: "bbm", jumlah: "", keterangan: "" });
    setShowForm(true);
  }

  function openEdit(p: Pengeluaran) {
    setEditing(p);
    setForm({
      tanggal: p.tanggal.split("T")[0],
      kategori: p.kategori,
      jumlah: p.jumlah.toString(),
      keterangan: p.keterangan,
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) { showToast("Silakan login ulang", "error"); return; }

    const url = editing ? `/api/pengeluaran/${editing.id}` : "/api/pengeluaran";
    const method = editing ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, dicatatById: user.id.toString() }),
    });

    if (res.ok) {
      setShowForm(false);
      setEditing(null);
      showToast(editing ? "Pengeluaran berhasil diperbarui" : "Pengeluaran berhasil dicatat");
      fetchData();
    } else {
      showToast("Gagal menyimpan", "error");
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await fetch(`/api/pengeluaran/${deleteTarget.id}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) {
      showToast("Pengeluaran berhasil dihapus");
      setDeleteTarget(null);
      fetchData();
    } else {
      showToast("Gagal menghapus pengeluaran", "error");
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-bone">Pengeluaran</h1>
          <p className="text-sm text-bone-dim mt-1">Catat pengeluaran operasional</p>
        </div>
        <button onClick={openCreate} className="chamfer-sm bg-vest hover:bg-vest-bright text-asphalt-deep px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Catat Pengeluaran
        </button>
      </div>

      {/* Filter & Total */}
      <div className="flex gap-3 mb-4 items-end flex-wrap">
        <select value={bulan} onChange={(e) => setBulan(e.target.value)} className="px-3 py-2 border border-asphalt-line rounded-lg text-sm">
          <option value="">Semua Bulan</option>
          {[1,2,3,4,5,6,7,8,9,10,11,12].map((b) => <option key={b} value={b}>{["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"][b-1]}</option>)}
        </select>
        <select value={tahun} onChange={(e) => setTahun(e.target.value)} className="px-3 py-2 border border-asphalt-line rounded-lg text-sm">
          {[2024, 2025, 2026, 2027, 2028].map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <div className="ml-auto text-right">
          <p className="text-sm text-bone-dim">Total Pengeluaran</p>
          <p className="text-xl font-bold text-danger">{formatRupiah(total)}</p>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-asphalt-deep/40 border-b border-asphalt-line">
                <th className="text-left px-4 py-3 font-medium text-bone-dim">Tanggal</th>
                <th className="text-left px-4 py-3 font-medium text-bone-dim">Kategori</th>
                <th className="text-left px-4 py-3 font-medium text-bone-dim">Keterangan</th>
                <th className="text-right px-4 py-3 font-medium text-bone-dim">Jumlah</th>
                <th className="text-left px-4 py-3 font-medium text-bone-dim">Dicatat Oleh</th>
                <th className="text-center px-4 py-3 font-medium text-bone-dim">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-bone-faint">Memuat...</td></tr>
              ) : pengeluaran.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-bone-faint">Belum ada pengeluaran</td></tr>
              ) : (
                pengeluaran.map((p) => (
                  <tr key={p.id} className="border-b border-asphalt-line hover:bg-asphalt-raised">
                    <td className="px-4 py-3 text-bone-dim text-xs">{formatDate(p.tanggal)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-danger/10 text-red-400 border border-red-500/30">
                        {KATEGORI_PENGELUARAN.find((k) => k.value === p.kategori)?.label || p.kategori}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-bone-dim max-w-xs truncate">{p.keterangan}</td>
                    <td className="px-4 py-3 text-right font-medium text-danger">{formatRupiah(p.jumlah)}</td>
                    <td className="px-4 py-3 text-bone-dim text-xs">{p.dicatatBy.nama}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEdit(p)} className="p-1.5 text-bone-dim hover:bg-asphalt-raised hover:text-sky-300 rounded-lg transition" title="Edit">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => setDeleteTarget(p)} className="p-1.5 text-danger hover:bg-danger/10 rounded-lg transition" title="Hapus">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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
      <div className="md:hidden space-y-3">
        {pengeluaran.map((p) => (
          <div key={p.id} className="panel p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <span className="text-xs text-bone-faint">{formatDate(p.tanggal)}</span>
                <h3 className="font-medium text-bone mt-0.5">{p.keterangan}</h3>
              </div>
              <span className="font-semibold text-danger">{formatRupiah(p.jumlah)}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-danger/10 text-red-400 border border-red-500/30">
                {KATEGORI_PENGELUARAN.find((k) => k.value === p.kategori)?.label || p.kategori}
              </span>
              <span className="text-bone-faint">oleh {p.dicatatBy.nama}</span>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={() => openEdit(p)} className="flex-1 text-center text-sm bg-asphalt-raised border border-asphalt-line text-bone hover:border-vest hover:text-vest py-2 rounded-lg transition">Edit</button>
              <button onClick={() => setDeleteTarget(p)} className="flex-1 text-center text-sm bg-danger/10 border border-danger/30 text-red-400 py-2 rounded-lg hover:bg-danger/20 transition">Hapus</button>
            </div>
          </div>
        ))}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-asphalt-deep/70 flex items-center justify-center z-50 p-4">
          <div className="panel w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-asphalt-line">
              <h2 className="font-semibold text-bone">{editing ? "Edit Pengeluaran" : "Catat Pengeluaran"}</h2>
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="text-bone-faint hover:text-bone-dim">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-bone-dim mb-1">Tanggal</label>
                <input type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} className="w-full px-3 py-2 border border-asphalt-line rounded-lg focus:outline-none focus:ring-2 focus:ring-vest text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-bone-dim mb-1">Kategori *</label>
                <select value={form.kategori} onChange={(e) => setForm({ ...form, kategori: e.target.value })} className="w-full px-3 py-2 border border-asphalt-line rounded-lg focus:outline-none focus:ring-2 focus:ring-vest text-sm" required>
                  {KATEGORI_PENGELUARAN.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-bone-dim mb-1">Jumlah *</label>
                <input type="number" value={form.jumlah} onChange={(e) => setForm({ ...form, jumlah: e.target.value })} className="w-full px-3 py-2 border border-asphalt-line rounded-lg focus:outline-none focus:ring-2 focus:ring-vest text-sm" placeholder="50000" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-bone-dim mb-1">Keterangan *</label>
                <textarea value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} className="w-full px-3 py-2 border border-asphalt-line rounded-lg focus:outline-none focus:ring-2 focus:ring-vest text-sm" rows={2} placeholder="Isi BBM motor" required />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="flex-1 px-4 py-2 border border-asphalt-line rounded-lg text-sm text-bone-dim hover:bg-asphalt-raised">Batal</button>
                <button type="submit" className="flex-1 px-4 py-2 chamfer-sm chamfer-sm bg-vest text-asphalt-deep rounded-lg text-sm hover:bg-vest-bright">{editing ? "Simpan" : "Simpan"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Hapus Pengeluaran"
        message={`Yakin ingin menghapus pengeluaran "${deleteTarget?.keterangan}" sebesar ${deleteTarget ? formatRupiah(deleteTarget.jumlah) : ""}?`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}
