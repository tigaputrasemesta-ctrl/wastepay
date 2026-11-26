"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { formatRupiah, formatDate } from "@/lib/utils";
import { X, Check, Search, Printer, ShieldCheck, Users, AlertCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/components/Toast";

type IndukPelanggan = {
  id: number;
  nama: string;
  noTelepon: string;
  kodePelanggan?: string;
  namaGrupKolektif?: string | null;
  alamat?: string;
  _count?: {
    anggotaKolektif?: number;
  };
};

type TagihanItem = {
  id: number;
  noInvoice?: string;
  bulan: number;
  tahun: number;
  jumlah: number;
  denda: number;
  total: number;
  status: string;
  jatuhTempo: string;
  tanggalLunas?: string | null;
  pelangganId: number;
  namaPelanggan: string;
  kodePelanggan: string;
  alamat: string;
  rtRw?: string;
  isInduk: boolean;
};

type SettlementResult = {
  success: boolean;
  message: string;
  induk: {
    id: number;
    nama: string;
    noTelepon: string;
    namaGrupKolektif?: string | null;
  };
  summary: {
    totalRumah: number;
    totalNominal: number;
    metode: string;
    tanggal: string;
  };
  items: {
    tagihanId: number;
    pembayaranId: number;
    noInvoice?: string;
    namaPelanggan: string;
    kodePelanggan: string;
    bulan: number;
    tahun: number;
    jumlah: number;
  }[];
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultBulan?: number;
  defaultTahun?: number;
};

const BULAN_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

export default function ModalBayarKolektif({
  isOpen,
  onClose,
  onSuccess,
  defaultBulan,
  defaultTahun,
}: Props) {
  const { showToast } = useToast();

  const [indukList, setIndukList] = useState<IndukPelanggan[]>([]);
  const [loadingInduk, setLoadingInduk] = useState(false);
  const [selectedIndukId, setSelectedIndukId] = useState<string>("");

  const [bulan, setBulan] = useState<number>(defaultBulan || new Date().getMonth() + 1);
  const [tahun, setTahun] = useState<number>(defaultTahun || new Date().getFullYear());

  const [tagihanList, setTagihanList] = useState<TagihanItem[]>([]);
  const [loadingTagihan, setLoadingTagihan] = useState(false);
  const [selectedTagihanIds, setSelectedTagihanIds] = useState<Set<number>>(new Set());

  const [metode, setMetode] = useState<string>("tunai");
  const [catatan, setCatatan] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const [settlementResult, setSettlementResult] = useState<SettlementResult | null>(null);

  // Muat daftar Koordinator / Induk Kolektif
  const loadIndukList = useCallback(async () => {
    setLoadingInduk(true);
    try {
      const res = await fetch("/api/pelanggan?skemaBayar=kolektif_induk&status=aktif");
      if (res.ok) {
        const data = await res.json();
        setIndukList(Array.isArray(data) ? data : data.data || []);
      }
    } catch {
      showToast("Gagal memuat daftar koordinator kolektif", "error");
    } finally {
      setLoadingInduk(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (isOpen) {
      loadIndukList();
      setSettlementResult(null);
      setSelectedIndukId("");
      setTagihanList([]);
      setSelectedTagihanIds(new Set());
      setCatatan("");
    }
  }, [isOpen, loadIndukList]);

  // Muat tagihan anggota dari induk yang dipilih
  const loadTagihanAnggota = useCallback(async () => {
    if (!selectedIndukId) {
      setTagihanList([]);
      setSelectedTagihanIds(new Set());
      return;
    }

    setLoadingTagihan(true);
    try {
      const url = `/api/tagihan/bayar-kolektif?indukKolektifId=${selectedIndukId}&bulan=${bulan}&tahun=${tahun}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const items: TagihanItem[] = data.tagihan || [];
        setTagihanList(items);

        // Otomatis centang semua tagihan yang belum lunas
        const unpaidIds = new Set<number>();
        items.forEach((t) => {
          if (t.status !== "lunas") {
            unpaidIds.add(t.id);
          }
        });
        setSelectedTagihanIds(unpaidIds);
      } else {
        const err = await res.json();
        showToast(err.error || "Gagal memuat tagihan anggota", "error");
      }
    } catch {
      showToast("Gagal memuat tagihan anggota kolektif", "error");
    } finally {
      setLoadingTagihan(false);
    }
  }, [selectedIndukId, bulan, tahun, showToast]);

  useEffect(() => {
    if (selectedIndukId) {
      loadTagihanAnggota();
    }
  }, [selectedIndukId, bulan, tahun, loadTagihanAnggota]);

  // Hitung total dari tagihan yang dipilih
  const { totalSelectedNominal, selectedCount } = useMemo(() => {
    let sum = 0;
    let count = 0;
    tagihanList.forEach((t) => {
      if (selectedTagihanIds.has(t.id)) {
        sum += t.total;
        count++;
      }
    });
    return { totalSelectedNominal: sum, selectedCount: count };
  }, [tagihanList, selectedTagihanIds]);

  const toggleSelectAll = () => {
    const unpaidItems = tagihanList.filter((t) => t.status !== "lunas");
    if (selectedTagihanIds.size === unpaidItems.length) {
      setSelectedTagihanIds(new Set());
    } else {
      setSelectedTagihanIds(new Set(unpaidItems.map((t) => t.id)));
    }
  };

  const toggleItem = (id: number) => {
    const next = new Set(selectedTagihanIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedTagihanIds(next);
  };

  // Submit pembayaran kolektif satu pintu
  const handleProcessSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTagihanIds.size === 0) {
      showToast("Pilih minimal satu tagihan untuk dilunasi", "error");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/tagihan/bayar-kolektif", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          indukKolektifId: parseInt(selectedIndukId, 10),
          tagihanIds: Array.from(selectedTagihanIds),
          bulan,
          tahun,
          metode,
          catatan,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message, "success");
        setSettlementResult(data);
        onSuccess();
      } else {
        showToast(data.error || "Gagal memproses pembayaran kolektif", "error");
      }
    } catch {
      showToast("Terjadi kesalahan jaringan", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const currentInduk = indukList.find((i) => String(i.id) === selectedIndukId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header Modal */}
        <div className="px-6 py-4.5 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between bg-slate-50/80 dark:bg-zinc-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center text-lg font-bold shadow-sm">
              👥
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-zinc-100 text-base leading-tight">
                Pembayaran Kolektif Satu Pintu
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Pelunasan retribusi terpadu untuk koordinator lingkungan RT / RW / Paguyuban
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-200/50 dark:hover:bg-zinc-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {settlementResult ? (
            /* TAMPILAN KWITANSI RESMI KOLEKTIF SETELAH BERHASIL */
            <div className="space-y-6 animate-in fade-in">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-3 text-emerald-900 dark:text-emerald-200 text-xs">
                <Check className="w-5 h-5 text-emerald-700 shrink-0" />
                <div>
                  <p className="font-extrabold text-sm">{settlementResult.message}</p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">
                    Kwitansi ini sah sebagai bukti pertanggungjawaban koordinator kepada warga.
                  </p>
                </div>
              </div>

              {/* Area Kwitansi Printable */}
              <div id="print-area-kolektif" className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-5">
                <div className="flex justify-between items-start border-b pb-4 border-slate-100 dark:border-zinc-800">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-purple-700 bg-purple-50 dark:bg-purple-950 px-2 py-0.5 rounded border border-purple-200">
                      Tanda Terima Resmi Kolektif
                    </span>
                    <h2 className="text-xl font-black text-slate-900 dark:text-zinc-100 mt-1">
                      UPS HERU • WASTEPAY
                    </h2>
                    <p className="text-xs text-slate-500">
                      Sistem Pembayaran Retribusi Sampah Terpadu
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-mono font-bold text-slate-800 dark:text-zinc-200">
                      KOL/{settlementResult.induk.id}/{tahun}{String(bulan).padStart(2, "0")}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {formatDate(settlementResult.summary.tanggal)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Koordinator Penyetor:</span>
                    <strong className="text-slate-900 dark:text-zinc-100 text-sm">
                      {settlementResult.induk.nama}
                    </strong>
                    {settlementResult.induk.namaGrupKolektif && (
                      <p className="text-slate-600 dark:text-zinc-400 font-semibold">
                        {settlementResult.induk.namaGrupKolektif}
                      </p>
                    )}
                    <p className="text-slate-500 font-mono">{settlementResult.induk.noTelepon}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block font-medium">Total Terbayar:</span>
                    <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
                      {formatRupiah(settlementResult.summary.totalNominal)}
                    </span>
                    <p className="text-slate-500 capitalize">
                      Metode: <strong className="text-slate-800 dark:text-zinc-200">{settlementResult.summary.metode}</strong> (LUNAS)
                    </p>
                  </div>
                </div>

                {/* Tabel Rincian Warga */}
                <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 font-bold">
                      <tr>
                        <th className="px-3 py-2 text-center w-10">No</th>
                        <th className="px-3 py-2">Nama Rumah / Warga</th>
                        <th className="px-3 py-2">ID Pelanggan</th>
                        <th className="px-3 py-2">No. Invoice</th>
                        <th className="px-3 py-2 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 text-slate-800 dark:text-zinc-200">
                      {settlementResult.items.map((item, idx) => (
                        <tr key={item.tagihanId} className="hover:bg-slate-50/50">
                          <td className="px-3 py-2 text-center text-slate-400">{idx + 1}</td>
                          <td className="px-3 py-2 font-semibold">{item.namaPelanggan}</td>
                          <td className="px-3 py-2 font-mono text-[11px]">{item.kodePelanggan}</td>
                          <td className="px-3 py-2 font-mono text-[11px] text-slate-500">{item.noInvoice || "-"}</td>
                          <td className="px-3 py-2 text-right font-bold text-slate-900 dark:text-zinc-100">
                            {formatRupiah(item.jumlah)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 dark:bg-zinc-900 border-t border-slate-200 dark:border-zinc-800 font-bold">
                      <tr>
                        <td colSpan={4} className="px-3 py-2 text-right uppercase text-slate-600">
                          Total Pelunasan ({settlementResult.items.length} Rumah):
                        </td>
                        <td className="px-3 py-2 text-right text-emerald-700 dark:text-emerald-400 text-sm">
                          {formatRupiah(settlementResult.summary.totalNominal)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="flex justify-between items-center text-[10px] text-slate-400 pt-2 border-t border-slate-100">
                  <span>Dicetak otomatis oleh Sistem WastePay</span>
                  <span>Status: Terverifikasi Kasir Resmi</span>
                </div>
              </div>

              {/* Action Buttons Kwitansi */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  <Printer size={15} />
                  <span>Cetak Kwitansi Kolektif</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl text-xs font-bold transition"
                >
                  Selesai
                </button>
              </div>
            </div>
          ) : (
            /* FORM PEMILIHAN KOORDINATOR DAN TAGIHAN ANGGOTA */
            <form onSubmit={handleProcessSettlement} className="space-y-5">
              {/* Filter Pemilihan Koordinator & Periode */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                    Pilih Koordinator / Induk Kolektif *
                  </label>
                  <select
                    value={selectedIndukId}
                    onChange={(e) => setSelectedIndukId(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-zinc-100 focus:ring-2 focus:ring-purple-500"
                    required
                  >
                    <option value="">-- Pilih Koordinator RT / Pengelola --</option>
                    {indukList.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.nama} {i.namaGrupKolektif ? `(${i.namaGrupKolektif})` : ""} — Telp: {i.noTelepon}
                      </option>
                    ))}
                  </select>
                  {indukList.length === 0 && !loadingInduk && (
                    <p className="text-[11px] text-amber-700 mt-1">
                      Belum ada pelanggan bertipe Induk Kolektif. Atur di menu Pelanggan.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                      Bulan
                    </label>
                    <select
                      value={bulan}
                      onChange={(e) => setBulan(parseInt(e.target.value, 10))}
                      className="w-full px-2 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs"
                    >
                      {BULAN_NAMES.map((bName, idx) => (
                        <option key={idx + 1} value={idx + 1}>
                          {bName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                      Tahun
                    </label>
                    <input
                      type="number"
                      value={tahun}
                      onChange={(e) => setTahun(parseInt(e.target.value, 10) || tahun)}
                      className="w-full px-2 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs text-center"
                    />
                  </div>
                </div>
              </div>

              {/* Rincian Ringkasan Koordinator */}
              {currentInduk && (
                <div className="p-3.5 bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-2xl flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-purple-700 uppercase">Koordinator Terpilih</span>
                    <h4 className="font-extrabold text-slate-900 dark:text-zinc-100 text-sm">
                      {currentInduk.nama}
                    </h4>
                    <p className="text-slate-500">
                      {currentInduk.namaGrupKolektif || "Grup Lingkungan"} • Telp: {currentInduk.noTelepon}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block text-[10px]">Total Anggota Terdaftar</span>
                    <span className="text-base font-black text-purple-700 dark:text-purple-300">
                      {currentInduk._count?.anggotaKolektif ?? tagihanList.length} Rumah
                    </span>
                  </div>
                </div>
              )}

              {/* Daftar Tagihan Warga */}
              {selectedIndukId && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                      <span>Daftar Tagihan Anggota Periode {BULAN_NAMES[bulan - 1]} {tahun}</span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-[10px]">
                        {tagihanList.length} tagihan
                      </span>
                    </h4>
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="text-xs font-semibold text-purple-700 hover:text-purple-800 transition"
                    >
                      {selectedTagihanIds.size === tagihanList.filter((t) => t.status !== "lunas").length
                        ? "Batal Pilih Semua"
                        : "Pilih Semua Tagihan"}
                    </button>
                  </div>

                  {loadingTagihan ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-purple-600" />
                      Memuat daftar tagihan warga...
                    </div>
                  ) : tagihanList.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 dark:bg-zinc-950 rounded-2xl border border-dashed border-slate-200">
                      Tidak ada tagihan untuk periode {BULAN_NAMES[bulan - 1]} {tahun}. Pastikan tagihan sudah di-generate di awal bulan.
                    </div>
                  ) : (
                    <div className="border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 text-slate-600 font-bold sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-center w-8">
                              <input
                                type="checkbox"
                                checked={
                                  tagihanList.filter((t) => t.status !== "lunas").length > 0 &&
                                  selectedTagihanIds.size === tagihanList.filter((t) => t.status !== "lunas").length
                                }
                                onChange={toggleSelectAll}
                                className="rounded text-purple-600"
                              />
                            </th>
                            <th className="px-3 py-2">Nama Pelanggan</th>
                            <th className="px-3 py-2">Alamat / RT</th>
                            <th className="px-3 py-2">Status</th>
                            <th className="px-3 py-2 text-right">Nominal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                          {tagihanList.map((t) => {
                            const isLunas = t.status === "lunas";
                            const isChecked = selectedTagihanIds.has(t.id);
                            return (
                              <tr
                                key={t.id}
                                className={`transition ${
                                  isLunas
                                    ? "bg-slate-50/50 dark:bg-zinc-900/40 text-slate-400"
                                    : isChecked
                                    ? "bg-purple-50/30 dark:bg-purple-950/20"
                                    : "hover:bg-slate-50 dark:hover:bg-zinc-900/60"
                                }`}
                              >
                                <td className="px-3 py-2 text-center">
                                  <input
                                    type="checkbox"
                                    disabled={isLunas}
                                    checked={isChecked}
                                    onChange={() => toggleItem(t.id)}
                                    className="rounded text-purple-600 focus:ring-purple-500 cursor-pointer disabled:cursor-not-allowed"
                                  />
                                </td>
                                <td className="px-3 py-2 font-semibold">
                                  <div className="flex items-center gap-1.5">
                                    <span>{t.namaPelanggan}</span>
                                    {t.isInduk && (
                                      <span className="text-[9px] bg-amber-100 text-amber-800 px-1 rounded font-bold">
                                        Koordinator
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-slate-400 font-mono block">
                                    {t.kodePelanggan}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-slate-600 dark:text-zinc-400 truncate max-w-[150px]">
                                  {t.alamat} {t.rtRw ? `(${t.rtRw})` : ""}
                                </td>
                                <td className="px-3 py-2">
                                  {isLunas ? (
                                    <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      Sudah Lunas
                                    </span>
                                  ) : (
                                    <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                                      Belum Bayar
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-right font-bold text-slate-900 dark:text-zinc-100">
                                  {formatRupiah(t.total)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Form Input Pembayaran Kasir */}
              {selectedIndukId && selectedCount > 0 && (
                <div className="p-4 bg-slate-50 dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                        Metode Pembayaran
                      </label>
                      <select
                        value={metode}
                        onChange={(e) => setMetode(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-semibold"
                      >
                        <option value="tunai">💵 Tunai (Setor Kasir Kantor)</option>
                        <option value="transfer">🏦 Transfer Bank</option>
                        <option value="qris">💳 QRIS / E-Wallet</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                        Catatan Transaksi (Opsional)
                      </label>
                      <input
                        type="text"
                        value={catatan}
                        onChange={(e) => setCatatan(e.target.value)}
                        placeholder="Misal: Diterima langsung dari Ketua RT di kantor"
                        className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-zinc-800">
                    <div>
                      <span className="text-[11px] text-slate-500 block">Total Tagihan Terpilih:</span>
                      <strong className="text-xl font-black text-purple-700 dark:text-purple-300">
                        {formatRupiah(totalSelectedNominal)}
                      </strong>
                      <span className="text-xs text-slate-500 ml-2">({selectedCount} rumah)</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-bold transition"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        disabled={submitting || selectedCount === 0}
                        className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold shadow-md transition active:scale-95 flex items-center gap-1.5"
                      >
                        {submitting ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Memproses...</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck size={16} />
                            <span>Proses Pelunasan Kolektif</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
