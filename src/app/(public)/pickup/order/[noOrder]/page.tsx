"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import PublicNavbar from "@/components/PublicNavbar";
import {
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  Calendar,
  AlertCircle,
  Phone,
  Copy,
  ExternalLink,
  ChevronLeft,
  Share2,
  User,
  ShieldCheck,
  PackageCheck,
} from "lucide-react";

const STATUS_STEPS = [
  { key: "menunggu_konfirmasi", label: "Menunggu Konfirmasi", desc: "Pesanan diterima sistem" },
  { key: "dikonfirmasi", label: "Dikonfirmasi", desc: "Jadwal & rute disetujui tim armada" },
  { key: "ditugaskan", label: "Armada Ditugaskan", desc: "Supir & mobil pickup disiapkan" },
  { key: "otw", label: "Menuju Lokasi", desc: "Armada bergerak ke rumah Anda" },
  { key: "selesai", label: "Selesai Terangkut", desc: "Sampah telah diangkut & bersih" },
];

export default function PickupOrderDetailPage({
  params,
}: {
  params: Promise<{ noOrder: string }>;
}) {
  const resolvedParams = use(params);
  const noOrder = decodeURIComponent(resolvedParams.noOrder);

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchOrder() {
      try {
        const res = await fetch(`/api/pickup/order/${encodeURIComponent(noOrder)}`);
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
  }, [noOrder]);

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
            <p className="text-sm text-slate-500 dark:text-zinc-400">Memuat status penjemputan...</p>
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
              Nomor order <strong>{noOrder}</strong> tidak terdaftar dalam sistem.
            </p>
            <Link
              href="/pickup"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 w-full"
            >
              <ChevronLeft className="w-4 h-4" />
              Kembali ke Form Pemesanan
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Cari index status saat ini
  const currentStatusIndex = STATUS_STEPS.findIndex((s) => s.key === order.status);
  const isCanceled = order.status === "dibatalkan";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 flex flex-col font-sans transition-colors">
      <PublicNavbar />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
        {/* Header Breadcrumb & Actions */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <Link
            href="/pickup"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-emerald-600"
          >
            <ChevronLeft className="w-4 h-4" />
            Pesan Penjemputan Baru
          </Link>

          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 text-xs font-medium bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:bg-slate-100"
          >
            <Copy className="w-3.5 h-3.5 text-slate-500" />
            {copied ? "Link Tersalin!" : "Salin Link Status"}
          </button>
        </div>

        {/* Card Utama Status */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 sm:p-7 shadow-sm mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-5 border-b border-slate-100 dark:border-zinc-800">
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Nomor Pesanan Penjemputan
              </div>
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-zinc-100">
                {order.noOrder}
              </h1>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Diajukan pada {new Date(order.createdAt).toLocaleDateString("id-ID", { dateStyle: "long" })}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  order.status === "selesai"
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                    : isCanceled
                    ? "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300"
                    : order.status === "otw"
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 animate-pulse"
                    : "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                }`}
              >
                {STATUS_STEPS.find((s) => s.key === order.status)?.label || order.status}
              </span>
            </div>
          </div>

          {/* Stepper Progress */}
          {!isCanceled ? (
            <div className="py-6">
              <div className="relative">
                <div className="hidden sm:block absolute top-1/2 left-0 right-0 h-0.5 bg-slate-200 dark:bg-zinc-800 -translate-y-1/2 z-0" />
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 relative z-10">
                  {STATUS_STEPS.map((step, idx) => {
                    const isDone = currentStatusIndex >= idx;
                    const isCurrent = currentStatusIndex === idx;

                    return (
                      <div
                        key={step.key}
                        className="flex sm:flex-col items-center sm:text-center gap-3 sm:gap-2"
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors flex-shrink-0 ${
                            isDone
                              ? "bg-emerald-600 text-white ring-4 ring-emerald-100 dark:ring-emerald-950/60"
                              : "bg-slate-100 dark:bg-zinc-800 text-slate-400 border border-slate-300 dark:border-zinc-700"
                          }`}
                        >
                          {isDone ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                        </div>
                        <div>
                          <div
                            className={`text-xs font-bold ${
                              isCurrent
                                ? "text-emerald-600 dark:text-emerald-400"
                                : isDone
                                ? "text-slate-800 dark:text-zinc-200"
                                : "text-slate-400"
                            }`}
                          >
                            {step.label}
                          </div>
                          <div className="text-[10px] text-slate-400 hidden sm:block">
                            {step.desc}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-rose-500 font-semibold text-sm">
              Pesanan ini telah dibatalkan.
            </div>
          )}

          {/* Info Petugas & Armada (Jika sudah ditugaskan) */}
          {order.petugas && (
            <div className="mt-4 p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                  {order.petugas.nama.charAt(0)}
                </div>
                <div>
                  <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                    Petugas / Supir yang Bertugas:
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                    {order.petugas.nama}
                  </div>
                  {order.kendaraan && (
                    <div className="text-xs text-slate-500 dark:text-zinc-400">
                      Armada: <strong>{order.kendaraan.nama}</strong> ({order.kendaraan.platNomor || "Plat Dinas"})
                    </div>
                  )}
                </div>
              </div>

              {order.petugas.noTelepon && (
                <a
                  href={`https://wa.me/${order.petugas.noTelepon.replace(/^0/, "62")}?text=Halo%20pak%20${encodeURIComponent(order.petugas.nama)},%20saya%20pemesan%20pickup%20nomor%20${encodeURIComponent(order.noOrder)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-emerald-700"
                >
                  <Phone className="w-3.5 h-3.5" />
                  Hubungi Supir
                </a>
              )}
            </div>
          )}
        </div>

        {/* Rincian Pesanan & Sampah */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Detail Muatan */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <Truck className="w-4 h-4 text-emerald-600" />
              Rincian Muatan Sampah
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-zinc-800">
                <span className="text-slate-500 dark:text-zinc-400">Kategori:</span>
                <span className="font-semibold text-slate-800 dark:text-zinc-200">
                  {order.kategoriPickup?.nama || "-"}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-zinc-800">
                <span className="text-slate-500 dark:text-zinc-400">Estimasi Muatan:</span>
                <span className="font-semibold text-slate-800 dark:text-zinc-200">
                  {order.estimasiMuatan}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-zinc-800">
                <span className="text-slate-500 dark:text-zinc-400">Jadwal Jemput:</span>
                <span className="font-semibold text-slate-800 dark:text-zinc-200">
                  {new Date(order.tanggalJemput).toLocaleDateString("id-ID", { dateStyle: "full" })} (Shift {order.waktuJemput})
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-zinc-800">
                <span className="text-slate-500 dark:text-zinc-400">Metode Bayar:</span>
                <span className="font-semibold uppercase text-slate-800 dark:text-zinc-200">
                  {order.metodeBayar === "cod" ? "Bayar di Tempat (COD)" : "Transfer / Online"}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500 dark:text-zinc-400">Total Biaya:</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                  Rp {(order.biayaFinal || order.estimasiBiaya).toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            {order.fotoSampah && (
              <div className="pt-2">
                <span className="text-xs font-semibold text-slate-600 dark:text-zinc-400 block mb-1">
                  Foto Sampah Sebelum Diangkut:
                </span>
                <img
                  src={order.fotoSampah}
                  alt="Foto Sampah"
                  className="w-full h-36 object-cover rounded-xl border border-slate-200 dark:border-zinc-700"
                />
              </div>
            )}

            {order.fotoSelesai && (
              <div className="pt-2">
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 block mb-1">
                  Foto Bukti Muatan Selesai Diangkut:
                </span>
                <img
                  src={order.fotoSelesai}
                  alt="Foto Selesai"
                  className="w-full h-36 object-cover rounded-xl border border-emerald-300 dark:border-emerald-700"
                />
              </div>
            )}
          </div>

          {/* Detail Lokasi & Pemesan */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              Lokasi & Kontak Pemesan
            </h3>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-slate-500 dark:text-zinc-400 block mb-0.5">Pemesan:</span>
                <span className="font-semibold text-slate-900 dark:text-zinc-100">
                  {order.namaPemesan} ({order.noTelepon})
                </span>
              </div>

              <div>
                <span className="text-slate-500 dark:text-zinc-400 block mb-0.5">Alamat Jemput:</span>
                <p className="font-medium text-slate-800 dark:text-zinc-200 leading-relaxed">
                  {order.alamat}
                </p>
                {order.kelurahan && (
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                    Kel. {order.kelurahan}, Kec. {order.kecamatan || "Kota Depok"}
                  </p>
                )}
                {order.patokan && (
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                    Patokan: {order.patokan}
                  </p>
                )}
              </div>

              {order.latitude && order.longitude && (
                <div className="pt-2">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${order.latitude},${order.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-700 dark:text-zinc-300 font-semibold text-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Buka Rute di Google Maps
                  </a>
                </div>
              )}
            </div>

            {/* Bantuan CS */}
            <div className="mt-4 p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700/80">
              <p className="text-xs font-semibold text-slate-800 dark:text-zinc-200 mb-1">
                Perlu Bantuan atau Penjadwalan Ulang?
              </p>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 mb-2">
                Tim operasional kami siap membantu koordinasi armada Anda melalui WhatsApp resmi.
              </p>
              <a
                href={`https://wa.me/6285353286062?text=Halo%20Admin%20UPS%20HERU,%20saya%20ingin%20menanyakan%20status%20order%20pickup%20nomor%20${encodeURIComponent(order.noOrder)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 w-full py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700"
              >
                <Phone className="w-3.5 h-3.5" />
                Hubungi Admin UPS HERU
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
