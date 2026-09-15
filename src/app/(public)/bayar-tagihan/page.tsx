"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  formatRupiahSkylite,
  formatTanggalIndo,
  formatTanggalWaktuIndo,
  BULAN_INDO,
  labelMetodePembayaran,
} from "@/lib/invoice-format";
import { DUITKU_METHODS, duitkuChannelLabel } from "@/lib/duitku-channels";
import AnimatedDumpTruck from "@/components/AnimatedDumpTruck";

type MetodeBayar = { value: string; label: string; icon: string };

// Ikon fallback per kode channel Duitku
const ICON_CHANNEL: Record<string, string> = {
  VC: "🏦", VA: "🏦", BT: "🏦", M1: "🏛️", CIMB: "🏛️", BNI: "🏛️",
  BRI: "🏛️", PERMATA: "🏛️", MANDIRI: "🏛️", QR: "📱", SP: "🛍️",
  OVO: "💜", DANA: "🔵", GOPAY: "🟢", LINK_AJA: "🟠", SA: "🕌",
  CREDIT_CARD: "💳",
};

function keMetodeBayar(pm: { paymentMethod: string; paymentName?: string }): MetodeBayar {
  const kode = pm.paymentMethod;
  return {
    value: kode,
    label: pm.paymentName || duitkuChannelLabel(kode),
    icon: ICON_CHANNEL[kode] || "💳",
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

export default function BayarTagihanPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-slate-500 font-medium">
          Memuat tagihan...
        </div>
      }
    >
      <BayarTagihanContent />
    </Suspense>
  );
}

