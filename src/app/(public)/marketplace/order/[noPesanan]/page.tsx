"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
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
  CreditCard,
  Building2,
  ExternalLink,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

const ORDER_STATUS_MAP: Record<string, { label: string; color: string; desc: string }> = {
  menunggu_pembayaran: {
    label: "Menunggu Pembayaran",
    color: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    desc: "Pesanan telah dicatat. Silakan lakukan pembayaran via Duitku QRIS / VA atau siapkan uang pas jika memilih COD.",
  },
  diproses: {
    label: "Sedang Dikemas / Diproses",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
    desc: "Pembayaran terverifikasi! Produk olahan organik sedang disiapkan dan dikemas oleh petugas TPS 3R.",
  },
  dikirim: {
    label: "Dalam Pengiriman",
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
    desc: "Pesanan sedang dalam perjalanan diantar oleh armada kurir resmi UPS HERU Depok.",
  },
  selesai: {
    label: "Selesai Diterima",
    color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    desc: "Barang telah berhasil diterima oleh pemesan. Terima kasih telah mendukung sirkular ekonomi Kota Depok!",
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
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

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
      setCheckingPayment(false);
    }
  }

  useEffect(() => {
    fetchOrder();
  }, [noPesanan]);

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePayNow = async () => {
    if (order?.paymentUrl) {
      window.location.href = order.paymentUrl;
      return;
    }

    try {
      setCheckingPayment(true);
      const res = await fetch(`/api/marketplace/order/${encodeURIComponent(noPesanan)}/pay`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.ok && json.paymentUrl) {
        window.location.href = json.paymentUrl;
      } else {
        alert(json.error || "Gagal memproses sesi pembayaran Duitku.");
      }
    } catch {
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setCheckingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center space-y-3">
        <div className="w-10 h-10 border-4 border-[#0d7a75] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-bold text-slate-500 dark:text-zinc-400">Memuat rincian pesanan toko resmi...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-sm">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-zinc-100 mb-1">
            Pesanan Tidak Ditemukan
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mb-6">
            Nomor pesanan <strong>{noPesanan}</strong> tidak ditemukan di database resmi.
          </p>
          <Link
            href="/marketplace"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0d7a75] text-white text-xs font-bold hover:bg-[#0b6460] w-full"
          >
            <ChevronLeft className="w-4 h-4" />
            Kembali ke Katalog Toko
          </Link>
        </div>
      </div>
    );
  }

  const statusInfo = ORDER_STATUS_MAP[order.status] || {
    label: order.status,
    color: "bg-slate-100 text-slate-800",
    desc: "",
  };

  const isDuitku = (order.metodeBayar || "").toLowerCase().includes("duitku") || (order.metodeBayar || "").toLowerCase().includes("qris");
  const isPending = order.status === "menunggu_pembayaran";
  const subtotalBarang = order.items?.reduce((sum: number, it: any) => sum + it.subtotal, 0) || (order.totalHarga - order.ongkir);
  const isAmbilSendiri = (order.catatan || "").includes("Ambil Sendiri");

  return (
    <div className="max-w-3xl mx-auto w-full space-y-6">
      {/* Top Navigation */}
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-zinc-400 hover:text-[#0d7a75]"
          >
            <ChevronLeft className="w-4 h-4" />
            Kembali ke Toko Resmi UPS HERU
          </Link>

          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs font-bold bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:bg-slate-100"
          >
            <Copy className="w-3.5 h-3.5 text-slate-500" />
            {copied ? "Link Tersalin!" : "Salin Link Pesanan"}
          </button>
        </div>

        {/* PAYMENT ACTION BANNER (Bila Menunggu Pembayaran via Duitku) */}
        {isPending && isDuitku && (
          <div className="bg-gradient-to-r from-teal-900 to-[#0d7a75] text-white rounded-3xl p-6 sm:p-7 shadow-lg space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-[11px] font-black uppercase tracking-wider text-amber-300">
                  Pembayaran Online Duitku Aktif
                </span>
                <h2 className="text-xl font-black text-white">
                  Selesaikan Pembayaran Sekarang
                </h2>
                <p className="text-xs text-emerald-100 leading-relaxed">
                  Pindai QRIS via BCA Mobile, GoPay, OVO, ShopeePay, DANA, LinkAja, atau Transfer Virtual Account.
                </p>
              </div>
              <CreditCard className="w-10 h-10 text-emerald-300 shrink-0 hidden sm:block" />
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                onClick={handlePayNow}
                disabled={checkingPayment}
                className="flex-1 py-3.5 px-5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Buka Gateway Pembayaran Duitku</span>
              </button>

              <button
                onClick={() => {
                  setCheckingPayment(true);
                  fetchOrder();
                }}
                disabled={checkingPayment}
                className="py-3.5 px-4 bg-white/15 hover:bg-white/25 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${checkingPayment ? "animate-spin" : ""}`} />
                <span>Cek Status Pembayaran</span>
              </button>
            </div>
          </div>
        )}

        {/* Card Utama Rincian Pesanan */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-5 sm:p-7 shadow-sm space-y-6">
          {/* Header Info */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-5 border-b border-slate-100 dark:border-zinc-800">
            <div>
              <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                Nomor Pesanan Toko Resmi
              </div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-zinc-100">
                {order.noPesanan}
              </h1>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Dibuat pada {new Date(order.createdAt).toLocaleDateString("id-ID", { dateStyle: "long", timeStyle: "short" })}
              </p>
            </div>

            <span className={`px-3 py-1.5 rounded-full text-xs font-black ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </div>

          {/* Status Description & Kurir */}
          <div className="py-2 text-xs text-slate-600 dark:text-zinc-400 border-b border-slate-100 dark:border-zinc-800 space-y-1">
            <p className="leading-relaxed">{statusInfo.desc}</p>
            {order.noResi && (
              <p className="text-slate-900 dark:text-zinc-100 font-bold pt-1">
                Kurir: {order.kurirNama || "Armada UPS HERU Depok"} | No. Resi: <strong>{order.noResi}</strong>
              </p>
            )}
            {order.tanggalBayar && (
              <p className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1 pt-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Lunas Terverifikasi pada {new Date(order.tanggalBayar).toLocaleDateString("id-ID", { dateStyle: "long", timeStyle: "short" })}</span>
              </p>
            )}
          </div>

          {/* Single Seller Box */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#0d7a75] text-white flex items-center justify-center font-black text-xs">
                UPS
              </div>
              <div>
                <span className="font-extrabold text-slate-900 dark:text-white block">
                  Toko Resmi UPS HERU / TPS 3R Kalibaru
                </span>
                <span className="text-[10px] text-slate-500">
                  Jl. H. Asmawi No. 1, Kalibaru, Kec. Cilodong, Kota Depok
                </span>
              </div>
            </div>
            <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-[10px] rounded-md">
              Penjual Resmi
            </span>
          </div>

          {/* Daftar Barang */}
          <div className="space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">
              Daftar Barang yang Dipesan
            </h3>
            {order.items?.map((item: any) => (
              <div
                key={item.id}
                className="flex items-center justify-between py-2.5 border-b border-slate-100 dark:border-zinc-800/60 text-xs"
              >
                <div>
                  <div className="font-extrabold text-slate-900 dark:text-zinc-100">
                    {item.produk?.nama || "Produk"}
                  </div>
                  <div className="text-slate-500 dark:text-zinc-400 text-[11px]">
                    Rp {item.hargaSatuan.toLocaleString("id-ID")} × {item.jumlah}
                  </div>
                </div>
                <div className="font-extrabold text-slate-900 dark:text-zinc-100">
                  Rp {item.subtotal.toLocaleString("id-ID")}
                </div>
              </div>
            ))}
          </div>

          {/* AKUMULASI PERHITUNGAN TERPISAH (SEPARATED ACCUMULATION BREAKDOWN) */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700/80 space-y-2 text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block pb-1 border-b border-slate-200 dark:border-zinc-700">
              Rincian Perhitungan Pembayaran Terpisah
            </span>
            <div className="flex justify-between text-slate-600 dark:text-zinc-400">
              <span>Subtotal Produk:</span>
              <span className="font-bold text-slate-900 dark:text-zinc-100">
                Rp {subtotalBarang.toLocaleString("id-ID")}
              </span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-zinc-400">
              <span>
                Biaya Pengiriman ({isAmbilSendiri ? "Ambil Mandiri di TPS 3R" : "Kurir Armada UPS HERU"}):
              </span>
              <span className="font-bold text-slate-900 dark:text-zinc-100">
                {order.ongkir === 0 ? "GRATIS" : `Rp ${order.ongkir.toLocaleString("id-ID")}`}
              </span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-zinc-400">
              <span>Biaya Layanan Gateway:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">GRATIS</span>
            </div>
            <div className="flex justify-between font-black text-sm text-slate-900 dark:text-zinc-100 pt-2 border-t border-slate-200 dark:border-zinc-700">
              <span>Total Tagihan Akhir:</span>
              <span className="text-[#0d7a75] dark:text-emerald-400 text-base">
                Rp {order.totalHarga.toLocaleString("id-ID")}
              </span>
            </div>
          </div>

          {/* Tujuan & Kontak Penerima */}
          <div className="pt-2 text-xs space-y-2 text-slate-600 dark:text-zinc-400">
            <div className="flex justify-between">
              <span>Nama Penerima:</span>
              <span className="font-bold text-slate-800 dark:text-zinc-200">
                {order.namaPembeli} ({order.noTelepon})
              </span>
            </div>
            <div className="flex justify-between">
              <span>Alamat Pengiriman:</span>
              <span className="font-medium text-slate-800 dark:text-zinc-200 max-w-xs text-right">
                {order.alamat} {order.kelurahan ? `, Kel. ${order.kelurahan}` : ""} {order.kecamatan ? `, Kec. ${order.kecamatan}` : ""}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Metode Pembayaran:</span>
              <span className="font-extrabold text-[#0d7a75] dark:text-emerald-400 uppercase">
                {isDuitku ? "Duitku Payment Gateway (QRIS / VA)" : "Bayar di Tempat (COD / Tunai)"}
              </span>
            </div>
            {order.catatan && (
              <div className="flex justify-between">
                <span>Catatan Pesanan:</span>
                <span className="font-medium text-slate-800 dark:text-zinc-200 italic max-w-xs text-right">
                  {order.catatan}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Bantuan WhatsApp Admin Toko */}
        <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 rounded-3xl p-5 text-center space-y-3">
          <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
            Butuh Konfirmasi Pengiriman atau Bantuan Pesanan?
          </p>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
            Admin toko resmi UPS HERU siap membantu pengecekan pesanan dan koordinasi armada pengantaran.
          </p>
          <a
            href={`https://wa.me/6281400782617?text=${encodeURIComponent(
              `Halo Admin UPS HERU, saya ingin konfirmasi pesanan marketplace nomor: ${order.noPesanan} atas nama ${order.namaPembeli}.`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0d7a75] text-white text-xs font-bold hover:bg-[#0b6460] transition-colors"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Hubungi WhatsApp Admin Toko</span>
          </a>
        </div>
      </div>
    );
  }
