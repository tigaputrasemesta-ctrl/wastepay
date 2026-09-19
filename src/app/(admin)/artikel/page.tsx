"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/Toast";

type Artikel = {
  id: number;
  slug: string;
  judul: string;
  isi: string;
  kategori: string;
  diterbitkan: boolean;
  createdAt: string;
};

export default function AdminArtikelPage() {
  const { showToast } = useToast();
  const [artikelList, setArtikelList] = useState<Artikel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editArtikel, setEditArtikel] = useState<Artikel | null>(null);
  const [form, setForm] = useState({ judul: "", isi: "", kategori: "edukasi", diterbitkan: false });

  useEffect(() => {
    fetchArtikel();
  }, []);

  async function fetchArtikel() {
    setLoading(true);
    try {
      const res = await fetch("/api/artikel");
      setArtikelList(await res.json());
    } catch {
      showToast("Gagal memuat artikel", "error");
    } finally {
      setLoading(false);
    }
  }

  function openForm(a?: Artikel) {
    setEditArtikel(a || null);
    setForm({
      judul: a?.judul || "",
      isi: a?.isi || "",
      kategori: a?.kategori || "edukasi",
      diterbitkan: a?.diterbitkan || false,
    });
    setShowForm(true);
  }

  async function saveArtikel(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch(editArtikel ? `/api/artikel/${editArtikel.id}` : "/api/artikel", {
        method: editArtikel ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        showToast(editArtikel ? "Artikel diperbarui" : "Artikel diterbitkan");
        setShowForm(false);
        fetchArtikel();
      } else {
        showToast("Gagal menyimpan", "error");
      }
    } catch {
      showToast("Terjadi kesalahan jaringan", "error");
    }
  }

  async function deleteArtikel(id: number) {
    if (!confirm("Yakin ingin menghapus artikel ini?")) return;
    try {
      const res = await fetch(`/api/artikel/${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Artikel dihapus");
        fetchArtikel();
      }
    } catch {
      showToast("Gagal menghapus", "error");
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Manajemen Artikel</h1>
          <p className="text-slate-500 text-sm">Kelola konten edukasi dan berita untuk warga</p>
        </div>
        <button
          onClick={() => openForm()}
          className="px-4 py-2 bg-emerald-700 text-white rounded-xl text-sm font-semibold hover:bg-emerald-800 transition shadow-sm"
        >
          + Tulis Artikel
        </button>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-700 text-xs uppercase text-left border-b border-slate-200">
              <th className="px-4 py-3">Judul Artikel</th>
              <th className="px-4 py-3">Kategori</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Tanggal</th>
              <th className="px-4 py-3 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={5} className="p-8 text-center text-slate-500">Memuat artikel...</td></tr>
            ) : artikelList.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-slate-500">Belum ada artikel terbit</td></tr>
            ) : (
              artikelList.map(a => (
                <tr key={a.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-semibold text-slate-900">{a.judul}</td>
                  <td className="px-4 py-3 capitalize text-slate-600">{a.kategori}</td>
                  <td className="px-4 py-3">
                    {a.diterbitkan ? (
                      <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full font-semibold">Publik</span>
                    ) : (
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full font-semibold">Draft</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{new Date(a.createdAt).toLocaleDateString("id-ID")}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => openForm(a)} className="text-emerald-600 hover:underline mr-3 text-xs font-semibold">Edit</button>
                    <button onClick={() => deleteArtikel(a.id)} className="text-rose-600 hover:underline text-xs font-semibold">Hapus</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h2 className="font-bold text-slate-900">{editArtikel ? "Edit Artikel" : "Tulis Artikel Baru"}</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={saveArtikel} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Judul Artikel</label>
                <input required type="text" value={form.judul} onChange={e => setForm({...form, judul: e.target.value})} className="w-full px-3 py-2 border rounded-xl bg-white outline-none focus:ring-2 ring-emerald-500/20" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Kategori</label>
                  <select value={form.kategori} onChange={e => setForm({...form, kategori: e.target.value})} className="w-full px-3 py-2 border rounded-xl bg-white outline-none">
                    <option value="edukasi">Edukasi Warga</option>
                    <option value="informasi">Informasi Layanan</option>
                    <option value="berita">Berita & Acara</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input type="checkbox" id="pub" checked={form.diterbitkan} onChange={e => setForm({...form, diterbitkan: e.target.checked})} className="w-4 h-4 text-emerald-600 rounded" />
                  <label htmlFor="pub" className="text-sm font-semibold text-slate-700">Terbitkan langsung</label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Isi Artikel</label>
                <textarea required rows={8} value={form.isi} onChange={e => setForm({...form, isi: e.target.value})} className="w-full px-3 py-2 border rounded-xl bg-white outline-none focus:ring-2 ring-emerald-500/20 resize-none" placeholder="Tulis konten di sini..." />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold text-sm">Batal</button>
                <button type="submit" className="px-4 py-2 bg-emerald-700 text-white rounded-xl font-semibold text-sm hover:bg-emerald-800">Simpan Artikel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