function BayarTagihanContent() {
  const searchParams = useSearchParams();
  const invoice = searchParams.get("invoice") || "";
  const merchantOrderId = searchParams.get("merchantOrderId") || "";
  const resultCode = searchParams.get("resultCode");
  const statusParam = searchParams.get("status");

  const [detail, setDetail] = useState<DetailTagihan | null>(null);
  const [error, setError] = useState((invoice || merchantOrderId) ? "" : "Nomor invoice atau order tidak ditemukan di URL");
  const [loading, setLoading] = useState(Boolean(invoice || merchantOrderId));
  const [pilihMetode, setPilihMetode] = useState("");
  const [bayarLoading, setBayarLoading] = useState(false);
  const [bayarError, setBayarError] = useState("");
  const [metodeList, setMetodeList] = useState<MetodeBayar[]>(DUITKU_METHODS);
  
  // Banner notifikasi status kembali dari gateway
  const [statusBatal, setStatusBatal] = useState(
    resultCode === "01" || resultCode === "02" || statusParam === "cancel" || statusParam === "failed"
  );
  const [statusSukses, setStatusSukses] = useState(
    resultCode === "00" || statusParam === "success"
  );

  const muatDetail = useCallback(async () => {
    try {
      let url = "/api/publik/tagihan-detail";
      if (invoice) {
        url += `?invoice=${encodeURIComponent(invoice)}`;
      } else if (merchantOrderId) {
        url += `?merchantOrderId=${encodeURIComponent(merchantOrderId)}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Tagihan tidak ditemukan");
      } else {
        setDetail(data);
        
        // Bersihkan parameter teknis dari URL dan ganti dengan invoice rapi
        if (data.noInvoice) {
          if (merchantOrderId || resultCode || statusParam || invoice !== data.noInvoice) {
            window.history.replaceState(null, "", `/bayar-tagihan?invoice=${encodeURIComponent(data.noInvoice)}`);
          }
        }
      }
    } catch {
      setError("Gagal menghubungi server, coba lagi");
    } finally {
      setLoading(false);
    }
  }, [invoice, merchantOrderId, resultCode, statusParam]);

  useEffect(() => {
    if (invoice || merchantOrderId) {
      (async () => {
        await muatDetail();
      })();
    }
  }, [invoice, merchantOrderId, muatDetail]);

  // Muat daftar channel yang benar-benar aktif dari Duitku (fallback: DUITKU_METHODS)
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
        // gagal → tetap pakai daftar fallback
      }
    })();
    return () => { batal = true; };
  }, [detail]);

  async function bayarOnline() {
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
        setBayarError(data.error || "Gagal membuat pembayaran online");
        return;
      }

      // Redirect ke halaman pembayaran Duitku (pola skylite.id)
      window.location.href = data.paymentUrl;
    } catch (err) {
      setBayarError(err instanceof Error ? err.message : "Gagal memulai pembayaran online");
    } finally {
      setBayarLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <AnimatedDumpTruck size="lg" theme="green" />
        <p className="font-bold text-sm tracking-wider uppercase text-slate-700 animate-pulse">
          Memuat data tagihan...
        </p>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16">
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm text-center p-8 sm:p-10">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center text-2xl mx-auto mb-4">
            ⚠️
          </div>
          <h2 className="font-extrabold text-xl text-slate-900">Tagihan Tidak Ditemukan</h2>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed max-w-md mx-auto">
            {error || "Nomor invoice atau order tidak valid. Pastikan link tagihan yang Anda buka sudah sesuai."}
          </p>
          <div className="mt-8 pt-6 border-t border-slate-100">
            <Link
              href="/bayar"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm shadow-sm transition-all"
            >
              ← Cek Tagihan via Kode Pelanggan
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const lunas = detail.status === "lunas";
  const namaPeriode = `${BULAN_INDO[detail.bulan - 1]} ${detail.tahun}`;
  const invoiceUrl = `/invoice-tagihan?invoice=${encodeURIComponent(detail.noInvoice)}`;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Portal Pembayaran Online Resmi
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Konfirmasi Pembayaran
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Retribusi kebersihan terpadu UPS HERU Kota Depok
          </p>
        </div>
        <Link
          href={invoiceUrl}
          target="_blank"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs border border-slate-200 shadow-sm transition-all self-start sm:self-center"
          title="Buka Lembar Invoice Digital"
        >
          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          Lihat Invoice PDF
        </Link>
      </div>

      {/* Banner Cancel / Pembayaran Belum Selesai */}
      {statusBatal && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-200/90 text-amber-900 flex items-start justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="text-xl shrink-0">ℹ️</span>
            <div>
              <h4 className="font-bold text-sm text-amber-900">Sesi Transaksi Sebelumnya Berakhir</h4>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                Pembayaran belum selesai atau waktu transaksi gateway telah kedaluwarsa. Tagihan Anda tetap aman. Silakan pilih kembali metode pembayaran di bawah untuk melanjutkan.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setStatusBatal(false)}
            className="text-xs font-bold text-amber-700 hover:text-amber-900 p-1"
            title="Tutup pesan"
          >
            ✕
          </button>
        </div>
      )}

      {/* Banner Notifikasi Berhasil */}
      {statusSukses && !lunas && (
        <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50 border border-emerald-200/90 text-emerald-900 flex items-start justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="text-xl shrink-0">⏳</span>
            <div>
              <h4 className="font-bold text-sm text-emerald-900">Pembayaran Sedang Diverifikasi</h4>
              <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                Pembayaran Anda telah diterima oleh payment gateway dan sedang diverifikasi secara otomatis oleh sistem kami.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setStatusSukses(false)}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-900 p-1"
            title="Tutup pesan"
          >
            ✕
          </button>
        </div>
      )}

      {/* Kartu Rincian Tagihan */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Nomor Invoice</p>
            <p className="font-mono font-bold text-sm sm:text-base text-slate-800">{detail.noInvoice}</p>
          </div>
          <span
            className={`text-xs font-semibold px-3 py-1 rounded-full ${
              lunas
                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                : "bg-amber-100 text-amber-800 border border-amber-200"
            }`}
          >
            {lunas ? "✓ Lunas" : "Menunggu Pembayaran"}
          </span>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-5 border-b border-slate-100">
            <div>
              <p className="text-xs font-medium text-slate-400">Pelanggan</p>
              <p className="text-sm font-bold text-slate-900 mt-0.5">{detail.pelanggan.nama}</p>
              <p className="text-xs font-mono text-slate-500 mt-0.5">ID: {detail.pelanggan.kodePelanggan}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">Periode & Jatuh Tempo</p>
              <p className="text-sm font-bold text-slate-900 mt-0.5">{namaPeriode}</p>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
                Batas bayar: <span className="text-rose-600 font-semibold">{formatTanggalIndo(detail.jatuhTempo)}</span>
              </p>
            </div>
          </div>

          <div className="space-y-2.5 text-xs sm:text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Iuran Sampah Pokok</span>
              <span className="font-semibold text-slate-800">{formatRupiahSkylite(detail.jumlah)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>PPN ({detail.ppnRate}%)</span>
              <span className="font-semibold text-slate-800">{formatRupiahSkylite(detail.ppn)}</span>
            </div>
            {detail.denda > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>Denda Keterlambatan</span>
                <span className="font-semibold">+{formatRupiahSkylite(detail.denda)}</span>
              </div>
            )}
            <div className="flex justify-between items-baseline pt-4 border-t border-slate-200">
              <span className="font-bold text-slate-900 text-sm sm:text-base">Total Tagihan</span>
              <span className="font-extrabold text-2xl sm:text-3xl text-emerald-700">
                {formatRupiahSkylite(detail.total)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {bayarError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
          ⚠️ {bayarError}
        </div>
      )}

      {lunas ? (
        /* Tampilan Status Lunas */
        <div className="bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-10 text-center space-y-6 shadow-sm">
          <div className="flex justify-center">
            <AnimatedDumpTruck size="xl" theme="green" />
          </div>
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Pembayaran Terverifikasi
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Tagihan Telah Dilunasi</h2>
            <p className="text-xs text-slate-500 mt-1">
              Diterima pada {detail.tanggalLunas ? formatTanggalWaktuIndo(detail.tanggalLunas) : formatTanggalWaktuIndo(new Date().toISOString())}
            </p>
          </div>
          {detail.pembayaranLunas && (
            <p className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 py-2 px-4 rounded-xl inline-block">
              Metode: {labelMetodePembayaran(detail.pembayaranLunas.metode)}
            </p>
          )}
          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <Link
              href={invoiceUrl}
              className="px-6 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm shadow-sm transition-all"
            >
              Lihat Kwitansi / Bukti Bayar
            </Link>
            <Link
              href="/lacak"
              className="px-6 py-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm border border-slate-200 shadow-sm transition-all"
            >
              Lacak Jadwal Truk
            </Link>
          </div>
        </div>
      ) : (
        /* Form Pemilihan Channel & Tombol Bayar */
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm">
          <div className="mb-5 pb-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-slate-900">Pilih Metode Pembayaran</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pilih opsi pembayaran cepat & aman melalui payment gateway resmi
              </p>
            </div>
            <span className="text-2xl">💳</span>
          </div>

          {/* Grid Channel Pembayaran */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {metodeList.map((m) => {
              const isSelected = pilihMetode === m.value;
              return (
                <button
                  type="button"
                  key={m.value}
                  onClick={() => setPilihMetode(m.value)}
                  className={`relative flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all ${
                    isSelected
                      ? "border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-500 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                  }`}
                >
                  <span className="text-2xl shrink-0">{m.icon}</span>
                  <div className="flex-1 min-w-0">
                    <span className="block text-xs font-bold text-slate-900 truncate">
                      {m.label}
                    </span>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? "border-emerald-600 bg-emerald-700 text-white"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {isSelected && <span className="text-xs font-bold">✓</span>}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Tombol Bayar Utama */}
          <button
            type="button"
            onClick={bayarOnline}
            disabled={bayarLoading || !detail.duitkuAktif}
            className={`w-full py-4 px-6 rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-sm transition-all ${
              bayarLoading
                ? "bg-slate-200 text-slate-500 cursor-wait"
                : !detail.duitkuAktif
                ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                : "bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] text-white"
            }`}
          >
            {bayarLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
                <span>Memproses Pembayaran...</span>
              </>
            ) : !detail.duitkuAktif ? (
              <span>Pembayaran Online Belum Dikonfigurasi</span>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>
                  Bayar Sekarang • {formatRupiahSkylite(detail.total)}
                </span>
              </>
            )}
          </button>

          {!detail.duitkuAktif && (
            <p className="text-xs text-slate-500 mt-3 text-center">
              Alternatif transfer manual:{" "}
              <Link href="/bayar" className="text-emerald-700 font-semibold underline hover:text-emerald-800">
                Unggah Bukti Transfer di Sini
              </Link>
            </p>
          )}

          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] font-medium text-slate-400">
            <svg className="w-4 h-4 text-emerald-700 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clipRule="evenodd" />
            </svg>
            <span>Transaksi Terenkripsi & Dijamin Aman oleh Gateway Berizin Resmi BI</span>
          </div>
        </div>
      )}
    </div>
  );
}



