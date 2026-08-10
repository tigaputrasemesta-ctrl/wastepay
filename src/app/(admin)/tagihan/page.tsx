"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatRupiah, formatDate } from "@/lib/utils";
import { useToast } from "@/components/Toast";
import { duitkuChannelLabel } from "@/lib/duitku-channels";
import { useUser } from "@/hooks/useUser";
import { hitungRincian } from "@/lib/invoice-format";

const METODE_LABEL: Record<string, string> = {
  tunai: "Tunai",
  transfer: "Transfer Bank",
  ewallet: "E-Wallet",
  qris: "QRIS",
  virtual_account: "Virtual Account",
  duitku: "Payment Gateway",
};

function labelMetode(metode: string) {
  if (metode.startsWith("duitku")) {
    return duitkuChannelLabel(metode.replace(/^duitku(\s*[:|-]\s*)?/, ""));
  }
  return METODE_LABEL[metode] || metode;
}

type Tagihan = {
  id: number;
  noInvoice?: string;
  bulan: number;
  tahun: number;
  jumlah: number;
  denda?: number;
  status: string;
  jatuhTempo: string;
  tanggalLunas?: string;
  pelanggan: { id: number; nama: string; alamat: string; noTelepon: string; kodePelanggan?: string; kategori?: string; customTarif?: number };
  pembayaran: { id: number; jumlah: number; metode: string; createdAt: string }[];
};

type PembayaranPending = {
  id: number;
  jumlah: number;
  metode: string;
  catatan?: string;
  buktiBayar?: string | null;
  createdAt: string;
  pelanggan: { id: number; nama: string; kodePelanggan: string };
  tagihan: { bulan: number; tahun: number; jumlah: number };
  duitkuTransaction?: { orderId: string; statusCode?: string | null; paymentUrl?: string | null } | null;
};

function isGateway(metode: string) {
  return metode.startsWith("duitku");
}

