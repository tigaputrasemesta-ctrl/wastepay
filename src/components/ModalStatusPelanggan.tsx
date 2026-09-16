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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Modal */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-800 font-bold shadow-xs">
              ⚙️
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                Kelola Status Layanan Pelanggan
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Sesuaikan status operasional &amp; penagihan untuk warga
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="w-8 h-8 rounded-full border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-left">
          {/* Info Singkat Pelanggan */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <div>
              <p className="text-xs font-mono font-bold text-slate-500 uppercase">
                {pelanggan.kodePelanggan || `ID #${pelanggan.id}`}
              </p>
              <p className="text-sm font-extrabold text-slate-900 mt-0.5">{pelanggan.nama}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">Status Saat Ini</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase mt-0.5 ${
                pelanggan.status === "aktif"
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  : pelanggan.status === "nonaktif"
                  ? "bg-slate-200 text-slate-800 border border-slate-300"
                  : pelanggan.status === "libur"
                  ? "bg-amber-100 text-amber-900 border border-amber-300"
                  : "bg-sky-100 text-sky-800 border border-sky-300"
              }`}>
                {pelanggan.status}
              </span>
            </div>
          </div>

          {/* Opsi Pilihan Status */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
              Pilih Status Baru:
            </label>

            {/* Opsi: Aktif */}
            <div
              onClick={() => setSelectedStatus("aktif")}
              className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3.5 ${
                selectedStatus === "aktif"
                  ? "border-emerald-600 bg-emerald-50/60 shadow-xs"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                selectedStatus === "aktif" ? "bg-emerald-600 text-white" : "bg-emerald-100 text-emerald-800"
              }`}>
                <Play className="w-4 h-4 fill-current" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900">Aktif (Layanan Berjalan Normal)</span>
                  {selectedStatus === "aktif" && <Check className="w-4 h-4 text-emerald-700 font-bold" />}
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Pelanggan terjadwal di rute harian armada truk pickup dan menerima tagihan bulanan rutin.
                </p>
              </div>
            </div>

            {/* Opsi: Nonaktif */}
            <div
              onClick={() => setSelectedStatus("nonaktif")}
              className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3.5 ${
                selectedStatus === "nonaktif"
                  ? "border-slate-800 bg-slate-100/90 shadow-xs"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                selectedStatus === "nonaktif" ? "bg-slate-800 text-white" : "bg-slate-200 text-slate-700"
              }`}>
                <Pause className="w-4 h-4 fill-current" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-slate-900">Nonaktif (Berhenti Langganan / Diputus)</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900">
                      Disarankan
                    </span>
                  </div>
                  {selectedStatus === "nonaktif" && <Check className="w-4 h-4 text-slate-900 font-bold" />}
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  <strong>Otomatis menghentikan penerbitan tagihan bulanan baru</strong> dan armada truk melewati alamat ini. Seluruh riwayat pembayaran &amp; kwitansi masa lalu <strong>tetap tersimpan aman 100%</strong> dan dapat diaktifkan kembali kapan saja.
                </p>
              </div>
            </div>

            {/* Opsi: Libur */}
            <div
              onClick={() => setSelectedStatus("libur")}
              className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3.5 ${
                selectedStatus === "libur"
                  ? "border-amber-500 bg-amber-50/70 shadow-xs"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                selectedStatus === "libur" ? "bg-amber-500 text-white" : "bg-amber-100 text-amber-800"
              }`}>
                <Sun className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900">Libur (Cuti Pengangkutan Sementara)</span>
                  {selectedStatus === "libur" && <Check className="w-4 h-4 text-amber-700 font-bold" />}
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Penjemputan sampah dijeda sementara (misal: mudik lebaran atau rumah sedang renovasi). Data pelanggan tetap terdaftar aktif dalam sistem.
                </p>
              </div>
            </div>
          </div>

          {/* Catatan / Alasan */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Catatan / Alasan Perubahan Status (Opsional)
            </label>
            <textarea
              rows={2}
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Contoh: Warga pindah rumah ke luar kota per 1 Oktober / Permintaan cuti mudik 2 minggu"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs font-medium text-slate-900 placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-xs transition active:scale-95 flex items-center gap-2 disabled:opacity-50 ${
              selectedStatus === "aktif"
                ? "bg-emerald-700 hover:bg-emerald-800"
                : selectedStatus === "nonaktif"
                ? "bg-slate-900 hover:bg-slate-800"
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
