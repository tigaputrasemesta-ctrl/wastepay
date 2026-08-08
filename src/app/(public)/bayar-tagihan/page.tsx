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
} from "@/lib/invoice";
import { DUITKU_METHODS, duitkuChannelLabel } from "@/lib/duitku";

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

  const [detail, setDetail] = useState<DetailTagihan | null>(null);
  const [error, setError] = useState(invoice ? "" : "Nomor invoice tidak ditemukan di URL");
  const [loading, setLoading] = useState(Boolean(invoice));
  const [pilihMetode, setPilihMetode] = useState("");
  const [bayarLoading, setBayarLoading] = useState(false);
  const [bayarError, setBayarError] = useState("");
  const [metodeList, setMetodeList] = useState<MetodeBayar[]>(DUITKU_METHODS);

  const muatDetail = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/publik/tagihan-detail?invoice=${encodeURIComponent(invoice)}`
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Tagihan tidak ditemukan");
      } else {
        setDetail(data);
      }
    } catch {
      setError("Gagal menghubungi server, coba lagi");
    } finally {
      setLoading(false);
    }
  }, [invoice]);

  useEffect(() => {
    if (invoice) {
      (async () => {
        await muatDetail();
      })();
    }
  }, [invoice, muatDetail]);

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
      <div className="max-w-xl mx-auto px-4 py-12 text-center text-bone-dim">
        Memuat tagihan...
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12">
        <div className="bg-danger/5 border border-danger/40 text-red-700 rounded-xl p-6 text-center">
          <p className="font-semibold">Tagihan Tidak Ditemukan</p>
          <p className="text-sm mt-1">{error || "Pastikan link invoice benar."}</p>
          <Link href="/bayar" className="inline-block mt-4 text-sm text-vest hover:underline">
            ← Cek tagihan via kode pelanggan
          </Link>
        </div>
      </div>
    );
  }

  const lunas = detail.status === "lunas";
  const namaPeriode = `${BULAN_INDO[detail.bulan - 1]} ${detail.tahun}`;
  const invoiceUrl = `/invoice-tagihan?invoice=${encodeURIComponent(detail.noInvoice)}`;

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-10">
      {/* Kartu tagihan — pola skylite.id */}
      <div className="bg-panel rounded-2xl border border-asphalt-line shadow-sm overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-dashed border-asphalt-line">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-vest flex items-center justify-center">
              <span className="text-white font-bold text-sm">W</span>
            </div>
            <Link
              href={invoiceUrl}
              target="_blank"
              className="inline-flex items-center gap-1.5 text-xs text-danger hover:bg-danger/5 rounded-lg px-2.5 py-1.5 font-medium transition"
              title="PDF Invoice"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              PDF Invoice
            </Link>
          </div>
        </div>

        <div className="px-6 py-2 divide-y divide-dashed divide-asphalt-line">
          <Baris label="No. Tagihan" value={<span className="font-mono">{detail.noInvoice}</span>} />
          <Baris label="Atas Nama" value={detail.pelanggan.nama} />
          <Baris label="Periode Tagihan" value={namaPeriode} />
          <Baris
            label={
              <>
                Total Tagihan <small className="font-normal text-bone-faint">(+ {detail.ppnRate}% PPN)</small>
              </>
            }
            value={<span className="font-semibold">{formatRupiahSkylite(detail.total)}</span>}
          />
          {detail.denda > 0 && (
            <Baris
              label="Denda Keterlambatan"
              value={<span className="text-danger">{formatRupiahSkylite(detail.denda)}</span>}
            />
          )}
          <Baris
            label="Jatuh Tempo"
            value={<span className="font-bold text-danger">{formatTanggalIndo(detail.jatuhTempo)}</span>}
          />
        </div>
      </div>

      {bayarError && (
        <div className="bg-danger/5 border border-danger/40 text-red-700 rounded-xl p-4 mt-4 text-sm">
          {bayarError}
        </div>
      )}

      {lunas ? (
        /* Status lunas — pola skylite.id */
        <div className="bg-vest/5 border border-vest/40 rounded-2xl p-6 mt-4 text-center">
          <h4 className="text-emerald-800 font-semibold">
            Tagihan ini sudah dibayar dan dilunaskan pada:
            <br />
            <strong className="block mt-1">
              {detail.tanggalLunas
                ? formatTanggalWaktuIndo(detail.tanggalLunas)
                : formatTanggalWaktuIndo(new Date().toISOString())}
            </strong>
          </h4>
          {detail.pembayaranLunas && (
            <p className="text-sm text-vest mt-2">
              Metode: {labelMetodePembayaran(detail.pembayaranLunas.metode)}
            </p>
          )}
          <div className="mt-4 grid gap-2">
            <Link
              href={invoiceUrl}
              className="chamfer-sm bg-vest hover:bg-vest-bright text-asphalt-deep py-2.5 rounded-xl text-sm font-medium transition"
            >
              Lihat Bukti Pembayaran
            </Link>
          </div>
        </div>
      ) : (
        /* Belum bayar: pilih metode + bayar online — pola skylite.id */
        <div className="bg-panel rounded-2xl border border-asphalt-line shadow-sm p-6 mt-4">
          <h4 className="font-semibold text-bone mb-1">Metode Pembayaran</h4>
          <p className="text-sm text-bone-dim mb-4">
            Pilih metode pembayaran, lalu Anda akan diarahkan ke halaman pembayaran aman.
          </p>

          <div className="grid grid-cols-2 gap-2 mb-5">
            {metodeList.map((m) => (
              <div
                key={m.value}
                onClick={() => setPilihMetode(m.value)}
                className={`payment-card flex items-center gap-2 border rounded-xl px-3 py-2.5 text-sm text-bone-dim cursor-pointer transition ${
                  pilihMetode === m.value
                    ? "border-vest bg-vest/5"
                    : "border-asphalt-line hover:border-vest/40"
                }`}
              >
                <span>{m.icon}</span>
                <span>{m.label}</span>
              </div>
            ))}
          </div>

          <button
            onClick={bayarOnline}
            disabled={bayarLoading || !detail.duitkuAktif}
            className="w-full chamfer-sm bg-vest hover:bg-vest-bright disabled:opacity-50 text-asphalt-deep py-3 rounded-xl text-sm font-medium transition"
          >
            {bayarLoading
              ? "Menyiapkan pembayaran..."
              : detail.duitkuAktif
                ? `Bayar ${formatRupiahSkylite(detail.total)}`
                : "Pembayaran online belum aktif — hubungi pengelola"}
          </button>
          {!detail.duitkuAktif && (
            <p className="text-xs text-bone-faint mt-2 text-center">
              Atau gunakan menu <Link href="/bayar" className="text-vest underline">Cek Tagihan</Link> untuk kirim bukti transfer manual.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Baris({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center py-3">
      <h6 className="text-sm text-bone-dim">{label}</h6>
      <p className="text-sm text-bone text-right">{value}</p>
    </div>
  );
}
