"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import QRCode from "qrcode";
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
import { PanduanCaraBayarQris } from "@/components/PanduanCaraBayarQris";
import { resolveTenantByHost } from "@/lib/tenant/config";
import { downloadQrisVoucherCard } from "@/lib/qris-card";

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
  pendingPayment?: {
    id: number;
    metode: string;
    createdAt: string;
    catatan?: string | null;
  } | null;
  activeGateway?: {
    id: number;
    metode: string;
    createdAt: string;
    orderId?: string | null;
  } | null;
  lastGatewayOrderId?: string | null;
};

type HasilCek = {
  pelanggan: {
    nama: string;
    kodePelanggan: string;
    alamat: string;
    status?: string;
    skemaBayar?: string;
    isKolektifAnggota?: boolean;
    isKolektifInduk?: boolean;
    namaGrupKolektif?: string | null;
    indukKolektif?: { nama: string; noTelepon?: string; kodePelanggan?: string } | null;
    lockPayment?: boolean;
    lockMessage?: string | null;
  };
  tagihan: TagihanPublik[];
};

type MetodeBayar = { value: string; label: string; sublabel?: string; icon: string; imageUrl?: string; totalFee?: string };

const ICON_CHANNEL: Record<string, string> = {
  VC: "🏦", VA: "🏦", BT: "🏦", M1: "🏛️", CIMB: "🏛️", BNI: "🏛️",
  BRI: "🏛️", PERMATA: "🏛️", MANDIRI: "🏛️", QR: "💳", SP: "💳",
  OVO: "💜", DANA: "🔵", GOPAY: "🟢", LINK_AJA: "🟠", SA: "🕌",
  CREDIT_CARD: "💳", SQ: "💳",
};