export default function TagihanPage() {
  const { user } = useUser();
  const isPetugas = user?.role === "petugas";
  const { showToast } = useToast();
  const [tagihan, setTagihan] = useState<Tagihan[]>([]);
  const [pending, setPending] = useState<PembayaranPending[]>([]);
  const [loading, setLoading] = useState(true);
  const [bulan, setBulan] = useState((new Date().getMonth() + 1).toString());
  const [tahun, setTahun] = useState(new Date().getFullYear().toString());
  const [status, setStatus] = useState("");
  const [showGenerate, setShowGenerate] = useState(false);
  const [showAutoGenerate, setShowAutoGenerate] = useState(false);
  const [autoResult, setAutoResult] = useState<{ message: string; created: number; skipped: number } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [showBayar, setShowBayar] = useState<{ tagihanId: number; pelangganId: number; jumlah: number } | null>(null);
  const [formBayar, setFormBayar] = useState({ metode: "transfer", catatan: "" });

  const fetchTagihan = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (bulan) params.set("bulan", bulan);
      if (tahun) params.set("tahun", tahun);
      if (status) params.set("status", status);
      // Petugas tagih → hanya tagihan pelanggan di wilayahnya
      if (isPetugas) params.set("saya", "1");

      const res = await fetch(`/api/tagihan?${params}`);
      const data = await res.json();
      setTagihan(data);

      const pendingParams = new URLSearchParams();
      pendingParams.set("status", "pending");
      if (isPetugas) pendingParams.set("saya", "1");
      const pendingRes = await fetch(`/api/pembayaran?${pendingParams}`);
      setPending(await pendingRes.json());
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [bulan, tahun, status, isPetugas]);

  useEffect(() => {
    (async () => { await fetchTagihan(); })();
  }, [fetchTagihan]);

  const [formGenerate, setFormGenerate] = useState({
    jumlah: "",
    bulan: (new Date().getMonth() + 1).toString(),
    tahun: new Date().getFullYear().toString(),
    untukSemua: true,
    pelangganId: "",
  });

  const [formAuto, setFormAuto] = useState({
    bulan: (new Date().getMonth() + 1).toString(),
    tahun: new Date().getFullYear().toString(),
  });

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/tagihan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formGenerate.untukSemua
        ? { jumlah: formGenerate.jumlah, bulan: formGenerate.bulan, tahun: formGenerate.tahun }
        : { ...formGenerate, pelangganId: formGenerate.pelangganId }),
    });
    if (res.ok) {
      setShowGenerate(false);
      showToast("Tagihan berhasil digenerate");
      fetchTagihan();
    } else {
      const data = await res.json();
      showToast(data.error || "Gagal generate", "error");
    }
  }

  async function handleAutoGenerate(e: React.FormEvent) {
    e.preventDefault();
    setGenerating(true);
    setAutoResult(null);
    const res = await fetch("/api/tagihan/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bulan: parseInt(formAuto.bulan),
        tahun: parseInt(formAuto.tahun),
      }),
    });
    const data = await res.json();
    setAutoResult(data);
    setGenerating(false);
    if (res.ok) {
      fetchTagihan();
    }
  }

  async function verifikasiPembayaran(id: number, statusBaru: string) {
    const res = await fetch(`/api/pembayaran/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: statusBaru }),
    });
    if (res.ok) {
      showToast(
        statusBaru === "terverifikasi"
          ? "Pembayaran terverifikasi — tagihan lunas"
          : "Pembayaran ditolak"
      );
      fetchTagihan();
    } else {
      const data = await res.json();
      showToast(data.error || "Gagal memproses", "error");
    }
  }

  // Pembayaran gateway (Duitku) tidak bisa diverifikasi manual — cek status live ke penyedia.
  const [cekLoading, setCekLoading] = useState<number | null>(null);
  async function cekStatusGateway(pembayaranId: number, orderId: string) {
    setCekLoading(pembayaranId);
    try {
      const res = await fetch(`/api/publik/duitku/status?orderId=${encodeURIComponent(orderId)}`);
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Gagal cek status", "error");
      } else if (data.tagihanStatus === "lunas") {
        showToast("Pembayaran lunas — tagihan terverifikasi otomatis");
        fetchTagihan();
      } else {
        showToast(
          `Status Duitku: ${data.duitkuStatus?.statusMessage || data.pembayaranStatus || "pending"}`,
          data.pembayaranStatus === "ditolak" ? "error" : "info"
        );
        fetchTagihan();
      }
    } catch {
      showToast("Gagal menghubungi Duitku", "error");
    } finally {
      setCekLoading(null);
    }
  }

  async function handleBayar(e: React.FormEvent) {
    e.preventDefault();
    if (!showBayar) return;
    const res = await fetch("/api/pembayaran", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tagihanId: showBayar.tagihanId,
        pelangganId: showBayar.pelangganId,
        jumlah: showBayar.jumlah,
        ...formBayar,
      }),
    });
    if (res.ok) {
      setShowBayar(null);
      showToast("Pembayaran berhasil dicatat");
      fetchTagihan();
    } else {
      const data = await res.json();
      showToast(data.error || "Gagal bayar", "error");
    }
  }

  const bulanList = [
    { value: "1", label: "Januari" }, { value: "2", label: "Februari" },
    { value: "3", label: "Maret" }, { value: "4", label: "April" },
    { value: "5", label: "Mei" }, { value: "6", label: "Juni" },
    { value: "7", label: "Juli" }, { value: "8", label: "Agustus" },
    { value: "9", label: "September" }, { value: "10", label: "Oktober" },
    { value: "11", label: "November" }, { value: "12", label: "Desember" },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-black uppercase tracking-tighter text-2xl text-black font-black">{isPetugas ? "Tagihan Saya" : "Tagihan"}</h1>
          <p className="text-sm text-gray-600 font-bold mt-1">
            {isPetugas
              ? "Tunggakan & tagihan warga di wilayah Anda — terima bayar tunai langsung"
              : "Kelola tagihan iuran bulanan"}
          </p>
        </div>
        {!isPetugas && (
        <>
        <button
          onClick={() => setShowGenerate(true)}
          className="shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:-translate-y-1 transition-all bg-green-400 hover:bg-green-300 text-black px-4 py-2 rounded-none text-sm font-medium transition flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Generate Tagihan
        </button>
        <button
          onClick={() => { setShowAutoGenerate(true); setAutoResult(null); }}
          className="bg-blue-600 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:-translate-y-1 transition-all bg-green-300 text-black px-4 py-2 rounded-none text-sm font-medium transition flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Auto-Generate
        </button>
        </>
        )}
      </div>

      {/* Pembayaran pending menunggu verifikasi */}
      {pending.length > 0 && (
        <div className="bg-amber/5 border border-amber-200 rounded-none-xl p-4 mb-4">
          <h3 className="font-semibold text-amber-900 text-sm mb-3">
            ⏳ Pembayaran menunggu verifikasi ({pending.length})
          </h3>
          <div className="space-y-2">
            {pending.map((p) => (
              <div key={p.id} className="flex items-center justify-between bg-hm-card bg-white p-0 overflow-hidden rounded-none border border-amber-200 px-4 py-2.5 flex-wrap gap-2">
                <div>
                  <div className="text-sm font-medium text-black font-black">
                    {p.pelanggan.nama}{" "}
                    <span className="text-xs text-gray-600 font-bold font-normal">({p.pelanggan.kodePelanggan})</span>
                  </div>
                  <div className="text-xs text-gray-600 font-bold">
                    {formatRupiah(p.jumlah)} • {labelMetode(p.metode)} •{" "}
                    {bulanList.find((b) => b.value === p.tagihan.bulan.toString())?.label} {p.tagihan.tahun}
                  </div>
                  {p.buktiBayar && (
                    <div className="mt-1">
                      <details className="text-xs">
                        <summary className="cursor-pointer text-green-600 hover:text-green-600 font-medium">Lihat bukti</summary>
                        <Image src={p.buktiBayar} alt="Bukti pembayaran" width={240} height={180} unoptimized className="mt-2 max-h-40 rounded-none border-2 border-black object-cover" />
                      </details>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  {isGateway(p.metode) ? (
                    p.duitkuTransaction?.orderId ? (
                      <button
                        onClick={() => cekStatusGateway(p.id, p.duitkuTransaction!.orderId!)}
                        disabled={cekLoading === p.id}
                        className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-none hover:bg-indigo-700 transition disabled:opacity-50"
                      >
                        {cekLoading === p.id ? "Mengecek…" : "⟳ Cek Status Live"}
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400 font-bold italic">Transaksi gateway tanpa orderId</span>
                    )
                  ) : (
                    <>
                      <button
                        onClick={() => verifikasiPembayaran(p.id, "terverifikasi")}
                        className="text-xs shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:-translate-y-1 transition-all shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:-translate-y-1 transition-all bg-green-400 text-black px-3 py-1.5 rounded-none hover:bg-green-300 transition"
                      >
                        Verifikasi
                      </button>
                      <button
                        onClick={() => verifikasiPembayaran(p.id, "ditolak")}
                        className="text-xs bg-danger/5 text-red-700 border border-danger/40 px-3 py-1.5 rounded-none hover:bg-danger/10 transition"
                      >
                        Tolak
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <select
          value={bulan}
          onChange={(e) => setBulan(e.target.value)}
          className="px-3 py-2 border-2 border-black rounded-none text-sm focus:outline-none focus:ring-2 focus:ring-black"
        >
          <option value="">Semua Bulan</option>
          {bulanList.map((b) => (
            <option key={b.value} value={b.value}>{b.label}</option>
          ))}
        </select>
        <select
          value={tahun}
          onChange={(e) => setTahun(e.target.value)}
          className="px-3 py-2 border-2 border-black rounded-none text-sm focus:outline-none focus:ring-2 focus:ring-black"
        >
          {[2024, 2025, 2026, 2027, 2028].map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-2 border-2 border-black rounded-none text-sm focus:outline-none focus:ring-2 focus:ring-black"
        >
          <option value="">Semua Status</option>
          <option value="belum_bayar">Belum Bayar</option>
          <option value="lunas">Lunas</option>
          <option value="tunggakan">Tunggakan</option>
        </select>
      </div>

      {/* Table */}
      <div className="hm-card bg-white p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-black text-white font-black border-b border-2 border-black">
                <th className="text-left px-4 py-3 font-medium text-gray-600 font-bold">Kode</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 font-bold">No. Invoice</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 font-bold">Pelanggan</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 font-bold">Periode</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 font-bold">Jumlah</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 font-bold">Jatuh Tempo</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600 font-bold">Status</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600 font-bold">Pembayaran</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400 font-bold">Memuat...</td></tr>
              ) : tagihan.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400 font-bold">Belum ada tagihan</td></tr>
              ) : (
                tagihan.map((t) => (
                  <tr key={t.id} className="border-b border-2 border-black hover:bg-gray-100 border-2 border-black">
                    <td className="px-4 py-3">
                      <code className="text-xs font-mono font-bold text-black font-black bg-gray-100 border-2 border-black px-1.5 py-0.5 rounded-none">
                        {t.pelanggan.kodePelanggan}
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      {t.noInvoice ? (
                        <Link
                          href={`/invoice-tagihan?invoice=${encodeURIComponent(t.noInvoice)}`}
                          target="_blank"
                          className="text-xs font-mono text-green-600 hover:text-sky-300 hover:underline"
                          title="Buka invoice"
                        >
                          {t.noInvoice}
                        </Link>
                      ) : (
                        <span className="text-xs text-gray-400 font-bold">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-black font-black">{t.pelanggan.nama}</div>
                      <div className="text-xs text-gray-600 font-bold">{t.pelanggan.noTelepon}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-bold">
                      {bulanList.find((b) => b.value === t.bulan.toString())?.label} {t.tahun}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatRupiah(t.jumlah + (t.denda || 0))}
                      {t.denda ? <span className="block text-xs text-red-600">+ denda {formatRupiah(t.denda)}</span> : null}
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-bold text-xs">{formatDate(t.jatuhTempo)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-none-full text-xs font-medium ${
                        t.status === "lunas" ? "bg-emerald-400/10 text-emerald-400 border border-emerald-500/30" :
                        t.status === "tunggakan" ? "bg-danger/10 text-red-400 border border-red-500/30" :
                        "bg-amber-400/10 text-amber-400 border border-amber-500/30"
                      }`}>
                        {t.status === "belum_bayar" ? "Belum Bayar" : t.status === "lunas" ? "Lunas" : "Tunggakan"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {t.status !== "lunas" ? (
                        <button
                          onClick={() => { setFormBayar({ metode: isPetugas ? "tunai" : "transfer", catatan: isPetugas ? "Bayar tunai via petugas tagih" : "" }); setShowBayar({ tagihanId: t.id, pelangganId: t.pelanggan.id, jumlah: hitungRincian(t.jumlah, t.denda).total }); }}
                          className="text-xs bg-green-400/10 text-green-600 border border-vest/30 px-3 py-1 rounded-none-full hover:bg-green-400/20 transition"
                        >
                          Bayar
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400 font-bold">
                          {t.tanggalLunas ? formatDate(t.tanggalLunas) : "-"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Auto Generate */}
      {showAutoGenerate && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="hm-card bg-white p-0 overflow-hidden w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-2 border-black">
              <h2 className="font-semibold text-black font-black">Auto-Generate Tagihan Bulanan</h2>
              <button onClick={() => { setShowAutoGenerate(false); setAutoResult(null); }} className="text-gray-400 font-bold hover:text-gray-600 font-bold">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleAutoGenerate} className="p-6 space-y-4">
              <div className="bg-sky-500/10 border border-sky-500/30 rounded-none p-3 text-sm text-sky-300">
                <p className="font-medium mb-1">ℹ️ Cara Kerja</p>
                <p>Sistem akan membuat tagihan untuk semua pelanggan aktif yang belum memiliki tagihan di periode yang dipilih. Tarif dihitung berdasarkan: tarif kustom &gt; paket &gt; kategori tarif default.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 font-bold mb-1">Periode</label>
                <div className="grid grid-cols-2 gap-3">
                  <select value={formAuto.bulan} onChange={(e) => setFormAuto({ ...formAuto, bulan: e.target.value })} className="px-3 py-2 border-2 border-black rounded-none text-sm" required>
                    {bulanList.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
                  </select>
                  <select value={formAuto.tahun} onChange={(e) => setFormAuto({ ...formAuto, tahun: e.target.value })} className="px-3 py-2 border-2 border-black rounded-none text-sm" required>
                    {[2024, 2025, 2026, 2027, 2028].map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {autoResult && (
                <div className="p-3 rounded-none text-sm bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  <p className="font-medium">{autoResult.message}</p>
                  <p className="text-xs mt-1">Dibuat: {autoResult.created} | Sudah ada: {autoResult.skipped}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowAutoGenerate(false); setAutoResult(null); }} className="flex-1 px-4 py-2 border-2 border-black rounded-none text-sm text-gray-600 font-bold hover:bg-gray-100 border-2 border-black">Batal</button>
                <button type="submit" disabled={generating} className="flex-1 px-4 py-2 shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:-translate-y-1 transition-all shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:-translate-y-1 transition-all bg-green-400 text-black rounded-none text-sm hover:bg-green-300 disabled:opacity-50">
                  {generating ? "Memproses..." : "Generate Sekarang"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Generate */}
      {showGenerate && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="hm-card bg-white p-0 overflow-hidden w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-2 border-black">
              <h2 className="font-semibold text-black font-black">Generate Tagihan</h2>
              <button onClick={() => setShowGenerate(false)} className="text-gray-400 font-bold hover:text-gray-600 font-bold">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleGenerate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 font-bold mb-1">Periode</label>
                <div className="grid grid-cols-2 gap-3">
                  <select value={formGenerate.bulan} onChange={(e) => setFormGenerate({ ...formGenerate, bulan: e.target.value })} className="px-3 py-2 border-2 border-black rounded-none text-sm" required>
                    {bulanList.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
                  </select>
                  <select value={formGenerate.tahun} onChange={(e) => setFormGenerate({ ...formGenerate, tahun: e.target.value })} className="px-3 py-2 border-2 border-black rounded-none text-sm" required>
                    {[2024, 2025, 2026, 2027, 2028].map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 font-bold mb-1">Jumlah Tagihan</label>
                <input type="number" value={formGenerate.jumlah} onChange={(e) => setFormGenerate({ ...formGenerate, jumlah: e.target.value })} className="w-full px-3 py-2 border-2 border-black rounded-none text-sm" placeholder="50000" required />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="untukSemua" checked={formGenerate.untukSemua} onChange={(e) => setFormGenerate({ ...formGenerate, untukSemua: e.target.checked })} className="rounded-none border-2 border-black" />
                <label htmlFor="untukSemua" className="text-sm text-gray-600 font-bold">Generate untuk semua pelanggan aktif</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowGenerate(false)} className="flex-1 px-4 py-2 border-2 border-black rounded-none text-sm text-gray-600 font-bold hover:bg-gray-100 border-2 border-black">Batal</button>
                <button type="submit" className="flex-1 px-4 py-2 shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:-translate-y-1 transition-all shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:-translate-y-1 transition-all bg-green-400 text-black rounded-none text-sm hover:bg-green-300">Generate</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Bayar */}
      {showBayar && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="hm-card bg-white p-0 overflow-hidden w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-2 border-black">
              <h2 className="font-semibold text-black font-black">Catat Pembayaran</h2>
              <button onClick={() => setShowBayar(null)} className="text-gray-400 font-bold hover:text-gray-600 font-bold">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleBayar} className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-600 font-bold">Jumlah Tagihan</p>
                <p className="font-black uppercase tracking-tighter text-2xl text-black font-black">{formatRupiah(showBayar.jumlah)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 font-bold mb-1">Metode Pembayaran</label>
                <select value={formBayar.metode} onChange={(e) => setFormBayar({ ...formBayar, metode: e.target.value })} className="w-full px-3 py-2 border-2 border-black rounded-none text-sm" required disabled={isPetugas}>
                  {isPetugas ? (
                    <option value="tunai">Tunai (diterima petugas)</option>
                  ) : (
                    <>
                      <option value="transfer">Transfer Bank</option>
                      <option value="ewallet">E-Wallet</option>
                      <option value="qris">QRIS</option>
                      <option value="virtual_account">Virtual Account</option>
                      <option value="tunai">Tunai</option>
                    </>
                  )}
                </select>
                {isPetugas && (
                  <p className="text-xs text-green-600 bg-green-400/5 border border-vest/20 rounded-none px-3 py-2 mt-2">
                    Anda mencatat <b>pembayaran tunai</b> — tercatat atas nama Anda & langsung lunas.
                  </p>
                )}
                {formBayar.metode !== "tunai" && (
                  <p className="text-xs text-amber bg-amber/5 border border-amber-200 rounded-none px-3 py-2 mt-2">
                    Pembayaran non-tunai dicatat sebagai <b>pending</b> dan perlu diverifikasi admin di hm-card bg-white p-0 overflow-hidden di atas.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 font-bold mb-1">Catatan (opsional)</label>
                <input type="text" value={formBayar.catatan} onChange={(e) => setFormBayar({ ...formBayar, catatan: e.target.value })} className="w-full px-3 py-2 border-2 border-black rounded-none text-sm" placeholder="Bayar tunai via petugas" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowBayar(null)} className="flex-1 px-4 py-2 border-2 border-black rounded-none text-sm text-gray-600 font-bold hover:bg-gray-100 border-2 border-black">Batal</button>
                <button type="submit" className="flex-1 px-4 py-2 shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:-translate-y-1 transition-all shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:-translate-y-1 transition-all bg-green-400 text-black rounded-none text-sm hover:bg-green-300">Konfirmasi Bayar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
