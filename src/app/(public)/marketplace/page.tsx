"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  Building2,
  CreditCard,
  MapPin,
  Clock,
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
  const [email, setEmail] = useState("");
  const [alamat, setAlamat] = useState("");
  const [kelurahan, setKelurahan] = useState("");
  const [kecamatan, setKecamatan] = useState("Cilodong");
  const [catatan, setCatatan] = useState("");

  // Opsi Pengiriman & Pembayaran
  const [opsiPengiriman, setOpsiPengiriman] = useState<"kurir_depok" | "ambil_sendiri">("kurir_depok");
  const [metodeBayar, setMetodeBayar] = useState<"duitku" | "cod">("duitku");

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

  // Akumulasi Perhitungan Terpisah
  const totalItemCount = cart.reduce((sum, item) => sum + item.jumlah, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.produk.harga * item.jumlah, 0);
  const isAmbilSendiri = opsiPengiriman === "ambil_sendiri";
  const isGratisOngkir = !isAmbilSendiri && subtotal >= 150000;
  const ongkir = subtotal === 0 ? 0 : isAmbilSendiri ? 0 : isGratisOngkir ? 0 : 10000;
  const totalBayar = subtotal + ongkir;

  // Checkout Submit
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (cart.length === 0) {
      setErrorMsg("Keranjang belanja Anda masih kosong.");
      return;
    }
    if (!namaPembeli.trim()) {
      setErrorMsg("Nama pembeli wajib diisi.");
      return;
    }
    if (!noTelepon.trim() || noTelepon.length < 9) {
      setErrorMsg("Nomor WhatsApp yang valid wajib diisi.");
      return;
    }
    if (!isAmbilSendiri && !alamat.trim()) {
      setErrorMsg("Alamat pengiriman lengkap wajib diisi untuk pengiriman kurir.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        namaPembeli: namaPembeli.trim(),
        noTelepon: noTelepon.trim(),
        email: email.trim() || null,
        alamat: isAmbilSendiri ? "Ambil Mandiri di TPS 3R Kalibaru" : alamat.trim(),
        kelurahan: kelurahan.trim() || null,
        kecamatan: kecamatan.trim() || null,
        catatan: catatan.trim() || null,
        opsiPengiriman,
        metodeBayar,
        items: cart.map((i) => ({ produkId: i.produk.id, jumlah: i.jumlah })),
      };

      const res = await fetch("/api/marketplace/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      const orderData = json.order || json.data;

      if (json.ok && orderData?.noPesanan) {
        setCart([]);
        // Jika bayar via Duitku dan menerima paymentUrl, redirect ke gateway Duitku
        if (json.paymentUrl && metodeBayar === "duitku") {
          window.location.href = json.paymentUrl;
        } else {
          router.push(`/marketplace/order/${encodeURIComponent(orderData.noPesanan)}`);
        }
      } else {
        setErrorMsg(json.error || "Gagal membuat pesanan.");
      }
    } catch (err) {
      console.error("Checkout error:", err);
      setErrorMsg("Terjadi kesalahan koneksi saat memproses order.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero Header with Single Seller Identity */}
      <section className="bg-gradient-to-b from-[#0a524e] via-[#0d7a75] to-slate-900 text-white py-10 px-6 sm:px-8 relative overflow-hidden rounded-3xl shadow-sm">
        <div className="max-w-5xl mx-auto text-center relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md text-emerald-100 text-xs font-bold border border-white/20">
            <ShieldCheck className="w-4 h-4 text-amber-300" />
            <span>Official Store Tunggal TPS 3R Kalibaru / UPS HERU</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
            Marketplace Resmi UPS HERU
          </h1>

          <p className="text-emerald-100 text-xs sm:text-sm max-w-2xl mx-auto leading-relaxed">
            Pusat produk olahan daur ulang sampah terpilah Kota Depok. Beli langsung dari sumber pengolahan resmi: Kompos matang, POC cair, Maggot BSF, dan perlengkapan pilah sampah ramah lingkungan.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3 text-[11px] font-bold text-emerald-200">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> TPS 3R Kalibaru, Cilodong, Kota Depok
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="flex items-center gap-1">
              <Truck className="w-3.5 h-3.5" /> Kirim Armada UPS HERU / Ambil Mandiri
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5" /> Bayar Otomatis via Duitku QRIS & COD
            </span>
          </div>

          {/* Search Bar */}
          <div className="mt-5 max-w-md mx-auto relative pt-2">
            <Search className="w-4 h-4 absolute left-4 top-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari pupuk kompos, maggot, tempat sampah..."
              className="w-full pl-11 pr-4 py-2.5 rounded-full bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 text-xs sm:text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 shadow-md"
            />
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto w-full">
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 no-scrollbar">
          {KATEGORI_OPTIONS.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveKategori(cat.id)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                activeKategori === cat.id
                  ? "bg-[#0d7a75] text-white border-[#0d7a75] shadow-sm"
                  : "bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-xs font-bold animate-pulse">
            Memuat katalog produk resmi UPS HERU...
          </div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-8 shadow-sm">
            <ShoppingBag className="w-12 h-12 mx-auto text-slate-300 dark:text-zinc-600 mb-2" />
            <p className="font-extrabold text-slate-800 dark:text-zinc-200 text-sm">Tidak ada produk ditemukan</p>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Coba ganti kata kunci pencarian atau pilih kategori lain.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {products.map((product) => (
              <div
                key={product.id}
                className="group bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-3xl overflow-hidden flex flex-col justify-between shadow-xs hover:border-[#0d7a75] hover:shadow-lg transition-all duration-300"
              >
                <div>
                  {/* Gambar & Kategori Badge */}
                  <Link href={`/marketplace/${product.slug}`} className="block relative aspect-16/10 bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                    {product.foto ? (
                      <img
                        src={product.foto}
                        alt={product.nama}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 dark:text-zinc-600">
                        <Leaf className="w-10 h-10 mb-1 text-emerald-600/40" />
                        <span className="text-[10px] font-bold">UPS HERU</span>
                      </div>
                    )}
                    <span className="absolute top-2.5 left-2.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white/90 dark:bg-zinc-900/90 text-emerald-800 dark:text-emerald-300 backdrop-blur-xs uppercase border border-emerald-100 dark:border-zinc-700">
                      {product.kategori.replace(/_/g, " ")}
                    </span>
                    <span className="absolute bottom-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-md bg-black/70 text-white backdrop-blur-xs">
                      Stok: {product.stok} {product.satuan}
                    </span>
                  </Link>

                  {/* Informasi Produk */}
                  <div className="p-4 sm:p-5 space-y-2">
                    <Link href={`/marketplace/${product.slug}`}>
                      <h3 className="font-extrabold text-sm text-slate-900 dark:text-zinc-100 line-clamp-1 group-hover:text-[#0d7a75] transition-colors">
                        {product.nama}
                      </h3>
                    </Link>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                      {product.deskripsi}
                    </p>
                    <div className="pt-2 flex items-baseline gap-1">
                      <span className="text-lg font-black text-[#0d7a75] dark:text-emerald-400">
                        Rp {product.harga.toLocaleString("id-ID")}
                      </span>
                      <span className="text-xs font-semibold text-slate-400">/{product.satuan}</span>
                    </div>
                  </div>
                </div>

                {/* Tombol Aksi */}
                <div className="p-4 sm:p-5 pt-0 grid grid-cols-2 gap-2">
                  <Link
                    href={`/marketplace/${product.slug}`}
                    className="py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 hover:border-[#0d7a75] text-slate-700 dark:text-zinc-300 font-bold text-xs flex items-center justify-center transition-colors"
                  >
                    Detail
                  </Link>
                  <button
                    onClick={() => addToCart(product)}
                    disabled={product.stok <= 0}
                    className="py-2.5 rounded-xl font-bold bg-[#0d7a75] hover:bg-[#0b6460] text-white text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all disabled:opacity-40"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Keranjang</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Cart Button */}
      {cart.length > 0 && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            onClick={() => setCartOpen(true)}
            className="flex items-center gap-2.5 px-5 py-3 rounded-full bg-[#0d7a75] hover:bg-[#0b6460] text-white shadow-xl hover:shadow-[#0d7a75]/30 transition-all font-bold text-xs sm:text-sm active:scale-95"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Keranjang</span>
            <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-900 text-xs font-black flex items-center justify-center">
              {totalItemCount}
            </span>
          </button>
        </div>
      )}

      {/* Cart & Checkout Drawer Modal */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 h-full flex flex-col shadow-2xl overflow-hidden">
            {/* Header Drawer */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-[#0d7a75]" />
                <h2 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-zinc-100">
                  Keranjang Belanja Toko Resmi
                </h2>
              </div>
              <button
                onClick={() => setCartOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Message Alert */}
            {errorMsg && (
              <div className="m-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Body Drawer: Items List & Checkout Form */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
              {/* Item List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Daftar Produk ({totalItemCount} item)
                  </h3>
                  <button
                    onClick={() => setCart([])}
                    className="text-[11px] text-rose-500 hover:underline font-semibold"
                  >
                    Kosongkan
                  </button>
                </div>

                {cart.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">
                    Keranjang masih kosong. Pilih produk terlebih dahulu.
                  </p>
                ) : (
                  cart.map((item) => (
                    <div
                      key={item.produk.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-700/60"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-zinc-700 overflow-hidden shrink-0">
                          {item.produk.foto ? (
                            <img
                              src={item.produk.foto}
                              alt={item.produk.nama}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Leaf className="w-5 h-5 text-emerald-600 m-auto mt-3.5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs text-slate-800 dark:text-zinc-200 truncate">
                            {item.produk.nama}
                          </h4>
                          <p className="text-[11px] text-[#0d7a75] dark:text-emerald-400 font-extrabold">
                            Rp {item.produk.harga.toLocaleString("id-ID")}{" "}
                            <span className="font-normal text-slate-400">/{item.produk.satuan}</span>
                          </p>
                        </div>
                      </div>

                      {/* Qty Controller */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => updateQuantity(item.produk.id, -1)}
                          className="w-6 h-6 rounded-lg bg-white dark:bg-zinc-700 border border-slate-200 dark:border-zinc-600 text-xs flex items-center justify-center font-bold hover:bg-slate-100"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold w-6 text-center tabular-nums">
                          {item.jumlah}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.produk.id, 1)}
                          className="w-6 h-6 rounded-lg bg-white dark:bg-zinc-700 border border-slate-200 dark:border-zinc-600 text-xs flex items-center justify-center font-bold hover:bg-slate-100"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => removeFromCart(item.produk.id)}
                          className="p-1 text-slate-400 hover:text-rose-500 ml-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Form Checkout Penerima */}
              <form id="checkout-form" onSubmit={handleCheckout} className="space-y-4 pt-4 border-t border-slate-100 dark:border-zinc-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Data Pengiriman & Pemesan
                </h3>

                {/* Opsi Pengiriman */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                    Pilihan Pengiriman
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label
                      className={`p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-all flex flex-col justify-between ${
                        opsiPengiriman === "kurir_depok"
                          ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-800 dark:text-emerald-300"
                          : "border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400"
                      }`}
                    >
                      <input
                        type="radio"
                        name="drawerOpsiPengiriman"
                        value="kurir_depok"
                        checked={opsiPengiriman === "kurir_depok"}
                        onChange={() => setOpsiPengiriman("kurir_depok")}
                        className="sr-only"
                      />
                      <div className="flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Kurir Armada Depok</span>
                      </div>
                      <span className="text-[10px] font-normal text-slate-500 mt-1">
                        {isGratisOngkir ? "GRATIS Promo" : "Rp 10.000 flat"}
                      </span>
                    </label>

                    <label
                      className={`p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-all flex flex-col justify-between ${
                        opsiPengiriman === "ambil_sendiri"
                          ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-800 dark:text-emerald-300"
                          : "border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400"
                      }`}
                    >
                      <input
                        type="radio"
                        name="drawerOpsiPengiriman"
                        value="ambil_sendiri"
                        checked={opsiPengiriman === "ambil_sendiri"}
                        onChange={() => setOpsiPengiriman("ambil_sendiri")}
                        className="sr-only"
                      />
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Ambil di TPS 3R</span>
                      </div>
                      <span className="text-[10px] font-normal text-slate-500 mt-1">
                        GRATIS (Jl. H. Asmawi)
                      </span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                    Nama Lengkap Pemesan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={namaPembeli}
                    onChange={(e) => setNamaPembeli(e.target.value)}
                    placeholder="Bpk/Ibu Nama Lengkap"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#0d7a75]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                    Nomor WhatsApp <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={noTelepon}
                    onChange={(e) => setNoTelepon(e.target.value)}
                    placeholder="0812xxxxxxxx"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#0d7a75]"
                  />
                </div>

                {!isAmbilSendiri && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                        Alamat Pengiriman Lengkap <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        required
                        rows={2}
                        value={alamat}
                        onChange={(e) => setAlamat(e.target.value)}
                        placeholder="Jalan, nomor rumah, RT/RW, nama perumahan"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#0d7a75]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                          Kecamatan di Depok
                        </label>
                        <select
                          value={kecamatan}
                          onChange={(e) => setKecamatan(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#0d7a75]"
                        >
                          <option value="Cilodong">Cilodong</option>
                          <option value="Sukmajaya">Sukmajaya</option>
                          <option value="Pancoran Mas">Pancoran Mas</option>
                          <option value="Beji">Beji</option>
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
                        <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                          Kelurahan
                        </label>
                        <input
                          type="text"
                          value={kelurahan}
                          onChange={(e) => setKelurahan(e.target.value)}
                          placeholder="Kalibaru / Jatimulya"
                          className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#0d7a75]"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Metode Pembayaran (Duitku vs COD) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                    Metode Pembayaran
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div
                      onClick={() => setMetodeBayar("duitku")}
                      className={`p-2.5 rounded-xl border cursor-pointer text-xs flex flex-col justify-between ${
                        metodeBayar === "duitku"
                          ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 font-bold"
                          : "border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Duitku Payment</span>
                      </div>
                      <span className="text-[10px] font-normal text-slate-500 mt-1">
                        QRIS Semua Bank & E-Wallet
                      </span>
                    </div>

                    <div
                      onClick={() => setMetodeBayar("cod")}
                      className={`p-2.5 rounded-xl border cursor-pointer text-xs flex flex-col justify-between ${
                        metodeBayar === "cod"
                          ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 font-bold"
                          : "border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Bayar di Tempat</span>
                      </div>
                      <span className="text-[10px] font-normal text-slate-500 mt-1">
                        COD / Tunai saat terima
                      </span>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Footer Ringkasan Biaya Terpisah & Checkout Button */}
            <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/80 space-y-3">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-500 dark:text-zinc-400">
                  <span>Subtotal Barang ({totalItemCount} item):</span>
                  <span className="font-bold text-slate-900 dark:text-zinc-100">
                    Rp {subtotal.toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="flex justify-between text-slate-500 dark:text-zinc-400">
                  <span>Biaya Pengiriman:</span>
                  <span className="font-bold text-slate-900 dark:text-zinc-100">
                    {isAmbilSendiri
                      ? "Rp 0 (Ambil di TPS)"
                      : isGratisOngkir
                      ? "Rp 0 (Promo Belanja ≥ 150rb)"
                      : `Rp ${ongkir.toLocaleString("id-ID")}`}
                  </span>
                </div>
                {isGratisOngkir && !isAmbilSendiri && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                    <span>Diskon Promo Ongkir:</span>
                    <span>-Rp 10.000</span>
                  </div>
                )}
                <div className="flex justify-between font-extrabold text-sm text-slate-900 dark:text-zinc-100 pt-2 border-t border-slate-200 dark:border-zinc-700">
                  <span>Total Tagihan Akhir:</span>
                  <span className="text-[#0d7a75] dark:text-emerald-400 text-base">
                    Rp {totalBayar.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                form="checkout-form"
                disabled={submitting || cart.length === 0}
                className="w-full py-3.5 rounded-xl font-black bg-[#0d7a75] hover:bg-[#0b6460] text-white text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-50 active:scale-95"
              >
                {submitting ? (
                  "Memproses Order..."
                ) : metodeBayar === "duitku" ? (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span>Bayar via Duitku (QRIS / VA)</span>
                  </>
                ) : (
                  <>
                    <span>Pesan Sekarang (COD)</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
