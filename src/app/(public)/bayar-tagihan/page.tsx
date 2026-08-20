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
        <div className="min-h-screen flex items-center justify-center text-bone-dim">
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
        <p className="font-black text-sm tracking-widest uppercase text-gray-800 animate-pulse">
          Memuat data tagihan...
        </p>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12">
        <div className="hm-card bg-red-50 border-2 border-black text-center p-8">
          <span className="text-4xl block mb-3">⚠️</span>
          <p className="font-black text-xl uppercase text-red-600">Tagihan Tidak Ditemukan</p>
          <p className="text-sm font-bold mt-2 text-gray-700">{error || "Pastikan link atau nomor invoice Anda benar."}</p>
          <Link
            href="/bayar"
            className="hm-btn mt-6 inline-block text-xs"
          >
            ← Cek Tagihan via Kode Pelanggan
          </Link>
        </div>
      </div>
    );
  }

  const lunas = detail.status === "lunas";
  const namaPeriode = `${BULAN_INDO[detail.bulan - 1]} ${detail.tahun}`;
  const invoiceUrl = `/invoice-tagihan?invoice=${encodeURIComponent(detail.noInvoice)}`;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Header Info */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-black uppercase tracking-widest bg-black text-white px-2.5 py-1 inline-block mb-1">
            PORTAL PEMBAYARAN ONLINE
          </span>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-black">
            Pembayaran Tagihan
          </h1>
        </div>
        <Link
          href={invoiceUrl}
          target="_blank"
          className="hm-btn px-4 py-2 text-xs flex items-center gap-2"
          title="Buka Lembar Invoice Digital"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          CETAK INVOICE
        </Link>
      </div>

      {/* Banner Cancel / Pembayaran Belum Selesai */}
      {statusBatal && (
        <div className="hm-card bg-amber-50 border-2 border-black p-5 mb-6 flex items-start justify-between gap-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-amber-300 border-2 border-black rounded-full flex items-center justify-center shrink-0 font-black text-lg">
              ℹ️
            </div>
            <div>
              <h4 className="font-black text-base uppercase text-black">Transaksi Belum Selesai</h4>
              <p className="text-xs font-bold text-gray-700 mt-1 leading-relaxed">
                Pembayaran Anda sebelumnya belum diselesaikan atau waktu transaksi telah berakhir. Tagihan Anda masih aktif dan saldo Anda aman. Silakan pilih kembali metode pembayaran di bawah untuk melanjutkan.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setStatusBatal(false)}
            className="text-xs font-black border-2 border-black px-2 py-1 bg-white hover:bg-black hover:text-white transition-colors"
            title="Tutup pesan"
          >
            ✕
          </button>
        </div>
      )}

      {/* Banner Notifikasi Berhasil */}
      {statusSukses && !lunas && (
        <div className="hm-card bg-green-50 border-2 border-black p-5 mb-6 flex items-start justify-between gap-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-green-400 border-2 border-black rounded-full flex items-center justify-center shrink-0 font-black text-lg">
              ⏳
            </div>
            <div>
              <h4 className="font-black text-base uppercase text-black">Pembayaran Sedang Diverifikasi</h4>
              <p className="text-xs font-bold text-gray-700 mt-1 leading-relaxed">
                Pembayaran Anda telah diterima oleh gateway dan sedang disinkronkan ke sistem. Status tagihan akan otomatis diperbarui menjadi Lunas.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setStatusSukses(false)}
            className="text-xs font-black border-2 border-black px-2 py-1 bg-white hover:bg-black hover:text-white transition-colors"
            title="Tutup pesan"
          >
            ✕
          </button>
        </div>
      )}

      {/* Kartu Rincian Tagihan */}
      <div className="hm-card p-0 bg-white overflow-hidden mb-6">
        <div className="px-6 py-4 bg-[#f4f4f0] border-b-2 border-black flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-600">NOMOR INVOICE</p>
            <p className="font-mono font-black text-base sm:text-lg text-black">{detail.noInvoice}</p>
          </div>
          <span
            className={`text-xs font-black uppercase px-3 py-1 border-2 border-black ${
              lunas ? "bg-green-400 text-black shadow-[2px_2px_0_0_rgba(0,0,0,1)]" : "bg-yellow-300 text-black shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
            }`}
          >
            {lunas ? "✓ LUNAS" : "MENUNGGU PEMBAYARAN"}
          </span>
        </div>

        <div className="p-6 space-y-4 divide-y-2 divide-dashed divide-gray-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-bold uppercase text-gray-500">Atas Nama</p>
              <p className="text-base font-black uppercase text-black mt-0.5">{detail.pelanggan.nama}</p>
              <p className="text-xs font-mono font-bold text-gray-600">ID: {detail.pelanggan.kodePelanggan}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-gray-500">Periode Layanan</p>
              <p className="text-base font-black uppercase text-black mt-0.5">{namaPeriode}</p>
              <p className="text-xs font-bold text-red-600">Jatuh Tempo: {formatTanggalIndo(detail.jatuhTempo)}</p>
            </div>
          </div>

          <div className="pt-4 space-y-2 text-sm">
            <div className="flex justify-between font-bold text-gray-700">
              <span>Iuran Sampah Pokok</span>
              <span>{formatRupiahSkylite(detail.jumlah)}</span>
            </div>
            <div className="flex justify-between font-bold text-gray-700">
              <span>PPN ({detail.ppnRate}%)</span>
              <span>{formatRupiahSkylite(detail.ppn)}</span>
            </div>
            {detail.denda > 0 && (
              <div className="flex justify-between font-bold text-red-600">
                <span>Denda Keterlambatan</span>
                <span>+{formatRupiahSkylite(detail.denda)}</span>
              </div>
            )}
            <div className="flex justify-between items-baseline pt-3 border-t-2 border-black">
              <span className="font-black text-base uppercase text-black">TOTAL PEMBAYARAN</span>
              <span className="font-black text-2xl text-red-600 sm:text-3xl">
                {formatRupiahSkylite(detail.total)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {bayarError && (
        <div className="hm-card bg-red-100 border-2 border-black text-red-700 p-4 mb-6 text-sm font-bold uppercase">
          ⚠️ {bayarError}
        </div>
      )}

      {lunas ? (
        /* Tampilan Status Lunas */
        <div className="hm-card bg-green-50 border-2 border-black p-8 text-center space-y-5">
          <div className="flex justify-center">
            <AnimatedDumpTruck size="xl" theme="green" />
          </div>
          <div>
            <span className="inline-block bg-green-500 text-black border-2 border-black font-black uppercase text-xs px-3 py-1 mb-2 shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
              ✓ PEMBAYARAN SUKSES
            </span>
            <h2 className="text-2xl sm:text-3xl font-black uppercase text-black">Tagihan Telah Dilunasi</h2>
            <p className="text-xs font-bold text-gray-600 uppercase mt-1">
              Diterima pada: {detail.tanggalLunas ? formatTanggalWaktuIndo(detail.tanggalLunas) : formatTanggalWaktuIndo(new Date().toISOString())}
            </p>
          </div>
          {detail.pembayaranLunas && (
            <p className="text-sm font-bold bg-white border-2 border-black py-2 px-4 inline-block shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
              Metode: {labelMetodePembayaran(detail.pembayaranLunas.metode)}
            </p>
          )}
          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <Link
              href={invoiceUrl}
              className="hm-btn-green py-3 px-6 text-sm font-black inline-block shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
            >
              LIHAT KWITANSI / BUKTI PEMBAYARAN
            </Link>
            <Link
              href="/lacak"
              className="hm-btn py-3 px-6 text-sm font-black inline-block shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
            >
              LACAK JADWAL TRUK
            </Link>
          </div>
        </div>
      ) : (
        /* Form Pemilihan Channel & Tombol Bayar */
        <div className="hm-card bg-white border-2 border-black p-6 sm:p-8">
          <div className="mb-5 pb-3 border-b-2 border-black flex items-center justify-between">
            <div>
              <h3 className="font-black text-lg uppercase text-black">Pilih Cara Pembayaran</h3>
              <p className="text-xs font-bold text-gray-500 uppercase mt-0.5">
                Pilih metode pembayaran aman via Payment Gateway
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
                  className={`relative flex items-center gap-3 border-2 p-3.5 text-left transition-all duration-150 ${
                    isSelected
                      ? "border-black bg-yellow-300 shadow-[3px_3px_0_0_rgba(0,0,0,1)] -translate-y-0.5"
                      : "border-black bg-white hover:bg-gray-100 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:-translate-y-0.5"
                  }`}
                >
                  <span className="text-2xl flex-shrink-0">{m.icon}</span>
                  <div className="flex-1 min-w-0">
                    <span className="block text-xs font-black uppercase text-black truncate">
                      {m.label}
                    </span>
                  </div>
                  <div
                    className={`w-5 h-5 border-2 border-black rounded-full flex items-center justify-center flex-shrink-0 ${
                      isSelected ? "bg-black text-yellow-300" : "bg-white"
                    }`}
                  >
                    {isSelected && <span className="text-xs font-black">✓</span>}
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
            className={`w-full py-4 px-6 border-2 border-black font-black uppercase tracking-wider text-base sm:text-lg flex items-center justify-center gap-3 transition-all ${
              bayarLoading
                ? "bg-gray-300 text-gray-600 cursor-wait shadow-none"
                : !detail.duitkuAktif
                ? "bg-gray-200 text-gray-500 cursor-not-allowed border-gray-400"
                : "bg-green-500 hover:bg-green-400 active:bg-green-600 text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:shadow-[6px_6px_0_0_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
            }`}
          >
            {bayarLoading ? (
              <>
                <div className="w-5 h-5 border-3 border-black border-t-transparent rounded-full animate-spin" />
                <span>MEMPROSES PEMBAYARAN...</span>
              </>
            ) : !detail.duitkuAktif ? (
              <span>PEMBAYARAN ONLINE BELUM AKTIF</span>
            ) : (
              <>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>
                  BAYAR SEKARANG • {formatRupiahSkylite(detail.total)}
                </span>
              </>
            )}
          </button>

          {!detail.duitkuAktif && (
            <p className="text-xs font-bold text-gray-500 mt-3 text-center uppercase">
              Silakan gunakan menu{" "}
              <Link href="/bayar" className="text-black underline font-black hover:text-red-600">
                Cek Tagihan & Upload Bukti Transfer Manual
              </Link>
            </p>
          )}

          <div className="mt-4 pt-4 border-t-2 border-gray-200 flex items-center justify-center gap-2 text-[11px] font-bold text-gray-500 uppercase tracking-widest">
            <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clipRule="evenodd" />
            </svg>
            <span>TERENKRIPSI & AMAN OLEH PAYMENT GATEWAY RESMI</span>
          </div>
        </div>
      )}
    </div>
  );
}


