"use client";

import { useState, useEffect } from "react";
import { Check, X, AlertTriangle, Play, Pause, Sun } from "lucide-react";

type ModalStatusPelangganProps = {
  pelanggan: {
    id: number;
    nama: string;
    kodePelanggan?: string;
    status: string;
    catatan?: string | null;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  showToast?: (msg: string, type?: "success" | "error" | "info") => void;
  initialTargetStatus?: "aktif" | "nonaktif" | "libur";
};

export default function ModalStatusPelanggan({
  pelanggan,
  isOpen,
  onClose,
  onSuccess,
  showToast,
  initialTargetStatus,
}: ModalStatusPelangganProps) {
  const [selectedStatus, setSelectedStatus] = useState<"aktif" | "nonaktif" | "libur">("nonaktif");
  const [catatan, setCatatan] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (pelanggan && isOpen) {
      if (initialTargetStatus) {
        setSelectedStatus(initialTargetStatus);
      } else if (pelanggan.status === "aktif") {
        setSelectedStatus("nonaktif");
      } else {
        setSelectedStatus("aktif");
      }
      setCatatan(pelanggan.catatan || "");
    }
  }, [pelanggan, isOpen, initialTargetStatus]);

  if (!isOpen || !pelanggan) return null;

  async function handleSave() {
    if (!pelanggan) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/pelanggan/${pelanggan.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: selectedStatus,
          catatan: catatan.trim() || undefined,
        }),
      });

      if (res.ok) {
        const labelMap: Record<string, string> = {
          aktif: "diaktifkan kembali",
          nonaktif: "dinonaktifkan",
          libur: "diatur libur sementara",
        };
        showToast?.(`Pelanggan ${pelanggan.nama} berhasil ${labelMap[selectedStatus] || "diperbarui"}.`, "success");
        onSuccess();
        onClose();
      } else {
        const data = await res.json();
        showToast?.(data.error || "Gagal memperbarui status pelanggan", "error");
      }
    } catch (err) {
      console.error(err);
      showToast?.("Terjadi kesalahan jaringan", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh] text-slate-900 dark:text-zinc-100">
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between bg-slate-50/50 dark:bg-zinc-950/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-900 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold shadow-xs">
              ⚙️
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-zinc-100 tracking-tight">
                Kelola Status Layanan Pelanggan
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 font-normal">
                Sesuaikan status operasional &amp; penagihan untuk warga
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-left">
          {/* Info Singkat Pelanggan */}
          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-mono font-bold text-slate-500 dark:text-zinc-400 uppercase">
                {pelanggan.kodePelanggan || `ID #${pelanggan.id}`}
              </p>
              <p className="text-sm font-bold text-slate-900 dark:text-zinc-100 mt-0.5">{pelanggan.nama}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-semibold block uppercase">Status Saat Ini</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase mt-0.5 ${
                pelanggan.status === "aktif"
                  ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                  : pelanggan.status === "nonaktif"
                  ? "bg-slate-200 dark:bg-zinc-800 text-slate-800 dark:text-zinc-300 border border-slate-300 dark:border-zinc-700"
                  : pelanggan.status === "libur"
                  ? "bg-amber-100 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                  : "bg-sky-100 dark:bg-sky-950/50 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-800"
              }`}>
                {pelanggan.status}
              </span>
            </div>
          </div>

          {/* Opsi Pilihan Status */}
          <div className="space-y-2.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 uppercase tracking-wide">
              Pilih Status Baru:
            </label>

            {/* Opsi: Aktif */}
            <div
              onClick={() => setSelectedStatus("aktif")}
              className={`p-3.5 rounded-lg border-2 transition-all cursor-pointer flex items-start gap-3.5 ${
                selectedStatus === "aktif"
                  ? "border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/40 shadow-xs"
                  : "border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-950"
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                selectedStatus === "aktif" ? "bg-emerald-600 text-white" : "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300"
              }`}>
                <Play className="w-4 h-4 fill-current" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Aktif (Layanan Berjalan Normal)</span>
                  {selectedStatus === "aktif" && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-bold" />}
                </div>
                <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1 leading-relaxed">
                  Pelanggan terjadwal di rute harian armada truk pickup dan menerima tagihan bulanan rutin.
                </p>
              </div>
            </div>

            {/* Opsi: Nonaktif */}
            <div
              onClick={() => setSelectedStatus("nonaktif")}
              className={`p-3.5 rounded-lg border-2 transition-all cursor-pointer flex items-start gap-3.5 ${
                selectedStatus === "nonaktif"
                  ? "border-slate-700 dark:border-zinc-600 bg-slate-100/90 dark:bg-zinc-800/80 shadow-xs"
                  : "border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-950"
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                selectedStatus === "nonaktif" ? "bg-slate-800 dark:bg-zinc-200 text-white dark:text-zinc-900" : "bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300"
              }`}>
                <Pause className="w-4 h-4 fill-current" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Nonaktif (Berhenti Langganan / Diputus)</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-300">
                      Disarankan
                    </span>
                  </div>
                  {selectedStatus === "nonaktif" && <Check className="w-4 h-4 text-slate-900 dark:text-zinc-100 font-bold" />}
                </div>
                <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1 leading-relaxed">
                  <strong>Otomatis menghentikan penerbitan tagihan bulanan baru</strong> dan armada truk melewati alamat ini. Seluruh riwayat pembayaran &amp; kwitansi masa lalu <strong>tetap tersimpan aman 100%</strong> dan dapat diaktifkan kembali kapan saja.
                </p>
              </div>
            </div>

            {/* Opsi: Libur */}
            <div
              onClick={() => setSelectedStatus("libur")}
              className={`p-3.5 rounded-lg border-2 transition-all cursor-pointer flex items-start gap-3.5 ${
                selectedStatus === "libur"
                  ? "border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 shadow-xs"
                  : "border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-950"
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                selectedStatus === "libur" ? "bg-amber-500 text-white" : "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300"
              }`}>
                <Sun className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Libur (Cuti Pengangkutan Sementara)</span>
                  {selectedStatus === "libur" && <Check className="w-4 h-4 text-amber-600 dark:text-amber-400 font-bold" />}
                </div>
                <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1 leading-relaxed">
                  Penjemputan sampah dijeda sementara (misal: mudik lebaran atau rumah sedang renovasi). Data pelanggan tetap terdaftar aktif dalam sistem.
                </p>
              </div>
            </div>
          </div>

          {/* Catatan / Alasan */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
              Catatan / Alasan Perubahan Status (Opsional)
            </label>
            <textarea
              rows={2}
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Contoh: Warga pindah rumah ke luar kota per 1 Oktober / Permintaan cuti mudik 2 minggu"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs font-medium text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/50 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 text-xs font-semibold transition disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className={`px-5 py-2 rounded-lg text-white text-xs font-semibold shadow-xs transition active:scale-95 flex items-center gap-2 disabled:opacity-50 ${
              selectedStatus === "aktif"
                ? "bg-emerald-600 hover:bg-emerald-700"
                : selectedStatus === "nonaktif"
                ? "bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-slate-800 dark:hover:bg-zinc-200"
                : "bg-amber-600 hover:bg-amber-700"
            }`}
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <span>Simpan Status {selectedStatus.toUpperCase()}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
