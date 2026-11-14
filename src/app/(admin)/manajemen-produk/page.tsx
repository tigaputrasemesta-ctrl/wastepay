"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RotateCcw,
  Sparkles,
  Layers,
  Tag,
  DollarSign,
  Package,
  MessageCircle,
  Eye,
  EyeOff,
  X,
  Save,
} from "lucide-react";
import { useToast } from "@/components/Toast";
import ConfirmDialog from "@/components/ConfirmDialog";
import {
  ProdukSampah,
  KategoriProduk,
  KATEGORI_LABELS,
  formatRupiah,
  getWaOrderUrl,
  DEFAULT_PRODUK_LIST,
} from "@/lib/katalog-produk";

export default function ManajemenProdukPage() {
  const { showToast } = useToast();
  const [produkList, setProdukList] = useState<ProdukSampah[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [kategoriFilter, setKategoriFilter] = useState<string>("all");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ProdukSampah | null>(null);
  const [formData, setFormData] = useState<Omit<ProdukSampah, "urutan">>({
    id: "",
    nama: "",
    kategori: "kompos",
    harga: 15000,
    satuan: "karung 5 kg",
    deskripsi: "",
    gambar: "",
    stokTersedia: true,
    badge: "",
    aktif: true,
  });

  // Delete Confirm
  const [deleteTarget, setDeleteTarget] = useState<ProdukSampah | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  // 1. Fetch Produk dari Admin API
  const fetchProduk = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/produk");
      if (res.ok) {
        const json = await res.json();
        setProdukList(json.data || []);
      } else {
        showToast("Gagal memuat katalog produk", "error");
      }
    } catch {
      showToast("Gagal terhubung ke server", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchProduk();
  }, [fetchProduk]);

  // 2. Simpan Seluruh List ke Backend
  const saveToServer = async (newList: ProdukSampah[], successMessage: string) => {
    try {
      setSaving(true);
      const res = await fetch("/api/admin/produk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ produkList: newList }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setProdukList(newList);
        showToast(successMessage, "success");
        return true;
      } else {
        showToast(data.error || "Gagal menyimpan perubahan", "error");
        return false;
      }
    } catch {
      showToast("Terjadi kendala jaringan saat menyimpan", "error");
      return false;
    } finally {
      setSaving(false);
    }
  };

  // 3. Filter & Search List
  const filteredList = useMemo(() => {
    return produkList.filter((item) => {
      const matchSearch =
        item.nama.toLowerCase().includes(search.toLowerCase()) ||
        item.deskripsi.toLowerCase().includes(search.toLowerCase()) ||
        item.satuan.toLowerCase().includes(search.toLowerCase());
      const matchKategori =
        kategoriFilter === "all" || item.kategori === kategoriFilter;
      return matchSearch && matchKategori;
    });
  }, [produkList, search, kategoriFilter]);

  // Stats
  const stats = useMemo(() => {
    const total = produkList.length;
    const aktif = produkList.filter((p) => p.aktif).length;
    const kategoriCount = new Set(produkList.map((p) => p.kategori)).size;
    return { total, aktif, kategoriCount };
  }, [produkList]);

  // Handle Form Open (New)
  const handleOpenNew = () => {
    setEditingItem(null);
    setFormData({
      id: `prod-${Date.now().toString().slice(-6)}`,
      nama: "",
      kategori: "kompos",
      harga: 15000,
      satuan: "kg",
      deskripsi: "",
      gambar:
        "https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?auto=format&fit=crop&w=800&q=80",
      stokTersedia: true,
      badge: "",
      aktif: true,
    });
    setModalOpen(true);
  };

  // Handle Form Open (Edit)
  const handleOpenEdit = (item: ProdukSampah) => {
    setEditingItem(item);
    setFormData({
      id: item.id,
      nama: item.nama,
      kategori: item.kategori,
      harga: item.harga,
      satuan: item.satuan,
      deskripsi: item.deskripsi,
      gambar: item.gambar,
      stokTersedia: item.stokTersedia,
      badge: item.badge || "",
      aktif: item.aktif,
    });
    setModalOpen(true);
  };

  // Handle Submit Form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama.trim()) {
      showToast("Nama produk wajib diisi", "error");
      return;
    }
    if (formData.harga <= 0) {
      showToast("Harga produk harus lebih dari 0", "error");
      return;
    }

    let updatedList: ProdukSampah[];
    if (editingItem) {
      // Update existing
      updatedList = produkList.map((p) =>
        p.id === editingItem.id ? { ...formData, urutan: p.urutan || 99 } : p
      );
    } else {
      // Add new
      const newItem: ProdukSampah = {
        ...formData,
        urutan: produkList.length + 1,
      };
      updatedList = [newItem, ...produkList];
    }

    const ok = await saveToServer(
      updatedList,
      editingItem ? "Produk berhasil diperbarui!" : "Produk baru berhasil ditambahkan!"
    );
    if (ok) {
      setModalOpen(false);
    }
  };

  // Toggle Aktif Langsung
  const handleToggleAktif = async (item: ProdukSampah) => {
    const updated = produkList.map((p) =>
      p.id === item.id ? { ...p, aktif: !p.aktif } : p
    );
    await saveToServer(
      updated,
      item.aktif
        ? `Produk '${item.nama}' dinonaktifkan dari landing page`
        : `Produk '${item.nama}' sekarang aktif di landing page`
    );
  };

  // Delete Item
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const updated = produkList.filter((p) => p.id !== deleteTarget.id);
    const ok = await saveToServer(updated, `Produk '${deleteTarget.nama}' berhasil dihapus.`);
    if (ok) {
      setDeleteTarget(null);
    }
  };

  // Reset ke Default
  const handleResetDefault = async () => {
    try {
      setSaving(true);
      const res = await fetch("/api/admin/produk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });
      if (res.ok) {
        setProdukList(DEFAULT_PRODUK_LIST);
        showToast("Katalog produk berhasil direset ke standar bawaan!", "success");
      } else {
        showToast("Gagal mereset katalog produk", "error");
      }
    } catch {
      showToast("Terjadi kendala jaringan", "error");
    } finally {
      setSaving(false);
      setResetConfirmOpen(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-[#0d7a75] dark:text-emerald-400 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-zinc-100">
              Katalog Produk Sampah & Daur Ulang
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400">
            Kelola etalase produk pupuk kompos, maggot BSF, dan hasil daur ulang TPS 3R yang tampil di marketplace landing page.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleOpenNew}
            className="px-4 py-2.5 bg-[#0d7a75] hover:bg-[#0b6460] text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center gap-1.5 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Produk</span>
          </button>

          <Link
            href="/#produk"
            target="_blank"
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
          >
            <Eye className="w-3.5 h-3.5 text-[#0d7a75]" />
            <span>Lihat Live</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </Link>

          <button
            type="button"
            onClick={() => setResetConfirmOpen(true)}
            title="Reset ke data bawaan TPS 3R"
            className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-500 dark:text-zinc-400 rounded-xl transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Produk</span>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-zinc-100">{stats.total}</div>
            <span className="text-[11px] text-slate-500">Item tersimpan di database</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-[#0d7a75] dark:text-emerald-400 flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Produk Aktif</span>
            <div className="text-2xl font-extrabold text-[#0d7a75] dark:text-emerald-400">{stats.aktif}</div>
            <span className="text-[11px] text-slate-500">Tampil di marketplace landing page</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kategori Aktif</span>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-zinc-100">{stats.kategoriCount}</div>
            <span className="text-[11px] text-slate-500">Kompos, Maggot, Enzyme, Daur Ulang</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ── Filters & Search ── */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama produk, satuan, atau deskripsi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#0d7a75]/30 text-slate-800 dark:text-zinc-100"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setKategoriFilter("all")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap ${
                kategoriFilter === "all"
                  ? "bg-[#0d7a75] text-white"
                  : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200"
              }`}
            >
              Semua ({produkList.length})
            </button>
            {(Object.keys(KATEGORI_LABELS) as KategoriProduk[]).map((kat) => (
              <button
                key={kat}
                type="button"
                onClick={() => setKategoriFilter(kat)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap ${
                  kategoriFilter === kat
                    ? "bg-[#0d7a75] text-white"
                    : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200"
                }`}
              >
                {KATEGORI_LABELS[kat]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Product List Grid ── */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800">
          Memuat katalog produk...
        </div>
      ) : filteredList.length === 0 ? (
        <div className="p-12 text-center space-y-3 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800">
          <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-700 dark:text-zinc-300">Tidak ada produk yang cocok</p>
          <p className="text-xs text-slate-400">Coba ubah kata kunci pencarian atau ganti filter kategori.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredList.map((item) => {
            const waUrl = getWaOrderUrl(item);

            return (
              <div
                key={item.id}
                className={`group bg-white dark:bg-zinc-900 border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${
                  item.aktif
                    ? "border-slate-200 dark:border-zinc-800"
                    : "border-dashed border-slate-300 dark:border-zinc-700 opacity-60 bg-slate-50/50"
                }`}
              >
                {/* Image Banner */}
                <div className="relative h-44 w-full bg-slate-900 overflow-hidden">
                  <img
                    src={item.gambar}
                    alt={item.nama}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />

                  {/* Top Badges */}
                  <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5 z-10">
                    <span className="px-2.5 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-extrabold uppercase text-white shadow-sm">
                      {KATEGORI_LABELS[item.kategori] || item.kategori}
                    </span>
                    {item.badge && (
                      <span className="px-2.5 py-0.5 rounded-md bg-[#0d7a75] text-[10px] font-extrabold uppercase text-white shadow-sm">
                        {item.badge}
                      </span>
                    )}
                  </div>

                  {/* Stock status indicator */}
                  <div className="absolute bottom-2.5 left-2.5 z-10 flex items-center gap-1.5 text-[11px] font-bold text-white drop-shadow">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        item.stokTersedia ? "bg-emerald-400" : "bg-amber-400"
                      }`}
                    />
                    <span>{item.stokTersedia ? "Stok Tersedia" : "Pre-Order"}</span>
                  </div>

                  {/* Visibility Tag */}
                  <div className="absolute top-2.5 right-2.5 z-10">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                        item.aktif
                          ? "bg-emerald-500/90 text-white"
                          : "bg-slate-700/90 text-slate-200"
                      }`}
                    >
                      {item.aktif ? "Aktif" : "Nonaktif"}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-zinc-100 leading-snug">
                      {item.nama}
                    </h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-extrabold text-[#0d7a75] dark:text-emerald-400">
                        {formatRupiah(item.harga)}
                      </span>
                      <span className="text-xs text-slate-500">/ {item.satuan}</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed line-clamp-3">
                      {item.deskripsi}
                    </p>
                  </div>

                  {/* Action Bar */}
                  <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleToggleAktif(item)}
                        title={item.aktif ? "Sembunyikan dari landing page" : "Tampilkan di landing page"}
                        className={`p-2 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                          item.aktif
                            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-400"
                        }`}
                      >
                        {item.aktif ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        <span className="hidden sm:inline">{item.aktif ? "Aktif" : "Mati"}</span>
                      </button>

                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noreferrer"
                        title="Uji coba template pesan WA pembeli"
                        className="p-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs font-bold transition flex items-center gap-1"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Tes WA</span>
                      </a>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(item)}
                        className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-bold transition flex items-center gap-1"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(item)}
                        className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-bold transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal Tambah / Edit Produk ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xl max-w-xl w-full overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-[#0d7a75]" />
                <h2 className="text-base font-extrabold text-slate-900 dark:text-zinc-100">
                  {editingItem ? "Edit Data Produk Sampah" : "Tambah Produk Sampah Baru"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitForm} className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Nama Produk */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Nama Produk <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Pupuk Kompos Super Organik (5 kg)"
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#0d7a75]/30"
                />
              </div>

              {/* Kategori & Status Stok */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    Kategori <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.kategori}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        kategori: e.target.value as KategoriProduk,
                      })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#0d7a75]/30"
                  >
                    {(Object.keys(KATEGORI_LABELS) as KategoriProduk[]).map((kat) => (
                      <option key={kat} value={kat}>
                        {KATEGORI_LABELS[kat]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    Ketersediaan Stok
                  </label>
                  <select
                    value={formData.stokTersedia ? "tersedia" : "preorder"}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        stokTersedia: e.target.value === "tersedia",
                      })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#0d7a75]/30"
                  >
                    <option value="tersedia">Stok Tersedia (Ready)</option>
                    <option value="preorder">Pre-Order / Indent</option>
                  </select>
                </div>
              </div>

              {/* Harga & Satuan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    Harga (Rp) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="500"
                    step="500"
                    required
                    placeholder="15000"
                    value={formData.harga}
                    onChange={(e) =>
                      setFormData({ ...formData, harga: parseInt(e.target.value, 10) || 0 })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#0d7a75]/30"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    Satuan Ukuran <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Misal: karung 5 kg, kg, botol 1L, unit"
                    value={formData.satuan}
                    onChange={(e) => setFormData({ ...formData, satuan: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#0d7a75]/30"
                  />
                </div>
              </div>

              {/* Badge Promosi */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Label / Badge Promosi (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Misal: Paling Laris, Hemat 20%, 100% Organik, Baru"
                  value={formData.badge || ""}
                  onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#0d7a75]/30"
                />
              </div>

              {/* URL Foto Gambar */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  URL Foto Produk
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/... atau /images/produk/..."
                  value={formData.gambar}
                  onChange={(e) => setFormData({ ...formData, gambar: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#0d7a75]/30"
                />
                {formData.gambar && (
                  <div className="mt-2 h-28 w-full bg-slate-100 dark:bg-zinc-800 rounded-xl overflow-hidden relative">
                    <img
                      src={formData.gambar}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Deskripsi */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Deskripsi Manfaat & Kandungan Produk
                </label>
                <textarea
                  rows={3}
                  placeholder="Tuliskan spesifikasi, kegunaan, dan keunggulan produk olahan ini..."
                  value={formData.deskripsi}
                  onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#0d7a75]/30"
                />
              </div>

              {/* Status Tampilkan di Landing Page */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-between">
                <div>
                  <span className="text-xs font-extrabold text-slate-900 dark:text-zinc-100 block">
                    Tampilkan di Marketplace Landing Page
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Jika dinonaktifkan, produk hanya tersimpan di database admin.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, aktif: !formData.aktif })}
                  className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-1 ${
                    formData.aktif ? "bg-[#0d7a75]" : "bg-slate-300 dark:bg-zinc-700"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      formData.aktif ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Footer Modal Actions */}
              <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-xs font-bold rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-[#0d7a75] hover:bg-[#0b6460] text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? "Menyimpan..." : "Simpan Produk"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Dialog Konfirmasi Hapus ── */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Hapus Produk dari Katalog?"
        message={`Apakah Anda yakin ingin menghapus produk '${deleteTarget?.nama}'? Produk tidak akan lagi tampil di landing page.`}
        confirmText="Hapus Produk"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* ── Dialog Konfirmasi Reset ── */}
      <ConfirmDialog
        open={resetConfirmOpen}
        title="Reset Katalog ke Data Bawaan TPS 3R?"
        message="Tindakan ini akan mengembalikan seluruh produk ke 7 item standar (Kompos, Maggot BSF, Eco-Enzyme, Tong Pilah, dll). Modifikasi produk yang dibuat sebelumnya akan digantikan."
        confirmText="Ya, Reset Katalog"
        variant="default"
        onConfirm={handleResetDefault}
        onCancel={() => setResetConfirmOpen(false)}
      />
    </div>
  );
}
