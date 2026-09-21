"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/components/Toast";
import { kompresGambar } from "@/lib/foto";

type Artikel = {
  id: number;
  slug: string;
  judul: string;
  isi: string;
  kategori: string;
  gambar: string | null;
  diterbitkan: boolean;
  createdAt: string;
  penulis?: { nama: string };
};

export default function ArtikelPage() {
  const { showToast } = useToast();
  const [artikel, setArtikel] = useState<Artikel[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Artikel | null>(null);
  
  const [form, setForm] = useState({
    judul: "",
    isi: "",
    kategori: "edukasi",
    gambar: "",
    diterbitkan: false,
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/artikel");
    if (res.ok) {
      setArtikel(await res.json());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => { await fetchData(); })();
  }, [fetchData]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await kompresGambar(file);
      setForm({ ...form, gambar: base64 });
    } catch (err: any) {
      alert("Gagal memproses gambar: " + err.message);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm({ judul: "", isi: "", kategori: "edukasi", gambar: "", diterbitkan: false });
    setShowForm(true);
  }

  function openEdit(a: Artikel) {
    setEditing(a);
    setForm({
      judul: a.judul,
      isi: a.isi,
      kategori: a.kategori,
      gambar: a.gambar || "",
      diterbitkan: a.diterbitkan,
    });
    setShowForm(true);
  }

  async function handleDelete(id: number) {
    if (!confirm("Hapus artikel ini permanen?")) return;
    const res = await fetch(`/api/artikel/${id}`, { method: "DELETE" });
    if (res.ok) {
      showToast("Artikel berhasil dihapus");
      fetchData();
    }
  }

  async function togglePublish(a: Artikel) {
    const res = await fetch(`/api/artikel/${a.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ diterbitkan: !a.diterbitkan }),
    });
    if (res.ok) {
      showToast(`Artikel berhasil ${!a.diterbitkan ? "diterbitkan" : "di-draft"}`);
      fetchData();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const url = editing ? `/api/artikel/${editing.id}` : "/api/artikel";
    const method = editing ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      setShowForm(false);
      showToast(editing ? "Artikel diperbarui" : "Artikel diterbitkan");
      fetchData();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Terjadi kesalahan");
    }
  }

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mb-1">Artikel & Edukasi</h1>
          <p className="text-sm text-slate-500 font-medium">Kelola informasi publik dan berita UPS HERU</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2"
        >
          <span>✍️ Tulis Artikel Baru</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold text-xs border-b border-slate-200">
                <th className="px-4 py-3.5 whitespace-nowrap">Judul Artikel</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Kategori</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Status</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Tanggal</th>
                <th className="px-4 py-3.5 text-center whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-slate-800 divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-500">Memuat artikel...</td></tr>
              ) : artikel.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-500 font-medium">Belum ada artikel.</td></tr>
              ) : (
                artikel.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        {a.gambar ? (
                          <img src={a.gambar} alt={a.judul} className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-400 text-xs">
                            📷
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-slate-900 max-w-sm truncate" title={a.judul}>{a.judul}</div>
                          <div className="text-[10px] text-slate-500 font-medium">/artikel/{a.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-[10px] font-bold">
                        {a.kategori.charAt(0).toUpperCase() + a.kategori.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <button
                        onClick={() => togglePublish(a)}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                          a.diterbitkan ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" : "bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200"
                        }`}
                        title="Klik untuk mengubah status"
                      >
                        {a.diterbitkan ? "✅ Diterbitkan" : "Draft"}
                      </button>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-600">
                      {formatDate(a.createdAt)}
                    </td>
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => openEdit(a)} className="text-slate-400 hover:text-emerald-600 transition-colors" title="Edit">
                          ✏️
                        </button>
                        <button onClick={() => handleDelete(a.id)} className="text-slate-400 hover:text-rose-600 transition-colors" title="Hapus">
                          🗑️
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

      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl overflow-hidden w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4.5 bg-slate-900 text-white shrink-0">
              <h2 className="font-bold text-base tracking-wide">{editing ? "Edit Artikel" : "Tulis Artikel Baru"}</h2>
              <button
                onClick={() => setShowForm(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              >
                ×
              </button>
            </div>
            <div className="overflow-y-auto p-6">
              <form id="artikel-form" onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700">Judul Artikel <span className="text-rose-500">*</span></label>
                    <input
                      required
                      value={form.judul}
                      onChange={e => setForm({ ...form, judul: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      placeholder="Masukkan judul artikel"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">Kategori</label>
                    <select
                      value={form.kategori}
                      onChange={e => setForm({ ...form, kategori: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    >
                      <option value="edukasi">Edukasi</option>
                      <option value="informasi">Informasi</option>
                      <option value="berita">Berita</option>
                    </select>
                  </div>
                  <div className="space-y-1.5 flex flex-col justify-end pb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.diterbitkan}
                        onChange={e => setForm({ ...form, diterbitkan: e.target.checked })}
                        className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                      />
                      <span className="text-sm font-bold text-slate-700">Publikasikan langsung</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">Gambar Cover (Opsional)</label>
                  {form.gambar ? (
                    <div className="relative inline-block">
                      <img src={form.gambar} alt="Cover" className="h-32 rounded-xl object-cover border border-slate-200" />
                      <button
                        type="button"
                        onClick={() => { setForm({ ...form, gambar: "" }); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                        className="absolute -top-2 -right-2 bg-rose-600 text-white rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs shadow-md"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-2 transition-colors"
                      >
                        📷 Unggah Gambar
                      </button>
                      <span className="text-[10px] text-slate-500">Maks. 5MB, JPG/PNG</span>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">Isi Artikel <span className="text-rose-500">*</span></label>
                  <textarea
                    required
                    value={form.isi}
                    onChange={e => setForm({ ...form, isi: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 min-h-[250px] resize-y"
                    placeholder="Tulis konten artikel di sini. Anda bisa menggunakan spasi ganda untuk paragraf baru."
                  />
                </div>
              </form>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0 flex justify-end gap-3 rounded-b-3xl">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Batal
              </button>
              <button
                form="artikel-form"
                type="submit"
                className="px-6 py-2.5 rounded-xl font-bold text-sm bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm transition-colors"
              >
                Simpan Artikel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
