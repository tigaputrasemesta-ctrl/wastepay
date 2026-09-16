"use client";

import { useState } from "react";
import { AlertTriangle, Trash2, Pause, X } from "lucide-react";

type ModalHapusPelangganProps = {
  pelanggan: {
    id: number;
    nama: string;
    kodePelanggan?: string;
    status: string;
    alamat?: string;
    _count?: {
      tagihan?: number;
      pembayaran?: number;
    };
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  showToast?: (msg: string, type?: "success" | "error" | "info") => void;
};

export default function ModalHapusPelanggan({
  pelanggan,
  isOpen,
  onClose,
  onSuccess,
  showToast,
}: ModalHapusPelangganProps) {
  const [loadingAction, setLoadingAction] = useState<"deactivate" | "delete" | null>(null);

  if (!isOpen || !pelanggan) return null;

  const hasHistory = Boolean(
    (pelanggan._count?.tagihan && pelanggan._count.tagihan > 0) ||
    (pelanggan._count?.pembayaran && pelanggan._count.pembayaran > 0)
  );

  async function handleDeactivate() {
    if (!pelanggan) return;
    setLoadingAction("deactivate");
    try {
      const res = await fetch(`/api/pelanggan/${pelanggan.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "nonaktif",
          catatan: "Dinonaktifkan dari menu pengelolaan",
        }),
      });

      if (res.ok) {
        showToast?.(
          `Pelanggan ${pelanggan.nama} dinonaktifkan. Tagihan disetop & riwayat pembukuan tetap aman.`,
          "success"
        );
        onSuccess();
        onClose();
      } else {
        const data = await res.json();
        showToast?.(data.error || "Gagal menonaktifkan pelanggan", "error");
      }
    } catch (err) {
      console.error(err);
      showToast?.("Terjadi kesalahan jaringan", "error");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleDelete() {
    if (!pelanggan) return;
    setLoadingAction("delete");
    try {
      const res = await fetch(`/api/pelanggan/${pelanggan.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        showToast?.(`Pelanggan ${pelanggan.nama} berhasil dihapus dari sistem.`, "success");
        onSuccess();
        onClose();
      } else {
        const data = await res.json();
        showToast?.(data.error || "Gagal menghapus pelanggan", "error");
      }
    } catch (err) {
      console.error(err);
      showToast?.("Terjadi kesalahan jaringan", "error");
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header Modal */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-rose-50/70 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 border border-rose-200 text-rose-700 flex items-center justify-center font-bold shadow-xs">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                Hapus atau Nonaktifkan?
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Pilih tindakan yang tepat untuk pelanggan ini
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loadingAction !== null}
            className="w-8 h-8 rounded-full border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 text-left">
          {/* Target Pelanggan */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-500">
                {pelanggan.kodePelanggan || `#${pelanggan.id}`}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 uppercase">
                {pelanggan.status}
              </span>
            </div>
            <p className="text-sm font-extrabold text-slate-900 mt-1">{pelanggan.nama}</p>
            {pelanggan.alamat && (
              <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{pelanggan.alamat}</p>
            )}
            {hasHistory && (
              <div className="mt-2 pt-2 border-t border-slate-200/70 flex items-center gap-2 text-[11px] font-bold text-amber-800">
                <span>⚠️ Tercatat memiliki</span>
                {pelanggan._count?.tagihan ? <span>{pelanggan._count.tagihan} tagihan</span> : null}
                {pelanggan._count?.pembayaran ? <span>• {pelanggan._count.pembayaran} pembayaran</span> : null}
              </div>
            )}
          </div>

          {/* Kotak Edukasi / Rekomendasi */}
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-950 text-xs space-y-2">
            <p className="font-extrabold flex items-center gap-1.5 text-amber-900">
              <span>💡</span> Saran Pembukuan &amp; Keuangan:
            </p>
            <p className="leading-relaxed text-amber-900">
              Jika warga <strong>berhenti berlangganan</strong>, <strong>pindah rumah</strong>, atau <strong>menolak bayar</strong>, gunakan opsi <strong>Nonaktifkan Saja</strong>.
            </p>
            <p className="leading-relaxed text-slate-700">
              • <strong>Nonaktifkan</strong>: Pengangkutan &amp; tagihan bulanan otomatis berhenti, tapi riwayat kuitansi &amp; pembukuan kas tetap utuh, serta dapat diaktifkan kembali kapan saja.
              <br />
              • <strong>Hapus Permanen</strong>: Hanya gunakan untuk data fiktif / duplikat / salah input yang belum pernah bertransaksi.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={loadingAction !== null}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleDeactivate}
            disabled={loadingAction !== null}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {loadingAction === "deactivate" ? (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Pause className="w-3.5 h-3.5 fill-current" />
            )}
            <span>Nonaktifkan Saja (Disarankan)</span>
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loadingAction !== null}
            className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {loadingAction === "delete" ? (
              <span className="w-3.5 h-3.5 border-2 border-rose-500/30 border-t-rose-600 rounded-full animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            <span>Tetap Hapus</span>
          </button>
        </div>
      </div>
    </div>
  );
}
