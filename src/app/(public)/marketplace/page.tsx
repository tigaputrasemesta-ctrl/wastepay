"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import PublicNavbar from "@/components/PublicNavbar";
import {
  ShoppingBag,
  Sparkles,
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Truck,
  Leaf,
  X,
  Phone,
  AlertCircle,
} from "lucide-react";

interface Produk {
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

interface CartItem {
  produk: Produk;
  jumlah: number;
}

const KATEGORI_OPTIONS = [
  { id: "semua", label: "Semua Produk" },
  { id: "pupuk_kompos", label: "Pupuk Kompos Organik" },
  { id: "pupuk_cair", label: "Pupuk Cair (POC)" },
  { id: "maggot", label: "Maggot BSF" },
  { id: "tempat_sampah", label: "Tempat Sampah" },
  { id: "kantong_sampah", label: "Kantong Biodegradable" },
];

export default function MarketplacePage() {
  const router = useRouter();
  const [products, setProducts] = useState<Produk[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeKategori, setActiveKategori] = useState("semua");
  const [searchQuery, setSearchQuery] = useState("");

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  // Checkout Form State
  const [namaPembeli, setNamaPembeli] = useState("");
  const [noTelepon, setNoTelepon] = useState("");
  const [alamat, setAlamat] = useState("");
  const [kelurahan, setKelurahan] = useState("");
  const [kecamatan, setKecamatan] = useState("Beji");
  const [catatan, setCatatan] = useState("");
  const [metodeBayar, setMetodeBayar] = useState("cod");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Fetch Products
  useEffect(() => {
    async function fetchProducts() {
      try {
        const queryParams = new URLSearchParams();
        if (activeKategori !== "semua") queryParams.set("kategori", activeKategori);
        if (searchQuery.trim()) queryParams.set("search", searchQuery.trim());

        const res = await fetch(`/api/marketplace/produk?${queryParams.toString()}`);
        const json = await res.json();
        if (json.ok && Array.isArray(json.data)) {
          setProducts(json.data);
        }
      } catch (err) {
        console.error("Gagal load produk:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, [activeKategori, searchQuery]);

  // Cart Actions
  const addToCart = (product: Produk) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.produk.id === product.id);
      if (existing) {
        if (existing.jumlah >= product.stok) {
          alert(`Maksimal stok tersedia: ${product.stok}`);
          return prev;
        }
        return prev.map((item) =>
          item.produk.id === product.id ? { ...item, jumlah: item.jumlah + 1 } : item
        );
      }
      return [...prev, { produk: product, jumlah: 1 }];
    });
    setCartOpen(true);
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.produk.id === productId) {
            const nextQty = item.jumlah + delta;
            if (nextQty > item.produk.stok) {
              alert(`Maksimal stok tersedia: ${item.produk.stok}`);
              return item;
            }
            return { ...item, jumlah: nextQty };
          }
          return item;
        })
        .filter((item) => item.jumlah > 0)
    );
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.produk.id !== productId));
  };

  const totalItemCount = cart.reduce((sum, item) => sum + item.jumlah, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.produk.harga * item.jumlah, 0);
  const ongkir = subtotal === 0 ? 0 : subtotal >= 150000 ? 0 : 10000;
  const totalBayar = subtotal + ongkir;

  // Checkout Submit
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (cart.length === 0) {
      setErrorMsg("Keranjang belanja Anda masih kosong");
      return;
    }
    if (!namaPembeli.trim()) {
      setErrorMsg("Nama lengkap wajib diisi");
      return;
    }
    if (!noTelepon.trim() || noTelepon.length < 9) {
      setErrorMsg("Nomor WhatsApp yang valid wajib diisi");
      return;
    }
    if (!alamat.trim()) {
      setErrorMsg("Alamat pengiriman lengkap wajib diisi");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        namaPembeli: namaPembeli.trim(),
        noTelepon: noTelepon.trim(),
        alamat: alamat.trim(),
        kelurahan: kelurahan.trim() || null,
        kecamatan: kecamatan.trim() || null,
        catatan: catatan.trim() || null,
        items: cart.map((i) => ({ produkId: i.produk.id, jumlah: i.jumlah })),
        metodeBayar,
      };

      const res = await fetch("/api/marketplace/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.ok && json.order) {
        setCart([]);
        router.push(`/marketplace/order/${encodeURIComponent(json.order.noPesanan)}`);
      } else {
        setErrorMsg(json.error || "Gagal membuat pesanan");
      }
    } catch (err) {
      console.error("Checkout error:", err);
      setErrorMsg("Terjadi kesalahan koneksi saat memproses order.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 flex flex-col font-sans transition-colors">
      <PublicNavbar />

      {/* Hero Header */}
      <section className="bg-gradient-to-b from-emerald-800 via-teal-800 to-slate-900 text-white py-12 px-4 sm:px-6 relative overflow-hidden">
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md text-emerald-100 text-xs font-semibold mb-4 border border-white/20">
            <Leaf className="w-3.5 h-3.5 text-emerald-300" />
            Produk Daur Ulang & Sirkular Ekonomi TPS 3R Kota Depok
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-3">
            Toko Resmi UPS HERU
          </h1>
          <p className="text-emerald-100 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Dukung pengurangan sampah dengan membeli produk olahan organik berkualitas: Pupuk Kompos matang, Pupuk Cair Bio-Nutrisi, Maggot BSF, dan perlengkapan pemilahan sampah keluarga.
          </p>

          {/* Search Bar */}
          <div className="mt-6 max-w-md mx-auto relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari pupuk kompos, maggot, tempat sampah..."
              className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 shadow-md"
            />
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 no-scrollbar">
          {KATEGORI_OPTIONS.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveKategori(cat.id)}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors border ${
                activeKategori === cat.id
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                  : "bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm animate-pulse">
            Memuat katalog produk resmi...
          </div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-8 shadow-sm">
            <ShoppingBag className="w-12 h-12 mx-auto text-slate-300 dark:text-zinc-600 mb-2" />
            <p className="font-semibold text-slate-800 dark:text-zinc-200">Tidak ada produk ditemukan</p>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Coba ganti kata kunci pencarian atau pilih kategori lain.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {products.map((p) => {
              const inCart = cart.find((item) => item.produk.id === p.id);

              return (
                <div
                  key={p.id}
                  className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div>
                    {/* Foto Produk */}
                    <div className="h-48 w-full bg-slate-100 dark:bg-zinc-800 relative overflow-hidden">
                      {p.foto ? (
                        <img
                          src={p.foto}
                          alt={p.nama}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <ShoppingBag className="w-12 h-12 opacity-30" />
                        </div>
                      )}
                      <div className="absolute top-2.5 right-2.5">
                        <span className="px-2.5 py-1 rounded-full bg-slate-900/70 backdrop-blur-md text-white text-[10px] font-semibold">
                          Stok: {p.stok} {p.satuan}
                        </span>
                      </div>
                    </div>

                    {/* Konten */}
                    <div className="p-4">
                      <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide mb-1">
                        {p.kategori.replace(/_/g, " ")}
                      </div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-zinc-100 mb-2 line-clamp-1">
                        {p.nama}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-3 leading-relaxed mb-3">
                        {p.deskripsi}
                      </p>
                    </div>
                  </div>

                  {/* Footer & Tombol Beli */}
                  <div className="p-4 pt-0">
                    <div className="flex items-baseline justify-between mb-3">
                      <div>
                        <span className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400">
                          Rp {p.harga.toLocaleString("id-ID")}
                        </span>
                        <span className="text-[11px] text-slate-400"> / {p.satuan}</span>
                      </div>
                    </div>

                    {inCart ? (
                      <div className="flex items-center justify-between border border-emerald-600 rounded-xl p-1 bg-emerald-50/50 dark:bg-emerald-950/20">
                        <button
                          type="button"
                          onClick={() => updateQuantity(p.id, -1)}
                          className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 font-bold flex items-center justify-center hover:bg-slate-100"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-bold text-xs text-emerald-800 dark:text-emerald-300">
                          {inCart.jumlah} di Keranjang
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(p.id, 1)}
                          className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-bold flex items-center justify-center hover:bg-emerald-700"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => addToCart(p)}
                        disabled={p.stok <= 0}
                        className="w-full py-2.5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        {p.stok <= 0 ? "Habis" : "Beli Sekarang"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Cart Button (Jika ada isi) */}
      {cart.length > 0 && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="px-5 py-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm flex items-center gap-3 shadow-2xl transition-all hover:scale-105 ring-4 ring-emerald-500/20"
          >
            <div className="relative">
              <ShoppingCart className="w-5 h-5" />
              <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold">
                {totalItemCount}
              </span>
            </div>
            <span>Rp {subtotal.toLocaleString("id-ID")}</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      )}

      {/* Slide-over Drawer Checkout */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-sm flex justify-end transition-opacity">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md h-full flex flex-col shadow-2xl relative">
            {/* Header Drawer */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-emerald-600" />
                <h2 className="font-bold text-base text-slate-900 dark:text-zinc-100">
                  Keranjang & Checkout
                </h2>
                <span className="text-xs bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full text-slate-600 dark:text-zinc-400">
                  {totalItemCount} item
                </span>
              </div>
              <button
                type="button"
                onClick={() => setCartOpen(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body Drawer */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Daftar Item */}
              <div className="space-y-3">
                <h3 className="font-semibold text-xs uppercase tracking-wider text-slate-400">
                  Barang yang Dibeli
                </h3>
                {cart.map((item) => (
                  <div
                    key={item.produk.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/80 dark:border-zinc-700/80 text-xs"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-900 dark:text-zinc-100 truncate">
                        {item.produk.nama}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-zinc-400">
                        Rp {item.produk.harga.toLocaleString("id-ID")} x {item.jumlah} {item.produk.satuan}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-700 border border-slate-200 dark:border-zinc-600 rounded-lg p-0.5">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.produk.id, -1)}
                          className="w-6 h-6 flex items-center justify-center font-bold text-slate-700 dark:text-zinc-200 hover:bg-slate-100"
                        >
                          -
                        </button>
                        <span className="w-6 text-center font-bold text-xs">
                          {item.jumlah}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.produk.id, 1)}
                          className="w-6 h-6 flex items-center justify-center font-bold text-slate-700 dark:text-zinc-200 hover:bg-slate-100"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.produk.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Form Data Pengiriman */}
              <form id="checkout-form" onSubmit={handleCheckout} className="space-y-3 pt-3 border-t border-slate-100 dark:border-zinc-800">
                <h3 className="font-semibold text-xs uppercase tracking-wider text-slate-400">
                  Tujuan Pengiriman
                </h3>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Nama Penerima <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={namaPembeli}
                    onChange={(e) => setNamaPembeli(e.target.value)}
                    placeholder="Nama Anda"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Nomor WhatsApp <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={noTelepon}
                    onChange={(e) => setNoTelepon(e.target.value)}
                    placeholder="0812xxxxxxxx"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Alamat Lengkap Pengiriman <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={alamat}
                    onChange={(e) => setAlamat(e.target.value)}
                    placeholder="Jalan, nomor rumah, RT/RW, nama perumahan"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                      Kecamatan di Depok
                    </label>
                    <select
                      value={kecamatan}
                      onChange={(e) => setKecamatan(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="Beji">Beji</option>
                      <option value="Pancoran Mas">Pancoran Mas</option>
                      <option value="Cilodong">Cilodong</option>
                      <option value="Sukmajaya">Sukmajaya</option>
                      <option value="Sawangan">Sawangan</option>
                      <option value="Bojongsari">Bojongsari</option>
                      <option value="Cimanggis">Cimanggis</option>
                      <option value="Tapos">Tapos</option>
                      <option value="Cinere">Cinere</option>
                      <option value="Limo">Limo</option>
                      <option value="Cipayung">Cipayung</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                      Kelurahan
                    </label>
                    <input
                      type="text"
                      value={kelurahan}
                      onChange={(e) => setKelurahan(e.target.value)}
                      placeholder="Kalibaru / Beji"
                      className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Metode Pembayaran
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div
                      onClick={() => setMetodeBayar("cod")}
                      className={`p-2.5 rounded-xl border cursor-pointer text-xs ${
                        metodeBayar === "cod"
                          ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 font-semibold"
                          : "border-slate-200 dark:border-zinc-700"
                      }`}
                    >
                      Bayar di Tempat (COD)
                    </div>
                    <div
                      onClick={() => setMetodeBayar("qris")}
                      className={`p-2.5 rounded-xl border cursor-pointer text-xs ${
                        metodeBayar === "qris"
                          ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 font-semibold"
                          : "border-slate-200 dark:border-zinc-700"
                      }`}
                    >
                      Transfer / QRIS Online
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Footer Ringkasan Biaya & Checkout Button */}
            <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/80 space-y-3">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-500 dark:text-zinc-400">
                  <span>Subtotal Barang:</span>
                  <span>Rp {subtotal.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between text-slate-500 dark:text-zinc-400">
                  <span>Ongkos Kirim Armada Depok:</span>
                  <span>{ongkir === 0 ? "GRATIS" : `Rp ${ongkir.toLocaleString("id-ID")}`}</span>
                </div>
                {subtotal < 150000 && subtotal > 0 && (
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                    *Gratis ongkir untuk belanja mulai Rp 150.000
                  </p>
                )}
                <div className="flex justify-between font-bold text-sm text-slate-900 dark:text-zinc-100 pt-1 border-t border-slate-200 dark:border-zinc-700">
                  <span>Total Pembayaran:</span>
                  <span className="text-emerald-700 dark:text-emerald-400">
                    Rp {totalBayar.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                form="checkout-form"
                disabled={submitting || cart.length === 0}
                className="w-full py-3 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg hover:shadow-emerald-600/25 transition-all disabled:opacity-50"
              >
                {submitting ? "Memproses Order..." : "Pesan Sekarang"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
