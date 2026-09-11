"use client";

import { useState, useEffect, useCallback } from "react";
import { formatDate } from "@/lib/utils";
import { useUser } from "@/hooks/useUser";
import { useToast } from "@/components/Toast";
import ConfirmDialog from "@/components/ConfirmDialog";

type Pengumuman = {
  id: number;
  judul: string;
  isi: string;
  penting: boolean;
  createdAt: string;
  createdBy: { nama: string };
  untukWilayah?: { nama: string } | null;
};

export default function PengumumanPage() {
  const { user } = useUser();
  const { showToast } = useToast();
  const [pengumuman, setPengumuman] = useState<Pengumuman[]>([]);
  const [wilayahList, setWilayahList] = useState<{ id: number; nama: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Pengumuman | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ judul: "", isi: "", penting: false, untukWilayahId: "" });

  const fetchData = useCallback(async () => {
    const [pengumumanRes, wilayahRes] = await Promise.all([
      fetch("/api/pengumuman"),
      fetch("/api/wilayah"),
    ]);
    setPengumuman(await pengumumanRes.json());
    setWilayahList(await wilayahRes.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => { await fetchData(); })();
  }, [fetchData]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) { alert("Silakan login ulang"); return; }
    const res = await fetch("/api/pengumuman", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, penting: form.penting, createdById: user.id.toString() }),
    });
    if (res.ok) {
      setShowForm(false);
      setForm({ judul: "", isi: "", penting: false, untukWilayahId: "" });
      showToast("Pengumuman berhasil dipublikasikan");
      fetchData();
    } else {
      showToast("Gagal menyimpan", "error");
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Pengumuman</h1>
          <p className="text-sm text-gray-600 font-bold mt-1">Broadcast pengumuman ke warga</p>
        </div>
        <button onClick={() => setShowForm(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm hover:shadow active:scale-[0.98] transition-all flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Buat Pengumuman
        </button>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="text-center text-gray-400 font-bold py-8">Memuat...</div>
        ) : pengumuman.length === 0 ? (
          <div className="text-center text-gray-400 font-bold py-8">Belum ada pengumuman</div>
        ) : (
          pengumuman.map((p) => (
            <div key={p.id} className={`hm-card bg-white p-0 overflow-hidden ${p.penting ? "border-red-300 ring-1 ring-red-100" : "border border-slate-200/80"}`}>
              <div className="p-4">
                <div className="flex items-start gap-3">
                  {p.penting && (
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-danger/10 flex items-center justify-center">
                      <svg className="w-3.5 h-3.5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </span>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-black font-black">{p.judul}</h3>
                      {p.penting && <span className="text-xs bg-danger/10 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full">Penting</span>}
                    </div>
                    <p className="text-sm text-gray-600 font-bold mt-1 whitespace-pre-wrap">{p.isi}</p>
                    <div className="flex items-center gap-3 mt-3 text-xs text-gray-400 font-bold">
                      <span>Oleh: {p.createdBy.nama}</span>
                      <span>{formatDate(p.createdAt)}</span>
                      {p.untukWilayah && <span>Wilayah: {p.untukWilayah.nama}</span>}
                      <button
                        onClick={() => setDeleteTarget(p)}
                        className="ml-auto text-red-400 hover:text-red-600 transition"
                        title="Hapus"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="hm-card bg-white p-0 overflow-hidden w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="font-semibold text-black font-black">Buat Pengumuman</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 font-bold hover:text-gray-600 font-bold">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 font-bold mb-1">Judul *</label>
                <input type="text" value={form.judul} onChange={(e) => setForm({ ...form, judul: e.target.value })} className="w-full px-3 py-2 border border-slate-200/80 rounded-none text-sm" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 font-bold mb-1">Isi *</label>
                <textarea value={form.isi} onChange={(e) => setForm({ ...form, isi: e.target.value })} className="w-full px-3 py-2 border border-slate-200/80 rounded-none text-sm" rows={4} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 font-bold mb-1">Target Wilayah</label>
                <select value={form.untukWilayahId} onChange={(e) => setForm({ ...form, untukWilayahId: e.target.value })} className="w-full px-3 py-2 border border-slate-200/80 rounded-none text-sm">
                  <option value="">Semua Wilayah</option>
                  {wilayahList.map((w) => <option key={w.id} value={w.id}>{w.nama}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.penting} onChange={(e) => setForm({ ...form, penting: e.target.checked })} className="rounded-none border border-slate-200/80" />
                <span className="text-sm text-gray-600 font-bold">Tandai sebagai penting</span>
              </label>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 border border-slate-200/80 rounded-xl text-sm text-slate-700 font-medium hover:bg-slate-50/80 transition">Batal</button>
                <button type="submit" className="flex-1 px-4 py-2 shadow-sm hover:shadow-md active:scale-[0.98] transition-all bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-sm hover:shadow active:scale-[0.98] transition-all text-sm hover:bg-green-300">Publikasikan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Hapus Pengumuman"
        message={`Yakin ingin menghapus pengumuman "${deleteTarget?.judul}"?`}
        onConfirm={async () => {
          if (!deleteTarget) return;
          setDeleting(true);
          const res = await fetch(`/api/pengumuman/${deleteTarget.id}`, { method: "DELETE" });
          setDeleting(false);
          if (res.ok) {
            showToast("Pengumuman berhasil dihapus");
            setDeleteTarget(null);
            fetchData();
          } else {
            showToast("Gagal menghapus pengumuman", "error");
          }
        }}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}
