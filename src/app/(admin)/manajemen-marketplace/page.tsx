"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ShoppingBag,
  Package,
  Search,
  RefreshCw,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  Clock,
  Truck,
  X,
  MessageCircle,
  Eye,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Layers,
  Leaf,
  Filter,
} from "lucide-react";
import { useToast } from "@/components/Toast";

interface ProdukItem {
  id: number;
  nama: string;
  slug: string;
  kategori: string;
  harga: number;
  stok: number;
  satuan: string;
  beratGram: number;
  deskripsi: string;
  foto: string | null;
  aktif: boolean;
}

interface OrderItemDetail {
  id: number;
  produkId: number;
  jumlah: number;
  hargaSatuan: number;
  subtotal: number;
  produk: ProdukItem;
}

interface MarketplaceOrder {
  id: number;
  noPesanan: string;
  namaPembeli: string;
  noTelepon: string;
  email: string | null;
  alamat: string;
  kelurahan: string | null;
  kecamatan: string | null;
  catatan: string | null;
  totalHarga: number;
  ongkir: number;
  status: string;
  metodeBayar: string;
  buktiBayar: string | null;
  tanggalBayar: string | null;
  kurirNama: string | null;
  noResi: string | null;
  createdAt: string;
  items: OrderItemDetail[];
}

const ORDER_STATUS_TABS = [
  { id: "semua", label: "Semua Pesanan" },
  { id: "menunggu_pembayaran", label: "Menunggu Bayar" },
  { id: "diproses", label: "Diproses" },
  { id: "dikirim", label: "Dikirim" },
  { id: "selesai", label: "Selesai" },
  { id: "dibatalkan", label: "Dibatalkan" },
];

const ORDER_STATUS_BADGES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  menunggu_pembayaran: {
    label: "Menunggu Bayar",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-800",
  },
  diproses: {
    label: "Sedang Dikemas",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    text: "text-blue-700 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-800",
  },
  dikirim: {
    label: "Sedang Dikirim",
    bg: "bg-purple-50 dark:bg-purple-950/40",
    text: "text-purple-700 dark:text-purple-400",
    border: "border-purple-200 dark:border-purple-800",
  },
  selesai: {
    label: "Selesai",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-800",
  },
  dibatalkan: {
    label: "Dibatalkan",
    bg: "bg-rose-50 dark:bg-rose-950/40",
    text: "text-rose-700 dark:text-rose-400",
    border: "border-rose-200 dark:border-rose-800",
  },
};

const KATEGORI_OPTIONS = [
  { id: "pupuk_kompos", label: "Pupuk Kompos Organik" },
  { id: "pupuk_cair", label: "Pupuk Cair (POC)" },
  { id: "maggot", label: "Maggot BSF" },
  { id: "tempat_sampah", label: "Tempat Sampah Terpilah" },
  { id: "kantong_sampah", label: "Kantong Biodegradable" },
  { id: "alat_kebersihan", label: "Alat Kebersihan" },
];

