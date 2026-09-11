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
    createdAt?: string;
    kelurahanId?: number | null;
    kelurahan?: {
      id: number;
      nama: string;
      kecamatan?: string | null;
    } | null;
    wilayah?: {
      id: number;
      nama: string;
      rt?: string | null;
      rw?: string | null;
      zonaId?: number | null;
      zona?: {
        id: number;
        nama: string;
        warna?: string | null;
      } | null;
    } | null;
  };
  pembayaran: { id: number; jumlah: number; metode: string; status: string; createdAt: string }[];
};

type KelurahanItem = {
  id: number;
  nama: string;
  kecamatan?: string | null;
};

type ZonaItem = {
  id: number;
  nama: string;
  keterangan?: string | null;
  warna?: string | null;
  kelurahanId: number;
  kelurahan?: { id: number; nama: string } | null;
};

type WilayahItem = {
  id: number;
  nama: string;
  rt?: string | null;
  rw?: string | null;
  kelurahanId?: number | null;
  zonaId?: number | null;
  zona?: { id: number; nama: string; warna?: string | null } | null;
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
  zonaNama?: string;
  zonaWarna?: string | null;
  kelurahanNama?: string;
};

type BlastPreviewData = {
  totalWarga: number;
  totalNominal: number;
  sampleMessage: string;
  recipients: BlastRecipient[];
  isWaConfigured: boolean;
  zonaNama?: string | null;
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
  createdAt?: string;
  hariSiklus?: number;
  jatuhTempo?: string;
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

  // Master Data Wilayah & Zona
  const [kelurahanList, setKelurahanList] = useState<KelurahanItem[]>([]);
  const [zonaList, setZonaList] = useState<ZonaItem[]>([]);
  const [wilayahList, setWilayahList] = useState<WilayahItem[]>([]);

  // Filter Active State
  const [kelurahanId, setKelurahanId] = useState("");
  const [zonaId, setZonaId] = useState("");
  const [wilayahId, setWilayahId] = useState("");
  const [rtFilter, setRtFilter] = useState("");

  // Blast WA Modal State
  const [showBlastModal, setShowBlastModal] = useState(false);
  const [blastKelurahanId, setBlastKelurahanId] = useState("");
  const [blastZonaId, setBlastZonaId] = useState("");
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
      if (kelurahanId) params.set("kelurahanId", kelurahanId);
      if (zonaId) params.set("zonaId", zonaId);
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
  }, [bulan, tahun, status, kelurahanId, zonaId, wilayahId, rtFilter, isPetugas]);

  useEffect(() => {
    (async () => { await fetchTagihan(); })();
  }, [fetchTagihan]);

  useEffect(() => {
    // Load Kelurahan, Zona, dan Wilayah secara paralel
    Promise.all([
      fetch("/api/kelurahan").then((r) => r.json()).catch(() => []),
      fetch("/api/zona").then((r) => r.json()).catch(() => []),
      fetch("/api/wilayah").then((r) => r.json()).catch(() => []),
    ]).then(([kelData, zonaData, wilData]) => {
      if (Array.isArray(kelData)) setKelurahanList(kelData);
      if (Array.isArray(zonaData)) setZonaList(zonaData);
      if (Array.isArray(wilData)) setWilayahList(wilData);
    });
  }, []);

  // Filter daftar zona berdasarkan kelurahan yang dipilih
  const availableZonas = zonaList.filter((z) =>
    !kelurahanId ? true : z.kelurahanId === parseInt(kelurahanId)
  );

  const availableBlastZonas = zonaList.filter((z) =>
    !blastKelurahanId ? true : z.kelurahanId === parseInt(blastKelurahanId)
  );

  async function loadBlastPreview(params?: {
    kelurahanId?: string;
    zonaId?: string;
    wilayahId?: string;
    rt?: string;
    bulan?: string;
    tahun?: string;
    statusFilter?: string;
  }) {
    const kId = params?.kelurahanId !== undefined ? params.kelurahanId : blastKelurahanId;
    const zId = params?.zonaId !== undefined ? params.zonaId : blastZonaId;
    const wId = params?.wilayahId !== undefined ? params.wilayahId : blastWilayahId;
    const rtVal = params?.rt !== undefined ? params.rt : blastRt;
    const bln = params?.bulan !== undefined ? params.bulan : blastBulan;
    const thn = params?.tahun !== undefined ? params.tahun : blastTahun;
    const stFilter = params?.statusFilter !== undefined ? params.statusFilter : blastStatusFilter;

    setBlastLoading(true);
    setBlastResult(null);
    try {
      const res = await fetch("/api/tagihan/blast-rt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kelurahanId: kId ? parseInt(kId) : undefined,
          zonaId: zId ? parseInt(zId) : undefined,
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
    const initKel = kelurahanId;
    const initZona = zonaId;
    const initWilayah = wilayahId;
    const initRt = rtFilter;
    const initBulan = bulan;
    const initTahun = tahun;
    const initStatus = status === "belum_bayar" || status === "tunggakan" ? status : "semua_belum_lunas";

    setBlastKelurahanId(initKel);
    setBlastZonaId(initZona);
    setBlastWilayahId(initWilayah);
    setBlastRt(initRt);
    setBlastBulan(initBulan);
    setBlastTahun(initTahun);
    setBlastStatusFilter(initStatus);
    setBlastResult(null);
    setShowBlastModal(true);

    loadBlastPreview({
      kelurahanId: initKel,
      zonaId: initZona,
      wilayahId: initWilayah,
      rt: initRt,
      bulan: initBulan,
      tahun: initTahun,
      statusFilter: initStatus,
    });
  }

  async function handleSendBlast() {
    if (!blastPreview || blastPreview.totalWarga === 0) {
      showToast("Tidak ada tagihan yang perlu dikirim", "error");
      return;
    }

    const targetDesc = blastPreview.zonaNama ? `Zona ${blastPreview.zonaNama}` : (blastRt ? `RT ${blastRt}` : "seluruh warga");
    const confirmText = blastPreview.isWaConfigured
      ? `Kirim notifikasi WhatsApp otomatis ke ${blastPreview.totalWarga} warga (${targetDesc})?`
      : `Siapkan tautan WhatsApp manual untuk ${blastPreview.totalWarga} warga (${targetDesc})?`;

    if (!window.confirm(confirmText)) return;

    setBlastSending(true);
    try {
      const res = await fetch("/api/tagihan/blast-rt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kelurahanId: blastKelurahanId ? parseInt(blastKelurahanId) : undefined,
          zonaId: blastZonaId ? parseInt(blastZonaId) : undefined,
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
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">{isPetugas ? "Tagihan Saya" : "Tagihan"}</h1>
          <p className="text-sm text-gray-600 font-bold mt-1">
            {isPetugas
              ? "Tunggakan & tagihan warga di wilayah Anda — terima bayar tunai langsung"
              : "Kelola tagihan iuran bulanan"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
        {!isPetugas && (
        <>
        <button
          onClick={handleOpenBlastModal}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-xs active:scale-98 transition flex items-center gap-1.5"
          title="Kirim pesan WhatsApp massal ke seluruh warga yang belum bayar di RT tertentu"
        >
          <span className="text-sm">📢</span>
          <span>Blast WA RT</span>
        </button>
        <button
          onClick={() => setShowGenerate(true)}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs active:scale-98 transition flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Generate Tagihan</span>
        </button>
        <button
          onClick={() => { setShowAutoGenerate(true); setAutoResult(null); }}
          className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-bold shadow-xs active:scale-98 transition flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Auto-Generate</span>
        </button>
        </>
        )}
        <Link
          href={`/tagihan-cetak?bulan=${bulan || new Date().getMonth() + 1}&tahun=${tahun || new Date().getFullYear()}`}
          target="_blank"
          className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-bold shadow-xs active:scale-98 transition flex items-center gap-1.5"
        >
          <span>🖨</span>
          <span>Cetak Massal</span>
        </Link>
        </div>
      </div>

      {/* Pembayaran pending menunggu verifikasi */}
      {pending.length > 0 && (
        <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-5 mb-6">
          <h3 className="font-bold text-amber-900 text-sm mb-3 flex items-center gap-2">
            <span>⏳</span> Pembayaran Menunggu Verifikasi ({pending.length})
          </h3>
          <div className="space-y-3">
            {pending.map((p) => (
              <div key={p.id} className="flex items-center justify-between bg-white rounded-xl border border-amber-200/60 p-4 shadow-xs flex-wrap gap-3">
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    {p.pelanggan.nama}{" "}
                    <span className="text-xs text-slate-500 font-mono font-normal">({p.pelanggan.kodePelanggan})</span>
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    <span className="font-semibold text-emerald-600">{formatRupiah(p.jumlah)}</span> • {labelMetode(p.metode)} •{" "}
                    {bulanList.find((b) => b.value === p.tagihan.bulan.toString())?.label} {p.tagihan.tahun}
                  </div>
                  {p.buktiBayar && (
                    <div className="mt-2">
                      <details className="text-xs">
                        <summary className="cursor-pointer text-emerald-600 hover:text-emerald-700 font-medium">Lihat bukti transfer</summary>
                        <Image src={p.buktiBayar} alt="Bukti pembayaran" width={240} height={180} unoptimized className="mt-2 max-h-40 rounded-xl border border-slate-200 object-cover" />
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
                        className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-3.5 py-2 rounded-xl transition-all disabled:opacity-50 shadow-xs"
                      >
                        {cekLoading === p.id ? "Mengecek…" : "⟳ Cek Status Live"}
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium italic">Transaksi gateway tanpa orderId</span>
                    )
                  ) : (
                    <>
                      <button
                        onClick={() => verifikasiPembayaran(p.id, "terverifikasi")}
                        className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-3.5 py-2 rounded-xl transition-all shadow-xs hover:shadow active:scale-[0.98]"
                      >
                        Verifikasi
                      </button>
                      <button
                        onClick={() => verifikasiPembayaran(p.id, "ditolak")}
                        className="text-xs bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold px-3.5 py-2 rounded-xl transition-all"
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
      <div className="flex gap-2.5 mb-4 flex-wrap items-center">
        <select
          value={bulan}
          onChange={(e) => setBulan(e.target.value)}
          className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
        >
          <option value="">Semua Bulan</option>
          {bulanList.map((b) => (
            <option key={b.value} value={b.value}>{b.label}</option>
          ))}
        </select>
        <select
          value={tahun}
          onChange={(e) => setTahun(e.target.value)}
          className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
        >
          {[2024, 2025, 2026, 2027, 2028].map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
        >
          <option value="">Semua Status</option>
          <option value="belum_bayar">Belum Bayar</option>
          <option value="lunas">Lunas</option>
          <option value="tunggakan">Tunggakan</option>
        </select>

        {/* Filter Kelurahan */}
        <select
          value={kelurahanId}
          onChange={(e) => {
            setKelurahanId(e.target.value);
            setZonaId(""); // reset zona saat kelurahan berganti
          }}
          className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
        >
          <option value="">Semua Kelurahan</option>
          {kelurahanList.map((k) => (
            <option key={k.id} value={k.id.toString()}>
              🏛️ {k.nama} {k.kecamatan ? `(${k.kecamatan})` : ""}
            </option>
          ))}
        </select>

        {/* Filter Zona */}
        <select
          value={zonaId}
          onChange={(e) => setZonaId(e.target.value)}
          className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
        >
          <option value="">Semua Zona</option>
          {availableZonas.map((z) => (
            <option key={z.id} value={z.id.toString()}>
              🏷️ {z.nama} {z.kelurahan?.nama ? `(${z.kelurahan.nama})` : ""}
            </option>
          ))}
        </select>

        {/* Filter Wilayah / RT */}
        <select
          value={wilayahId}
          onChange={(e) => setWilayahId(e.target.value)}
          className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
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
            placeholder="No. RT (misal: 01)..."
            value={rtFilter}
            onChange={(e) => setRtFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 w-44 shadow-2xs placeholder:text-slate-400 placeholder:font-normal"
          />
          {rtFilter && (
            <button
              onClick={() => setRtFilter("")}
              className="absolute right-2 text-xs font-bold text-slate-400 hover:text-slate-700"
              title="Hapus filter RT"
            >
              ✕
            </button>
          )}
        </div>

        {(kelurahanId || zonaId || wilayahId || rtFilter || status || bulan !== (new Date().getMonth() + 1).toString()) && (
          <button
            onClick={() => {
              setKelurahanId("");
              setZonaId("");
              setWilayahId("");
              setRtFilter("");
              setStatus("");
              setBulan((new Date().getMonth() + 1).toString());
              setTahun(new Date().getFullYear().toString());
            }}
            className="px-3 py-2 text-xs font-black uppercase text-gray-800 bg-gray-200 hover:bg-gray-300 border border-slate-200/80 transition"
          >
            Reset Filter
          </button>
        )}

        {(kelurahanId || zonaId || wilayahId || rtFilter) && (
          <div className="flex items-center gap-2 text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200/80 rounded-xl px-3.5 py-2 flex-wrap">
            <span className="font-bold">🔍 Filter Aktif:</span>
            {kelurahanId && (
              <span className="bg-white rounded-lg px-2 py-0.5 border border-amber-200/80 text-[11px] font-semibold text-slate-800 shadow-2xs">
                🏛️ {kelurahanList.find((k) => k.id === parseInt(kelurahanId))?.nama}
              </span>
            )}
            {zonaId && (
              <span
                className="font-semibold text-slate-900 px-2 py-0.5 rounded-lg text-[11px] border border-black/10 shadow-2xs"
                style={{
                  backgroundColor: zonaList.find((z) => z.id === parseInt(zonaId))?.warna || "#6ee7b7",
                }}
              >
                🏷️ {zonaList.find((z) => z.id === parseInt(zonaId))?.nama}
              </span>
            )}
            {rtFilter && (
              <span className="bg-slate-800 text-white rounded-lg px-2 py-0.5 text-[10px] font-semibold">
                RT {rtFilter}
              </span>
            )}
            <span className="text-amber-800 font-medium">({tagihan.length} tagihan)</span>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-semibold">Kode</th>
                <th className="text-left px-4 py-3 font-semibold">No. Invoice</th>
                <th className="text-left px-4 py-3 font-semibold">Pelanggan</th>
                <th className="text-left px-4 py-3 font-semibold">Periode</th>
                <th className="text-right px-4 py-3 font-semibold">Jumlah</th>
                <th className="text-left px-4 py-3 font-semibold">Jatuh Tempo</th>
                <th className="text-center px-4 py-3 font-semibold">Status</th>
                <th className="text-center px-4 py-3 font-semibold">Pembayaran</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400 font-medium">Memuat...</td></tr>
              ) : tagihan.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400 font-medium">Belum ada tagihan</td></tr>
              ) : (
                tagihan.map((t) => (
                  <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50/60 transition">
                    <td className="px-4 py-3">
                      <code className="text-xs font-mono font-medium text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-md">
                        {t.pelanggan.kodePelanggan}
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      {t.noInvoice ? (
                        <Link
                          href={`/invoice-tagihan?invoice=${encodeURIComponent(t.noInvoice)}`}
                          target="_blank"
                          className="text-xs font-mono text-emerald-600 hover:text-emerald-700 hover:underline font-semibold"
                          title="Buka invoice"
                        >
                          {t.noInvoice}
                        </Link>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{t.pelanggan.nama}</div>
                      <div className="text-xs text-slate-500 font-mono">{t.pelanggan.noTelepon || "—"}</div>
                      <div className="mt-1 flex flex-wrap gap-1 items-center">
                        {t.pelanggan.kelurahan?.nama && (
                          <span className="inline-flex items-center text-[10px] font-medium bg-slate-50 text-slate-700 border border-slate-200 px-1.5 py-0.5 rounded-md">
                            🏛️ {t.pelanggan.kelurahan.nama}
                          </span>
                        )}
                        {t.pelanggan.wilayah?.zona?.nama && (
                          <span
                            className="inline-flex items-center text-[10px] font-semibold text-slate-900 border border-black/10 px-1.5 py-0.5 rounded-md"
                            style={{
                              backgroundColor: t.pelanggan.wilayah.zona.warna || "#a7f3d0",
                            }}
                          >
                            🏷️ {t.pelanggan.wilayah.zona.nama}
                          </span>
                        )}
                        {(t.pelanggan.rtRw || t.pelanggan.wilayah?.nama || t.pelanggan.wilayah?.rt) && (
                          <span className="inline-flex items-center text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200/80 px-2 py-0.5 rounded-md">
                            📍 {t.pelanggan.rtRw || `${t.pelanggan.wilayah?.nama || ""}${t.pelanggan.wilayah?.rt ? ` (RT ${t.pelanggan.wilayah.rt})` : ""}`}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-bold">
                      {bulanList.find((b) => b.value === t.bulan.toString())?.label} {t.tahun}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatRupiah(t.jumlah + (t.denda || 0))}
                      {t.denda ? <span className="block text-xs text-red-600">+ denda {formatRupiah(t.denda)}</span> : null}
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-bold text-xs">
                      <div>{formatDate(t.jatuhTempo)}</div>
                      <div className="text-[10px] text-gray-500 font-mono">
                        Siklus tgl {new Date(t.jatuhTempo).getDate()}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        t.status === "lunas" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                        t.status === "tunggakan" ? "bg-rose-50 text-rose-700 border border-rose-200" :
                        "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}>
                        {t.status === "belum_bayar" ? "Belum Bayar" : t.status === "lunas" ? "Lunas" : "Tunggakan"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {t.status !== "lunas" ? (
                        <button
                          onClick={() => { setFormBayar({ metode: isPetugas ? "tunai" : "transfer", catatan: isPetugas ? "Bayar tunai via petugas tagih" : "" }); setShowBayar({ tagihanId: t.id, pelangganId: t.pelanggan.id, jumlah: hitungRincian(t.jumlah, t.denda).total }); }}
                          className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg shadow-xs hover:shadow-sm active:scale-95 transition-all inline-flex items-center gap-1.5"
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
                                className="text-xs text-emerald-600 underline hover:text-emerald-700 font-semibold"
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
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-2xl rounded-3xl border border-slate-200/80 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
              <div>
                <h2 className="font-bold text-slate-900 text-base">Auto-Generate Tagihan</h2>
                <p className="text-xs text-slate-500">Buat tagihan massal secara otomatis berdasarkan tarif pelanggan</p>
              </div>
              <button onClick={() => { setShowAutoGenerate(false); setAutoResult(null); setPreview(null); }} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-lg leading-none">&times;</button>
            </div>
            <form onSubmit={handleAutoGenerate} className="p-6 space-y-4">
              <div className="bg-sky-50/70 border border-sky-200/60 rounded-xl p-3.5 text-xs text-sky-900">
                <p className="font-bold mb-1">ℹ️ Cara Kerja Auto-Generate</p>
                <p className="text-sky-800 leading-relaxed">Nominal dihitung otomatis (tarif kustom → paket → Level). Klik <b>Muat Preview</b> untuk melihat & mengubah nominal per pelanggan sebelum generate.</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Periode Tagihan</label>
                <div className="grid grid-cols-2 gap-3">
                  <select value={formAuto.bulan} onChange={(e) => { setFormAuto({ ...formAuto, bulan: e.target.value }); setPreview(null); setAutoResult(null); }} className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" required>
                    {bulanList.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
                  </select>
                  <select value={formAuto.tahun} onChange={(e) => { setFormAuto({ ...formAuto, tahun: e.target.value }); setPreview(null); setAutoResult(null); }} className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" required>
                    {[2024, 2025, 2026, 2027, 2028].map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {preview === null && (
                <button type="button" onClick={handleAutoPreview} disabled={previewLoading} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50">
                  {previewLoading ? "Memuat preview data..." : "Muat Preview Data"}
                </button>
              )}

              {preview && preview.length > 0 && (
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
                        <tr className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          <th className="px-4 py-2.5 text-left">Pelanggan</th>
                          <th className="px-4 py-2.5 text-left">Siklus / Jatuh Tempo</th>
                          <th className="px-4 py-2.5 text-left">Level</th>
                          <th className="px-4 py-2.5 text-right">Nominal (Rp)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-800">
                        {preview.map((p) => (
                          <tr key={p.pelangganId} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-4 py-2.5">
                              <p className="font-semibold text-xs text-slate-900">{p.nama}</p>
                              <p className="text-[10px] text-slate-500 font-mono">{p.kodePelanggan}{p.paket ? ` · ${p.paket}` : ""}</p>
                            </td>
                            <td className="px-4 py-2.5 text-xs text-slate-600">
                              <div>{p.jatuhTempo ? formatDate(p.jatuhTempo) : "-"}</div>
                              {p.hariSiklus ? (
                                <span className="text-[10px] text-sky-700 font-mono">
                                  Siklus tgl {p.hariSiklus}
                                </span>
                              ) : null}
                            </td>
                            <td className="px-4 py-2.5 text-xs text-slate-600 capitalize">{p.kategori.replace(/_/g, " ")}</td>
                            <td className="px-4 py-2.5 text-right">
                              <input type="number" min={0} value={p.jumlah} onChange={(e) => updatePreviewJumlah(p.pelangganId, Number(e.target.value))} className="w-28 px-2 py-1 rounded-lg border border-slate-200 text-right text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700">
                    <span>{preview.length} tagihan</span>
                    <span className="text-emerald-600 font-bold">Total: {formatRupiah(preview.reduce((s, p) => s + (p.jumlah || 0), 0))}</span>
                  </div>
                </div>
              )}

              {autoResult && (
                <div className="p-3.5 rounded-xl text-sm bg-emerald-50 border border-emerald-200 text-emerald-900">
                  <p className="font-semibold">{autoResult.message}</p>
                  <p className="text-xs text-emerald-700 mt-1">Dibuat: {autoResult.created} | Sudah ada: {autoResult.skipped}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowAutoGenerate(false); setAutoResult(null); setPreview(null); }} className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-all">Batal</button>
                <button type="submit" disabled={generating || (preview !== null && preview.length === 0)} className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs hover:shadow active:scale-[0.98] transition-all text-sm font-semibold rounded-xl disabled:opacity-50">
                  {generating ? "Memproses..." : preview ? `Generate (${preview.length})` : "Generate Semua"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Generate */}
      {showGenerate && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl overflow-hidden w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
              <div>
                <h2 className="font-bold text-slate-900 text-base">Generate Tagihan Manual</h2>
                <p className="text-xs text-slate-500">Buat tagihan seragam untuk periode tertentu</p>
              </div>
              <button onClick={() => setShowGenerate(false)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-lg leading-none">&times;</button>
            </div>
            <form onSubmit={handleGenerate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Periode Tagihan</label>
                <div className="grid grid-cols-2 gap-3">
                  <select value={formGenerate.bulan} onChange={(e) => setFormGenerate({ ...formGenerate, bulan: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" required>
                    {bulanList.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
                  </select>
                  <select value={formGenerate.tahun} onChange={(e) => setFormGenerate({ ...formGenerate, tahun: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" required>
                    {[2024, 2025, 2026, 2027, 2028].map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Jumlah Tagihan (Rp)</label>
                <input type="number" value={formGenerate.jumlah} onChange={(e) => setFormGenerate({ ...formGenerate, jumlah: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" placeholder="50000" required />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input type="checkbox" id="untukSemua" checked={formGenerate.untukSemua} onChange={(e) => setFormGenerate({ ...formGenerate, untukSemua: e.target.checked })} className="rounded-md border-slate-300 accent-emerald-600 w-4 h-4" />
                <label htmlFor="untukSemua" className="text-sm text-slate-700 font-medium cursor-pointer">Generate untuk semua pelanggan aktif</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowGenerate(false)} className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm text-slate-700 font-semibold transition-all">Batal</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-xs hover:shadow active:scale-[0.98] transition-all text-sm font-semibold">Generate</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Bayar */}
      {showBayar && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl overflow-hidden w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
              <div>
                <h2 className="font-bold text-slate-900 text-base">Catat Pembayaran</h2>
                <p className="text-xs text-slate-500">Konfirmasi pelunasan tagihan pelanggan</p>
              </div>
              <button onClick={() => setShowBayar(null)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-lg leading-none">&times;</button>
            </div>
            <form onSubmit={handleBayar} className="p-6 space-y-4">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <p className="text-xs text-slate-500 font-medium">Jumlah Tagihan</p>
                <p className="text-2xl font-black text-emerald-600 tracking-tight mt-0.5">{formatRupiah(showBayar.jumlah)}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Metode Pembayaran</label>
                <select value={formBayar.metode} onChange={(e) => setFormBayar({ ...formBayar, metode: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" required disabled={isPetugas}>
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
                  <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 mt-2">
                    Anda mencatat <b>pembayaran tunai</b> — tercatat atas nama Anda & langsung lunas.
                  </p>
                )}
                {formBayar.metode !== "tunai" && (
                  <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mt-2">
                    Pembayaran non-tunai dicatat sebagai <b>pending</b> dan perlu diverifikasi admin di antrean verifikasi di atas.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Catatan (opsional)</label>
                <input
                  type="text"
                  value={formBayar.catatan}
                  onChange={(e) => setFormBayar({ ...formBayar, catatan: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="Bayar tunai via petugas"
                />
              </div>
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBayar(null)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs active:scale-98 transition-all"
                >
                  Konfirmasi Bayar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Blast WA Tagihan per RT */}
      {showBlastModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-3xl rounded-3xl border border-slate-200/80 shadow-2xl my-8 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl shadow-xs">
                  📢
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 text-base">Blast WhatsApp Tagihan Zona & RT</h2>
                  <p className="text-xs text-slate-500">Kirim pengingat tagihan massal per Zona, Kelurahan, atau RT</p>
                </div>
              </div>
              <button
                onClick={() => { setShowBlastModal(false); setBlastResult(null); }}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Filter / Kriteria Pengiriman */}
              <div className="bg-slate-50/60 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">🎯 Kriteria Target Penerima</span>
                  <button
                    type="button"
                    onClick={() => loadBlastPreview()}
                    disabled={blastLoading}
                    className="text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl px-3 py-1.5 shadow-xs transition-all disabled:opacity-50"
                  >
                    {blastLoading ? "Memuat..." : "🔄 Refresh Target"}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Kelurahan</label>
                    <select
                      value={blastKelurahanId}
                      onChange={(e) => {
                        const newKel = e.target.value;
                        setBlastKelurahanId(newKel);
                        setBlastZonaId("");
                        loadBlastPreview({ kelurahanId: newKel, zonaId: "" });
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    >
                      <option value="">Semua Kelurahan</option>
                      {kelurahanList.map((k) => (
                        <option key={k.id} value={k.id.toString()}>
                          🏛️ {k.nama}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Zona Operasional</label>
                    <select
                      value={blastZonaId}
                      onChange={(e) => {
                        const newZona = e.target.value;
                        setBlastZonaId(newZona);
                        loadBlastPreview({ zonaId: newZona });
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    >
                      <option value="">Semua Zona</option>
                      {availableBlastZonas.map((z) => (
                        <option key={z.id} value={z.id.toString()}>
                          🏷️ {z.nama}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Wilayah</label>
                    <select
                      value={blastWilayahId}
                      onChange={(e) => {
                        setBlastWilayahId(e.target.value);
                        loadBlastPreview({ wilayahId: e.target.value });
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
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
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">No. RT</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        placeholder="01, 02..."
                        value={blastRt}
                        onChange={(e) => setBlastRt(e.target.value)}
                        onBlur={() => loadBlastPreview({ rt: blastRt })}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            loadBlastPreview({ rt: blastRt });
                          }
                        }}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Status Tagihan</label>
                    <select
                      value={blastStatusFilter}
                      onChange={(e) => {
                        setBlastStatusFilter(e.target.value);
                        loadBlastPreview({ statusFilter: e.target.value });
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    >
                      <option value="semua_belum_lunas">Semua Belum Lunas</option>
                      <option value="belum_bayar">Hanya Belum Bayar</option>
                      <option value="tunggakan">Hanya Tunggakan</option>
                    </select>
                  </div>
                </div>

                {/* Quick Zona buttons */}
                {availableBlastZonas.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[10px] font-semibold uppercase text-slate-500">Pilih Cepat Zona:</span>
                    {availableBlastZonas.map((z) => (
                      <button
                        key={z.id}
                        type="button"
                        onClick={() => {
                          const newZ = blastZonaId === z.id.toString() ? "" : z.id.toString();
                          setBlastZonaId(newZ);
                          loadBlastPreview({ zonaId: newZ });
                        }}
                        className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition-all ${
                          blastZonaId === z.id.toString()
                            ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                            : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                        }`}
                      >
                        🏷️ {z.nama}
                      </button>
                    ))}
                    {blastZonaId && (
                      <button
                        type="button"
                        onClick={() => {
                          setBlastZonaId("");
                          loadBlastPreview({ zonaId: "" });
                        }}
                        className="text-xs font-medium text-rose-600 underline ml-1 hover:text-rose-700"
                      >
                        Reset Zona
                      </button>
                    )}
                  </div>
                )}

                {/* Quick RT buttons */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] font-semibold uppercase text-slate-500">Pilih Cepat RT:</span>
                  {["01", "02", "03", "04", "05"].map((rtVal) => (
                    <button
                      key={rtVal}
                      type="button"
                      onClick={() => {
                        setBlastRt(rtVal);
                        loadBlastPreview({ rt: rtVal });
                      }}
                      className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition-all ${
                        blastRt === rtVal
                          ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                          : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
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
                        loadBlastPreview({ rt: "" });
                      }}
                      className="text-xs font-medium text-rose-600 underline ml-1 hover:text-rose-700"
                    >
                      Reset RT
                    </button>
                  )}
                </div>
              </div>

              {/* Status Gateway Banner */}
              {blastPreview && (
                <div
                  className={`p-4 rounded-2xl border text-xs font-medium flex items-start gap-3 ${
                    blastPreview.isWaConfigured ? "bg-emerald-50/70 border-emerald-200/70 text-emerald-950" : "bg-amber-50/70 border-amber-200/70 text-amber-950"
                  }`}
                >
                  <span className="text-lg leading-none">
                    {blastPreview.isWaConfigured ? "⚡" : "ℹ️"}
                  </span>
                  <div className="flex-1">
                    <p className="font-bold text-xs">
                      {blastPreview.isWaConfigured
                        ? "Gateway WhatsApp Aktif"
                        : "Mode Manual / Direct Link (WA_API_KEY Kosong)"}
                    </p>
                    <p className="text-xs mt-1 leading-relaxed opacity-90">
                      {blastPreview.isWaConfigured
                        ? "Pesan dikirim langsung via API ke nomor HP pelanggan dengan jeda anti-spam aman (1.2 detik/pesan)."
                        : "Sistem akan menyiapkan tautan direct link WhatsApp (wa.me) dengan pesan tagihan yang sudah siap kirim."}
                    </p>
                  </div>
                </div>
              )}

              {/* Ringkasan Target */}
              {blastPreview && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="border border-slate-200/80 rounded-2xl p-4 bg-white shadow-xs">
                    <p className="text-xs font-semibold text-slate-500">Target Warga</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">{blastPreview.totalWarga} <span className="text-xs font-normal text-slate-500">Orang</span></p>
                  </div>
                  <div className="border border-slate-200/80 rounded-2xl p-4 bg-white shadow-xs">
                    <p className="text-xs font-semibold text-slate-500">Total Nominal Tagihan</p>
                    <p className="text-xl font-black text-emerald-600 mt-1">{formatRupiah(blastPreview.totalNominal)}</p>
                  </div>
                  <div className="border border-slate-200/80 rounded-2xl p-4 bg-white shadow-xs col-span-2 sm:col-span-1">
                    <p className="text-xs font-semibold text-slate-500">Filter Zona & RT</p>
                    <p className="text-xs font-bold text-slate-800 mt-1">
                      {blastPreview.zonaNama ? `🏷️ Zona ${blastPreview.zonaNama}` : (blastZonaId ? `Zona #${blastZonaId}` : "Semua Zona")}
                      {blastRt ? ` · RT ${blastRt}` : ""}
                      {blastWilayahId ? ` · ${wilayahList.find((w) => w.id === parseInt(blastWilayahId))?.nama || ""}` : ""}
                    </p>
                  </div>
                </div>
              )}

              {/* Contoh Format Pesan WA */}
              {blastPreview && blastPreview.sampleMessage && (
                <div className="border border-slate-200/80 rounded-2xl p-4 bg-white shadow-xs">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <span>💬</span> Contoh Pesan WhatsApp Yang Dikirim
                    </span>
                    <button
                      type="button"
                      onClick={() => copySampleMessage(blastPreview.sampleMessage)}
                      className="text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg px-2.5 py-1 transition-all"
                    >
                      {copiedMessage ? "✅ Tersalin!" : "📋 Salin Pesan"}
                    </button>
                  </div>
                  <pre className="text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl p-3.5 max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed text-slate-800">
                    {blastPreview.sampleMessage}
                  </pre>
                </div>
              )}

              {/* Daftar Penerima Preview */}
              {blastPreview && blastPreview.recipients.length > 0 && (
                <div className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
                  <div className="bg-slate-50/80 px-4 py-3 flex items-center justify-between border-b border-slate-200">
                    <span className="text-xs font-semibold text-slate-700">
                      Daftar Warga Target ({blastPreview.recipients.length} dari {blastPreview.totalWarga})
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Diurutkan per Zona & RT
                    </span>
                  </div>
                  <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 text-xs">
                    {blastPreview.recipients.map((r, idx) => (
                      <div key={r.tagihanId} className="p-3 flex items-center justify-between hover:bg-slate-50/60 transition-colors gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-slate-400 font-medium w-5 text-right">{idx + 1}.</span>
                          <div>
                            <p className="font-semibold text-slate-900">{r.nama}</p>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap mt-0.5">
                              <span className="font-mono">{r.noTelepon || "Tanpa No. WA"}</span>
                              {r.kelurahanNama && r.kelurahanNama !== "-" && (
                                <span className="border border-slate-200 px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded text-[10px]">
                                  🏛️ {r.kelurahanNama}
                                </span>
                              )}
                              {r.zonaNama && r.zonaNama !== "-" && (
                                <span className="border border-emerald-200 px-1.5 py-0.2 bg-emerald-50 text-emerald-700 rounded text-[10px] font-medium">
                                  🏷️ {r.zonaNama}
                                </span>
                              )}
                              <span className="text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded text-[10px]">
                                📍 {r.rtRw}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          <div>
                            <p className="font-bold text-slate-900">{formatRupiah(r.total)}</p>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                              r.status === "tunggakan" ? "bg-rose-50 text-rose-700 border border-rose-200/60" : "bg-amber-50 text-amber-700 border border-amber-200/60"
                            }`}>
                              {r.status === "tunggakan" ? "Tunggakan" : "Belum Bayar"}
                            </span>
                          </div>
                          {!blastPreview.isWaConfigured && r.noTelepon && (
                            <a
                              href={`https://wa.me/${r.noTelepon.replace(/^0/, "62")}?text=${encodeURIComponent(blastPreview.sampleMessage)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/60 px-3 py-1.5 rounded-xl transition-all inline-flex items-center gap-1"
                            >
                              Buka WA ↗
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
                <div className="rounded-2xl border border-emerald-200 p-4 bg-emerald-50/70">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">✅</span>
                    <h3 className="font-bold text-sm text-emerald-950">{blastResult.message}</h3>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-medium mt-2">
                    <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-lg">
                      Terkirim: {blastResult.hasil.terkirim}
                    </span>
                    <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-lg">
                      Pending: {blastResult.hasil.pending}
                    </span>
                    {blastResult.hasil.gagal > 0 && (
                      <span className="bg-rose-100 text-rose-800 px-2.5 py-1 rounded-lg">
                        Gagal: {blastResult.hasil.gagal}
                      </span>
                    )}
                  </div>

                  {/* Jika mode link manual (wa.me) */}
                  {blastResult.hasil.links && blastResult.hasil.links.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-emerald-200/60">
                      <p className="text-xs font-semibold text-emerald-900 mb-2">
                        💬 Tautan WhatsApp Siap Kirim ({blastResult.hasil.links.length} Warga):
                      </p>
                      <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                        {blastResult.hasil.links.map((lnk) => (
                          <div key={lnk.pelangganId} className="flex items-center justify-between bg-white border border-emerald-200/60 rounded-xl px-3 py-2 text-xs">
                            <div>
                              <span className="font-semibold text-slate-900">{lnk.nama}</span>{" "}
                              <span className="text-slate-500 text-[11px]">({lnk.noTelepon})</span>
                            </div>
                            <a
                              href={lnk.link}
                              target="_blank"
                              rel="noreferrer"
                              className="font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-2.5 py-1 text-xs shadow-xs transition-all"
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
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-all"
                >
                  {blastResult ? "Tutup" : "Batal"}
                </button>
                <button
                  type="button"
                  onClick={handleSendBlast}
                  disabled={blastSending || blastLoading || !blastPreview || blastPreview.totalWarga === 0}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-xl shadow-xs hover:shadow active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
