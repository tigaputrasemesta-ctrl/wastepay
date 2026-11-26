"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import { toast } from "@/components/Toast";
import { formatRupiah } from "@/lib/utils";
import {
  formatRupiahSkylite,
  formatTanggalIndo,
  BULAN_INDO,
} from "@/lib/invoice-format";
import "./bayar-tagihan.css";

type DetailTagihan = {
  id: number;
  noInvoice: string;
  status: string;
  bulan: number;
  tahun: number;
  jumlah: number;
  denda: number;
  total: number;
  jatuhTempo: string;
  tanggalLunas?: string | null;
  keterangan?: string | null;
  pelanggan: {
    id: number;
    nama: string;
    kodePelanggan: string;
    kategori?: string;
  };
  pembayaranLunas?: {
    metode: string;
    jumlah: number;
    tanggal: string;
  } | null;
  pembayaranPending?: {
    id?: number;
    metode?: string;
    createdAt?: string;
  } | null;
};

type PaymentChannel = {
  id: string;
  name: string;
  fee: string;
  isFree?: boolean;
  logo: string;
};

// Hanya 2 metode pembayaran resmi sesuai instruksi: QRIS NusaPay & Transfer BCA Manual Kode Unik
const DEFAULT_CHANNELS: PaymentChannel[] = [
  {
    id: "SQ",
    name: "QRIS NUSAPAY",
    fee: "Tanpa biaya admin",
    isFree: true,
    logo: "https://images.duitku.com/hotlink-ok/SQ.PNG",
  },
  {
    id: "BCA_MANUAL",
    name: "TRANSFER BCA (KODE UNIK)",
    fee: "Tanpa biaya admin",
    isFree: true,
    logo: "https://images.duitku.com/hotlink-ok/BC.PNG",
  },
];

function hitungSisaHari(jatuhTempoStr: string): { text: string; isOverdue: boolean } {
  try {
    const due = new Date(jatuhTempoStr);
    const now = new Date();
    // Hilangkan jam
    due.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return { text: "Hari ini jatuh tempo", isOverdue: false };
    if (diffDays > 0) return { text: `${diffDays} hari lagi`, isOverdue: false };
    return { text: `Terlewat ${Math.abs(diffDays)} hari`, isOverdue: true };
  } catch {
    return { text: "Jatuh tempo", isOverdue: false };
  }
}

function BayarTagihanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const invoiceParam = searchParams.get("invoice")?.trim() || "";
  const merchantOrderId = searchParams.get("merchantOrderId")?.trim() || "";
  const resultCode = searchParams.get("resultCode")?.trim() || "";

  const [loading, setLoading] = useState(Boolean(invoiceParam || merchantOrderId));
  const [tagihan, setTagihan] = useState<DetailTagihan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inputInvoice, setInputInvoice] = useState(invoiceParam);
  const [channels, setChannels] = useState<PaymentChannel[]>(DEFAULT_CHANNELS);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string | null>("SQ");
  const [buktiBayarFile, setBuktiBayarFile] = useState<string | null>(null);
  const [namaPengirim, setNamaPengirim] = useState("");
  const [uploadingBukti, setUploadingBukti] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);

  // === ON-PAGE QRIS MODAL & AUTO-POLLING STATE ===
  const [onPageQris, setOnPageQris] = useState<{
    qrDataUrl: string;
    paymentUrl?: string;
    orderId: string;
    amount: number;
  } | null>(null);
  const [pollingStatus, setPollingStatus] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSalinTeks = (teks: string, label: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(teks).then(() => {
        showToast(`${label} disalin`);
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2.8 * 1024 * 1024) {
      toast("Ukuran foto bukti transfer maksimal 2.5MB.", "warning");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setBuktiBayarFile(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const loadTagihan = useCallback(async (inv?: string, orderId?: string) => {
    if (!inv && !orderId) return;
    setLoading(true);
    setError(null);
    try {
      const q = inv
        ? `invoice=${encodeURIComponent(inv)}`
        : `merchantOrderId=${encodeURIComponent(orderId!)}`;
      const res = await fetch(`/api/publik/tagihan-detail?${q}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Data tagihan tidak ditemukan.");
        setTagihan(null);
      } else {
        setTagihan(data);
        if (data.noInvoice) setInputInvoice(data.noInvoice);
      }
    } catch {
      setError("Gagal menghubungi server. Silakan coba lagi.");
      setTagihan(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (invoiceParam) {
      loadTagihan(invoiceParam);
    } else if (merchantOrderId) {
      loadTagihan(undefined, merchantOrderId);
    } else {
      setLoading(false);
    }
  }, [invoiceParam, merchantOrderId, loadTagihan]);

  useEffect(() => {
    if (resultCode === "00") {
      showToast("Pembayaran Berhasil Diverifikasi LUNAS!");
    }
  }, [resultCode]);

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
          setOnPageQris(null);
          showToast("Pembayaran QRIS Berhasil Diverifikasi LUNAS!");
          if (tagihan?.noInvoice) {
            loadTagihan(tagihan.noInvoice);
          } else if (invoiceParam) {
            loadTagihan(invoiceParam);
          }
        }
      } catch (err) {
        console.warn("Polling status error:", err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [onPageQris, pollingStatus, tagihan?.noInvoice, invoiceParam, loadTagihan]);

  // Muat channel gateway (hanya SQ NusaPay & BCA Manual)
  useEffect(() => {
    if (!tagihan) return;
    setChannels([
      {
        id: "SQ",
        name: "QRIS NUSAPAY",
        fee: "Tanpa biaya admin",
        isFree: true,
        logo: "https://images.duitku.com/hotlink-ok/SQ.PNG",
      },
      {
        id: "BCA_MANUAL",
        name: "TRANSFER BCA (KODE UNIK)",
        fee: "Tanpa biaya admin",
        isFree: true,
        logo: "https://images.duitku.com/hotlink-ok/BC.PNG",
      },
    ]);
  }, [tagihan]);

  const handleSalinInvoice = () => {
    if (!tagihan?.noInvoice) return;
    handleSalinTeks(tagihan.noInvoice, "Nomor tagihan");
  };

  const handleBayar = async (methodId: string) => {
    if (!tagihan) return;
    setSelectedMethod(methodId);

    // Jika metode Transfer BCA, tampilkan rincian transfer dan kode unik (tanpa redirect Duitku)
    if (methodId === "BCA_MANUAL") {
      return;
    }

    setProcessingPayment(true);
    try {
      const res = await fetch("/api/publik/duitku/transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kode: tagihan.pelanggan.kodePelanggan,
          tagihanId: tagihan.id,
          paymentMethod: "SQ",
        }),
      });

      const data = await res.json();
      if (res.ok) {
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
              amount: tagihan.total,
            });
            setPollingStatus("pending");
            setProcessingPayment(false);
            return;
          } catch (qrErr) {
            console.error("Gagal render QRIS, fallback ke URL:", qrErr);
          }
        }
        if (data.paymentUrl) {
          window.location.assign(data.paymentUrl);
          return;
        }
      }
      toast(data.error || "Gagal membuat sesi transaksi QRIS. Silakan coba kembali.", "error");
      setProcessingPayment(false);
    } catch {
      toast("Terjadi kesalahan koneksi ke payment gateway. Silakan refresh dan coba lagi.", "error");
      setProcessingPayment(false);
    }
  };

  const isLunas = tagihan?.status === "lunas" || tagihan?.status === "terverifikasi";
  const sisaJatuhTempo = tagihan ? hitungSisaHari(tagihan.jatuhTempo) : { text: "", isOverdue: false };
  const namaBulan = tagihan ? BULAN_INDO[tagihan.bulan - 1] : "";

  // Rumus kode unik deterministik berdasarkan ID tagihan (misal: 100 - 999)
  const kodeUnik = tagihan ? ((tagihan.id % 900) + 100) : 278;
  const totalTransferBca = tagihan ? tagihan.total + kodeUnik : 0;

  const waUrlKonfirmasi = tagihan
    ? `https://wa.me/6281400782617?text=${encodeURIComponent(
        `Halo Admin UPS HERU, saya sudah melakukan pembayaran retribusi sampah via Transfer Bank BCA:\n\n` +
        `• No. Invoice    : ${tagihan.noInvoice}\n` +
        `• Nama Warga     : ${tagihan.pelanggan.nama}\n` +
        `• Rekening Tujuan: BCA 7651211445 a.n SURYANI\n` +
        `• Jumlah Pas     : ${formatRupiahSkylite(totalTransferBca)} (termasuk kode unik ${kodeUnik})\n` +
        (namaPengirim.trim() ? `• Rekening Pengirim: a.n ${namaPengirim.trim()}\n` : "") +
        `\nMohon bantu diverifikasi ya Admin. Bukti transfer saya lampirkan berikut ini. Terima kasih! 🙏`
      )}`
    : "#";

  const handleKirimBuktiTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagihan) return;
    if (!buktiBayarFile) {
      toast("Silakan pilih foto bukti transfer terlebih dahulu.", "warning");
      return;
    }
    setUploadingBukti(true);
    try {
      const res = await fetch("/api/publik/bayar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kode: tagihan.pelanggan.kodePelanggan,
          tagihanId: tagihan.id,
          metode: "transfer",
          buktiBayar: buktiBayarFile,
          catatan: `Transfer BCA 7651211445 a.n SURYANI (Total Pas: ${formatRupiahSkylite(totalTransferBca)})` + (namaPengirim.trim() ? ` - Pengirim: ${namaPengirim.trim()}` : ""),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Bukti transfer berhasil dikirim ke Admin!");
        setBuktiBayarFile(null);
        setShowUploadForm(false);
        loadTagihan(tagihan.noInvoice);
      } else {
        toast(data.error || "Gagal mengirim bukti transfer.", "error");
      }
    } catch {
      toast("Terjadi kendala jaringan saat mengunggah bukti.", "error");
    } finally {
      setUploadingBukti(false);
    }
  };

  return (
    <div className="pp-body">
      {/* Background Animasi Melayang */}
      <div className="bg-animation-container" aria-hidden="true">
        <span className="bg-icon" style={{ left: "10%", fontSize: "3rem", animationDuration: "12s", animationDelay: "0s" }}>🪙</span>
        <span className="bg-icon" style={{ left: "25%", fontSize: "4rem", animationDuration: "18s", animationDelay: "2s" }}>💳</span>
        <span className="bg-icon" style={{ left: "70%", fontSize: "3.5rem", animationDuration: "15s", animationDelay: "4s" }}>👛</span>
        <span className="bg-icon" style={{ left: "85%", fontSize: "5rem", animationDuration: "16s", animationDelay: "1s" }}>💵</span>
        <span className="bg-icon" style={{ left: "50%", fontSize: "2.5rem", animationDuration: "20s", animationDelay: "5s" }}>🛡️</span>
        <span className="bg-icon" style={{ left: "40%", fontSize: "3rem", animationDuration: "14s", animationDelay: "7s" }}>🧾</span>
        <span className="bg-icon" style={{ left: "80%", fontSize: "3.5rem", animationDuration: "17s", animationDelay: "3s" }}>📱</span>
        <span className="bg-icon" style={{ left: "20%", fontSize: "2rem", animationDuration: "13s", animationDelay: "6s" }}>💰</span>
        <span className="bg-icon" style={{ left: "60%", fontSize: "4rem", animationDuration: "19s", animationDelay: "1.5s" }}>♻️</span>
        <span className="bg-icon" style={{ left: "5%", fontSize: "2.6rem", animationDuration: "16s", animationDelay: "8s" }}>🚛</span>
        <span className="bg-icon" style={{ left: "92%", fontSize: "2.2rem", animationDuration: "14s", animationDelay: "4.5s" }}>✨</span>
      </div>

      <main className="pp">
        {/* JIKA BELUM ADA NOMOR INVOICE ATAU ERROR */}
        {!invoiceParam && !tagihan && (
          <section className="pp-card p-6 text-center">
            <div className="pp-logo mb-2">
              <span className="pp-shine">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/ups-heru-logo.jpg" alt="UPS HERU" />
              </span>
            </div>
            <h2 className="text-lg font-extrabold text-slate-900 mb-1">Cek & Bayar Tagihan</h2>
            <p className="text-xs text-slate-500 mb-5">
              Masukkan nomor invoice atau nomor pelanggan/WhatsApp Anda untuk melihat rincian pembayaran.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (inputInvoice.trim()) {
                  router.push(`/bayar-tagihan?invoice=${encodeURIComponent(inputInvoice.trim())}`);
                }
              }}
              className="space-y-3"
            >
              <input
                type="text"
                placeholder="Contoh: INV/085716251003/202611"
                value={inputInvoice}
                onChange={(e) => setInputInvoice(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                required
              />
              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md transition"
              >
                Cari Tagihan &rarr;
              </button>
            </form>
          </section>
        )}

        {/* LOADING STATE */}
        {loading && (
          <section className="pp-card p-10 text-center">
            <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm font-bold text-slate-700">Memuat rincian tagihan...</p>
            <p className="text-xs text-slate-400 mt-1">Mengambil data aman dari server resmi UPS HERU</p>
          </section>
        )}

        {/* ERROR STATE */}
        {!loading && error && (
          <section className="pp-card p-6 text-center">
            <div className="text-4xl mb-3">⚠️</div>
            <h3 className="text-base font-bold text-rose-700 mb-1">Tagihan Tidak Ditemukan</h3>
            <p className="text-xs text-slate-600 mb-4">{error}</p>
            <Link
              href="/bayar-tagihan"
              className="inline-block px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition"
            >
              &larr; Cek Nomor Tagihan Lain
            </Link>
          </section>
        )}

        {/* DATA TAGIHAN DITEMUKAN (TAMPILAN TIKET SKYLITE) */}
        {!loading && tagihan && (
          <>
            {/* 1. TIKET PERFORASI TAGIHAN */}
            <section className="pp-card pp-ticket">
              <div className="pp-tk-top">
                <div className="pp-logo">
                  <span className="pp-shine">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/ups-heru-logo.jpg" alt="UPS HERU DEPOK" />
                  </span>
                </div>
                <div className="pp-hero">
                  <div className="pp-eyebrow">
                    <small>Retribusi Kebersihan · {namaBulan} {tagihan.tahun}</small>
                    <span className={`pp-status ${isLunas ? "paid" : "unpaid"}`}>
                      <span className="dot" />
                      {isLunas ? "LUNAS" : "BELUM LUNAS"}
                    </span>
                  </div>
                  <div className="pp-amount">{formatRupiahSkylite(tagihan.total)}</div>
                  <div className="pp-amount-sub">Total tagihan retribusi kebersihan & pengelolaan sampah</div>

                  <div className={`pp-due ${sisaJatuhTempo.isOverdue ? "overdue" : "ok"}`}>
                    <span className="ic">⏳</span>
                    <div>
                      <b>Jatuh tempo {formatTanggalIndo(tagihan.jatuhTempo)}</b>
                      <span>{sisaJatuhTempo.text}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pp-tk-bot">
                <div className="pp-rows">
                  <div className="pp-row">
                    <span className="k">📄 No. Tagihan</span>
                    <span className="v">
                      {tagihan.noInvoice}
                      <button
                        type="button"
                        className="pp-copy"
                        title="Salin Nomor Tagihan"
                        onClick={handleSalinInvoice}
                      >
                        📋
                      </button>
                    </span>
                  </div>
                  <div className="pp-row">
                    <span className="k">👤 Atas Nama</span>
                    <span className="v">{tagihan.pelanggan.nama}</span>
                  </div>
                  <div className="pp-row">
                    <span className="k">🏷️ ID Pelanggan</span>
                    <span className="v">{tagihan.pelanggan.kodePelanggan}</span>
                  </div>
                  <div className="pp-row">
                    <span className="k">♻️ Paket</span>
                    <span className="v">
                      {tagihan.pelanggan.kategori === "level_2" ? "Retribusi Usaha / Niaga" : "Retribusi Rumah Tangga"}
                    </span>
                  </div>
                  <div className="pp-row">
                    <span className="k">📅 Periode</span>
                    <span className="v">{namaBulan} {tagihan.tahun}</span>
                  </div>
                </div>

                <div className="pp-actions">
                  <Link
                    className="pp-btn ghost"
                    href={`/invoice-tagihan?invoice=${encodeURIComponent(tagihan.noInvoice)}`}
                    target="_blank"
                  >
                    📄 Lihat Invoice
                  </Link>
                  <a
                    className="pp-btn ghost"
                    target="_blank"
                    rel="noopener noreferrer"
                    href={`https://wa.me/6281400782617?text=${encodeURIComponent(
                      `Halo Admin UPS HERU, saya ingin bertanya tentang tagihan ${tagihan.noInvoice} a.n ${tagihan.pelanggan.nama}.`
                    )}`}
                  >
                    💬 Hubungi CS
                  </a>
                </div>
              </div>
            </section>

            {/* 2. KARTU METODE PEMBAYARAN / STATUS LUNAS */}
            <section className="pp-card">
              {isLunas ? (
                /* JIKA SUDAH LUNAS */
                <div className="pp-paid">
                  <div className="ring">✓</div>
                  <h2>Tagihan Sudah Lunas</h2>
                  <p>
                    Terima kasih atas pembayaran retribusi kebersihan Anda. Iuran ini membantu mewujudkan
                    lingkungan Kota Depok yang bersih, sehat, dan terkelola dengan baik.
                  </p>
                  <Link
                    href={`/invoice-tagihan?invoice=${encodeURIComponent(tagihan.noInvoice)}`}
                    className="pp-btn primary"
                    target="_blank"
                  >
                    📄 Cetak Kuitansi / Bukti Lunas Resmi
                  </Link>
                </div>
              ) : (
                /* JIKA BELUM LUNAS: PILIH METODE BAYAR */
                <div className="pp-sec">
                  {/* BANNER JIKA SUDAH ADA BUKTI TRANSFER YANG PENDING DIVERIFIKASI */}
                  {tagihan?.pembayaranPending && (
                    <div className="p-4 mb-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 animate-fadeIn">
                      <div className="flex items-center gap-2 font-bold text-xs text-amber-800 mb-1">
                        <span>⏳</span>
                        <span>Bukti Pembayaran Sedang Diverifikasi Kasir</span>
                      </div>
                      <p className="text-[11px] text-amber-700 leading-relaxed">
                        Bukti transfer Anda telah diterima sistem dan sedang dalam antrean verifikasi kasir UPS HERU. Anda tidak perlu mentransfer ulang. Kuitansi resmi akan langsung diterbitkan begitu diverifikasi.
                      </p>
                    </div>
                  )}

                  <div className="pp-head">
                    <h2>Pilih Metode Pembayaran</h2>
                    <p>Ketuk salah satu metode di bawah ini. Transfer manual atau gateway otomatis.</p>
                    <ol className="pp-tl">
                      <li className="on">
                        <b>1</b>Pilih metode
                      </li>
                      <li>
                        <b>2</b>Bayar
                      </li>
                      <li className="end">
                        <b>✓</b>Otomatis lunas
                      </li>
                    </ol>
                  </div>

                  <div className="pp-grid">
                    {channels.map((ch) => (
                      <div
                        key={ch.id}
                        className={`pp-pm ${selectedMethod === ch.id ? "active" : ""}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleBayar(ch.id)}
                      >
                        <div className="logo">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={ch.logo} alt={ch.name} loading="lazy" />
                        </div>
                        <div className="nm">{ch.name}</div>
                        <span className={`fee ${ch.isFree ? "free" : ""}`}>{ch.fee}</span>
                      </div>
                    ))}
                  </div>

                  {/* TOMBOL BUKA QRIS KEMBALI JIKA SUDAH PILIH SQ */}
                  {selectedMethod === "SQ" && !onPageQris && (
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() => handleBayar("SQ")}
                        disabled={processingPayment}
                        className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-md transition flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                      >
                        <span className="text-base">💳</span>
                        <span>{processingPayment ? "Menyiapkan QRIS..." : "Tampilkan Barcode QRIS Sekarang"}</span>
                      </button>
                    </div>
                  )}

                  {/* KARTU RINCIAN TRANSFER MANUAL BANK BCA */}
                  {selectedMethod === "BCA_MANUAL" && tagihan && (
                    <div className="pp-bca-box">
                      <div className="pp-bca-title">
                        <span>🏦</span>
                        <span>Instruksi Transfer Manual Bank BCA</span>
                      </div>

                      <div className="pp-bca-row">
                        <span className="text-slate-500 text-xs">Bank Tujuan</span>
                        <span className="val text-xs">BCA (Bank Central Asia)</span>
                      </div>

                      <div className="pp-bca-row">
                        <span className="text-slate-500 text-xs">Nomor Rekening</span>
                        <div className="val">
                          <span className="font-mono font-bold tracking-wider text-emerald-800 text-sm">7651211445</span>
                          <button
                            type="button"
                            className="pp-copy-btn"
                            onClick={() => handleSalinTeks("7651211445", "Nomor Rekening BCA")}
                          >
                            📋 Salin
                          </button>
                        </div>
                      </div>

                      <div className="pp-bca-row">
                        <span className="text-slate-500 text-xs">Atas Nama</span>
                        <span className="val text-emerald-950 font-bold text-xs uppercase">SURYANI</span>
                      </div>

                      <div className="pp-bca-row">
                        <span className="text-slate-500 text-xs">Tagihan Pokok</span>
                        <span className="val text-xs text-slate-700">{formatRupiahSkylite(tagihan.total)}</span>
                      </div>

                      <div className="pp-bca-row">
                        <span className="text-slate-500 text-xs">Kode Unik Transfer</span>
                        <span className="val text-xs font-mono font-bold text-emerald-600">+ Rp{kodeUnik}</span>
                      </div>

                      <div className="pp-bca-total-box">
                        <div>
                          <div className="text-[10px] uppercase font-bold text-slate-400">Total Harus Ditransfer</div>
                          <div className="text-base font-extrabold text-emerald-700 font-mono">
                            {formatRupiahSkylite(totalTransferBca)}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="pp-copy-btn text-xs py-1 px-2.5"
                          onClick={() => handleSalinTeks(String(totalTransferBca), "Nominal Pas Transfer")}
                        >
                          📋 Salin Nominal Pas
                        </button>
                      </div>

                      <div className="pp-bca-alert">
                        <strong>⚠️ PENTING:</strong> Mohon transfer tepat hingga 3 digit terakhir (<strong>{formatRupiahSkylite(totalTransferBca)}</strong>) agar pembayaran dapat dicocokkan & diverifikasi kasir secara cepat.
                      </div>

                      {/* AKSI KONFIRMASI */}
                      <div className="pp-bca-actions">
                        <a
                          href={waUrlKonfirmasi}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="pp-btn-wa"
                        >
                          <span>💬</span>
                          <span>Konfirmasi via WhatsApp (+ Foto Bukti)</span>
                        </a>

                        <button
                          type="button"
                          className="text-xs text-slate-600 underline font-semibold text-center hover:text-emerald-700 py-1"
                          onClick={() => setShowUploadForm(!showUploadForm)}
                        >
                          {showUploadForm ? "▲ Sembunyikan Form Upload Bukti" : "▼ Atau Unggah Bukti Transfer Langsung di Sini"}
                        </button>

                        {showUploadForm && (
                          <form onSubmit={handleKirimBuktiTransfer} className="pp-upload-box">
                            <div className="text-xs font-bold text-slate-700 mb-2">Unggah Foto / Screenshot Bukti Transfer:</div>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleFileChange}
                              className="w-full text-xs text-slate-600 mb-3 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-100 file:text-emerald-800 hover:file:bg-emerald-200 cursor-pointer"
                              required
                            />

                            <input
                              type="text"
                              placeholder="Nama Pemilik Rekening Pengirim (opsional)"
                              value={namaPengirim}
                              onChange={(e) => setNamaPengirim(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 mb-3"
                            />

                            <button
                              type="submit"
                              disabled={uploadingBukti || !buktiBayarFile}
                              className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition shadow-sm"
                            >
                              {uploadingBukti ? "Mengirim Bukti Transfer..." : "Kirim Bukti Pembayaran"}
                            </button>
                          </form>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="pp-safe">
                    <span>🛡️</span>
                    <div>Pembayaran aman & diverifikasi langsung oleh pengelola resmi UPS HERU Kota Depok.</div>
                  </div>
                </div>
              )}
            </section>
          </>
        )}

        {/* FOOTER */}
        <footer className="pp-foot">
          <p>© {new Date().getFullYear()} UPS HERU Kota Depok · All rights reserved.</p>
          <p>Layanan Pengelolaan Sampah Terpadu & Retribusi TPS 3R</p>
        </footer>

        {/* TOAST MESSAGE */}
        {toastMessage && <div className="pp-toast">✓ {toastMessage}</div>}

        {/* MODAL QRIS ON-PAGE */}
        {onPageQris && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 max-w-sm w-full space-y-4 text-center">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <h3 className="text-sm font-extrabold text-slate-900">Scan QRIS Pembayaran</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setOnPageQris(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="bg-white p-3 rounded-2xl border-2 border-slate-200 shadow-inner inline-block mx-auto">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={onPageQris.qrDataUrl}
                  alt="QRIS Tagihan UPS HERU"
                  className="w-64 h-64 mx-auto object-contain"
                />
              </div>

              <div className="space-y-1">
                <p className="text-xs text-slate-500 font-medium">Total Pembayaran</p>
                <p className="text-2xl font-black text-emerald-800">
                  {formatRupiah(onPageQris.amount)}
                </p>
                <p className="text-[11px] text-slate-400 font-mono">Order #{onPageQris.orderId}</p>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-left space-y-1">
                <p className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <span className="animate-spin text-sm">⏳</span>
                  <span>Menunggu Pembayaran Warga...</span>
                </p>
                <p className="text-[11px] text-amber-800 leading-tight">
                  Jika pakai 1 HP: simpan gambar QRIS di bawah, lalu buka aplikasi m-Banking/e-wallet Anda dan pilih <em>Upload QR dari Galeri</em>. Halaman ini otomatis mendeteksi saat lunas.
                </p>
              </div>

              <div className="space-y-2 pt-1">
                <a
                  href={onPageQris.qrDataUrl}
                  download={`QRIS-Tagihan-${onPageQris.orderId}.png`}
                  className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition shadow-md flex items-center justify-center gap-2 active:scale-95"
                >
                  <span>📥 Simpan Gambar QRIS ke Galeri</span>
                </a>
                <button
                  type="button"
                  onClick={() => setOnPageQris(null)}
                  className="w-full py-2 text-slate-500 hover:text-slate-700 text-xs font-semibold"
                >
                  Tutup QRIS
                </button>
              </div>
            </div>
          </div>
        )}

        {/* LOADING MODAL OVERLAY */}
        {processingPayment && (
          <div className="pp-loading-overlay">
            <div className="pp-spinner" />
            <div className="text-base font-bold mb-1">Memproses Pembayaran...</div>
            <div className="text-xs text-emerald-200">Menghubungkan ke gateway QRIS Duitku</div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function BayarTagihanPage() {
  return (
    <Suspense
      fallback={
        <div className="pp-body flex items-center justify-center min-h-screen text-white font-bold text-sm">
          Memuat portal pembayaran...
        </div>
      }
    >
      <BayarTagihanContent />
    </Suspense>
  );
}