export default function ManajemenMarketplacePage() {
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<"orders" | "products">("orders");

  // Orders State
  const [orders, setOrders] = useState<MarketplaceOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [activeOrderStatus, setActiveOrderStatus] = useState("semua");
  const [searchOrder, setSearchOrder] = useState("");

  // Products State
  const [products, setProducts] = useState<ProdukItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [searchProduct, setSearchProduct] = useState("");

  // Modal Kelola Order
  const [selectedOrder, setSelectedOrder] = useState<MarketplaceOrder | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editKurir, setEditKurir] = useState("");
  const [editResi, setEditResi] = useState("");
  const [savingOrder, setSavingOrder] = useState(false);

  // Modal Tambah / Edit Produk
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProdukItem | null>(null);
  const [prodForm, setProdForm] = useState({
    nama: "",
    slug: "",
    kategori: "pupuk_kompos",
    harga: "",
    stok: "10",
    satuan: "sak",
    beratGram: "5000",
    deskripsi: "",
    foto: "",
    aktif: true,
  });
  const [savingProduct, setSavingProduct] = useState(false);

  // Fetch Orders
  const fetchOrders = useCallback(async () => {
    try {
      setLoadingOrders(true);
      const q = new URLSearchParams();
      if (activeOrderStatus !== "semua") q.set("status", activeOrderStatus);
      if (searchOrder.trim()) q.set("search", searchOrder.trim());
      q.set("limit", "100");

      const res = await fetch(`/api/admin/marketplace/orders?${q.toString()}`);
      const json = await res.json();
      if (json.ok && Array.isArray(json.data)) {
        setOrders(json.data);
      } else {
        showToast(json.error || "Gagal memuat pesanan marketplace", "error");
      }
    } catch {
      showToast("Gagal memuat pesanan marketplace", "error");
    } finally {
      setLoadingOrders(false);
    }
  }, [activeOrderStatus, searchOrder, showToast]);

  // Fetch Products
  const fetchProducts = useCallback(async () => {
    try {
      setLoadingProducts(true);
      const res = await fetch("/api/admin/marketplace/produk");
      const json = await res.json();
      if (json.ok && Array.isArray(json.data)) {
        setProducts(json.data);
      } else {
        showToast(json.error || "Gagal memuat produk", "error");
      }
    } catch {
      showToast("Gagal memuat produk", "error");
    } finally {
      setLoadingProducts(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchOrders();
    fetchProducts();
  }, [fetchOrders, fetchProducts]);

  // Open Edit Order Modal
  const openEditOrderModal = (order: MarketplaceOrder) => {
    setSelectedOrder(order);
    setEditStatus(order.status);
    setEditKurir(order.kurirNama || "");
    setEditResi(order.noResi || "");
  };

  // Save Order Status
  const handleSaveOrder = async () => {
    if (!selectedOrder) return;
    setSavingOrder(true);
    try {
      const res = await fetch(`/api/admin/marketplace/orders/${selectedOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: editStatus,
          kurirNama: editKurir.trim() || null,
          noResi: editResi.trim() || null,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        showToast("Status pesanan berhasil diperbarui", "success");
        setSelectedOrder(null);
        fetchOrders();
      } else {
        showToast(json.error || "Gagal memperbarui pesanan", "error");
      }
    } catch {
      showToast("Gagal menghubungi server", "error");
    } finally {
      setSavingOrder(false);
    }
  };

  // Open Add / Edit Product Modal
  const openProductForm = (prod?: ProdukItem) => {
    if (prod) {
      setEditingProduct(prod);
      setProdForm({
        nama: prod.nama,
        slug: prod.slug,
        kategori: prod.kategori,
        harga: String(prod.harga),
        stok: String(prod.stok),
        satuan: prod.satuan,
        beratGram: String(prod.beratGram),
        deskripsi: prod.deskripsi,
        foto: prod.foto || "",
        aktif: prod.aktif,
      });
    } else {
      setEditingProduct(null);
      setProdForm({
        nama: "",
        slug: "",
        kategori: "pupuk_kompos",
        harga: "",
        stok: "20",
        satuan: "sak",
        beratGram: "5000",
        deskripsi: "",
        foto: "",
        aktif: true,
      });
    }
    setShowProductModal(true);
  };

  // Save Product (Add or Edit)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodForm.nama.trim() || !prodForm.harga || !prodForm.deskripsi.trim()) {
      showToast("Nama, harga, dan deskripsi wajib diisi", "error");
      return;
    }

    setSavingProduct(true);
    try {
      const url = editingProduct
        ? `/api/admin/marketplace/produk/${editingProduct.id}`
        : `/api/admin/marketplace/produk`;
      const method = editingProduct ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: prodForm.nama.trim(),
          slug: prodForm.slug.trim() || undefined,
          kategori: prodForm.kategori,
          harga: Number(prodForm.harga),
          stok: Number(prodForm.stok),
          satuan: prodForm.satuan,
          beratGram: Number(prodForm.beratGram),
          deskripsi: prodForm.deskripsi.trim(),
          foto: prodForm.foto.trim() || null,
          aktif: prodForm.aktif,
        }),
      });

      const json = await res.json();
      if (json.ok) {
        showToast(
          editingProduct ? "Produk berhasil diperbarui" : "Produk baru berhasil ditambahkan",
          "success"
        );
        setShowProductModal(false);
        fetchProducts();
      } else {
        showToast(json.error || "Gagal menyimpan produk", "error");
      }
    } catch {
      showToast("Gagal menyimpan produk", "error");
    } finally {
      setSavingProduct(false);
    }
  };

  // Delete Product
  const handleDeleteProduct = async (id: number, nama: string) => {
    if (!confirm(`Hapus produk "${nama}"?`)) return;
    try {
      const res = await fetch(`/api/admin/marketplace/produk/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.ok) {
        showToast("Produk berhasil dihapus", "success");
        fetchProducts();
      } else {
        showToast(json.error || "Gagal menghapus produk", "error");
      }
    } catch {
      showToast("Gagal menghapus produk", "error");
    }
  };

  // Summary Metrics
  const totalOrdersCount = orders.length;
  const menungguBayarCount = orders.filter((o) => o.status === "menunggu_pembayaran").length;
  const diprosesCount = orders.filter((o) => o.status === "diproses").length;
  const selesaiCount = orders.filter((o) => o.status === "selesai").length;
  const totalOmset = orders
    .filter((o) => o.status !== "dibatalkan")
    .reduce((sum, o) => sum + o.totalHarga, 0);

  // Filtered Products
  const filteredProducts = products.filter(
    (p) =>
      p.nama.toLowerCase().includes(searchProduct.toLowerCase()) ||
      p.kategori.toLowerCase().includes(searchProduct.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">
              Marketplace Produk Resmi UPS HERU
            </h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-zinc-400">
              Kelola etalase pupuk kompos organik, pupuk cair POC, maggot, dan pesanan warga.
            </p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-zinc-800 rounded-2xl self-start md:self-auto border border-slate-200 dark:border-zinc-700">
          <button
            onClick={() => setActiveTab("orders")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "orders"
                ? "bg-white dark:bg-zinc-900 text-emerald-700 dark:text-emerald-400 shadow-xs"
                : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Pesanan Warga ({totalOrdersCount})</span>
          </button>
          <button
            onClick={() => setActiveTab("products")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "products"
                ? "bg-white dark:bg-zinc-900 text-emerald-700 dark:text-emerald-400 shadow-xs"
                : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
            }`}
          >
            <Leaf className="w-4 h-4" />
            <span>Katalog & Stok ({products.length})</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Pesanan</span>
          <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block tabular-nums">
            {totalOrdersCount}
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Semua pesanan masuk</span>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-amber-200/70 dark:border-amber-900/50 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">Menunggu Bayar</span>
          <span className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-1 block tabular-nums">
            {menungguBayarCount}
          </span>
          <span className="text-[10px] text-amber-600/80 mt-0.5 block">Perlu verifikasi</span>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-blue-200/70 dark:border-blue-900/50 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">Sedang Dikemas</span>
          <span className="text-2xl font-black text-blue-700 dark:text-blue-300 mt-1 block tabular-nums">
            {diprosesCount}
          </span>
          <span className="text-[10px] text-blue-600/80 mt-0.5 block">Siap kirim ke kurir</span>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-emerald-200/70 dark:border-emerald-900/50 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Pesanan Selesai</span>
          <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1 block tabular-nums">
            {selesaiCount}
          </span>
          <span className="text-[10px] text-emerald-600/80 mt-0.5 block">Diterima warga</span>
        </div>

        <div className="col-span-2 lg:col-span-1 bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Omset Produk</span>
          <span className="text-xl font-black text-emerald-700 dark:text-emerald-400 mt-1 block tabular-nums truncate">
            Rp {totalOmset.toLocaleString("id-ID")}
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Penjualan produk UPS</span>
        </div>
      </div>

      {/* ========================================================== */}
      {/* TAB 1: DAFTAR PESANAN WARGA */}
      {/* ========================================================== */}
      {activeTab === "orders" && (
        <div className="space-y-4">
          {/* Controls: Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
              <input
                type="text"
                placeholder="Cari No Pesanan, Nama Pembeli, No WA, atau Alamat..."
                value={searchOrder}
                onChange={(e) => setSearchOrder(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <button
              onClick={() => fetchOrders()}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-bold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {ORDER_STATUS_TABS.map((tab) => {
              const active = activeOrderStatus === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveOrderStatus(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    active
                      ? "bg-emerald-700 text-white shadow-xs"
                      : "bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Order Cards Grid */}
          {loadingOrders ? (
            <div className="py-20 text-center">
              <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs font-bold text-slate-500">Memuat data pesanan...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="py-16 text-center bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-6">
              <Package className="w-12 h-12 text-slate-300 dark:text-zinc-700 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800 dark:text-zinc-200">Tidak ada pesanan</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
                Belum ada pesanan belanja untuk filter status ini.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {orders.map((order) => {
                const badge = ORDER_STATUS_BADGES[order.status] || {
                  label: order.status,
                  bg: "bg-slate-100",
                  text: "text-slate-700",
                  border: "border-slate-200",
                };
                const waPhone = order.noTelepon.replace(/^0/, "62").replace(/[^0-9]/g, "");

                return (
                  <div
                    key={order.id}
                    className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-4 shadow-xs flex flex-col justify-between hover:border-emerald-400/70 transition-all space-y-4"
                  >
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-black font-mono text-slate-400 uppercase tracking-wider block">
                            {order.noPesanan}
                          </span>
                          <h4 className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                            {order.namaPembeli}
                          </h4>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {new Date(order.createdAt).toLocaleString("id-ID")}
                          </span>
                        </div>

                        <span
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-black border ${badge.bg} ${badge.text} ${badge.border} shrink-0`}
                        >
                          {badge.label}
                        </span>
                      </div>

                      {/* Detail Alamat */}
                      <div className="text-xs text-slate-600 dark:text-zinc-400 bg-slate-50 dark:bg-zinc-800/50 p-2.5 rounded-xl space-y-1">
                        <p className="line-clamp-2">{order.alamat}</p>
                        {order.kelurahan && (
                          <p className="text-[11px] text-slate-400">
                            Kel. {order.kelurahan}, Kec. {order.kecamatan || "Beji"}
                          </p>
                        )}
                        {order.catatan && (
                          <p className="text-[11px] text-amber-700 dark:text-amber-400 italic pt-1 border-t border-slate-200/60 dark:border-zinc-700">
                            &quot;{order.catatan}&quot;
                          </p>
                        )}
                      </div>

                      {/* Items List */}
                      <div className="space-y-1.5 border-t border-slate-100 dark:border-zinc-800 pt-2.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Daftar Produk ({order.items.length})
                        </span>
                        <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                          {order.items.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between text-xs py-0.5"
                            >
                              <span className="text-slate-800 dark:text-zinc-200 truncate pr-2">
                                {item.produk?.nama || "Produk"}
                                <span className="text-slate-400 ml-1">×{item.jumlah}</span>
                              </span>
                              <span className="font-bold text-slate-900 dark:text-white tabular-nums shrink-0">
                                Rp {item.subtotal.toLocaleString("id-ID")}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Total & Kurir */}
                      <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-xl p-2.5 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Metode Bayar:</span>
                          <span className="font-bold text-slate-800 dark:text-zinc-200 uppercase">
                            {order.metodeBayar}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-emerald-100 dark:border-emerald-900/40">
                          <span className="font-bold text-slate-800 dark:text-zinc-200">Total Tagihan:</span>
                          <span className="font-black text-emerald-800 dark:text-emerald-300 text-sm">
                            Rp {order.totalHarga.toLocaleString("id-ID")}
                          </span>
                        </div>
                        {order.kurirNama && (
                          <div className="flex items-center justify-between text-[11px] pt-1 text-slate-500">
                            <span>Kurir / Resi:</span>
                            <span className="font-mono font-bold text-slate-700 dark:text-zinc-300">
                              {order.kurirNama} {order.noResi ? `(${order.noResi})` : ""}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                      <a
                        href={`https://wa.me/${waPhone}?text=${encodeURIComponent(
                          `Halo Kak ${order.namaPembeli}, kami dari Marketplace UPS HERU mengenai status pesanan no: ${order.noPesanan}.`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 transition-all border border-emerald-200 dark:border-emerald-800"
                        title="Chat WhatsApp Pembeli"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>

                      <button
                        onClick={() => openEditOrderModal(order)}
                        className="flex-1 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-xs"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Update Status & Resi</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================== */}
      {/* TAB 2: KATALOG & STOK PRODUK */}
      {/* ========================================================== */}
      {activeTab === "products" && (
        <div className="space-y-4">
          {/* Header Action: Add product & Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
              <input
                type="text"
                placeholder="Cari nama produk..."
                value={searchProduct}
                onChange={(e) => setSearchProduct(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <button
              onClick={() => openProductForm()}
              className="w-full sm:w-auto px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Produk Baru</span>
            </button>
          </div>

          {/* Product Grid */}
          {loadingProducts ? (
            <div className="py-20 text-center">
              <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs font-bold text-slate-500">Memuat katalog produk...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-16 text-center bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-6">
              <Leaf className="w-12 h-12 text-slate-300 dark:text-zinc-700 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800 dark:text-zinc-200">Tidak ada produk</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
                Belum ada produk yang cocok dengan pencarian.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map((prod) => (
                <div
                  key={prod.id}
                  className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-4 shadow-xs flex flex-col justify-between hover:border-emerald-400 transition-all space-y-3"
                >
                  <div className="space-y-2">
                    {/* Image / Thumbnail */}
                    <div className="w-full h-36 bg-slate-100 dark:bg-zinc-800 rounded-xl overflow-hidden relative flex items-center justify-center">
                      {prod.foto ? (
                        <img
                          src={prod.foto}
                          alt={prod.nama}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Leaf className="w-10 h-10 text-emerald-600/40" />
                      )}
                      {!prod.aktif && (
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-2xs flex items-center justify-center">
                          <span className="text-[10px] font-black uppercase text-white bg-rose-600 px-2 py-0.5 rounded-md">
                            Nonaktif
                          </span>
                        </div>
                      )}
                      <span className="absolute top-2 left-2 text-[10px] font-bold bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xs px-2 py-0.5 rounded-md text-slate-700 dark:text-zinc-300 shadow-2xs">
                        {prod.kategori.replace(/_/g, " ")}
                      </span>
                    </div>

                    {/* Info */}
                    <div>
                      <h4 className="font-black text-slate-900 dark:text-white text-sm line-clamp-1">
                        {prod.nama}
                      </h4>
                      <p className="text-xs font-black text-emerald-700 dark:text-emerald-400 mt-0.5">
                        Rp {prod.harga.toLocaleString("id-ID")}{" "}
                        <span className="text-[11px] font-medium text-slate-400">/{prod.satuan}</span>
                      </p>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                      {prod.deskripsi}
                    </p>

                    {/* Stock & Weight */}
                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100 dark:border-zinc-800">
                      <span className="text-slate-500">Stok Tersedia:</span>
                      <span
                        className={`font-black ${
                          prod.stok <= 5
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-slate-900 dark:text-white"
                        }`}
                      >
                        {prod.stok} {prod.satuan}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                    <button
                      onClick={() => openProductForm(prod)}
                      className="flex-1 py-1.5 px-3 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-bold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all flex items-center justify-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(prod.id, prod.nama)}
                      className="p-1.5 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all"
                      title="Hapus Produk"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================== */}
      {/* MODAL UPDATE STATUS PESANAN */}
      {/* ========================================================== */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
              <div>
                <span className="text-[10px] font-mono font-black text-slate-400 block">
                  {selectedOrder.noPesanan}
                </span>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Update Pesanan Marketplace
                </h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                  Status Pesanan
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="menunggu_pembayaran">Menunggu Pembayaran</option>
                  <option value="diproses">Diproses (Sedang Dikemas)</option>
                  <option value="dikirim">Dikirim (Dalam Pengantaran)</option>
                  <option value="selesai">Selesai (Pesanan Diterima)</option>
                  <option value="dibatalkan">Dibatalkan</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                  Nama Kurir / Petugas Pengantar
                </label>
                <input
                  type="text"
                  placeholder="Misal: Kurir Internal UPS / JNE / Gosend"
                  value={editKurir}
                  onChange={(e) => setEditKurir(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                  Nomor Resi / Pelacakan
                </label>
                <input
                  type="text"
                  placeholder="Misal: RESI-UPS-00129"
                  value={editResi}
                  onChange={(e) => setEditResi(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveOrder}
                disabled={savingOrder}
                className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 disabled:opacity-50"
              >
                {savingOrder ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* MODAL TAMBAH / EDIT PRODUK */}
      {/* ========================================================== */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {editingProduct ? "Edit Produk UPS HERU" : "Tambah Produk Baru"}
              </h3>
              <button
                onClick={() => setShowProductModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                  Nama Produk *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Pupuk Kompos Organik TPS 3R (5 Kg)"
                  value={prodForm.nama}
                  onChange={(e) => setProdForm({ ...prodForm, nama: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                    Kategori *
                  </label>
                  <select
                    value={prodForm.kategori}
                    onChange={(e) => setProdForm({ ...prodForm, kategori: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {KATEGORI_OPTIONS.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                    Harga Satuan (Rp) *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="15000"
                    value={prodForm.harga}
                    onChange={(e) => setProdForm({ ...prodForm, harga: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                    Stok *
                  </label>
                  <input
                    type="number"
                    required
                    value={prodForm.stok}
                    onChange={(e) => setProdForm({ ...prodForm, stok: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                    Satuan *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="sak, botol, kg, pcs"
                    value={prodForm.satuan}
                    onChange={(e) => setProdForm({ ...prodForm, satuan: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                    Berat (Gram) *
                  </label>
                  <input
                    type="number"
                    required
                    value={prodForm.beratGram}
                    onChange={(e) => setProdForm({ ...prodForm, beratGram: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                  URL Foto Produk
                </label>
                <input
                  type="text"
                  placeholder="https://... atau /images/produk.jpg"
                  value={prodForm.foto}
                  onChange={(e) => setProdForm({ ...prodForm, foto: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                  Deskripsi & Manfaat *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Jelaskan spesifikasi, kandungan hara, cara pakai, dan manfaat produk..."
                  value={prodForm.deskripsi}
                  onChange={(e) => setProdForm({ ...prodForm, deskripsi: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="prodAktif"
                  checked={prodForm.aktif}
                  onChange={(e) => setProdForm({ ...prodForm, aktif: e.target.checked })}
                  className="w-4 h-4 rounded-md text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="prodAktif" className="font-bold text-slate-800 dark:text-zinc-200">
                  Tampilkan produk ini di etalase toko (Aktif)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 rounded-xl transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingProduct}
                  className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 disabled:opacity-50"
                >
                  {savingProduct ? "Menyimpan..." : "Simpan Produk"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
