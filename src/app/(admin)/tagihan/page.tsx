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
  pelanggan: {
    id: number;
    nama: string;
    alamat: string;
    noTelepon: string;
    kodePelanggan?: string;
    kategori?: string;
    customTarif?: number;
    rtRw?: string | null;
    wilayah?: {
      id: number;
      nama: string;
      rt?: string | null;
      rw?: string | null;
    } | null;
  };
  pembayaran: { id: number; jumlah: number; metode: string; status: string; createdAt: string }[];
};

type WilayahItem = {
  id: number;
  nama: string;
  rt?: string | null;
  rw?: string | null;
  kelurahanRef?: { nama: string } | null;
};

type BlastRecipient = {
  pelangganId: number;
  nama: string;
  noTelepon: string;
  tagihanId: number;
  noInvoice: string;
  total: number;
  denda: number;
  status: string;
  rtRw: string;
};

type BlastPreviewData = {
  totalWarga: number;
  totalNominal: number;
  sampleMessage: string;
  recipients: BlastRecipient[];
  isWaConfigured: boolean;
};

type BlastResultData = {
  message: string;
  autoSend: boolean;
  hasil: {
    batchId?: string;
    total: number;
    terkirim: number;
    pending: number;
    gagal: number;
    links?: Array<{ pelangganId: number; nama: string; noTelepon: string; link: string }>;
  };
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

type PreviewItem = {
  pelangganId: number;
  nama: string;
  kodePelanggan: string;
  kategori: string;
  noTelepon: string | null;
  paket: string | null;
  jumlah: number;
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

  // Filter Wilayah & RT
  const [wilayahList, setWilayahList] = useState<WilayahItem[]>([]);
  const [wilayahId, setWilayahId] = useState("");
  const [rtFilter, setRtFilter] = useState("");

  // Blast WA RT state
  const [showBlastModal, setShowBlastModal] = useState(false);
  const [blastWilayahId, setBlastWilayahId] = useState("");
  const [blastRt, setBlastRt] = useState("");
  const [blastStatusFilter, setBlastStatusFilter] = useState("semua_belum_lunas");
  const [blastBulan, setBlastBulan] = useState((new Date().getMonth() + 1).toString());
  const [blastTahun, setBlastTahun] = useState(new Date().getFullYear().toString());
  const [blastLoading, setBlastLoading] = useState(false);
  const [blastSending, setBlastSending] = useState(false);
  const [blastPreview, setBlastPreview] = useState<BlastPreviewData | null>(null);
  const [blastResult, setBlastResult] = useState<BlastResultData | null>(null);
  const [copiedMessage, setCopiedMessage] = useState(false);

  const [showGenerate, setShowGenerate] = useState(false);
  const [showAutoGenerate, setShowAutoGenerate] = useState(false);
  const [autoResult, setAutoResult] = useState<{ message: string; created: number; skipped: number } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<PreviewItem[] | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showBayar, setShowBayar] = useState<{ tagihanId: number; pelangganId: number; jumlah: number } | null>(null);
  const [formBayar, setFormBayar] = useState({ metode: "transfer", catatan: "" });

  const fetchTagihan = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (bulan) params.set("bulan", bulan);
      if (tahun) params.set("tahun", tahun);
      if (status) params.set("status", status);
      if (wilayahId) params.set("wilayahId", wilayahId);
      if (rtFilter.trim()) params.set("rt", rtFilter.trim());
      // Petugas tagih → hanya tagihan pelanggan di wilayahnya
      if (isPetugas) params.set("saya", "1");

      const res = await fetch(`/api/tagihan?${params}`);
      const data = await res.json();
      setTagihan(Array.isArray(data) ? data : []);

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
  }, [bulan, tahun, status, wilayahId, rtFilter, isPetugas]);

  useEffect(() => {
    (async () => { await fetchTagihan(); })();
  }, [fetchTagihan]);

  useEffect(() => {
    fetch("/api/wilayah")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setWilayahList(data);
      })
      .catch((err) => console.error("Gagal memuat daftar wilayah:", err));
  }, []);

  async function loadBlastPreview(
    wId: string = blastWilayahId,
    rtVal: string = blastRt,
    bln: string = blastBulan,
    thn: string = blastTahun,
    stFilter: string = blastStatusFilter
  ) {
    setBlastLoading(true);
    setBlastResult(null);
    try {
      const res = await fetch("/api/tagihan/blast-rt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wilayahId: wId ? parseInt(wId) : undefined,
          rt: rtVal.trim() || undefined,
          bulan: bln || undefined,
          tahun: thn || undefined,
          statusFilter: stFilter,
          previewOnly: true,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setBlastPreview(data);
      } else {
        showToast(data.error || "Gagal memuat target blast WA", "error");
      }
    } catch {
      showToast("Gagal memuat preview blast WA", "error");
    } finally {
      setBlastLoading(false);
    }
  }

  function handleOpenBlastModal() {
    const initWilayah = wilayahId;
    const initRt = rtFilter;
    const initBulan = bulan;
    const initTahun = tahun;
    const initStatus = status === "belum_bayar" || status === "tunggakan" ? status : "semua_belum_lunas";

    setBlastWilayahId(initWilayah);
    setBlastRt(initRt);
    setBlastBulan(initBulan);
    setBlastTahun(initTahun);
    setBlastStatusFilter(initStatus);
    setBlastResult(null);
    setShowBlastModal(true);

    loadBlastPreview(initWilayah, initRt, initBulan, initTahun, initStatus);
  }

  async function handleSendBlast() {
    if (!blastPreview || blastPreview.totalWarga === 0) {
      showToast("Tidak ada tagihan yang perlu dikirim", "error");
      return;
    }

    const confirmText = blastPreview.isWaConfigured
      ? `Kirim pesan WhatsApp otomatis ke ${blastPreview.totalWarga} warga?`
      : `Siapkan link WhatsApp manual untuk ${blastPreview.totalWarga} warga?`;

    if (!window.confirm(confirmText)) return;

    setBlastSending(true);
    try {
      const res = await fetch("/api/tagihan/blast-rt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wilayahId: blastWilayahId ? parseInt(blastWilayahId) : undefined,
          rt: blastRt.trim() || undefined,
          bulan: blastBulan || undefined,
          tahun: blastTahun || undefined,
          statusFilter: blastStatusFilter,
          previewOnly: false,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setBlastResult(data);
        showToast(data.message || "Blast WA berhasil diproses", "success");
      } else {
        showToast(data.error || "Gagal memproses blast WA", "error");
      }
    } catch {
      showToast("Terjadi kesalahan sistem saat mengirim blast WA", "error");
    } finally {
      setBlastSending(false);
    }
  }

  function copySampleMessage(text: string) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedMessage(true);
      showToast("Format pesan disalin ke clipboard", "success");
      setTimeout(() => setCopiedMessage(false), 2000);
    }
  }

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

  async function handleAutoPreview() {
    setPreviewLoading(true);
    setAutoResult(null);
    setPreview(null);
    try {
      const res = await fetch("/api/tagihan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bulan: parseInt(formAuto.bulan),
          tahun: parseInt(formAuto.tahun),
          preview: true,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setPreview(data.preview || []);
        if ((data.preview || []).length === 0) {
          setAutoResult({ message: "Tidak ada pelanggan aktif yang perlu ditagih di periode ini.", created: 0, skipped: 0 });
        }
      } else {
        showToast(data.error || "Gagal memuat preview", "error");
      }
    } finally {
      setPreviewLoading(false);
    }
  }

  function updatePreviewJumlah(pelangganId: number, jumlah: number) {
    setPreview((prev) =>
      prev ? prev.map((p) => (p.pelangganId === pelangganId ? { ...p, jumlah } : p)) : prev
    );
  }

  async function handleAutoGenerate(e: React.FormEvent) {
    e.preventDefault();
    setGenerating(true);
    setAutoResult(null);
    const body = preview
      ? {
          bulan: parseInt(formAuto.bulan),
          tahun: parseInt(formAuto.tahun),
          items: preview.map((p) => ({ pelangganId: p.pelangganId, jumlah: p.jumlah })),
        }
      : {
          bulan: parseInt(formAuto.bulan),
          tahun: parseInt(formAuto.tahun),
        };
    const res = await fetch("/api/tagihan/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setAutoResult(data);
    setGenerating(false);
    if (res.ok) {
      setPreview(null);
      fetchTagihan();
    } else {
      showToast(data.error || "Gagal generate", "error");
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
        <div className="flex items-center gap-2">
        {!isPetugas && (
        <>
        <button
          onClick={handleOpenBlastModal}
          className="shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:-translate-y-1 transition-all bg-emerald-400 hover:bg-emerald-300 text-black border-2 border-black px-4 py-2 rounded-none text-sm font-black transition flex items-center gap-2"
          title="Kirim pesan WhatsApp massal ke seluruh warga yang belum bayar di RT tertentu"
        >
          <span className="text-base">📢</span>
          <span>Blast WA RT</span>
        </button>
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
          className="hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:-translate-y-1 transition-all bg-green-300 text-black px-4 py-2 rounded-none text-sm font-medium transition flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Auto-Generate
        </button>
        </>
        )}
        <Link
          href={`/tagihan-cetak?bulan=${bulan || new Date().getMonth() + 1}&tahun=${tahun || new Date().getFullYear()}`}
          target="_blank"
          className="bg-black text-white hover:bg-gray-800 px-4 py-2 rounded-none text-sm font-medium flex items-center gap-2"
        >
          🖨 Cetak Massal
        </Link>
        </div>
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
      <div className="flex gap-3 mb-4 flex-wrap items-center">
        <select
          value={bulan}
          onChange={(e) => setBulan(e.target.value)}
          className="px-3 py-2 border-2 border-black rounded-none text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white font-bold"
        >
          <option value="">Semua Bulan</option>
          {bulanList.map((b) => (
            <option key={b.value} value={b.value}>{b.label}</option>
          ))}
        </select>
        <select
          value={tahun}
          onChange={(e) => setTahun(e.target.value)}
          className="px-3 py-2 border-2 border-black rounded-none text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white font-bold"
        >
          {[2024, 2025, 2026, 2027, 2028].map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-2 border-2 border-black rounded-none text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white font-bold"
        >
          <option value="">Semua Status</option>
          <option value="belum_bayar">Belum Bayar</option>
          <option value="lunas">Lunas</option>
          <option value="tunggakan">Tunggakan</option>
        </select>

        {/* Filter Wilayah */}
        <select
          value={wilayahId}
          onChange={(e) => setWilayahId(e.target.value)}
          className="px-3 py-2 border-2 border-black rounded-none text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white font-bold"
        >
          <option value="">Semua Wilayah</option>
          {wilayahList.map((w) => (
            <option key={w.id} value={w.id.toString()}>
              {w.nama} {w.rt ? `(RT ${w.rt}${w.rw ? `/RW ${w.rw}` : ""})` : ""}
            </option>
          ))}
        </select>

        {/* Filter RT Cepat */}
        <div className="relative flex items-center">
          <input
            type="text"
            placeholder="Filter RT (misal: 01, 02)..."
            value={rtFilter}
            onChange={(e) => setRtFilter(e.target.value)}
            className="px-3 py-2 border-2 border-black rounded-none text-sm focus:outline-none focus:ring-2 focus:ring-black w-48 bg-white font-bold placeholder:font-normal placeholder:text-gray-500"
          />
          {rtFilter && (
            <button
              onClick={() => setRtFilter("")}
              className="absolute right-2 text-xs font-bold text-gray-500 hover:text-black"
              title="Hapus filter RT"
            >
              ✕
            </button>
          )}
        </div>

        {(wilayahId || rtFilter || status || bulan !== (new Date().getMonth() + 1).toString()) && (
          <button
            onClick={() => {
              setWilayahId("");
              setRtFilter("");
              setStatus("");
              setBulan((new Date().getMonth() + 1).toString());
              setTahun(new Date().getFullYear().toString());
            }}
            className="px-3 py-2 text-xs font-black uppercase text-gray-800 bg-gray-200 hover:bg-gray-300 border-2 border-black transition"
          >
            Reset Filter
          </button>
        )}

        {(rtFilter || wilayahId) && (
          <div className="flex items-center gap-1.5 text-xs font-bold bg-yellow-200 border-2 border-black px-3 py-1.5">
            <span>🔍 Filter RT:</span>
            {wilayahId && (
              <span className="font-black underline">
                {wilayahList.find((w) => w.id === parseInt(wilayahId))?.nama || "Wilayah"}
              </span>
            )}
            {rtFilter && (
              <span className="font-black bg-black text-white px-2 py-0.5 text-[10px]">
                RT {rtFilter}
              </span>
            )}
            <span className="text-gray-800">({tagihan.length} tagihan)</span>
          </div>
        )}
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
                      <div className="text-xs text-gray-600 font-bold">{t.pelanggan.noTelepon || "-"}</div>
                      {(t.pelanggan.rtRw || t.pelanggan.wilayah?.nama || t.pelanggan.wilayah?.rt) && (
                        <div className="mt-1">
                          <span className="inline-flex items-center text-[10px] font-black bg-yellow-300 text-black border border-black px-1.5 py-0.5">
                            📍 {t.pelanggan.rtRw || `${t.pelanggan.wilayah?.nama || ""}${t.pelanggan.wilayah?.rt ? ` (RT ${t.pelanggan.wilayah.rt})` : ""}`}
                          </span>
                        </div>
                      )}
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
                          className="text-xs font-black bg-green-500 hover:bg-green-400 text-black border-2 border-black px-3.5 py-1.5 shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-[3px_3px_0_0_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[1px_1px_0_0_rgba(0,0,0,1)] transition-all uppercase inline-flex items-center gap-1"
                        >
                          <span>💳</span>
                          <span>Bayar</span>
                        </button>
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-xs text-gray-400 font-bold">
                            {t.tanggalLunas ? formatDate(t.tanggalLunas) : "-"}
                          </span>
                          {t.pembayaran
                            .filter((pb) => pb.status === "terverifikasi")
                            .map((pb) => (
                              <Link
                                key={pb.id}
                                href={`/kwitansi/${pb.id}`}
                                target="_blank"
                                className="text-xs text-green-600 underline hover:text-green-700"
                              >
                                Kwitansi
                              </Link>
                            ))}
                        </div>
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
          <div className="bg-white w-full max-w-2xl border-4 border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between px-6 py-4 border-b-4 border-black bg-sky-300">
              <h2 className="font-black uppercase tracking-widest">Auto-Generate Tagihan</h2>
              <button onClick={() => { setShowAutoGenerate(false); setAutoResult(null); setPreview(null); }} className="font-black text-xl hover:text-white">&times;</button>
            </div>
            <form onSubmit={handleAutoGenerate} className="p-6 space-y-4">
              <div className="bg-sky-100 border-2 border-black p-3 text-sm">
                <p className="font-black uppercase text-xs mb-1">ℹ️ Cara Kerja</p>
                <p>Nominal dihitung otomatis (tarif kustom → paket → Level). Klik <b>Muat Preview</b> untuk melihat & mengubah nominal per pelanggan sebelum generate.</p>
              </div>
              <div>
                <label className="block text-xs font-black uppercase mb-1">Periode</label>
                <div className="grid grid-cols-2 gap-3">
                  <select value={formAuto.bulan} onChange={(e) => { setFormAuto({ ...formAuto, bulan: e.target.value }); setPreview(null); setAutoResult(null); }} className="px-3 py-2 border-2 border-black text-sm font-bold uppercase" required>
                    {bulanList.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
                  </select>
                  <select value={formAuto.tahun} onChange={(e) => { setFormAuto({ ...formAuto, tahun: e.target.value }); setPreview(null); setAutoResult(null); }} className="px-3 py-2 border-2 border-black text-sm font-bold uppercase" required>
                    {[2024, 2025, 2026, 2027, 2028].map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {preview === null && (
                <button type="button" onClick={handleAutoPreview} disabled={previewLoading} className="w-full bg-yellow-300 border-2 border-black py-3 font-black uppercase shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:bg-yellow-200 disabled:opacity-50">
                  {previewLoading ? "Memuat..." : "Muat Preview"}
                </button>
              )}

              {preview && preview.length > 0 && (
                <div className="border-2 border-black">
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-gray-100">
                        <tr className="text-[10px] font-black uppercase border-b-2 border-black">
                          <th className="px-3 py-2 text-left border-r-2 border-black">Pelanggan</th>
                          <th className="px-3 py-2 text-left border-r-2 border-black">Level</th>
                          <th className="px-3 py-2 text-right">Nominal (Rp)</th>
                        </tr>
                      </thead>
                      <tbody className="text-black">
                        {preview.map((p) => (
                          <tr key={p.pelangganId} className="border-b border-gray-300">
                            <td className="px-3 py-2 border-r-2 border-black">
                              <p className="font-black text-xs uppercase">{p.nama}</p>
                              <p className="text-[10px] text-gray-500">{p.kodePelanggan}{p.paket ? ` · ${p.paket}` : ""}</p>
                            </td>
                            <td className="px-3 py-2 border-r-2 border-black text-xs font-bold uppercase">{p.kategori.replace(/_/g, " ")}</td>
                            <td className="px-3 py-2 text-right">
                              <input type="number" min={0} value={p.jumlah} onChange={(e) => updatePreviewJumlah(p.pelangganId, Number(e.target.value))} className="w-28 px-2 py-1 border-2 border-black text-right text-sm font-black focus:bg-yellow-100 outline-none" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2 border-t-2 border-black bg-gray-100 text-xs font-black uppercase">
                    <span>{preview.length} tagihan</span>
                    <span>Total: {formatRupiah(preview.reduce((s, p) => s + (p.jumlah || 0), 0))}</span>
                  </div>
                </div>
              )}

              {autoResult && (
                <div className="p-3 text-sm bg-emerald-100 border-2 border-black">
                  <p className="font-black">{autoResult.message}</p>
                  <p className="text-xs mt-1">Dibuat: {autoResult.created} | Sudah ada: {autoResult.skipped}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowAutoGenerate(false); setAutoResult(null); setPreview(null); }} className="flex-1 px-4 py-2 border-2 border-black text-sm text-gray-600 font-black uppercase hover:bg-gray-100">Batal</button>
                <button type="submit" disabled={generating || (preview !== null && preview.length === 0)} className="flex-1 px-4 py-2 bg-green-400 text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:-translate-y-1 transition-all text-sm font-black uppercase hover:bg-green-300 disabled:opacity-50">
                  {generating ? "Memproses..." : preview ? `Generate (${preview.length})` : "Generate Semua"}
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
                <button type="button" onClick={() => setShowBayar(null)} className="flex-1 px-4 py-2.5 border-2 border-black text-sm text-gray-700 font-black hover:bg-gray-100 uppercase transition-all">Batal</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-green-500 hover:bg-green-400 text-black border-2 border-black font-black text-sm uppercase shadow-[3px_3px_0_0_rgba(0,0,0,1)] hover:shadow-[5px_5px_0_0_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[1px_1px_0_0_rgba(0,0,0,1)] transition-all">Konfirmasi Bayar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Blast WA Tagihan per RT */}
      {showBlastModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-3xl border-4 border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)] my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b-4 border-black bg-emerald-400">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📢</span>
                <div>
                  <h2 className="font-black uppercase tracking-tight text-lg text-black">Blast WA Tagihan RT</h2>
                  <p className="text-xs font-bold text-black/80">Kirim pengingat tagihan WhatsApp massal per wilayah / RT</p>
                </div>
              </div>
              <button
                onClick={() => { setShowBlastModal(false); setBlastResult(null); }}
                className="w-8 h-8 flex items-center justify-center font-black text-xl border-2 border-black bg-white hover:bg-black hover:text-white transition"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Filter / Kriteria Pengiriman */}
              <div className="bg-gray-50 border-2 border-black p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-black">🎯 Kriteria Target Penerima</span>
                  <button
                    type="button"
                    onClick={() => loadBlastPreview()}
                    disabled={blastLoading}
                    className="text-xs font-black bg-yellow-300 hover:bg-yellow-200 border-2 border-black px-2.5 py-1 shadow-[2px_2px_0_0_rgba(0,0,0,1)] active:shadow-none transition disabled:opacity-50"
                  >
                    {blastLoading ? "Memuat..." : "🔄 Refresh Target"}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-black uppercase mb-1">Wilayah</label>
                    <select
                      value={blastWilayahId}
                      onChange={(e) => {
                        setBlastWilayahId(e.target.value);
                        loadBlastPreview(e.target.value, blastRt, blastBulan, blastTahun, blastStatusFilter);
                      }}
                      className="w-full px-2.5 py-2 border-2 border-black text-xs font-bold bg-white focus:outline-none"
                    >
                      <option value="">Semua Wilayah</option>
                      {wilayahList.map((w) => (
                        <option key={w.id} value={w.id.toString()}>
                          {w.nama} {w.rt ? `(RT ${w.rt})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase mb-1">No. RT</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        placeholder="Contoh: 01, 02..."
                        value={blastRt}
                        onChange={(e) => setBlastRt(e.target.value)}
                        onBlur={() => loadBlastPreview(blastWilayahId, blastRt, blastBulan, blastTahun, blastStatusFilter)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            loadBlastPreview(blastWilayahId, blastRt, blastBulan, blastTahun, blastStatusFilter);
                          }
                        }}
                        className="w-full px-2.5 py-2 border-2 border-black text-xs font-bold bg-white focus:outline-none placeholder:text-gray-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase mb-1">Status Tagihan</label>
                    <select
                      value={blastStatusFilter}
                      onChange={(e) => {
                        setBlastStatusFilter(e.target.value);
                        loadBlastPreview(blastWilayahId, blastRt, blastBulan, blastTahun, e.target.value);
                      }}
                      className="w-full px-2.5 py-2 border-2 border-black text-xs font-bold bg-white focus:outline-none"
                    >
                      <option value="semua_belum_lunas">Semua Belum Lunas (Belum Bayar + Tunggakan)</option>
                      <option value="belum_bayar">Hanya Belum Bayar</option>
                      <option value="tunggakan">Hanya Tunggakan</option>
                    </select>
                  </div>
                </div>

                {/* Quick RT buttons */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] font-black uppercase text-gray-500">Pilih Cepat RT:</span>
                  {["01", "02", "03", "04", "05"].map((rtVal) => (
                    <button
                      key={rtVal}
                      type="button"
                      onClick={() => {
                        setBlastRt(rtVal);
                        loadBlastPreview(blastWilayahId, rtVal, blastBulan, blastTahun, blastStatusFilter);
                      }}
                      className={`text-[11px] font-black px-2 py-0.5 border border-black transition ${
                        blastRt === rtVal ? "bg-black text-white" : "bg-white hover:bg-yellow-200"
                      }`}
                    >
                      RT {rtVal}
                    </button>
                  ))}
                  {blastRt && (
                    <button
                      type="button"
                      onClick={() => {
                        setBlastRt("");
                        loadBlastPreview(blastWilayahId, "", blastBulan, blastTahun, blastStatusFilter);
                      }}
                      className="text-[11px] font-bold text-red-600 underline ml-1 hover:text-black"
                    >
                      Reset RT
                    </button>
                  )}
                </div>
              </div>

              {/* Status Gateway Banner */}
              {blastPreview && (
                <div
                  className={`p-3 border-2 border-black text-xs font-bold flex items-start gap-2.5 ${
                    blastPreview.isWaConfigured ? "bg-green-100 text-green-950" : "bg-amber-100 text-amber-950"
                  }`}
                >
                  <span className="text-base leading-none">
                    {blastPreview.isWaConfigured ? "⚡" : "ℹ️"}
                  </span>
                  <div className="flex-1">
                    <p className="font-black uppercase text-[11px]">
                      {blastPreview.isWaConfigured
                        ? "Gateway WhatsApp Aktif"
                        : "Mode Manual / Direct Link (WA_API_KEY Kosong)"}
                    </p>
                    <p className="text-[11px] mt-0.5">
                      {blastPreview.isWaConfigured
                        ? "Pesan dikirim langsung via API ke nomor HP pelanggan dengan delay anti-spam aman (1.2 detik/pesan)."
                        : "Sistem akan menyiapkan tautan direct link WhatsApp (wa.me) dengan pesan tagihan yang sudah siap kirim."}
                    </p>
                  </div>
                </div>
              )}

              {/* Ringkasan Target */}
              {blastPreview && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="border-2 border-black p-3 bg-yellow-200">
                    <p className="text-[10px] font-black uppercase text-gray-700">Target Warga</p>
                    <p className="text-2xl font-black text-black">{blastPreview.totalWarga} <span className="text-xs font-bold">Orang</span></p>
                  </div>
                  <div className="border-2 border-black p-3 bg-sky-200">
                    <p className="text-[10px] font-black uppercase text-gray-700">Total Nominal Tagihan</p>
                    <p className="text-xl font-black text-black">{formatRupiah(blastPreview.totalNominal)}</p>
                  </div>
                  <div className="border-2 border-black p-3 bg-white col-span-2 sm:col-span-1">
                    <p className="text-[10px] font-black uppercase text-gray-700">Filter Wilayah / RT</p>
                    <p className="text-xs font-black text-black mt-1">
                      {blastRt ? `RT ${blastRt}` : "Semua RT"}
                      {blastWilayahId ? ` · ${wilayahList.find((w) => w.id === parseInt(blastWilayahId))?.nama || ""}` : ""}
                    </p>
                  </div>
                </div>
              )}

              {/* Contoh Format Pesan WA */}
              {blastPreview && blastPreview.sampleMessage && (
                <div className="border-2 border-black p-3 bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                      <span>💬</span> Contoh Pesan WhatsApp Yang Dikirim
                    </span>
                    <button
                      type="button"
                      onClick={() => copySampleMessage(blastPreview.sampleMessage)}
                      className="text-[11px] font-black bg-gray-100 hover:bg-gray-200 border border-black px-2 py-0.5"
                    >
                      {copiedMessage ? "✅ Tersalin!" : "📋 Salin Pesan"}
                    </button>
                  </div>
                  <pre className="text-xs font-mono bg-gray-50 border border-gray-300 p-3 max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed text-gray-800">
                    {blastPreview.sampleMessage}
                  </pre>
                </div>
              )}

              {/* Daftar Penerima Preview */}
              {blastPreview && blastPreview.recipients.length > 0 && (
                <div className="border-2 border-black">
                  <div className="bg-black text-white px-3 py-2 flex items-center justify-between">
                    <span className="text-xs font-black uppercase">
                      Daftar Warga Target ({blastPreview.recipients.length} dari {blastPreview.totalWarga})
                    </span>
                    <span className="text-[10px] font-bold text-gray-300">
                      Diurutkan per RT & Nama
                    </span>
                  </div>
                  <div className="max-h-48 overflow-y-auto divide-y divide-gray-200 text-xs">
                    {blastPreview.recipients.map((r, idx) => (
                      <div key={r.tagihanId} className="p-2.5 flex items-center justify-between hover:bg-yellow-50 gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-gray-400 font-bold w-5 text-right">{idx + 1}.</span>
                          <div>
                            <p className="font-black text-black">{r.nama}</p>
                            <p className="text-[10px] text-gray-600">
                              {r.noTelepon || "Tanpa No. WA"} · <span className="font-bold">{r.rtRw}</span>
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-2">
                          <div>
                            <p className="font-black text-black">{formatRupiah(r.total)}</p>
                            <span className={`text-[9px] font-black uppercase px-1 py-0.2 border ${
                              r.status === "tunggakan" ? "bg-red-100 text-red-700 border-red-400" : "bg-amber-100 text-amber-800 border-amber-400"
                            }`}>
                              {r.status === "tunggakan" ? "Tunggakan" : "Belum Bayar"}
                            </span>
                          </div>
                          {!blastPreview.isWaConfigured && r.noTelepon && (
                            <a
                              href={`https://wa.me/${r.noTelepon.replace(/^0/, "62")}?text=${encodeURIComponent(blastPreview.sampleMessage)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] font-black bg-green-500 hover:bg-green-400 text-black border border-black px-2 py-1 uppercase inline-flex items-center gap-0.5"
                            >
                              WA ↗
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hasil Pengiriman (Setelah Submit) */}
              {blastResult && (
                <div className="border-4 border-black p-4 bg-emerald-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">✅</span>
                    <h3 className="font-black uppercase text-sm text-black">{blastResult.message}</h3>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-bold mt-2">
                    <span className="bg-green-300 border border-black px-2 py-1">
                      Terkirim: {blastResult.hasil.terkirim}
                    </span>
                    <span className="bg-amber-200 border border-black px-2 py-1">
                      Pending: {blastResult.hasil.pending}
                    </span>
                    {blastResult.hasil.gagal > 0 && (
                      <span className="bg-red-300 border border-black px-2 py-1">
                        Gagal: {blastResult.hasil.gagal}
                      </span>
                    )}
                  </div>

                  {/* Jika mode link manual (wa.me) */}
                  {blastResult.hasil.links && blastResult.hasil.links.length > 0 && (
                    <div className="mt-4 pt-3 border-t-2 border-black">
                      <p className="text-xs font-black uppercase mb-2">
                        💬 Tautan WhatsApp Siap Kirim ({blastResult.hasil.links.length} Warga):
                      </p>
                      <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                        {blastResult.hasil.links.map((lnk) => (
                          <div key={lnk.pelangganId} className="flex items-center justify-between bg-white border border-black px-2.5 py-1.5 text-xs">
                            <div>
                              <span className="font-black">{lnk.nama}</span>{" "}
                              <span className="text-gray-500 text-[11px]">({lnk.noTelepon})</span>
                            </div>
                            <a
                              href={lnk.link}
                              target="_blank"
                              rel="noreferrer"
                              className="font-black bg-green-400 hover:bg-green-300 text-black border border-black px-2 py-0.5 text-[10px] uppercase shadow-[1px_1px_0_0_rgba(0,0,0,1)]"
                            >
                              Buka WA ↗
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowBlastModal(false); setBlastResult(null); }}
                  className="flex-1 px-4 py-2.5 border-2 border-black text-sm text-gray-700 font-black hover:bg-gray-100 uppercase transition-all"
                >
                  {blastResult ? "Tutup" : "Batal"}
                </button>
                <button
                  type="button"
                  onClick={handleSendBlast}
                  disabled={blastSending || blastLoading || !blastPreview || blastPreview.totalWarga === 0}
                  className="flex-1 px-4 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-black border-2 border-black font-black text-sm uppercase shadow-[3px_3px_0_0_rgba(0,0,0,1)] hover:shadow-[5px_5px_0_0_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[1px_1px_0_0_rgba(0,0,0,1)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {blastSending ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      <span>Sedang Mengirim Blast...</span>
                    </>
                  ) : (
                    <>
                      <span>🚀</span>
                      <span>
                        Kirim Blast WA ({blastPreview ? `${blastPreview.totalWarga} Warga` : "..."})
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
