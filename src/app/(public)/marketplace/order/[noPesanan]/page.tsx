"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import PublicNavbar from "@/components/PublicNavbar";
import {
  ShoppingBag,
  CheckCircle2,
  Clock,
  MapPin,
  AlertCircle,
  Copy,
  ChevronLeft,
  Truck,
  Phone,
  Package,
} from "lucide-react";

const ORDER_STATUS_MAP: Record<string, { label: string; color: string; desc: string }> = {
  menunggu_pembayaran: {
    label: "Menunggu Pembayaran",
    color: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    desc: "Pesanan telah dicatat, silakan siapkan pembayaran sesuai metode yang dipilih.",
  },
  diproses: {
    label: "Sedang Diproses",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
    desc: "Produk olahan organik sedang disiapkan dan dikemas oleh tim TPS 3R.",
  },
  dikirim: {
    label: "Dalam Pengiriman",
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
    desc: "Pesanan sedang dalam perjalanan menuju alamat Anda oleh armada UPS HERU.",
  },
  selesai: {
    label: "Selesai Diterima",
    color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    desc: "Barang telah berhasil diterima oleh pemesan. Terima kasih!",
  },
  dibatalkan: {
    label: "Dibatalkan",
    color: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
    desc: "Pesanan ini telah dibatalkan.",
  },
};

export default function MarketplaceOrderDetailPage({
  params,
}: {
  params: Promise<{ noPesanan: string }>;
}) {
  const resolvedParams = use(params);
  const noPesanan = decodeURIComponent(resolvedParams.noPesanan);

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchOrder() {
      try {
        const res = await fetch(`/api/marketplace/order/${encodeURIComponent(noPesanan)}`);
        const json = await res.json();
        if (json.ok && json.data) {
          setOrder(json.data);
        } else {
          setError(json.error || "Pesanan tidak ditemukan");
        }
      } catch (err) {
        console.error("Fetch order error:", err);
        setError("Gagal memuat status pesanan");
      } finally {
        setLoading(false);
      }
    }
    fetchOrder();
  }, [noPesanan]);

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col font-sans transition-colors">
        <PublicNavbar />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-slate-500 dark:text-zinc-400">Memuat rincian pesanan toko...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col font-sans transition-colors">
        <PublicNavbar />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 max-w-md w-full text-center shadow-sm">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-zinc-100 mb-1">
              Pesanan Tidak Ditemukan
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mb-6">
              Nomor pesanan <strong>{noPesanan}</strong> tidak ditemukan.
            </p>
            <Link
              href="/marketplace"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 w-full"
            >
              <ChevronLeft className="w-4 h-4" />
              Kembali ke Toko
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const statusInfo = ORDER_STATUS_MAP[order.status] || {
    label: order.status,
    color: "bg-slate-100 text-slate-800",
    desc: "",
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 flex flex-col font-sans transition-colors">
      <PublicNavbar />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
        <div className="flex items-center justify-between gap-3 mb-6">
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-emerald-600"
          >
            <ChevronLeft className="w-4 h-4" />
            Kembali ke Toko UPS HERU
          </Link>

          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 text-xs font-medium bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:bg-slate-100"
          >
            <Copy className="w-3.5 h-3.5 text-slate-500" />
            {copied ? "Link Tersalin!" : "Salin Link Pesanan"}
          </button>
        </div>

        {/* Card Utama */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 sm:p-7 shadow-sm mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-5 border-b border-slate-100 dark:border-zinc-800">
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Nomor Pesanan Toko
              </div>
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-zinc-100">
                {order.noPesanan}
              </h1>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Dipesan pada {new Date(order.createdAt).toLocaleDateString("id-ID", { dateStyle: "long" })}
              </p>
            </div>

            <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </div>

          <div className="py-4 text-xs text-slate-600 dark:text-zinc-400 border-b border-slate-100 dark:border-zinc-800">
            <p>{statusInfo.desc}</p>
            {order.noResi && (
              <p className="mt-2 text-slate-900 dark:text-zinc-100 font-semibold">
                Kurir: {order.kurirNama || "Armada UPS HERU"} | No. Resi: <strong>{order.noResi}</strong>
              </p>
            )}
          </div>

          {/* Daftar Barang */}
          <div className="py-5 space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">
              Barang yang Dipesan
            </h3>
            {order.items?.map((item: any) => (
              <div
                key={item.id}
                className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-zinc-800/60 text-xs"
              >
                <div>
                  <div className="font-bold text-slate-900 dark:text-zinc-100">
                    {item.produk?.nama || "Produk"}
                  </div>
                  <div className="text-slate-500 dark:text-zinc-400 text-[11px]">
                    Rp {item.hargaSatuan.toLocaleString("id-ID")} x {item.jumlah}
                  </div>
                </div>
                <div className="font-bold text-slate-900 dark:text-zinc-100">
                  Rp {item.subtotal.toLocaleString("id-ID")}
                </div>
              </div>
            ))}

            {/* Total Pembayaran */}
            <div className="pt-3 space-y-1 text-xs">
              <div className="flex justify-between text-slate-500 dark:text-zinc-400">
                <span>Ongkos Kirim Armada Depok:</span>
                <span>{order.ongkir === 0 ? "GRATIS" : `Rp ${order.ongkir.toLocaleString("id-ID")}`}</span>
              </div>
              <div className="flex justify-between font-extrabold text-sm text-slate-900 dark:text-zinc-100 pt-2 border-t border-slate-200 dark:border-zinc-700">
                <span>Total Pembayaran:</span>
                <span className="text-emerald-700 dark:text-emerald-400">
                  Rp {order.totalHarga.toLocaleString("id-ID")}
                </span>
              </div>
            </div>
          </div>

          {/* Tujuan & Kontak */}
          <div className="pt-4 border-t border-slate-100 dark:border-zinc-800 text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-zinc-400">Penerima:</span>
              <span className="font-semibold text-slate-800 dark:text-zinc-200">
                {order.namaPembeli} ({order.noTelepon})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-zinc-400">Alamat:</span>
              <span className="font-medium text-slate-800 dark:text-zinc-200 max-w-xs text-right">
                {order.alamat} {order.kelurahan ? `, Kel. ${order.kelurahan}` : ""} {order.kecamatan ? `, Kec. ${order.kecamatan}` : ""}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-zinc-400">Metode Bayar:</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-400 uppercase">
                {order.metodeBayar === "cod" ? "Bayar di Tempat (COD)" : "Transfer / QRIS Online"}
              </span>
            </div>
          </div>
        </div>

        {/* Bantuan WA */}
        <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-5 text-center">
          <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-200 mb-1">
            Butuh Konfirmasi Pengiriman atau Pertanyaan Produk?
          </p>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mb-3">
            Admin toko kami siap membantu pengiriman pesanan Anda ke seluruh wilayah Kota Depok.
          </p>
          <a
            href={`https://wa.me/6285353286062?text=Halo%20Admin%20UPS%20HERU,%20saya%20sudah%20membuat%20pesanan%20nomor%20${encodeURIComponent(order.noPesanan)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700"
          >
            <Phone className="w-3.5 h-3.5" />
            Konfirmasi Pesanan ke WhatsApp Admin
          </a>
        </div>
      </main>
    </div>
  );
}
