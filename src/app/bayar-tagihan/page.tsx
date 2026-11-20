"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
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
};

type PaymentChannel = {
  id: string;
  name: string;
  fee: string;
  isFree?: boolean;
  logo: string;
};

// Saluran pembayaran Duitku resmi (Pola Skylite)
const DEFAULT_CHANNELS: PaymentChannel[] = [
  {
    id: "SP",
    name: "NUSAPAY / QRIS",
    fee: "Tanpa biaya admin",
    isFree: true,
    logo: "https://images.duitku.com/hotlink-ok/SP.PNG",
  },
  {
    id: "B1",
    name: "CIMB NIAGA VA",
    fee: "+ Rp3.000,-",
    logo: "https://images.duitku.com/hotlink-ok/B1.PNG",
  },
  {
    id: "A1",
    name: "ATM BERSAMA VA",
    fee: "+ Rp3.000,-",
    logo: "https://images.duitku.com/hotlink-ok/A1.PNG",
  },
  {
    id: "M2",
    name: "MANDIRI VA H2H",
    fee: "+ Rp4.000,-",
    logo: "https://images.duitku.com/hotlink-ok/MV.PNG",
  },
  {
    id: "BR",
    name: "BRI VA",
    fee: "+ Rp3.000,-",
    logo: "https://images.duitku.com/hotlink-ok/BR.PNG",
  },
  {
    id: "BT",
    name: "BSI VA",
    fee: "+ Rp3.000,-",
    logo: "https://images.duitku.com/hotlink-ok/BT.PNG",
  },
  {
    id: "FT",
    name: "RETAIL",
    fee: "+ Rp2.500,-",
    logo: "https://images.duitku.com/hotlink-ok/RETAIL.PNG",
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

  const [loading, setLoading] = useState(Boolean(invoiceParam));
  const [tagihan, setTagihan] = useState<DetailTagihan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inputInvoice, setInputInvoice] = useState(invoiceParam);
  const [channels, setChannels] = useState<PaymentChannel[]>(DEFAULT_CHANNELS);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const loadTagihan = useCallback(async (inv: string) => {
    if (!inv) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/publik/tagihan-detail?invoice=${encodeURIComponent(inv)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Data tagihan tidak ditemukan.");
        setTagihan(null);
      } else {
        setTagihan(data);
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
    } else {
      setLoading(false);
    }
  }, [invoiceParam, loadTagihan]);

  // Muat channel gateway jika tersedia
  useEffect(() => {
    if (!tagihan) return;
    fetch(`/api/publik/duitku/methods?amount=${tagihan.total}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.methods && Array.isArray(data.methods) && data.methods.length > 0) {
          const mapped: PaymentChannel[] = data.methods.map((m: any) => ({
            id: m.paymentMethod,
            name: m.paymentName || m.paymentMethod,
            fee: m.totalFee && Number(m.totalFee) > 0 ? `+ ${formatRupiahSkylite(Number(m.totalFee))}` : "Tanpa biaya admin",
            isFree: !m.totalFee || Number(m.totalFee) === 0,
            logo: m.paymentImage && m.paymentImage.startsWith("http") ? m.paymentImage : (m.paymentImage || "https://images.duitku.com/hotlink-ok/SP.PNG"),
          }));
          // Jika ada lebih dari satu, prioritaskan hasil API; bila hanya 1, gabungkan dengan varian VA
          if (mapped.length > 1) {
            setChannels(mapped);
          }
        }
      })
      .catch(() => {
        // Fallback ke DEFAULT_CHANNELS
      });
  }, [tagihan]);

  const handleSalinInvoice = () => {
    if (!tagihan?.noInvoice) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(tagihan.noInvoice).then(() => {
        showToast("Nomor tagihan disalin");
      });
    }
  };

  const handleBayar = async (methodId: string) => {
    if (!tagihan) return;
    setSelectedMethod(methodId);
    setProcessingPayment(true);

    try {
      const res = await fetch("/api/publik/duitku/transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kode: tagihan.pelanggan.kodePelanggan,
          tagihanId: tagihan.id,
          paymentMethod: methodId,
        }),
      });

      const data = await res.json();
      if (res.ok && data.paymentUrl) {
        // Alihkan langsung ke halaman pembayaran resmi Duitku
        window.location.href = data.paymentUrl;
      } else {
        alert(data.error || "Gagal membuat transaksi pembayaran. Silakan coba kembali.");
        setProcessingPayment(false);
      }
    } catch {
      alert("Terjadi kesalahan koneksi ke payment gateway. Silakan refresh dan coba lagi.");
      setProcessingPayment(false);
    }
  };

  const isLunas = tagihan?.status === "lunas" || tagihan?.status === "terverifikasi";
  const sisaJatuhTempo = tagihan ? hitungSisaHari(tagihan.jatuhTempo) : { text: "", isOverdue: false };
  const namaBulan = tagihan ? BULAN_INDO[tagihan.bulan - 1] : "";

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
                  <div className="pp-head">
                    <h2>Pilih Metode Pembayaran</h2>
                    <p>Ketuk salah satu metode di bawah ini. Biaya admin ditambahkan sesuai metode.</p>
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

                  <div className="pp-safe">
                    <span>🛡️</span>
                    <div>Pembayaran aman & otomatis diproses langsung oleh payment gateway resmi berlisensi Bank Indonesia & OJK.</div>
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

        {/* LOADING MODAL OVERLAY */}
        {processingPayment && (
          <div className="pp-loading-overlay">
            <div className="pp-spinner" />
            <div className="text-base font-bold mb-1">Memproses Pembayaran...</div>
            <div className="text-xs text-emerald-200">Mengarahkan ke halaman transaksi aman Duitku</div>
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
