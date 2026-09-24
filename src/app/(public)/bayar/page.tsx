"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { formatRupiah, formatDate } from "@/lib/utils";
import {
  formatRupiahSkylite,
  formatTanggalIndo,
  formatTanggalWaktuIndo,
  BULAN_INDO,
  labelMetodePembayaran,
} from "@/lib/invoice-format";
import { DUITKU_METHODS, duitkuChannelLabel } from "@/lib/duitku-channels";
import AnimatedDumpTruck from "@/components/AnimatedDumpTruck";

type TagihanPublik = {
  id: number;
  noInvoice?: string;
  bulan: number;
  tahun: number;
  jumlah: number;
  denda?: number;
  total?: number;
  status: string;
  jatuhTempo: string;
};

type HasilCek = {
  pelanggan: { nama: string; kodePelanggan: string; alamat: string };
  tagihan: TagihanPublik[];
};

type MetodeBayar = { value: string; label: string; icon: string; imageUrl?: string };

const ICON_CHANNEL: Record<string, string> = {
  VC: "🏦", VA: "🏦", BT: "🏦", M1: "🏛️", CIMB: "🏛️", BNI: "🏛️",
  BRI: "🏛️", PERMATA: "🏛️", MANDIRI: "🏛️", QR: "📱", SP: "🛍️",
  OVO: "💜", DANA: "🔵", GOPAY: "🟢", LINK_AJA: "🟠", SA: "🕌",
  CREDIT_CARD: "💳",
};

function keMetodeBayar(pm: { paymentMethod: string; paymentName?: string; paymentImage?: string }): MetodeBayar {
  const kode = pm.paymentMethod;
  return {
    value: kode,
    label: pm.paymentName || duitkuChannelLabel(kode),
    icon: ICON_CHANNEL[kode] || "💳",
    imageUrl: pm.paymentImage,
  };
}

type DetailTagihan = {
  id: number;
  noInvoice: string;
  status: string;
  bulan: number;
  tahun: number;
  jumlah: number;
  denda: number;
  ppn: number;
  ppnRate: number;
  total: number;
  duitkuAktif: boolean;
  jatuhTempo: string;
  tanggalLunas?: string | null;
  pelanggan: {
    nama: string;
    noTelepon: string;
    kodePelanggan: string;
    alamat: string;
  };
  pembayaranLunas?: {
    metode: string;
    jumlah: number;
    tanggal: string;
  } | null;
};

const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const METODE_MANUAL = [
  { value: "transfer", label: "Transfer Bank Manual" },
  { value: "ewallet", label: "Dompet Digital (GoPay / OVO / DANA)" },
  { value: "qris", label: "Scan QRIS Nasional" },
  { value: "virtual_account", label: "Virtual Account (BCA / Mandiri / BRI)" },
];

