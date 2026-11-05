"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/components/Toast";
import { kompresGambar } from "@/lib/foto";
import { getArticleCoverImage } from "@/lib/default-articles";
import ArticleImage from "@/components/ArticleImage";

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
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [editorTab, setEditorTab] = useState<"edit" | "preview">("edit");
  
  const [form, setForm] = useState({
    judul: "",
    isi: "",
    kategori: "edukasi",
    gambar: "",
    diterbitkan: false,
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/artikel");
      if (res.ok) {
        setArtikel(await res.json());
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || "Gagal memuat daftar artikel", "error");
      }
    } catch {
      showToast("Gagal menghubungi server untuk memuat artikel", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    (async () => { await fetchData(); })();
  }, [fetchData]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const base64 = await kompresGambar(file);
      setForm(prev => ({ ...prev, gambar: base64 }));
    } catch (err: any) {
      showToast("Gagal memproses gambar: " + err.message, "error");
    } finally {
      setUploadingImage(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setErrorMsg("");
    setEditorTab("edit");
    setForm({ judul: "", isi: "", kategori: "edukasi", gambar: "", diterbitkan: false });
    setShowForm(true);
  }

  function openEdit(a: Artikel) {
    setEditing(a);
    setErrorMsg("");
    setEditorTab("edit");
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
    try {
      const res = await fetch(`/api/artikel/${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Artikel berhasil dihapus");
        fetchData();
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || "Gagal menghapus artikel", "error");
      }
    } catch {
      showToast("Gagal menghubungi server", "error");
    }
  }

  async function togglePublish(a: Artikel) {
    try {
      const res = await fetch(`/api/artikel/${a.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diterbitkan: !a.diterbitkan }),
      });
      if (res.ok) {
        showToast(`Artikel berhasil ${!a.diterbitkan ? "diterbitkan" : "di-draft"}`);
        fetchData();
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || "Gagal mengubah status artikel", "error");
      }
    } catch {
      showToast("Gagal menghubungi server", "error");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.judul.trim() || !form.isi.trim()) {
      setErrorMsg("Judul dan isi artikel wajib diisi");
      return;
    }

    setSaving(true);
    setErrorMsg("");

    try {
      const url = editing ? `/api/artikel/${editing.id}` : "/api/artikel";
      const method = editing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setShowForm(false);
        showToast(editing ? "Artikel berhasil diperbarui" : "Artikel berhasil diterbitkan");
        fetchData();
      } else {
        setErrorMsg(data.error || "Terjadi kesalahan saat menyimpan artikel");
        showToast(data.error || "Terjadi kesalahan", "error");
      }
    } catch {
      setErrorMsg("Gagal terhubung ke server. Periksa koneksi internet Anda.");
      showToast("Gagal terhubung ke server", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleSyncSeo() {
    if (!confirm("Sinkronkan / perbarui 5 artikel SEO unggulan (Page 1 Google) ke sistem?")) return;
    setSyncing(true);
    try {
      const res = await fetch("/api/artikel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync" }),
      });
      if (res.ok) {
        showToast("5 Artikel SEO unggulan berhasil disinkronkan ke sistem!");
        fetchData();
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || "Gagal menyinkronkan artikel", "error");
      }
    } catch {
      showToast("Gagal terhubung ke server", "error");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 pb-12 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mb-1">Artikel & Edukasi</h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">Kelola informasi publik dan berita UPS HERU</p>
        </div>
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleSyncSeo}
            disabled={syncing}
            className="flex-1 sm:flex-none bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 px-3.5 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            title="Muat atau perbarui 5 artikel SEO Page 1 Google ke database"
          >
            <span>{syncing ? "⏳ Menyinkronkan..." : "⚡ Sinkronkan 5 Artikel SEO"}</span>
          </button>
          <button
            onClick={openCreate}
            className="flex-1 sm:flex-none bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2"
          >
            <span>✍️ Tulis Artikel Baru</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
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
                        <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-slate-200 shadow-sm bg-slate-900">
                          <ArticleImage
                            src={getArticleCoverImage(a.gambar, a.kategori)}
                            alt={a.judul}
                            fallbackCategory={a.kategori}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 max-w-sm truncate" title={a.judul}>{a.judul}</div>
                          <a
                            href={`/artikel/${a.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-emerald-600 hover:underline font-medium inline-flex items-center gap-1"
                          >
                            <span>/artikel/{a.slug}</span>
                            <span>↗</span>
                          </a>
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
                        <a
                          href={`/artikel/${a.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-400 hover:text-blue-600 transition-colors p-1"
                          title="Lihat Halaman Publik (Tab Baru)"
                        >
                          👁️
                        </a>
                        <button onClick={() => openEdit(a)} className="text-slate-400 hover:text-emerald-600 transition-colors p-1" title="Edit">
                          ✏️
                        </button>
                        <button onClick={() => handleDelete(a.id)} className="text-slate-400 hover:text-rose-600 transition-colors p-1" title="Hapus">
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

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500 font-medium">Memuat artikel...</div>
          ) : artikel.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 font-medium">Belum ada artikel</div>
          ) : (
            artikel.map((a) => (
              <div key={a.id} className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-slate-200 bg-slate-900">
                    <ArticleImage
                      src={getArticleCoverImage(a.gambar, a.kategori)}
                      alt={a.judul}
                      fallbackCategory={a.kategori}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 text-sm line-clamp-2 leading-snug">{a.judul}</p>
                    <a
                      href={`/artikel/${a.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-emerald-600 hover:underline font-medium inline-flex items-center gap-0.5 mt-1"
                    >
                      <span>/artikel/{a.slug}</span>
                      <span>↗</span>
                    </a>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-50 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-[10px] font-bold">
                      {a.kategori.charAt(0).toUpperCase() + a.kategori.slice(1)}
                    </span>
                    <button
                      onClick={() => togglePublish(a)}
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                        a.diterbitkan ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-600 border-slate-300"
                      }`}
                    >
                      {a.diterbitkan ? "✅ Terbit" : "Draft"}
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <a
                      href={`/artikel/${a.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-slate-500 hover:text-blue-600 bg-slate-50 rounded-lg border border-slate-200"
                      title="Lihat"
                    >
                      👁️
                    </a>
                    <button
                      onClick={() => openEdit(a)}
                      className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 rounded-lg border border-emerald-200"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(a.id)}
                      className="p-1.5 text-rose-600 hover:text-rose-700 bg-rose-50 rounded-lg border border-rose-200"
                      title="Hapus"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 rounded-t-2xl sm:rounded-xl border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden w-full max-w-3xl max-h-[88dvh] sm:max-h-[90vh] flex flex-col text-slate-900 dark:text-zinc-100">
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/50 shrink-0">
              <div className="flex items-center gap-3">
                <h2 className="font-semibold text-sm sm:text-base text-slate-900 dark:text-zinc-100">
                  {editing ? "Edit Artikel" : "Tulis Artikel Baru"}
                </h2>
                {/* Segmented Toggle Tab Mobile */}
                <div className="flex items-center gap-1 bg-slate-200/80 dark:bg-zinc-800 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setEditorTab("edit")}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                      editorTab === "edit"
                        ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-xs"
                        : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200"
                    }`}
                  >
                    ✏️ Editor
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorTab("preview")}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                      editorTab === "preview"
                        ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-xs"
                        : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200"
                    }`}
                  >
                    👁️ Pratinjau
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="overflow-y-auto p-4 sm:p-6 space-y-5 flex-1">
                {editorTab === "preview" ? (
                  <div className="space-y-4 max-w-2xl mx-auto py-2">
                    <div className="space-y-2">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300">
                        {form.kategori}
                      </span>
                      <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
                        {form.judul || "Judul Artikel (Pratinjau)"}
                      </h1>
                      <p className="text-xs text-slate-400 dark:text-zinc-500">
                        Status: {form.diterbitkan ? "Diterbitkan (Publik)" : "Draft"} · Pratinjau Tampilan
                      </p>
                    </div>

                    {form.gambar && (
                      <div className="h-44 sm:h-60 w-full rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-800 bg-slate-950 relative">
                        <ArticleImage
                          src={getArticleCoverImage(form.gambar, form.kategori)}
                          alt={form.judul}
                          fallbackCategory={form.kategori}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    <div className="prose prose-sm max-w-none text-slate-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed border-t border-slate-100 dark:border-zinc-800 pt-4 text-xs sm:text-sm">
                      {form.isi || "Belum ada konten artikel."}
                    </div>
                  </div>
                ) : (
                  <>
                    {errorMsg && (
                      <div className="p-3.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                        <span>⚠️</span>
                        <span>{errorMsg}</span>
                      </div>
                    )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300">Judul Artikel <span className="text-rose-500">*</span></label>
                    <input
                      required
                      value={form.judul}
                      onChange={e => setForm({ ...form, judul: e.target.value })}
                      className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-slate-900 dark:text-zinc-100 text-sm placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                      placeholder="Masukkan judul artikel"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300">Kategori</label>
                    <select
                      value={form.kategori}
                      onChange={e => setForm({ ...form, kategori: e.target.value })}
                      className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-slate-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
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
                      <span className="text-sm font-semibold text-slate-700 dark:text-zinc-300">Publikasikan langsung</span>
                    </label>
                  </div>
                </div>

                {/* GAMBAR COVER: BISA KETIK URL ATAU UNGGAH FILE */}
                <div className="space-y-3 p-4 rounded-xl bg-slate-50/50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <label className="block text-xs font-semibold text-slate-800 dark:text-zinc-200">
                      Gambar Cover / Sampul (Opsional)
                    </label>
                    <span className="text-[11px] text-slate-500 dark:text-zinc-400">Ketik link URL atau unggah file foto</span>
                  </div>

                  {/* Input URL atau Unggah File */}
                  <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
                    <div className="flex-1 relative">
                      <input
                        type="url"
                        value={form.gambar.startsWith("data:") ? "" : form.gambar}
                        onChange={e => setForm(prev => ({ ...prev, gambar: e.target.value }))}
                        placeholder="Ketik atau tempel link URL foto (contoh: https://...)"
                        className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors shadow-xs"
                      />
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-slate-400 dark:text-zinc-500 font-semibold hidden sm:inline">atau</span>
                      <button
                        type="button"
                        disabled={uploadingImage}
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full sm:w-auto px-4 py-2 bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-xs"
                      >
                        {uploadingImage ? "⏳ Memproses..." : "📁 Unggah File"}
                      </button>
                    </div>
                  </div>

                  {/* Tombol Pilihan Foto Cepat UPS HERU */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-semibold uppercase tracking-wider mr-1">Rekomendasi Foto:</span>
                    <button
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, gambar: "https://images.unsplash.com/photo-1595278069441-2cf29f8005a4?auto=format&fit=crop&w=800&q=80" }))}
                      className="px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-semibold border border-emerald-200 dark:border-emerald-800 transition-colors"
                    >
                      🚚 Truk Sampah
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, gambar: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=800&q=80" }))}
                      className="px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-semibold border border-emerald-200 dark:border-emerald-800 transition-colors"
                    >
                      ♻️ Pemilahan Sampah
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, gambar: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80" }))}
                      className="px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-semibold border border-emerald-200 dark:border-emerald-800 transition-colors"
                    >
                      🌿 Lingkungan Bersih
                    </button>
                  </div>

                  {/* Preview Gambar Cover */}
                  {form.gambar && (
                    <div className="relative inline-block mt-1">
                      <div className="h-36 w-64 rounded-lg overflow-hidden border border-slate-200 dark:border-zinc-800 shadow-xs bg-slate-900">
                        <ArticleImage
                          src={form.gambar}
                          alt="Preview Cover"
                          fallbackCategory={form.kategori}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setForm(prev => ({ ...prev, gambar: "" }));
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="absolute -top-2 -right-2 bg-rose-600 hover:bg-rose-700 text-white rounded-full w-5 h-5 flex items-center justify-center font-bold text-xs shadow-md transition z-10"
                        title="Hapus Gambar"
                      >
                        ×
                      </button>
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

                {/* ISI ARTIKEL DENGAN TOOLBAR SISIPKAN FOTO / FORMAT */}
                <div className="space-y-1.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300">
                      Isi Konten Artikel <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const url = prompt("Ketik / tempel link URL foto yang ingin disisipkan di dalam artikel:");
                          if (url) {
                            setForm(prev => ({
                              ...prev,
                              isi: (prev.isi ? prev.isi + "\n\n" : "") + `![Foto Kegiatan UPS HERU](${url})\n\n`
                            }));
                          }
                        }}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-800 transition flex items-center gap-1"
                      >
                        <span>📷</span>
                        <span>Sisipkan Foto di Teks</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setForm(prev => ({
                            ...prev,
                            isi: (prev.isi ? prev.isi + "\n\n" : "") + "### Sub-Judul Baru\n"
                          }));
                        }}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-800 transition"
                      >
                        📌 Sub-Judul
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setForm(prev => ({
                            ...prev,
                            isi: (prev.isi ? prev.isi + "\n" : "") + "• Poin pertama\n• Poin kedua\n"
                          }));
                        }}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-800 transition"
                      >
                        • Poin
                      </button>
                    </div>
                  </div>
                  <textarea
                    required
                    value={form.isi}
                    onChange={e => setForm({ ...form, isi: e.target.value })}
                    className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-2.5 text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 min-h-[250px] resize-y transition-colors"
                    placeholder="Tulis konten berita atau edukasi di sini. Anda bisa menyisipkan foto atau sub-judul memakai tombol di atas."
                  />
                </div>
              </>
            )}
          </div>

              <div className="p-4 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/50 shrink-0 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg font-semibold text-xs border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving || uploadingImage}
                  className="px-4 py-2 rounded-lg font-semibold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-r-transparent rounded-full animate-spin"></span>
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Simpan Artikel</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
