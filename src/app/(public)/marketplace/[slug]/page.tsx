"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import PublicNavbar from "@/components/PublicNavbar";
import {
  ShoppingBag,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  Truck,
  Leaf,
  Plus,
  Minus,
  MessageCircle,
  Clock,
  Sparkles,
  ChevronRight,
  AlertCircle,
  PackageCheck,
  Share2,
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

export default function ProdukDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const router = useRouter();
  const { slug } = use(params);

  const [product, setProduct] = useState<Produk | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Produk[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Direct Checkout Form
  const [qty, setQty] = useState(1);
  const [namaPembeli, setNamaPembeli] = useState("");
  const [noTelepon, setNoTelepon] = useState("");
  const [alamat, setAlamat] = useState("");
  const [kelurahan, setKelurahan] = useState("");
  const [catatan, setCatatan] = useState("");
  const [metodeBayar, setMetodeBayar] = useState("cod");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Load Product & Related
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await fetch(`/api/marketplace/produk/${slug}`);
        const json = await res.json();

        if (json.ok && json.data) {
          setProduct(json.data);

          // Load other products for recommendations
          const resAll = await fetch(`/api/marketplace/produk`);
          const jsonAll = await resAll.json();
          if (jsonAll.ok && Array.isArray(jsonAll.data)) {
            setRelatedProducts(jsonAll.data.filter((p: Produk) => p.slug !== slug).slice(0, 3));
          }
        } else {
          setNotFound(true);
        }
      } catch (err) {
        console.error("Gagal load detail produk:", err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    if (slug) {
      loadData();
    }
  }, [slug]);

  // Handle Direct Buy Submit
  const handleDirectBuy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    if (!namaPembeli.trim() || !noTelepon.trim() || !alamat.trim()) {
      setErrorMsg("Nama, No WhatsApp, dan Alamat Pengiriman wajib diisi.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/marketplace/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          namaPembeli: namaPembeli.trim(),
          noTelepon: noTelepon.trim(),
          alamat: alamat.trim(),
          kelurahan: kelurahan.trim() || null,
          catatan: catatan.trim() || null,
          items: [{ produkId: product.id, jumlah: qty }],
          metodeBayar,
        }),
      });

      const json = await res.json();
      if (json.ok && json.data?.noPesanan) {
        router.push(`/marketplace/order/${encodeURIComponent(json.data.noPesanan)}`);
      } else {
        setErrorMsg(json.error || "Gagal memproses pesanan.");
      }
    } catch {
      setErrorMsg("Terjadi gangguan koneksi server. Silakan coba kembali.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950">
        <PublicNavbar />
        <div className="max-w-6xl mx-auto px-4 py-20 text-center">
          <div className="w-10 h-10 border-4 border-[#0d7a75] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-500">Memuat informasi produk...</p>
        </div>
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950">
        <PublicNavbar />
        <div className="max-w-lg mx-auto px-4 py-24 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">Produk Tidak Ditemukan</h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            Produk yang Anda cari mungkin sudah tidak aktif atau tautan telah berpindah.
          </p>
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0d7a75] text-white rounded-xl text-xs font-bold shadow-xs hover:bg-[#0b6460] transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Katalog Produk</span>
          </Link>
        </div>
      </div>
    );
  }

  const subtotal = product.harga * qty;
  const waContactUrl = `https://wa.me/6281400782617?text=${encodeURIComponent(
    `Halo UPS HERU, saya tertarik membeli "${product.nama}" seharga Rp ${product.harga.toLocaleString("id-ID")}/${product.satuan}. Bisa info ketersediaan stok & pengirimannya?`
  )}`;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 flex flex-col justify-between">
      <div>
        <PublicNavbar />

        {/* Breadcrumb Navigation */}
        <div className="bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 py-3 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400">
            <Link href="/" className="hover:text-[#0d7a75] dark:hover:text-emerald-400">
              Beranda
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href="/marketplace" className="hover:text-[#0d7a75] dark:hover:text-emerald-400">
              Marketplace
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="font-bold text-slate-800 dark:text-zinc-200 truncate max-w-xs sm:max-w-md">
              {product.nama}
            </span>
          </div>
        </div>

        {/* Main Product Container */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-12 space-y-12">
          <div className="grid md:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* Left Column: Visual & Specs (7 cols) */}
            <div className="md:col-span-7 space-y-6">
              {/* Product Visual Box */}
              <div className="relative aspect-4/3 sm:aspect-16/10 w-full rounded-3xl overflow-hidden bg-slate-100 dark:bg-zinc-800 border-2 border-slate-200/90 dark:border-zinc-800 shadow-sm">
                {product.foto ? (
                  <img
                    src={product.foto}
                    alt={product.nama}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                    <Leaf className="w-16 h-16 text-emerald-600/40 mb-2" />
                    <span className="text-xs font-bold">Foto Produk UPS HERU</span>
                  </div>
                )}

                {/* Badges */}
                <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-full text-xs font-black text-emerald-800 dark:text-emerald-300 shadow-sm border border-emerald-200 dark:border-emerald-800/60 uppercase tracking-wider">
                    {product.kategori.replace(/_/g, " ")}
                  </span>
                  <span className="px-3 py-1 bg-[#0d7a75]/90 text-white backdrop-blur-md rounded-full text-xs font-bold shadow-sm flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
                    <span>Resmi TPS 3R</span>
                  </span>
                </div>

                <div className="absolute bottom-4 right-4">
                  <span className="px-3 py-1 bg-black/70 text-white backdrop-blur-md rounded-full text-xs font-bold">
                    Stok Tersedia: {product.stok} {product.satuan}
                  </span>
                </div>
              </div>

              {/* Title & Price Header (Mobile only, desktop has in right box too) */}
              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  {product.nama}
                </h1>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-[#0d7a75] dark:text-emerald-400">
                    Rp {product.harga.toLocaleString("id-ID")}
                  </span>
                  <span className="text-xs font-bold text-slate-500">/{product.satuan}</span>
                </div>
              </div>

              {/* Description & Benefits */}
              <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-4">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#0d7a75] dark:text-emerald-400" />
                  <span>Deskripsi & Keunggulan Produk</span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
                  {product.deskripsi}
                </p>

                {/* Key Features Bullet List */}
                <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 grid sm:grid-cols-2 gap-3 text-xs text-slate-700 dark:text-zinc-300">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#0d7a75] shrink-0 mt-0.5" />
                    <span>100% Hasil Olahan Sampah Terpilah Organik</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#0d7a75] shrink-0 mt-0.5" />
                    <span>Mendukung Sirkular Ekonomi Kota Depok</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#0d7a75] shrink-0 mt-0.5" />
                    <span>Kemasan Rapi & Siap Kirim ke Seluruh Depok</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#0d7a75] shrink-0 mt-0.5" />
                    <span>Dapat Diambil Langsung di Fasilitas TPS 3R</span>
                  </div>
                </div>
              </div>

              {/* Technical Specifications */}
              <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-3">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Spesifikasi Teknis
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Satuan</span>
                    <span className="font-bold text-slate-800 dark:text-zinc-200 capitalize">
                      {product.satuan}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Berat Bersih</span>
                    <span className="font-bold text-slate-800 dark:text-zinc-200">
                      {product.beratGram >= 1000
                        ? `${product.beratGram / 1000} Kg`
                        : `${product.beratGram} Gram`}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Produksi</span>
                    <span className="font-bold text-slate-800 dark:text-zinc-200">
                      UPS HERU Depok
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Stok Siap</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">
                      {product.stok} Tersedia
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Direct Buy Checkout Box (5 cols) */}
            <div className="md:col-span-5 sticky top-20 space-y-4">
              <div className="bg-white dark:bg-zinc-900 border-2 border-[#0d7a75] rounded-3xl p-6 shadow-lg space-y-5">
                <div className="space-y-1 pb-3 border-b border-slate-100 dark:border-zinc-800">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#0d7a75] dark:text-emerald-400 uppercase tracking-wider">
                    <ShoppingBag className="w-4 h-4" />
                    <span>Pemesanan Langsung Cepat</span>
                  </div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Form Pembelian Produk
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Tanpa perlu mendaftar akun. Pesanan langsung diverifikasi oleh admin.
                  </p>
                </div>

                {errorMsg && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-400 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <form onSubmit={handleDirectBuy} className="space-y-4 text-xs">
                  {/* Quantity Counter */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800 dark:text-zinc-200 block">
                        Jumlah Pembelian
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Rp {product.harga.toLocaleString("id-ID")} × {qty}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl p-1">
                      <button
                        type="button"
                        onClick={() => setQty((q) => Math.max(1, q - 1))}
                        disabled={qty <= 1}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-30"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center font-black text-sm text-slate-900 dark:text-white tabular-nums">
                        {qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQty((q) => Math.min(product.stok || 99, q + 1))}
                        disabled={qty >= product.stok}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-30"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Total Calculation Highlight */}
                  <div className="flex items-center justify-between py-2 border-y border-slate-100 dark:border-zinc-800">
                    <span className="text-xs font-bold text-slate-500">Total Tagihan:</span>
                    <span className="text-xl font-black text-[#0d7a75] dark:text-emerald-400">
                      Rp {subtotal.toLocaleString("id-ID")}
                    </span>
                  </div>

                  {/* Customer Form Fields */}
                  <div className="space-y-3">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                        Nama Lengkap Pembeli *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: Bpk. Bambang Sutrisno"
                        value={namaPembeli}
                        onChange={(e) => setNamaPembeli(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0d7a75]"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                        Nomor WhatsApp Aktif *
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="Contoh: 081234567890"
                        value={noTelepon}
                        onChange={(e) => setNoTelepon(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0d7a75]"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        Nota pesanan & konfirmasi kurir akan dikirimkan ke nomor ini.
                      </span>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                        Alamat Pengiriman Lengkap *
                      </label>
                      <textarea
                        rows={2}
                        required
                        placeholder="Jalan, Nomor Rumah, RT/RW, Patokan..."
                        value={alamat}
                        onChange={(e) => setAlamat(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0d7a75]"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                        Kelurahan di Kota Depok
                      </label>
                      <input
                        type="text"
                        placeholder="Misal: Kalibaru, Cilodong, Jatimulya"
                        value={kelurahan}
                        onChange={(e) => setKelurahan(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0d7a75]"
                      />
                    </div>

                    {/* Payment Method */}
                    <div>
                      <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1.5">
                        Pilihan Metode Pembayaran
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <label
                          className={`p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-all flex flex-col justify-between ${
                            metodeBayar === "cod"
                              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-800 dark:text-emerald-300"
                              : "border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400"
                          }`}
                        >
                          <input
                            type="radio"
                            name="metodeBayar"
                            value="cod"
                            checked={metodeBayar === "cod"}
                            onChange={(e) => setMetodeBayar(e.target.value)}
                            className="sr-only"
                          />
                          <span>COD (Tunai ke Kurir)</span>
                          <span className="text-[10px] font-normal text-slate-400 mt-1">Bayar saat sampai</span>
                        </label>

                        <label
                          className={`p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-all flex flex-col justify-between ${
                            metodeBayar === "qris"
                              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-800 dark:text-emerald-300"
                              : "border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400"
                          }`}
                        >
                          <input
                            type="radio"
                            name="metodeBayar"
                            value="qris"
                            checked={metodeBayar === "qris"}
                            onChange={(e) => setMetodeBayar(e.target.value)}
                            className="sr-only"
                          />
                          <span>QRIS / Transfer Bank</span>
                          <span className="text-[10px] font-normal text-slate-400 mt-1">Scan otomatis</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={submitting || product.stok <= 0}
                      className="w-full py-3.5 bg-[#0d7a75] hover:bg-[#0b6460] text-white rounded-xl font-black text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>{submitting ? "Memproses Pesanan..." : "Beli Sekarang Langsung"}</span>
                    </button>
                  </div>
                </form>

                {/* WhatsApp Help Button */}
                <div className="pt-2 border-t border-slate-100 dark:border-zinc-800">
                  <a
                    href={waContactUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-600" />
                    <span>Tanya Produk / Custom via WhatsApp</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Related / Other Products Section */}
          {relatedProducts.length > 0 && (
            <div className="pt-8 border-t border-slate-200 dark:border-zinc-800 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">
                    Produk Resmi Olahan UPS HERU Lainnya
                  </h3>
                  <p className="text-xs text-slate-500">
                    Kombinasikan dengan pupuk atau peralatan kebersihan lainnya.
                  </p>
                </div>
                <Link
                  href="/marketplace"
                  className="text-xs font-bold text-[#0d7a75] dark:text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <span>Lihat Semua Katalog</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {relatedProducts.map((rel) => (
                  <Link
                    key={rel.id}
                    href={`/marketplace/${rel.slug}`}
                    className="group bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 shadow-xs hover:border-[#0d7a75] transition-all flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-2">
                      <div className="w-full h-36 rounded-xl overflow-hidden bg-slate-100 dark:bg-zinc-800 relative">
                        {rel.foto ? (
                          <img
                            src={rel.foto}
                            alt={rel.nama}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <Leaf className="w-8 h-8 text-emerald-600/40 m-auto mt-12" />
                        )}
                        <span className="absolute top-2 left-2 text-[10px] font-bold bg-white/90 dark:bg-zinc-900/90 px-2 py-0.5 rounded-md text-slate-700 dark:text-zinc-300">
                          {rel.kategori.replace(/_/g, " ")}
                        </span>
                      </div>
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-white line-clamp-1 group-hover:text-[#0d7a75]">
                        {rel.nama}
                      </h4>
                      <p className="text-xs font-black text-[#0d7a75] dark:text-emerald-400">
                        Rp {rel.harga.toLocaleString("id-ID")}{" "}
                        <span className="text-[10px] font-medium text-slate-400">/{rel.satuan}</span>
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs font-bold text-[#0d7a75] dark:text-emerald-400">
                      <span>Buka Halaman Produk</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