function StatusBadge({ status }: { status: string }) {
  const isLunas = status === "lunas";
  const isTunggakan = status === "tunggakan";

  const cls = isLunas
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : isTunggakan
    ? "bg-rose-50 text-rose-700 border-rose-200"
    : "bg-amber-50 text-amber-700 border-amber-200";

  const label = isLunas ? "Lunas" : isTunggakan ? "Tunggakan" : "Belum Dibayar";

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full border ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isLunas ? "bg-emerald-500" : isTunggakan ? "bg-rose-500" : "bg-amber-500"}`} />
      {label}
    </span>
  );
}

export default function BayarPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
          <AnimatedDumpTruck size="md" theme="green" />
          <p className="font-bold text-xs uppercase tracking-wider text-slate-600">
            Memuat portal pembayaran...
          </p>
        </div>
      }
    >
      <BayarPortalContent />
    </Suspense>
  );
}

function BayarPortalContent() {
  const searchParams = useSearchParams();
  const invoiceParam = searchParams.get("invoice") || "";
  const merchantOrderId = searchParams.get("merchantOrderId") || "";
  const resultCode = searchParams.get("resultCode");
  const statusParam = searchParams.get("status");

  // === STATE PENCARIAN TAGIHAN ===
  const [kode, setKode] = useState("");
  const [mencari, setMencari] = useState(false);
  const [hasil, setHasil] = useState<HasilCek | null>(null);
  const [errorSearch, setErrorSearch] = useState("");

  // Upload bukti manual
  const [pilihTagihan, setPilihTagihan] = useState<number | null>(null);
  const [formManual, setFormManual] = useState({ metode: "transfer", catatan: "" });
  const [bukti, setBukti] = useState("");
  const [mengirim, setMengirim] = useState(false);
  const [suksesManual, setSuksesManual] = useState("");
  const [kirimError, setKirimError] = useState("");

  // === STATE CHECKOUT INVOICE (DUITKU) ===
  const isInvoiceMode = Boolean(invoiceParam || merchantOrderId);
  const [detail, setDetail] = useState<DetailTagihan | null>(null);
  const [errorInvoice, setErrorInvoice] = useState("");
  const [loadingInvoice, setLoadingInvoice] = useState(isInvoiceMode);
  const [pilihMetode, setPilihMetode] = useState("");
  const [bayarLoading, setBayarLoading] = useState(false);
  const [bayarError, setBayarError] = useState("");
  const [metodeList, setMetodeList] = useState<MetodeBayar[]>(DUITKU_METHODS);

  const [statusBatal, setStatusBatal] = useState(
    resultCode === "01" || resultCode === "02" || statusParam === "cancel" || statusParam === "failed"
  );
  const [statusSukses, setStatusSukses] = useState(
    resultCode === "00" || statusParam === "success"
  );

  // Load detail invoice jika ada di param
  const muatInvoiceDetail = useCallback(async () => {
    setLoadingInvoice(true);
    setErrorInvoice("");
    try {
      let url = "/api/publik/tagihan-detail";
      if (invoiceParam) {
        url += `?invoice=${encodeURIComponent(invoiceParam)}`;
      } else if (merchantOrderId) {
        url += `?merchantOrderId=${encodeURIComponent(merchantOrderId)}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        setErrorInvoice(data.error || "Tagihan invoice tidak ditemukan");
      } else {
        setDetail(data);
      }
    } catch {
      setErrorInvoice("Gagal menghubungi server untuk memuat invoice");
    } finally {
      setLoadingInvoice(false);
    }
  }, [invoiceParam, merchantOrderId]);

  useEffect(() => {
    if (isInvoiceMode) {
      muatInvoiceDetail();
    }
  }, [isInvoiceMode, muatInvoiceDetail]);

  // Muat daftar channel Duitku
  useEffect(() => {
    if (!detail) return;
    let batal = false;
    (async () => {
      try {
        const res = await fetch(`/api/publik/duitku/methods?amount=${detail.total}`);
        const data = await res.json();
        if (!batal && res.ok && data.enabled && Array.isArray(data.methods) && data.methods.length > 0) {
          setMetodeList(data.methods.map(keMetodeBayar));
        }
      } catch {
        // fallback
      }
    })();
    return () => {
      batal = true;
    };
  }, [detail]);

  // Cek tagihan by kode / WA / invoice input
  async function cekTagihan(e: React.FormEvent) {
    e.preventDefault();
    const query = kode.trim();
    if (!query) return;

    // Jika user mengetik invoice, alihkan langsung ke tampilan invoice
    if (query.toUpperCase().startsWith("INV")) {
      let invoiceUrl = query.toUpperCase();
      // Normalisasi jika user mengetik INV- menjadi INV/
      if (invoiceUrl.startsWith("INV-")) {
        invoiceUrl = "INV/" + invoiceUrl.slice(4);
      }
      window.location.href = `/bayar?invoice=${encodeURIComponent(invoiceUrl)}`;
      return;
    }

    setErrorSearch("");
    setHasil(null);
    setPilihTagihan(null);
    setMencari(true);

    try {
      const res = await fetch(`/api/publik/tagihan?kode=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (!res.ok) {
        setErrorSearch(data.error || "Data pelanggan tidak ditemukan. Pastikan nomor WhatsApp sudah benar.");
        setHasil(null);
      } else {
        setHasil(data);
      }
    } catch {
      setErrorSearch("Gagal terhubung ke server. Silakan periksa koneksi internet Anda.");
    } finally {
      setMencari(false);
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setKirimError("Ukuran file terlalu besar. Maksimal ukuran gambar bukti transfer adalah 2MB.");
      return;
    }
    setKirimError("");
    const reader = new FileReader();
    reader.onload = () => setBukti(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function kirimBuktiManual(e: React.FormEvent) {
    e.preventDefault();
    if (!hasil || !pilihTagihan) return;
    setKirimError("");
    setMengirim(true);
    try {
      const res = await fetch("/api/publik/bayar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kode: hasil.pelanggan.kodePelanggan,
          tagihanId: pilihTagihan,
          metode: formManual.metode,
          buktiBayar: bukti || undefined,
          catatan: formManual.catatan,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuksesManual(data.message);
        setHasil(null);
        setKode("");
        setPilihTagihan(null);
      } else {
        setKirimError(data.error || "Gagal mengirim bukti pembayaran.");
      }
    } catch {
      setKirimError("Terjadi kendala jaringan saat mengirim bukti pembayaran.");
    } finally {
      setMengirim(false);
    }
  }

  async function bayarOnlineDuitku() {
    if (!detail) return;
    if (!pilihMetode) {
      setBayarError("Metode pembayaran belum dipilih");
      return;
    }
    setBayarError("");
    setBayarLoading(true);
    try {
      const res = await fetch("/api/publik/duitku/transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kode: detail.pelanggan.kodePelanggan,
          tagihanId: detail.id,
          paymentMethod: pilihMetode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBayarError(data.error || "Gagal membuat sesi pembayaran online");
        return;
      }
      window.location.href = data.paymentUrl;
    } catch (err) {
      setBayarError(err instanceof Error ? err.message : "Gagal memulai pembayaran online");
    } finally {
      setBayarLoading(false);
    }
  }

  // =========================================================================
  // TAMPILAN 1: CHECKOUT INVOICE TERTENTU (Duitku / Link WA)
  // =========================================================================
  if (isInvoiceMode) {
    if (loadingInvoice || (!detail && !errorInvoice)) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
          <AnimatedDumpTruck size="lg" theme="green" />
          <p className="font-bold text-sm tracking-wider uppercase text-slate-700 animate-pulse">
            Memuat data invoice...
          </p>
        </div>
      );
    }

    if (errorInvoice || !detail) {
      return (
        <div className="max-w-xl mx-auto px-4 py-16">
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm text-center p-8 sm:p-10">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center text-2xl mx-auto mb-4">
              ⚠️
            </div>
            <h2 className="font-extrabold text-xl text-slate-900">Tagihan Tidak Ditemukan</h2>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed max-w-md mx-auto">
              {errorInvoice || "Data tagihan belum tersedia."}
            </p>
            <div className="mt-8 pt-6 border-t border-slate-100">
              <Link
                href="/bayar"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm shadow-sm transition-all"
              >
                ← Cek Tagihan via Kode / Nomor WA
              </Link>
            </div>
          </div>
        </div>
      );
    }

    const lunas = detail.status === "lunas";
    const namaPeriode = `${BULAN_INDO[detail.bulan - 1]} ${detail.tahun}`;
    const invoicePdfUrl = `/invoice-tagihan?invoice=${encodeURIComponent(detail.noInvoice)}`;

    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <Link href="/bayar" className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1">
            ← Cek Tagihan Lain
          </Link>
          <Link href={invoicePdfUrl} target="_blank" className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1">
            📄 Lihat Lembar Invoice
          </Link>
        </div>

        {/* Header Info */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Portal Pembayaran Online Resmi
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Konfirmasi Pembayaran
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm">
            Retribusi kebersihan terpadu UPS HERU Kota Depok
          </p>
        </div>

        {/* Banner Cancel */}
        {statusBatal && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start justify-between gap-4 text-xs">
            <div>
              <h4 className="font-bold">Sesi Transaksi Sebelumnya Dibatalkan / Berakhir</h4>
              <p className="mt-0.5">Tagihan Anda tetap aman. Silakan pilih kembali metode pembayaran di bawah untuk melanjutkan.</p>
            </div>
            <button onClick={() => setStatusBatal(false)} className="font-bold text-amber-700">✕</button>
          </div>
        )}

        {/* Banner Sukses Verifikasi */}
        {statusSukses && !lunas && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start justify-between gap-4 text-xs">
            <div>
              <h4 className="font-bold">Pembayaran Sedang Diverifikasi</h4>
              <p className="mt-0.5">Pembayaran Anda telah diterima oleh gateway dan sedang diverifikasi otomatis oleh sistem.</p>
            </div>
            <button onClick={() => setStatusSukses(false)} className="font-bold text-emerald-700">✕</button>
          </div>
        )}

        {/* Kartu Rincian Tagihan */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Nomor Invoice</p>
              <p className="font-mono font-bold text-sm text-slate-800">{detail.noInvoice}</p>
            </div>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${lunas ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
              {lunas ? "✓ Lunas" : "Menunggu Pembayaran"}
            </span>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-100 text-xs">
              <div>
                <p className="text-slate-400 font-medium">Pelanggan</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{detail.pelanggan.nama}</p>
                <p className="font-mono text-slate-500">ID: {detail.pelanggan.kodePelanggan}</p>
              </div>
              <div>
                <p className="text-slate-400 font-medium">Periode Retribusi</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{namaPeriode}</p>
                <p className="text-rose-600 font-semibold">Jatuh Tempo: {formatTanggalIndo(detail.jatuhTempo)}</p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Iuran Pokok</span>
                <span className="font-semibold">{formatRupiahSkylite(detail.jumlah)}</span>
              </div>
              {detail.ppnRate > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Pajak Daerah ({detail.ppnRate}%)</span>
                  <span className="font-semibold">{formatRupiahSkylite(detail.ppn)}</span>
                </div>
              )}
              {detail.denda > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Denda Keterlambatan</span>
                  <span className="font-semibold">+{formatRupiahSkylite(detail.denda)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-extrabold text-slate-900 pt-3 border-t border-slate-100">
                <span>Total Pembayaran</span>
                <span className="text-emerald-700">{formatRupiahSkylite(detail.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pilihan Metode Pembayaran jika belum lunas */}
        {!lunas ? (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Pilih Metode Pembayaran</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {metodeList.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setPilihMetode(m.value)}
                  className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition ${
                    pilihMetode === m.value
                      ? "border-emerald-600 bg-emerald-50/50 shadow-xs ring-2 ring-emerald-500/20"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  {m.imageUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={m.imageUrl} alt={m.label} className="w-12 h-auto shrink-0 object-contain" />
                  ) : (
                    <span className="text-xl shrink-0">{m.icon}</span>
                  )}
                  <span className="text-xs font-bold text-slate-800 truncate">{m.label}</span>
                </button>
              ))}
            </div>

            {bayarError && (
              <p className="text-xs text-rose-600 font-medium bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                {bayarError}
              </p>
            )}

            <button
              type="button"
              disabled={bayarLoading || !pilihMetode}
              onClick={bayarOnlineDuitku}
              className="w-full py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-sm shadow-sm transition active:scale-95 flex items-center justify-center gap-2"
            >
              {bayarLoading ? "Menghubungkan ke Gateway..." : `Bayar Sekarang (${formatRupiahSkylite(detail.total)})`}
            </button>
          </div>
        ) : (
          <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xl mx-auto">
              ✓
            </div>
            <h3 className="font-extrabold text-emerald-900 text-base">Tagihan Sudah Lunas</h3>
            <p className="text-xs text-emerald-800 max-w-sm mx-auto">
              Terima kasih telah membayar retribusi kebersihan tepat waktu demi Kota Depok yang bersih dan asri.
            </p>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // TAMPILAN 2: PENCARIAN TAGIHAN PUBLIK (Kode Pelanggan / No WA / Invoice)
  // =========================================================================
  return (
    <div className="py-6 sm:py-10 space-y-8 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
          <span>💳</span>
          <span>Portal Resmi Retribusi Sampah UPS HERU</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Cek & Bayar Tagihan Retribusi
        </h1>
        <p className="text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
          Masukkan <strong>Nomor WhatsApp</strong> Anda atau <strong>Nomor Invoice</strong> untuk melihat tagihan dan membayar secara online.
        </p>
      </div>

      {/* Box Pencarian */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm max-w-2xl mx-auto relative overflow-hidden">
        <form onSubmit={cekTagihan} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Nomor WhatsApp / No. Invoice
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="cth: 08123456789 atau INV/..."
                value={kode}
                onChange={(e) => setKode(e.target.value)}
                disabled={mencari}
                className="w-full pl-4 pr-32 py-3.5 rounded-2xl border border-slate-200 text-slate-900 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-xs disabled:opacity-60 disabled:bg-slate-50"
                required
              />
              <button
                type="submit"
                disabled={mencari || !kode.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 disabled:opacity-50"
              >
                {mencari ? "Memeriksa..." : "Periksa"}
              </button>
            </div>
          </div>
        </form>

        {mencari && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-10 flex flex-col items-center justify-center space-y-4 rounded-3xl animate-in fade-in duration-300">
            <AnimatedDumpTruck size="md" theme="green" />
            <p className="font-bold text-sm tracking-wider uppercase text-emerald-700 animate-pulse">
              Menunggu cek database...
            </p>
            <p className="text-xs text-slate-500">Menganalisa data pelanggan dan riwayat tagihan</p>
          </div>
        )}

        {suksesManual && (
          <div className="mt-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <span>✓</span>
            <span>{suksesManual}</span>
          </div>
        )}
      </div>

      {/* Pesan Error (Tidak Ditemukan) dengan UI Laporan Analisa */}
      {errorSearch && !mencari && (
        <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-rose-200 shadow-sm p-6 sm:p-8 animate-in slide-in-from-bottom-4 fade-in duration-300 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-rose-500"></div>
          <div className="flex flex-col sm:flex-row gap-5 items-start">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
              <span className="text-2xl">🔍</span>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-[10px] uppercase font-bold text-rose-500 tracking-wider mb-1">Hasil Analisa Pencarian</div>
                <h3 className="text-lg font-extrabold text-slate-900">Data Tidak Ditemukan</h3>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                {errorSearch}
              </p>
              <div className="bg-slate-50 p-4 rounded-xl text-xs text-slate-600 border border-slate-100 space-y-2">
                <p className="font-bold text-slate-700">Rekomendasi Tindakan:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Pastikan Anda memasukkan nomor WhatsApp yang benar (contoh: 08123456789).</li>
                  <li>Jika Anda pelanggan baru, pastikan pendaftaran Anda sudah diverifikasi oleh admin.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hasil Pencarian Tagihan */}
      {hasil && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Identitas Pelanggan</p>
              <h3 className="text-xl font-extrabold text-slate-900">{hasil.pelanggan.nama}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{hasil.pelanggan.alamat}</p>
            </div>
            <div className="text-left sm:text-right">
              <span className="inline-block px-3 py-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-mono font-bold text-slate-800">
                {hasil.pelanggan.kodePelanggan}
              </span>
            </div>
          </div>

          <div className="space-y-3.5">
            {hasil.tagihan.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-2">
                <p className="font-bold text-slate-900">Tidak Ada Tagihan Tertunggak</p>
                <p className="text-xs text-slate-500">Semua iuran retribusi sampah Anda sudah lunas. Terima kasih!</p>
              </div>
            ) : (
              hasil.tagihan.map((t) => (
                <div
                  key={t.id}
                  className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-slate-900">{BULAN[t.bulan - 1]} {t.tahun}</span>
                      <StatusBadge status={t.status} />
                    </div>
                    <p className="text-xs text-slate-500 font-medium">Jatuh Tempo: {formatDate(t.jatuhTempo)}</p>
                    {t.denda ? (
                      <p className="text-xs font-bold text-rose-600">+ Denda (2%): {formatRupiah(t.denda)}</p>
                    ) : null}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="text-left sm:text-right">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Total Tagihan</p>
                      <p className="text-xl font-extrabold text-slate-900">
                        {formatRupiah(t.total ?? (t.jumlah + (t.denda || 0)))}
                      </p>
                    </div>

                    {t.status !== "lunas" && (
                      <div className="flex items-center gap-2">
                        {t.noInvoice && (
                          <Link
                            href={`/bayar?invoice=${encodeURIComponent(t.noInvoice)}`}
                            className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-95 flex items-center gap-1.5"
                          >
                            <span>⚡</span>
                            <span>Bayar Instan</span>
                          </Link>
                        )}
                        <button
                          type="button"
                          onClick={() => setPilihTagihan(t.id)}
                          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition active:scale-95"
                        >
                          📤 Upload Bukti
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal Upload Bukti Manual */}
      {pilihTagihan && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl p-6 sm:p-8 max-w-lg w-full space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900">Konfirmasi Bukti Transfer Manual</h3>
              <button onClick={() => setPilihTagihan(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={kirimBuktiManual} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Metode Pembayaran</label>
                <select
                  value={formManual.metode}
                  onChange={(e) => setFormManual({ ...formManual, metode: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold bg-white"
                >
                  {METODE_MANUAL.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Unggah Struk / Screenshot Bukti</label>
                <input type="file" accept="image/*" onChange={handleFile} className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100" />
              </div>

              {bukti && (
                <div className="relative w-full h-36 rounded-xl overflow-hidden border border-slate-200">
                  <Image src={bukti} alt="Bukti transfer" fill className="object-cover" />
                </div>
              )}

              {kirimError && <p className="text-xs text-rose-600">{kirimError}</p>}

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setPilihTagihan(null)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-700">Batal</button>
                <button type="submit" disabled={mengirim} className="flex-1 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition">
                  {mengirim ? "Mengirim..." : "Kirim Bukti"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
