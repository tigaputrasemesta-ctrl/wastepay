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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-2xl w-full max-w-md overflow-hidden flex flex-col text-slate-900 dark:text-zinc-100">
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between bg-slate-50/50 dark:bg-zinc-950/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200/60 dark:border-rose-900 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold shadow-xs">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-zinc-100 tracking-tight">
                Hapus atau Nonaktifkan?
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 font-normal">
                Pilih tindakan yang tepat untuk pelanggan ini
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loadingAction !== null}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 text-left">
          {/* Target Pelanggan */}
          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-500 dark:text-zinc-400">
                {pelanggan.kodePelanggan || `#${pelanggan.id}`}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 uppercase">
                {pelanggan.status}
              </span>
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-zinc-100 mt-1">{pelanggan.nama}</p>
            {pelanggan.alamat && (
              <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-1 mt-0.5">{pelanggan.alamat}</p>
            )}
            {hasHistory && (
              <div className="mt-2 pt-2 border-t border-slate-200/70 dark:border-zinc-800 flex items-center gap-2 text-[11px] font-bold text-amber-700 dark:text-amber-400">
                <span>⚠️ Tercatat memiliki</span>
                {pelanggan._count?.tagihan ? <span>{pelanggan._count.tagihan} tagihan</span> : null}
                {pelanggan._count?.pembayaran ? <span>• {pelanggan._count.pembayaran} pembayaran</span> : null}
              </div>
            )}
          </div>

          {/* Kotak Edukasi / Rekomendasi */}
          <div className="p-3.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900 text-amber-950 dark:text-amber-200 text-xs space-y-2">
            <p className="font-semibold flex items-center gap-1.5 text-amber-900 dark:text-amber-300">
              <span>💡</span> Saran Pembukuan &amp; Keuangan:
            </p>
            <p className="leading-relaxed text-amber-900 dark:text-amber-300">
              Jika warga <strong>berhenti berlangganan</strong>, <strong>pindah rumah</strong>, atau <strong>menolak bayar</strong>, gunakan opsi <strong>Nonaktifkan Saja</strong>.
            </p>
            <p className="leading-relaxed text-slate-700 dark:text-zinc-300">
              • <strong>Nonaktifkan</strong>: Pengangkutan &amp; tagihan bulanan otomatis berhenti, tapi riwayat kuitansi &amp; pembukuan kas tetap utuh, serta dapat diaktifkan kembali kapan saja.
              <br />
              • <strong>Hapus Permanen</strong>: Hanya gunakan untuk data fiktif / duplikat / salah input yang belum pernah bertransaksi.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/50 flex flex-col sm:flex-row items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loadingAction !== null}
            className="w-full sm:w-auto px-4 py-2 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 text-xs font-semibold transition disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleDeactivate}
            disabled={loadingAction !== null}
            className="w-full sm:w-auto px-4 py-2 rounded-lg bg-slate-900 dark:bg-zinc-100 hover:bg-slate-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-semibold shadow-xs transition active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50"
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
            className="w-full sm:w-auto px-3.5 py-2 rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-semibold transition active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50"
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