function keMetodeBayar(pm: { paymentMethod: string; paymentName?: string; paymentImage?: string; totalFee?: string }): MetodeBayar {
  const kode = pm.paymentMethod;
  const isQris = kode === "SP" || kode === "SQ" || kode === "QR";
  return {
    value: kode,
    label: isQris ? "QRIS / Cetak QRIS" : (pm.paymentName || duitkuChannelLabel(kode)),
    sublabel: isQris ? "BCA, Mandiri, BRI, BNI, DANA, GoPay, OVO, ShopeePay dll" : undefined,
    icon: isQris ? "💳" : (ICON_CHANNEL[kode] || "💳"),
    imageUrl: isQris ? "/qris.png" : pm.paymentImage,
    totalFee: pm.totalFee,
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
  isKolektifAnggota?: boolean;
  lockPayment?: boolean;
  kolektifInfo?: {
    namaKoordinator: string;
    namaGrup?: string | null;
    noTeleponKoordinator?: string | null;
  } | null;
  pelanggan: {
    nama: string;
    noTelepon?: string;
    kodePelanggan: string;
    alamat?: string;
    skemaBayar?: string;
    isKolektifAnggota?: boolean;
    lockPayment?: boolean;
    kolektifInfo?: {
      namaKoordinator: string;
      namaGrup?: string | null;
      noTeleponKoordinator?: string | null;
    } | null;
  };
  pembayaranLunas?: {
    metode: string;
    jumlah: number;
    tanggal: string;
  } | null;
  pembayaranPending?: {
    id: number;
    metode: string;
    jumlah: number;
    tanggal: string;
    catatan?: string | null;
  } | null;
  sesiGatewayAktif?: {
    id: number;
    metode: string;
    jumlah: number;
    tanggal: string;
    orderId?: string | null;
  } | null;
  lastGatewayOrderId?: string | null;
};

const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const METODE_MANUAL = [
  { value: "transfer", label: "Transfer Bank Manual" },
  { value: "tunai", label: "Titip Tunai ke Petugas Lapangan" },
];

function StatusBadge({ status, hasPending }: { status: string; hasPending?: boolean }) {
  if (hasPending) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full border bg-amber-50 text-amber-900 border-amber-300 shadow-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        ⏳ Menunggu Verifikasi Admin
      </span>
    );
  }

  const isLunas = status === "lunas";
  const isTunggakan = status === "tunggakan";

  const cls = isLunas
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : isTunggakan
    ? "bg-amber-50 text-amber-800 border-amber-200"
    : "bg-sky-50 text-sky-800 border-sky-200";

  const label = isLunas
    ? "✓ Sudah Lunas"
    : isTunggakan
    ? "⚠️ Belum Bayar (Bulan Lalu)"
    : "⏳ Belum Bayar (Bulan Ini)";

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full border ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isLunas ? "bg-emerald-500" : isTunggakan ? "bg-amber-500" : "bg-sky-500"}`} />
      {label}
    </span>
  );
}

export default function BayarPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
          <div className="relative flex flex-col items-center">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-28 bg-emerald-400/20 blur-2xl rounded-full animate-pulse"></div>
            <AnimatedDumpTruck size="xl" theme="green" />
          </div>
          <p className="font-bold text-xs uppercase tracking-wider text-slate-500 animate-pulse mt-2">
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const invoiceParam = searchParams.get("invoice") || "";
  const merchantOrderId = searchParams.get("merchantOrderId") || "";
  const resultCode = searchParams.get("resultCode");
  const statusParam = searchParams.get("status");
  const kodeParam = searchParams.get("kode") || searchParams.get("noWhatsapp") || searchParams.get("search") || "";

  // Forward ke halaman tiket Skylite yang ultra-responsif di mobile bila ada invoice / callback
  useEffect(() => {
    if (invoiceParam) {
      router.replace(`/bayar-tagihan?invoice=${encodeURIComponent(invoiceParam)}`);
    } else if (merchantOrderId) {
      const q = resultCode ? `&resultCode=${encodeURIComponent(resultCode)}` : "";
      router.replace(`/bayar-tagihan?merchantOrderId=${encodeURIComponent(merchantOrderId)}${q}`);
    }
  }, [invoiceParam, merchantOrderId, resultCode, router]);

  // === STATE PENCARIAN TAGIHAN ===
  const [kode, setKode] = useState(kodeParam);
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

  // === ON-PAGE QRIS & POLLING STATE ===
  const [onPageQris, setOnPageQris] = useState<{
    qrDataUrl: string;
    paymentUrl?: string;
    orderId: string;
    amount: number;
  } | null>(null);
  const [pollingStatus, setPollingStatus] = useState<string | null>(null);
  const [downloadingCard, setDownloadingCard] = useState(false);

  const handleDownloadCard = async () => {
    if (!onPageQris) return;
    setDownloadingCard(true);
    try {
      await downloadQrisVoucherCard({
        qrDataUrl: onPageQris.qrDataUrl,
        amount: onPageQris.amount,
        orderId: onPageQris.orderId,
        noInvoice: detail?.noInvoice || invoiceParam,
        namaPelanggan: detail?.pelanggan.nama,
        brandName: tenantInfo.brandName,
        city: tenantInfo.city,
      });
    } catch (err) {
      console.error("Gagal simpan gambar QRIS lengkap:", err);
      const a = document.createElement("a");
      a.href = onPageQris.qrDataUrl;
      a.download = `QRIS-Tagihan-${onPageQris.orderId}.png`;
      a.click();
    } finally {
      setDownloadingCard(false);
    }
  };

  const [tenantInfo, setTenantInfo] = useState<{ brandName: string; city: string; whatsapp: string }>({
    brandName: "UPS HERU",
    city: "Kota Depok",
    whatsapp: "6281400782617",
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const res = resolveTenantByHost(window.location.hostname);
      if (res.isValid && !res.isCore) {
        setTenantInfo({
          brandName: res.tenant.branding?.namaMitra || "UPS HERU",
          city: res.tenant.branding?.kota || "Kota Depok",
          whatsapp: res.tenant.branding?.whatsappKontak?.replace(/\D/g, "") || "6281400782617",
        });
      }
    }
  }, []);

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
          const list = data.methods.map(keMetodeBayar);
          setMetodeList(list);
          if (list.length > 0) {
            setPilihMetode(list[0].value);
          }
        }
      } catch {
        // fallback
      }
    })();
    return () => {
      batal = true;
    };
  }, [detail]);

  // Pastikan metode default terpilih jika belum dipilih
  useEffect(() => {
    if (metodeList.length > 0 && !pilihMetode) {
      setPilihMetode(metodeList[0].value);
    }
  }, [metodeList, pilihMetode]);

  // Lakukan pencarian data tagihan pelanggan
  const lakukanPencarian = useCallback(async (queryTarget: string) => {
    let query = queryTarget.trim();
    if (!query) return;

    // Normalisasi awalan nomor WhatsApp 08xx menjadi 628xx
    if (/^08\d+/.test(query)) {
      query = "628" + query.slice(2);
    }

    // Jika user mengetik invoice, alihkan langsung ke tampilan invoice
    if (query.toUpperCase().startsWith("INV")) {
      setMencari(true);

      let invoiceUrl = query.toUpperCase();
      // Normalisasi jika user mengetik INV- menjadi INV/
      if (invoiceUrl.startsWith("INV-")) {
        invoiceUrl = "INV/" + invoiceUrl.slice(4);
      }
      window.location.href = `/bayar-tagihan?invoice=${encodeURIComponent(invoiceUrl)}`;
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
  }, []);

  // Cek tagihan by kode / WA / invoice input form
  async function cekTagihan(e: React.FormEvent) {
    e.preventDefault();
    await lakukanPencarian(kode);
  }

  // Auto-search jika parameter ?kode= diberikan di URL
  useEffect(() => {
    if (kodeParam && !isInvoiceMode) {
      setKode(kodeParam);
      lakukanPencarian(kodeParam);
    }
  }, [kodeParam, isInvoiceMode, lakukanPencarian]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setKirimError("Ukuran file terlalu besar. Maksimal ukuran gambar bukti pembayaran adalah 2MB.");
      return;
    }
    setKirimError("");
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setMengirim(true);
      try {
        setBukti(base64);
      } catch {
        setKirimError("Gagal mengunggah foto");
      }
      setMengirim(false);
    };
    reader.readAsDataURL(file);
  }

  const segarkanTagihan = useCallback(async (queryTarget: string) => {
    try {
      const res = await fetch(`/api/publik/tagihan?kode=${encodeURIComponent(queryTarget)}`);
      const data = await res.json();
      if (res.ok) {
        setHasil(data);
      }
    } catch {
      // fallback
    }
  }, []);

  // === STATE & FUNGSI SINKRONISASI PAYMENT GATEWAY (DUITKU) ===
  const [checkingGateway, setCheckingGateway] = useState(false);
  const [gatewayCheckResult, setGatewayCheckResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const checkGatewayStatus = useCallback(
    async (orderIdTarget?: string, invoiceTarget?: string) => {
      const oId =
        orderIdTarget ||
        merchantOrderId ||
        detail?.sesiGatewayAktif?.orderId ||
        detail?.lastGatewayOrderId;
      const inv = invoiceTarget || invoiceParam || detail?.noInvoice;

      if (!oId && !inv) return;

      setCheckingGateway(true);
      setGatewayCheckResult(null);

      try {
        let url = "/api/publik/duitku/status?";
        if (oId) {
          url += `orderId=${encodeURIComponent(oId)}`;
        } else if (inv) {
          url += `invoice=${encodeURIComponent(inv)}`;
        }

        const res = await fetch(url);
        const data = await res.json();

        if (!res.ok) {
          setGatewayCheckResult({
            success: false,
            message: data.error || "Belum ada catatan transaksi di payment gateway.",
          });
          return;
        }

        if (data.tagihanStatus === "lunas" || data.duitkuStatus?.statusCode === "00") {
          setGatewayCheckResult({
            success: true,
            message: "Pembayaran terverifikasi BERHASIL! Status tagihan Anda otomatis diperbarui menjadi LUNAS.",
          });
          setStatusSukses(true);
          if (isInvoiceMode) {
            await muatInvoiceDetail();
          }
          const kodeTarget = hasil?.pelanggan.kodePelanggan || detail?.pelanggan.kodePelanggan;
          if (kodeTarget) {
            await segarkanTagihan(kodeTarget);
          }
        } else if (data.duitkuStatus?.statusCode === "01") {
          setGatewayCheckResult({
            success: false,
            message: `Status Gateway: ${data.duitkuStatus.statusMessage || "Menunggu Pembayaran"}. Jika Anda baru saja transfer atau scan QRIS, silakan tunggu 1-2 menit lalu klik tombol cek kembali.`,
          });
        } else if (data.duitkuStatus?.statusCode === "02") {
          setGatewayCheckResult({
            success: false,
            message: "Transaksi di gateway telah dibatalkan atau kedaluwarsa. Silakan cetak QRIS baru.",
          });
          setStatusBatal(true);
        } else {
          setGatewayCheckResult({
            success: false,
            message: `Status Gateway: ${data.duitkuStatus?.statusMessage || data.tagihanStatus || "Diproses"}`,
          });
        }
      } catch {
        setGatewayCheckResult({
          success: false,
          message: "Gagal terhubung ke gateway pembayaran. Periksa koneksi internet Anda.",
        });
      } finally {
        setCheckingGateway(false);
      }
    },
    [detail, invoiceParam, isInvoiceMode, merchantOrderId, muatInvoiceDetail, hasil, segarkanTagihan]
  );

  // Auto-check status ke Duitku secara live saat kembali dari Duitku dengan merchantOrderId
  useEffect(() => {
    if (merchantOrderId) {
      checkGatewayStatus(merchantOrderId);
    }
  }, [merchantOrderId, checkGatewayStatus]);

  async function kirimBuktiManual(e: React.FormEvent) {
    e.preventDefault();
    const kodeTarget = hasil?.pelanggan.kodePelanggan || detail?.pelanggan.kodePelanggan;
    if (!kodeTarget || !pilihTagihan) return;
    setKirimError("");
    setMengirim(true);
    try {
      const res = await fetch("/api/publik/bayar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kode: kodeTarget,
          tagihanId: pilihTagihan,
          metode: formManual.metode,
          buktiBayar: bukti || undefined,
          catatan: formManual.catatan,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuksesManual(data.message || "Bukti pembayaran diterima. Status pembayaran menunggu verifikasi admin.");
        setPilihTagihan(null);
        setBukti("");
        setFormManual({ metode: "transfer", catatan: "" });
        if (isInvoiceMode) {
          muatInvoiceDetail();
        } else if (kodeTarget) {
          await segarkanTagihan(kodeTarget);
        }
      } else {
        setKirimError(data.error || "Gagal mengirim bukti pembayaran.");
      }
    } catch {
      setKirimError("Terjadi kendala jaringan saat mengirim bukti pembayaran.");
    } finally {
      setMengirim(false);
    }
  }

  // Auto-polling status transaksi saat QRIS on-page terbuka
  useEffect(() => {
    if (!onPageQris?.orderId || pollingStatus === "success") return;

    let pollCount = 0;
    const maxPoll = 40; // 40 x 3s = 2 menit
    const interval = setInterval(async () => {
      pollCount++;
      if (pollCount > maxPoll) {
        clearInterval(interval);
        return;
      }
      try {
        const res = await fetch(`/api/publik/duitku/status?orderId=${encodeURIComponent(onPageQris.orderId)}`);
        const st = await res.json();
        if (st && (st.statusCode === "00" || st.status === "SUCCESS")) {
          clearInterval(interval);
          setPollingStatus("success");
          setStatusSukses(true);
          setOnPageQris(null);
          if (isInvoiceMode) {
            muatInvoiceDetail();
          } else if (kode) {
            segarkanTagihan(kode);
          }
        }
      } catch (err) {
        console.warn("Polling status error:", err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [onPageQris, pollingStatus, isInvoiceMode, kode, muatInvoiceDetail, segarkanTagihan]);

  async function bayarOnlineDuitku(forceNew = false) {
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
          forceNew,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBayarError(data.error || "Gagal membuat sesi pembayaran online");
        return;
      }

      // Jika channel QRIS dan mengembalikan qrString, render on-page
      if (data.qrString) {
        try {
          const qrDataUrl = await QRCode.toDataURL(data.qrString, {
            width: 320,
            margin: 2,
            color: { dark: "#0f172a", light: "#ffffff" },
          });
          setOnPageQris({
            qrDataUrl,
            paymentUrl: data.paymentUrl,
            orderId: data.orderId,
            amount: detail.total,
          });
          setPollingStatus("pending");
          return;
        } catch (qrErr) {
          console.error("Gagal generate QR Data URL, redirecting:", qrErr);
        }
      }

      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      }
    } catch (err) {
      setBayarError(err instanceof Error ? err.message : "Gagal memulai pembayaran online");
    } finally {
      setBayarLoading(false);
    }
  }

  const renderModalQris = () => {
    if (!onPageQris) return null;
    return (
      <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl p-6 sm:p-8 max-w-sm w-full space-y-5 text-center">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-zinc-100">Scan QRIS Pembayaran</h3>
            </div>
            <button
              type="button"
              onClick={() => setOnPageQris(null)}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200 flex items-center justify-center text-sm font-bold"
            >
              ✕
            </button>
          </div>

          <div className="bg-white p-3 rounded-2xl border-2 border-slate-200 dark:border-zinc-700 shadow-inner inline-block mx-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={onPageQris.qrDataUrl}
              alt="QRIS Tagihan UPS HERU"
              className="w-64 h-64 mx-auto object-contain"
            />
          </div>

          <div className="space-y-1">
            <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">Total Pembayaran</p>
            <p className="text-2xl font-black text-emerald-800 dark:text-emerald-400">
              {formatRupiah(onPageQris.amount)}
            </p>
            <p className="text-[11px] text-slate-400 font-mono">Order #{onPageQris.orderId}</p>
          </div>

          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl text-left space-y-1">
            <p className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
              <span className="animate-spin text-sm">⏳</span>
              <span>Menunggu Pembayaran Warga...</span>
            </p>
            <p className="text-[11px] text-amber-800 dark:text-amber-400/90 leading-tight">
              Jika pakai 1 HP: simpan gambar QRIS di bawah, lalu buka aplikasi e-wallet / m-Banking Anda dan pilih <em>Upload QR dari Galeri</em>. Halaman ini otomatis mendeteksi ketika pembayaran lunas.
            </p>
          </div>

          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={handleDownloadCard}
              disabled={downloadingCard}
              className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white font-bold text-xs rounded-xl transition shadow-md flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
            >
              <span>{downloadingCard ? "Menyimpan Gambar..." : "📥 Simpan Gambar QRIS ke Galeri"}</span>
            </button>
            {onPageQris.paymentUrl && (
              <a
                href={onPageQris.paymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <span>Buka Portal Duitku ↗</span>
              </a>
            )}
            <button
              type="button"
              onClick={() => setOnPageQris(null)}
              className="w-full py-2 text-slate-500 hover:text-slate-700 dark:text-zinc-400 text-xs font-semibold"
            >
              Tutup QRIS
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderModalUpload = () => {
    if (!pilihTagihan) return null;
    const isTunai = formManual.metode === "tunai";
    const tagihanTarget = hasil?.tagihan.find((t) => t.id === pilihTagihan);
    const sudahPending = Boolean(tagihanTarget?.pendingPayment || (detail?.id === pilihTagihan && detail?.pembayaranPending));

    if (sudahPending) {
      return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl p-6 sm:p-8 max-w-md w-full space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center text-2xl mx-auto shadow-sm">
              ⏳
            </div>
            <h3 className="text-base font-extrabold text-slate-900">Pembayaran Sedang Diverifikasi</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Bukti pembayaran untuk tagihan ini sudah dikirim sebelumnya dan sedang dalam proses verifikasi oleh admin. Anda tidak perlu mengirim ulang.
            </p>
            <button
              type="button"
              onClick={() => {
                setPilihTagihan(null);
                setKirimError("");
              }}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition"
            >
              Tutup
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl p-6 sm:p-8 max-w-lg w-full space-y-5 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Konfirmasi Pembayaran Manual</h3>
              <p className="text-xs text-slate-500 mt-0.5">Bagi Anda yang sudah melakukan transfer manual atau titip tunai</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setPilihTagihan(null);
                setKirimError("");
              }}
              aria-label="Tutup dialog konfirmasi pembayaran"
              className="text-slate-400 hover:text-slate-600 font-bold p-1.5 rounded-lg hover:bg-slate-100 text-lg leading-none transition-colors"
            >
              <span aria-hidden="true">✕</span>
            </button>
          </div>

          <div className="p-3.5 bg-emerald-50 border border-emerald-200/80 rounded-2xl text-xs text-emerald-900 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-emerald-950">
              <span>⚡</span>
              <span>Disarankan: Bayar via QRIS (Langsung Lunas Otomatis)</span>
            </div>
            <p className="text-xs text-emerald-800 leading-relaxed">
              Agar tidak perlu antri verifikasi admin, kami sangat menyarankan memakai tombol hijau <strong>&quot;Bayar via QRIS / Bank&quot;</strong>. Cukup scan dari m-banking apa saja atau e-wallet (BCA, Mandiri, BRI, DANA, GoPay), tagihan Anda langsung otomatis lunas seketika!
            </p>
          </div>

          <p className="text-xs text-slate-500 mb-1">Kolom bertanda <span className="text-rose-500 font-bold">*</span> wajib diisi.</p>
          <form onSubmit={kirimBuktiManual} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Pilihan Cara Pembayaran yang Dilakukan</label>
              <select
                value={formManual.metode}
                onChange={(e) => setFormManual({ ...formManual, metode: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                {METODE_MANUAL.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            {isTunai && (
              <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-2xl text-xs text-amber-900 leading-relaxed flex items-start gap-2.5">
                <span className="text-base shrink-0">💵</span>
                <div>
                  <span className="font-bold">Info Titip Tunai ke Petugas Lapangan:</span>
                  <p className="mt-0.5 text-amber-800">
                    Uang diserahkan langsung ke petugas armada mobil sampah. Unggah foto tanda terima / kwitansi (jika ada) dan tuliskan nama petugas penerima di bawah.
                  </p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isTunai ? "Unggah Foto Kwitansi / Bukti Tanda Terima (Opsional)" : "Unggah Struk / Screenshot Bukti Transfer"}
                {!isTunai && <span className="text-rose-500 ml-0.5">*</span>}
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFile}
                aria-required={!isTunai}
                className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
              />
              <p className="text-xs text-slate-500 mt-1">Maksimal ukuran file: 2MB (format JPG, PNG, WEBP)</p>
            </div>

            {bukti && (
              <div className="relative w-full h-40 rounded-xl overflow-hidden border border-slate-200 shadow-inner">
                <Image
                  src={bukti}
                  alt={isTunai ? "Bukti tanda terima tunai" : "Bukti transfer"}
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isTunai ? "Nama Petugas Armada Penerima (Opsional)" : "Nama Pemilik Rekening Pengirim (Opsional)"}
              </label>
              <input
                type="text"
                value={formManual.catatan}
                onChange={(e) => setFormManual({ ...formManual, catatan: e.target.value })}
                placeholder={isTunai ? "Contoh: Titip ke Petugas Heru / Supir Armada" : "Contoh: Rekening a.n. Evi Susanti"}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder:text-slate-400"
              />
            </div>

            {kirimError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                {kirimError}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setPilihTagihan(null);
                  setKirimError("");
                }}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={mengirim || (!isTunai && !bukti)}
                className="flex-1 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-95"
              >
                {mengirim ? "Mengirim..." : isTunai ? "Konfirmasi Titip Tunai" : "Kirim Bukti Transfer"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // =========================================================================
  // TAMPILAN 1: CHECKOUT INVOICE TERTENTU (Duitku / Link WA)
  // =========================================================================
  if (isInvoiceMode) {
    if (loadingInvoice || (!detail && !errorInvoice)) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6">
          <style>{`
            @keyframes roadDrive {
              0% { background-position: 100px 0; }
              100% { background-position: -100px 0; }
            }
            .animated-road {
              background-image: linear-gradient(90deg, transparent 0%, transparent 30%, #cbd5e1 30%, #cbd5e1 70%, transparent 70%, transparent 100%);
              background-size: 40px 100%;
              animation: roadDrive 0.8s linear infinite;
            }
          `}</style>

          <div className="relative mb-6 mt-2 flex flex-col items-center">
            {/* Glowing Aura for Truck */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-36 bg-emerald-400/20 blur-3xl rounded-full animate-pulse"></div>
            
            <div className="relative z-10 drop-shadow-2xl">
              <AnimatedDumpTruck size="2xl" theme="green" />
            </div>
            
            {/* Animated Road Lines */}
            <div className="w-64 sm:w-72 h-1 bg-slate-200 rounded-full mt-2.5 overflow-hidden relative shadow-inner">
              <div className="absolute inset-0 animated-road opacity-90"></div>
            </div>
          </div>
          
          <div className="flex flex-col items-center gap-2">
            <h3 className="font-display font-extrabold text-lg sm:text-xl text-slate-800 tracking-tight text-center">
              Mengangkut Dokumen Tagihan...
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 font-medium text-center">
              Armada WastePay sedang mengonfirmasi data transaksi Anda
            </p>
          </div>
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
        {suksesManual && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <span className="font-bold text-base">✓</span>
            <span className="font-medium">{suksesManual}</span>
          </div>
        )}
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
            Retribusi kebersihan terpadu {tenantInfo.brandName} {tenantInfo.city}
          </p>
        </div>

        {/* Banner Cancel */}
        {statusBatal && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start justify-between gap-4 text-xs">
            <div>
              <h4 className="font-bold">Sesi Transaksi Sebelumnya Dibatalkan / Berakhir</h4>
              <p className="mt-0.5">Tagihan Anda tetap aman. Silakan pilih kembali metode pembayaran di bawah untuk melanjutkan.</p>
            </div>
            <button onClick={() => setStatusBatal(false)} aria-label="Tutup peringatan pembayaran" className="font-bold text-amber-700 p-1 rounded hover:bg-amber-100 transition-colors"><span aria-hidden="true">✕</span></button>
          </div>
        )}

        {/* Banner Sukses Verifikasi */}
        {statusSukses && !lunas && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start justify-between gap-4 text-xs">
            <div className="space-y-1">
              <h4 className="font-bold flex items-center gap-1.5">
                <span className={checkingGateway ? "animate-spin" : ""}>🔄</span>
                <span>Pembayaran Sedang Diverifikasi Gateway</span>
              </h4>
              <p className="mt-0.5">
                {checkingGateway
                  ? "Sedang memverifikasi status pembayaran langsung ke gateway Duitku..."
                  : "Pembayaran Anda sedang disinkronkan otomatis ke sistem WastePay."}
              </p>
              {!checkingGateway && (
                <button
                  type="button"
                  onClick={() => checkGatewayStatus()}
                  className="mt-1.5 px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg text-xs transition inline-flex items-center gap-1"
                >
                  <span>Cek Status Sekarang</span>
                  <span>&rarr;</span>
                </button>
              )}
            </div>
            <button onClick={() => setStatusSukses(false)} aria-label="Tutup notifikasi pembayaran" className="font-bold text-emerald-700 p-1 rounded hover:bg-emerald-100 transition-colors"><span aria-hidden="true">✕</span></button>
          </div>
        )}

        {/* Box Notifikasi Hasil Cek Gateway */}
        {gatewayCheckResult && (
          <div
            className={`p-4 rounded-2xl text-xs flex items-start justify-between gap-3 animate-in fade-in ${
              gatewayCheckResult.success
                ? "bg-emerald-50 border border-emerald-200 text-emerald-900"
                : "bg-sky-50 border border-sky-200 text-sky-900"
            }`}
          >
            <div className="flex items-start gap-2.5">
              <span className="text-base shrink-0">{gatewayCheckResult.success ? "✓" : "ℹ️"}</span>
              <div className="space-y-0.5">
                <h4 className="font-bold">
                  {gatewayCheckResult.success ? "Pembayaran Terverifikasi LUNAS" : "Status Gateway Terkini"}
                </h4>
                <p className="leading-relaxed">{gatewayCheckResult.message}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setGatewayCheckResult(null)}
              className="font-bold text-slate-400 hover:text-slate-600 p-1 text-sm leading-none"
            >
              ✕
            </button>
          </div>
        )}

        {/* Kartu Rincian Tagihan */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Nomor Invoice</p>
              <p className="font-mono font-bold text-sm text-slate-800">{detail.noInvoice}</p>
            </div>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${
              lunas
                ? "bg-emerald-100 text-emerald-800"
                : detail.pembayaranPending
                ? "bg-amber-100 text-amber-900 border border-amber-300"
                : "bg-amber-100 text-amber-800"
            }`}>
              {lunas ? "✓ Lunas" : detail.pembayaranPending ? "⏳ Menunggu Verifikasi Admin" : "Menunggu Pembayaran"}
            </span>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-100 text-xs">
              <div>
                <p className="text-slate-500 font-medium">Pelanggan</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{detail.pelanggan.nama}</p>
                <p className="font-mono text-slate-600">ID: {detail.pelanggan.kodePelanggan}</p>
              </div>
              <div>
                <p className="text-slate-500 font-medium">Periode Retribusi</p>
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
          detail.pembayaranPending ? (
            <div className="space-y-6">
              <div className="bg-amber-50/70 border-2 border-amber-200/90 rounded-3xl p-6 sm:p-7 space-y-4 shadow-sm animate-in fade-in">
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center text-xl shrink-0 shadow-sm">
                    ⏳
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-md inline-block">
                      Status Transaksi
                    </span>
                    <h3 className="font-extrabold text-amber-950 text-base sm:text-lg">
                      Pembayaran Sedang Dalam Proses Verifikasi Admin
                    </h3>
                    <p className="text-xs text-amber-900/85 leading-relaxed">
                      Konfirmasi pembayaran Anda via{" "}
                      <strong>
                        {detail.pembayaranPending.metode === "tunai" ? "Titip Tunai ke Petugas Lapangan" : "Transfer Bank Manual"}
                      </strong>{" "}
                      telah berhasil diterima oleh sistem pada{" "}
                      <strong>{formatTanggalIndo(detail.pembayaranPending.tanggal)}</strong>.
                    </p>
                  </div>
                </div>

                <div className="bg-white/90 rounded-2xl p-4 border border-amber-200/70 text-xs text-slate-700 space-y-2 shadow-sm">
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <span>🛡️</span>
                    <span>Sinkronisasi Pembayaran Aman (Tidak Perlu Kirim Ulang):</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Petugas administrasi kasir kami sedang mencocokkan mutasi rekening bank / tanda terima fisik dari armada penjemput. Status invoice ini akan otomatis berubah menjadi <strong>LUNAS</strong> setelah diverifikasi. Anda tidak perlu mengunggah ulang bukti pembayaran.
                  </p>
                  {detail.pembayaranPending.catatan && (
                    <div className="pt-2 border-t border-slate-100 text-xs text-slate-600">
                      <span className="font-semibold text-slate-700">Catatan Pengirim:</span> {detail.pembayaranPending.catatan}
                    </div>
                  )}
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <span className="text-amber-800 text-center sm:text-left">Butuh percepatan verifikasi atau konfirmasi darurat?</span>
                  <a
                    href={`https://wa.me/${tenantInfo.whatsapp}?text=${encodeURIComponent(
                      `Halo Admin ${tenantInfo.brandName}, saya sudah konfirmasi pembayaran untuk invoice ${detail.noInvoice} a.n ${detail.pelanggan.nama}. Mohon bantuannya untuk verifikasi.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl transition shadow-sm flex items-center justify-center gap-1.5 w-full sm:w-auto"
                  >
                    <span>💬 Chat Petugas Verifikasi</span>
                  </a>
                </div>
              </div>

              {/* Panduan Cara Pembayaran QRIS tetap bisa dilihat sebagai referensi */}
              <PanduanCaraBayarQris defaultOpen={false} />
            </div>
          ) : (detail.isKolektifAnggota || detail.lockPayment || detail.pelanggan?.isKolektifAnggota || detail.pelanggan?.lockPayment) ? (
            <div className="bg-white rounded-3xl border border-purple-200 shadow-sm p-8 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-purple-100 border border-purple-200 text-purple-700 flex items-center justify-center text-3xl">
                🛡️
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-extrabold text-slate-900">
                  Pembayaran Dikelola Kolektif Satu Pintu
                </h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                  Tagihan retribusi sampah untuk alamat ini dibayarkan secara kolektif terpadu melalui{" "}
                  <strong>
                    {detail.kolektifInfo?.namaKoordinator || detail.pelanggan.kolektifInfo?.namaKoordinator || "Koordinator Lingkungan"}
                  </strong>
                  {detail.kolektifInfo?.namaGrup || detail.pelanggan.kolektifInfo?.namaGrup
                    ? ` (${detail.kolektifInfo?.namaGrup || detail.pelanggan.kolektifInfo?.namaGrup})`
                    : ""}.
                </p>
                <div className="p-3 bg-purple-50/80 rounded-2xl border border-purple-100 max-w-sm mx-auto text-xs text-purple-900 font-medium mt-3">
                  ⚠️ Pembayaran mandiri online dinonaktifkan untuk mencegah terjadinya pembayaran ganda (double bayar).
                </div>
                {(detail.kolektifInfo?.noTeleponKoordinator || detail.pelanggan.kolektifInfo?.noTeleponKoordinator) && (
                  <p className="text-xs text-slate-500 pt-2">
                    Kontak Koordinator:{" "}
                    <span className="font-mono font-bold text-slate-800">
                      {detail.kolektifInfo?.noTeleponKoordinator || detail.pelanggan.kolektifInfo?.noTeleponKoordinator}
                    </span>
                  </p>
                )}
              </div>
            </div>
          ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm">Metode Pembayaran Resmi</h3>
                <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  ⚡ Verifikasi Otomatis
                </span>
              </div>

              <div className="space-y-2">
                {metodeList.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setPilihMetode(m.value)}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border text-left transition ${
                      pilihMetode === m.value
                        ? "border-emerald-600 bg-emerald-50/60 shadow-sm ring-2 ring-emerald-500/20"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-3.5 overflow-hidden">
                      {m.imageUrl ? (
                        <div className="w-14 h-9 px-1.5 py-1 bg-white rounded-xl border border-slate-200/90 shadow-sm flex items-center justify-center shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={m.imageUrl} alt={m.label} className="w-full h-full object-contain" />
                        </div>
                      ) : (
                        <span className="text-2xl shrink-0">{m.icon}</span>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-extrabold text-slate-900">{m.label}</span>
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            Rekomendasi
                          </span>
                        </div>
                        <p className="text-xs font-medium text-slate-600 mt-0.5">
                          {m.sublabel || "Scan pakai m-Banking (BCA, Mandiri, BRI, BNI) atau E-Wallet (DANA, GoPay, OVO, ShopeePay)"}
                        </p>
                      </div>
                    </div>
                    {m.totalFee && (
                      <div className="shrink-0 text-right ml-2">
                        <span className="text-xs font-bold text-slate-700 block">
                          {m.totalFee === "0" ? "Gratis" : `+Rp ${parseInt(m.totalFee).toLocaleString("id-ID")}`}
                        </span>
                        <span className="text-xs text-slate-500 block">biaya layanan web</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {bayarError && (
                <p className="text-xs text-rose-600 font-medium bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                  {bayarError}
                </p>
              )}

              {detail.sesiGatewayAktif && (
                <div className="p-3.5 bg-sky-50 border border-sky-200/90 rounded-2xl text-xs text-sky-950 flex items-start gap-2.5">
                  <span className="text-base shrink-0">ℹ️</span>
                  <div className="space-y-0.5">
                    <p className="font-bold">Sesi QRIS Sebelumnya Belum Diselesaikan</p>
                    <p className="text-sky-800 text-xs leading-relaxed">
                      Jika Anda lupa kode atau barcode lama hilang/rusak, silakan klik <strong>Cetak QRIS Baru</strong> di bawah. Sesi lama otomatis dibatalkan dan tidak menumpuk.
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <button
                  type="button"
                  disabled={bayarLoading || !pilihMetode}
                  onClick={() => bayarOnlineDuitku(false)}
                  className="w-full py-3.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-sm shadow-sm transition active:scale-95 flex flex-col items-center justify-center gap-0.5"
                >
                  {(() => {
                    if (bayarLoading) return <span>Menghubungkan ke Gateway...</span>;
                    const selected = metodeList.find((m) => m.value === pilihMetode);
                    const fee = selected?.totalFee ? parseInt(selected.totalFee) || 0 : 0;
                    const grandTotal = detail.total + fee;
                    return (
                      <>
                        <span>{detail.sesiGatewayAktif ? "Buka / Lanjutkan Pembayaran" : "Bayar Sekarang"} ({formatRupiahSkylite(grandTotal)})</span>
                        {fee > 0 && <span className="text-xs font-normal opacity-80">termasuk biaya layanan sistem web Rp {fee.toLocaleString("id-ID")}</span>}
                      </>
                    );
                  })()}
                </button>

                {detail.sesiGatewayAktif && (
                  <button
                    type="button"
                    disabled={bayarLoading || !pilihMetode}
                    onClick={() => bayarOnlineDuitku(true)}
                    className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition active:scale-95 flex items-center justify-center gap-1.5 border border-slate-200"
                  >
                    <span>🔄</span>
                    <span>Cetak QRIS Baru (Ganti Barcode Lama)</span>
                  </button>
                )}

                {/* Tombol sinkronisasi langsung ke Duitku jika ada sesi transaksi */}
                {(detail.sesiGatewayAktif?.orderId || detail.lastGatewayOrderId || merchantOrderId) && (
                  <button
                    type="button"
                    disabled={checkingGateway}
                    onClick={() => checkGatewayStatus()}
                    className="w-full py-2.5 rounded-2xl bg-sky-50 hover:bg-sky-100 disabled:opacity-60 text-sky-800 font-bold text-xs transition active:scale-95 flex items-center justify-center gap-1.5 border border-sky-200/80 shadow-sm"
                  >
                    <span className={checkingGateway ? "animate-spin" : ""}>🔄</span>
                    <span>{checkingGateway ? "Memeriksa Status ke Gateway..." : "Sudah Bayar? Cek Status Gateway Sekarang"}</span>
                  </button>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => {
                    setPilihTagihan(detail.id);
                    setBukti("");
                    setKirimError("");
                  }}
                  className="text-xs font-semibold text-slate-600 hover:text-emerald-700 transition flex items-center gap-1.5 py-1 px-3 rounded-xl hover:bg-slate-50"
                >
                  <span>📤</span>
                  <span>Sudah transfer bank manual sebelumnya? Konfirmasi bukti di sini</span>
                </button>
              </div>
            </div>

            {/* Panduan Cara Pembayaran QRIS (How to Pay dari Duitku) */}
            <PanduanCaraBayarQris defaultOpen={true} />
          </div>
          )
        ) : (
          <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-emerald-700 text-white flex items-center justify-center text-xl mx-auto">
              ✓
            </div>
            <h3 className="font-extrabold text-emerald-900 text-base">Tagihan Sudah Lunas</h3>
            <p className="text-xs text-emerald-800 max-w-sm mx-auto">
              Terima kasih telah membayar retribusi kebersihan tepat waktu demi {tenantInfo.city} yang bersih dan asri.
            </p>
          </div>
        )}

        {renderModalUpload()}
        {renderModalQris()}
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

      {/* Box Pencarian & Animasi Truk Loading */}
      <div className={`bg-white rounded-3xl border border-slate-200/80 shadow-sm max-w-2xl mx-auto overflow-hidden transition-all duration-300 relative ${
        mencari
          ? "min-h-[420px] p-6 sm:p-10 flex flex-col items-center justify-center bg-gradient-to-b from-white via-slate-50/60 to-emerald-50/20"
          : "p-6 sm:p-8"
      }`}>
        {mencari ? (
          <div className="w-full flex flex-col items-center justify-center py-4 animate-in fade-in zoom-in-95 duration-300">
            <style>{`
              @keyframes roadDrive {
                0% { background-position: 120px 0; }
                100% { background-position: -120px 0; }
              }
              .animated-road {
                background-image: linear-gradient(90deg, transparent 0%, transparent 25%, #cbd5e1 25%, #cbd5e1 75%, transparent 75%, transparent 100%);
                background-size: 40px 100%;
                animation: roadDrive 0.7s linear infinite;
              }
            `}</style>
            
            {/* Top scanning bar */}
            <div className="absolute top-0 left-0 w-full h-1 bg-slate-100 overflow-hidden">
              <div className="h-full w-full bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-80 animate-pulse"></div>
            </div>

            {/* TRUCK CONTAINER */}
            <div className="relative mb-6 mt-2 flex flex-col items-center">
              {/* Glowing Aura for Truck */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-36 bg-emerald-400/20 blur-3xl rounded-full animate-pulse"></div>
              
              {/* TRUCK - size="2xl" */}
              <div className="relative z-10 drop-shadow-2xl">
                <AnimatedDumpTruck size="2xl" theme="green" />
              </div>
              
              {/* Animated Road Lines */}
              <div className="w-64 sm:w-72 h-1 bg-slate-200 rounded-full mt-2.5 overflow-hidden relative shadow-inner">
                <div className="absolute inset-0 animated-road opacity-90"></div>
              </div>
            </div>
            
            <h3 className="font-display font-extrabold text-lg sm:text-xl text-slate-800 tracking-tight text-center">
              Memeriksa Database Tagihan...
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1 text-center">
              Armada WastePay sedang menyisir data pelanggan dan riwayat tagihan
            </p>

            {/* Steps Status Indicators */}
            <div className="mt-6 flex flex-col sm:flex-row items-center gap-3 sm:gap-6 bg-slate-50/90 border border-slate-200/70 px-5 py-2.5 rounded-2xl shadow-sm">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-emerald-700 text-white flex items-center justify-center text-xs font-bold">✓</span>
                <span className="text-xs font-semibold text-slate-700">Koneksi Server Stabil</span>
              </div>
              <div className="hidden sm:block w-1 h-1 rounded-full bg-slate-300"></div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-emerald-600 border-r-transparent rounded-full animate-spin"></span>
                <span className="text-xs font-bold text-emerald-700">Mencocokkan Data WhatsApp</span>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={cekTagihan} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Nomor WhatsApp / No. Invoice
              </label>
              <div className="relative">
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="cth: 08123456789 atau 628..."
                  value={kode}
                  onChange={(e) => {
                    setKode(e.target.value.replace(/[^0-9a-zA-Z\-/]/g, ""));
                  }}
                  onBlur={() => {
                    // Normalisasi rapi saat selesai mengetik
                    if (/^08\d+/.test(kode)) {
                      setKode("628" + kode.slice(2));
                    }
                  }}
                  disabled={mencari}
                  className="w-full pl-4 pr-32 py-3.5 rounded-2xl border border-slate-200 text-slate-900 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm disabled:opacity-60 disabled:bg-slate-50"
                  required
                />
                <button
                  type="submit"
                  disabled={mencari || !kode.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
                >
                  {mencari ? "Memeriksa..." : "Periksa"}
                </button>
              </div>
            </div>
          </form>
        )}

        {suksesManual && !mencari && (
          <div className="mt-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <span>✓</span>
            <span>{suksesManual}</span>
          </div>
        )}
      </div>

      {/* Pesan Error dengan UI Laporan Analisa Bento Grid 2x2 */}
      {errorSearch && !mencari && (
        <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-rose-200 shadow-sm p-5 sm:p-7 animate-in slide-in-from-bottom-4 fade-in duration-300 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-rose-500"></div>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0 text-xl">
                🔍
              </div>
              <div>
                <div className="text-xs font-bold text-rose-600 tracking-wider">Hasil Analisa Sistem</div>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900">Data Tagihan Tidak Ditemukan</h3>
              </div>
            </div>
            
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {errorSearch}
            </p>

            {/* Bento Grid 2x2 untuk Layar Mobile 360px+ */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-xs">📱</span>
                <h5 className="text-xs font-bold text-slate-800">Format Nomor</h5>
                <p className="text-xs text-slate-600 leading-tight">Pastikan nomor aktif WhatsApp (08xx / 628xx).</p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-xs">⏳</span>
                <h5 className="text-xs font-bold text-slate-800">Status Warga</h5>
                <p className="text-xs text-slate-600 leading-tight">Calon warga memerlukan approval admin pusat.</p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-xs">🧾</span>
                <h5 className="text-xs font-bold text-slate-800">No. Invoice</h5>
                <p className="text-xs text-slate-600 leading-tight">Bisa memasukkan no. invoice (INV/...) resmi.</p>
              </div>

              <a
                href={`https://wa.me/${tenantInfo.whatsapp}?text=${encodeURIComponent(`Halo Admin ${tenantInfo.brandName}, saya butuh bantuan cek tagihan`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200/80 hover:bg-emerald-100 text-emerald-800 space-y-1 transition-colors block"
              >
                <span className="text-xs">💬</span>
                <h5 className="text-xs font-bold text-emerald-900">Bantuan CS</h5>
                <p className="text-xs text-emerald-700 leading-tight">Chat langsung petugas pelayanan {tenantInfo.city}.</p>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Hasil Pencarian Tagihan */}
      {hasil && (() => {
        const unpaidBills = hasil.tagihan.filter((t) => t.status !== "lunas");
        const pendingBills = hasil.tagihan.filter((t) => t.status !== "lunas" && t.pendingPayment);
        const totalUnpaid = unpaidBills.reduce((acc, t) => acc + (t.total ?? (t.jumlah + (t.denda || 0))), 0);

        return (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase font-bold text-slate-500 tracking-wider">Identitas Pelanggan</p>
                <h3 className="text-xl font-extrabold text-slate-900">{hasil.pelanggan.nama}</h3>
                <p className="text-xs text-slate-600 mt-0.5">{hasil.pelanggan.alamat}</p>
                {hasil.pelanggan.isKolektifAnggota && (
                  <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-lg bg-purple-100 border border-purple-200 text-purple-800 text-xs font-bold">
                    <span>👥</span>
                    <span>Anggota Kolektif: {hasil.pelanggan.namaGrupKolektif || hasil.pelanggan.indukKolektif?.nama || "Koordinator"}</span>
                  </div>
                )}
              </div>
              <div className="text-left sm:text-right">
                <span className="inline-block px-3 py-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-mono font-bold text-slate-800">
                  {hasil.pelanggan.kodePelanggan}
                </span>
              </div>
            </div>

            {/* Box Notifikasi Hasil Cek Gateway */}
            {gatewayCheckResult && (
              <div
                className={`p-4 rounded-3xl text-xs flex items-start justify-between gap-3 shadow-sm animate-in fade-in ${
                  gatewayCheckResult.success
                    ? "bg-emerald-50 border border-emerald-200 text-emerald-900"
                    : "bg-sky-50 border border-sky-200 text-sky-900"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <span className="text-base shrink-0">{gatewayCheckResult.success ? "✓" : "ℹ️"}</span>
                  <div className="space-y-0.5">
                    <h4 className="font-bold">
                      {gatewayCheckResult.success ? "Pembayaran Terverifikasi LUNAS" : "Status Gateway Terkini"}
                    </h4>
                    <p className="leading-relaxed">{gatewayCheckResult.message}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setGatewayCheckResult(null)}
                  className="font-bold text-slate-400 hover:text-slate-600 p-1 text-sm leading-none"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Banner Khusus Pembayaran Kolektif (Anti-Double Bayar) */}
            {(hasil.pelanggan.isKolektifAnggota || hasil.pelanggan.lockPayment) && (
              <div className="p-4 bg-purple-50/95 border border-purple-200 rounded-3xl flex items-start gap-3.5 text-xs text-purple-950 shadow-sm animate-in fade-in">
                <div className="w-9 h-9 rounded-2xl bg-purple-600 text-white flex items-center justify-center text-lg shrink-0 shadow-sm">
                  🛡️
                </div>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-purple-950 text-sm">
                    Pembayaran Dikelola Terpadu Satu Pintu (Kolektif)
                  </h4>
                  <p className="text-xs text-purple-900/90 leading-relaxed">
                    {hasil.pelanggan.lockMessage || `Tagihan retribusi sampah untuk alamat ini dibayarkan secara kolektif terpadu melalui ${hasil.pelanggan.indukKolektif?.nama || "Koordinator Lingkungan"}. Pembayaran mandiri dinonaktifkan untuk mencegah pembayaran ganda.`}
                  </p>
                  {hasil.pelanggan.indukKolektif?.noTelepon && (
                    <p className="text-xs text-purple-800 font-medium pt-0.5">
                      Kontak Koordinator: <span className="font-mono font-bold">{hasil.pelanggan.indukKolektif.noTelepon}</span> ({hasil.pelanggan.indukKolektif.nama})
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Banner Khusus jika ada pembayaran yang sedang diverifikasi admin */}
            {pendingBills.length > 0 && (
              <div className="p-4 bg-amber-50/90 border border-amber-200/90 rounded-3xl flex items-start gap-3.5 text-xs text-amber-950 shadow-sm animate-in fade-in">
                <div className="w-9 h-9 rounded-2xl bg-amber-500 text-white flex items-center justify-center text-lg shrink-0 shadow-sm">
                  ⏳
                </div>
                <div className="space-y-0.5">
                  <h4 className="font-extrabold text-amber-950 text-sm">
                    {pendingBills.length} Tagihan Sedang Dalam Proses Verifikasi Admin
                  </h4>
                  <p className="text-xs text-amber-900/85 leading-relaxed">
                    Bukti pembayaran transfer / tanda terima Anda telah tercatat aman di sistem dan sedang dalam antrean verifikasi kasir. <strong>Anda tidak perlu mengirim bukti ulang.</strong>
                  </p>
                </div>
              </div>
            )}

            {/* Edukasi & Rekomendasi Bayar QRIS */}
            {unpaidBills.length > 0 && (
              <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200/90 rounded-3xl p-5 shadow-sm space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-emerald-700 text-white flex items-center justify-center text-lg shrink-0 shadow-sm">
                    💡
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-slate-900 text-sm">
                      Cara Bayar Termudah (Bebas Antri & Otomatis Lunas):
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Pilih tagihan di bawah, lalu klik tombol hijau <strong>&quot;Bayar via QRIS / Bank&quot;</strong>. Anda bisa langsung scan menggunakan aplikasi <strong>BCA, Mandiri, BRI, BNI, DANA, GoPay, ShopeePay, atau OVO</strong>. Tagihan langsung <strong>LUNAS otomatis</strong> tanpa perlu kirim struk konfirmasi.
                    </p>
                  </div>
                </div>

                {unpaidBills.length > 1 && (
                  <div className="pt-2.5 border-t border-emerald-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                    <span className="text-slate-600 font-medium">
                      Total kewajiban yang belum dibayar ({unpaidBills.length} periode tagihan):
                    </span>
                    <span className="font-extrabold text-emerald-800 text-sm">
                      {formatRupiah(totalUnpaid)}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3.5">
              {hasil.tagihan.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-3">
                  {hasil.pelanggan.status === "calon" ? (
                    <>
                      <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center text-xl">
                        ⏳
                      </div>
                      <p className="font-bold text-slate-900">Pendaftaran Dalam Proses Verifikasi</p>
                      <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                        Status akun Anda saat ini masih dalam tahap calon pelanggan / survei lokasi. Tagihan iuran sampah belum diterbitkan oleh admin.
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center text-xl">
                        🎉
                      </div>
                      <p className="font-bold text-slate-900">Tidak Ada Tagihan Tertunggak</p>
                      <p className="text-xs text-slate-500">
                        Semua iuran retribusi sampah Anda saat ini sudah lunas. Terima kasih atas partisipasi aktif Anda!
                      </p>
                    </>
                  )}
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
                        <StatusBadge status={t.status} hasPending={Boolean(t.pendingPayment)} />
                      </div>
                      <p className="text-xs text-slate-500 font-medium">Jatuh Tempo: {formatDate(t.jatuhTempo)}</p>
                      {t.denda ? (
                        <p className="text-xs font-bold text-rose-600">+ Denda (2%): {formatRupiah(t.denda)}</p>
                      ) : null}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="text-left sm:text-right">
                        <p className="text-xs uppercase font-bold text-slate-500">Total Tagihan</p>
                        <p className="text-xl font-extrabold text-slate-900">
                          {formatRupiah(t.total ?? (t.jumlah + (t.denda || 0)))}
                        </p>
                      </div>

                      {t.status !== "lunas" && (
                        (hasil.pelanggan.lockPayment || hasil.pelanggan.isKolektifAnggota) ? (
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                            <div className="px-3.5 py-2.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs font-semibold flex items-center gap-2">
                              <span>🛡️</span>
                              <span>Dikelola Kolektif via {hasil.pelanggan.indukKolektif?.nama || "Koordinator Lingkungan"}</span>
                            </div>
                            {t.noInvoice && (
                              <Link
                                href={`/invoice-tagihan?invoice=${encodeURIComponent(t.noInvoice)}`}
                                target="_blank"
                                className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                                title="Lihat rincian tagihan"
                              >
                                <span>📄</span>
                                <span>Rincian</span>
                              </Link>
                            )}
                          </div>
                        ) : t.pendingPayment ? (
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                            <div className="px-3.5 py-2 rounded-2xl bg-amber-50 border border-amber-200/90 text-amber-950 text-xs flex items-center gap-2.5 shadow-sm">
                              <span className="text-base shrink-0 animate-pulse">⏳</span>
                              <div>
                                <p className="font-extrabold leading-tight">Bukti Terkirim (Sedang Diverifikasi)</p>
                                <p className="text-xs text-amber-800 leading-tight mt-0.5">
                                  {t.pendingPayment.metode === "tunai" ? "Titip Tunai Petugas" : "Transfer Bank"} • Admin sedang memproses
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              disabled
                              className="px-3.5 py-2.5 bg-slate-100 text-slate-400 rounded-xl text-xs font-semibold cursor-not-allowed flex items-center justify-center gap-1.5 opacity-80"
                              title="Bukti pembayaran sudah terkirim dan sedang dalam antrean verifikasi admin"
                            >
                              <span>✓</span>
                              <span>Menunggu Approval</span>
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2 w-full sm:w-auto">
                            {/* Tombol Utama: Bayar via QRIS / Bank (Skylite Ticket) */}
                            {t.noInvoice && (
                              <Link
                                href={`/bayar-tagihan?invoice=${encodeURIComponent(t.noInvoice)}`}
                                className="px-5 py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-95 flex items-center justify-center sm:justify-start gap-2.5"
                              >
                                <span className="text-base">💳</span>
                                <div className="text-left">
                                  <span className="block leading-tight font-extrabold text-sm">Bayar Sekarang</span>
                                  <span className="text-[11px] font-normal text-emerald-100 block leading-tight">QRIS NusaPay & Transfer BCA</span>
                                </div>
                                <span className="ml-auto text-emerald-200 font-bold">&rarr;</span>
                              </Link>
                            )}

                            {/* Tombol Konfirmasi Transfer & Sub-Actions */}
                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setPilihTagihan(t.id);
                                  setBukti("");
                                  setKirimError("");
                                }}
                                className="flex-1 min-w-[140px] px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/90 rounded-lg text-xs font-bold transition active:scale-95 flex items-center justify-center gap-1.5"
                                title="Klik di sini jika Anda sudah melakukan transfer bank dan ingin mengunggah foto struk"
                              >
                                <span>📸</span>
                                <span>Sudah Transfer? Kirim Bukti</span>
                              </button>

                              {t.noInvoice && (
                                <Link
                                  href={`/invoice-tagihan?invoice=${encodeURIComponent(t.noInvoice)}`}
                                  target="_blank"
                                  className="px-2.5 py-2 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1"
                                  title={`Lihat rincian faktur bulan ${BULAN[t.bulan - 1]} ${t.tahun}`}
                                >
                                  <span>📄</span>
                                  <span>Faktur</span>
                                </Link>
                              )}

                              {(t.activeGateway?.orderId || t.lastGatewayOrderId) && (
                                <button
                                  type="button"
                                  disabled={checkingGateway}
                                  onClick={() => checkGatewayStatus(t.activeGateway?.orderId || t.lastGatewayOrderId || undefined, t.noInvoice)}
                                  className="px-2.5 py-2 bg-sky-50 hover:bg-sky-100 disabled:opacity-60 text-sky-800 border border-sky-200 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1"
                                  title="Cek status transaksi ke gateway"
                                >
                                  <span className={checkingGateway ? "animate-spin" : ""}>🔄</span>
                                  <span>{checkingGateway ? "Cek..." : "Status"}</span>
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      )}

                      {t.status === "lunas" && t.noInvoice && (
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/invoice-tagihan?invoice=${encodeURIComponent(t.noInvoice)}`}
                            target="_blank"
                            className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
                            title={`Cetak Kuitansi Lunas Bulan ${BULAN[t.bulan - 1]} ${t.tahun}`}
                          >
                            <span>🧾</span>
                            <span>Cetak Kuitansi Lunas</span>
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Panduan Lengkap Cara Bayar QRIS */}
            <div className="pt-2">
              <PanduanCaraBayarQris defaultOpen={false} />
            </div>
          </div>
        );
      })()}

      {/* Jika belum mencari tagihan, tampilkan panduan cara bayar sebagai edukasi warga */}
      {!hasil && !mencari && (
        <div className="max-w-2xl mx-auto pt-2">
          <PanduanCaraBayarQris defaultOpen={false} />
        </div>
      )}

      {renderModalUpload()}
      {renderModalQris()}
    </div>
  );
}
