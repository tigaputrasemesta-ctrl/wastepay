"use client";

import { useState } from "react";
import Image from "next/image";
import SlideToConfirm from "./SlideToConfirm";
import { formatRupiah } from "@/lib/utils";
import {
  buildWhatsAppDriverUrl,
  buildNavigationUrl,
  buildCallUrl,
} from "@/lib/driver-actions";
import type { ProximityTugas } from "@/hooks/useProximityPickup";

type ProximityPickupModalProps = {
  tugas: ProximityTugas;
  jarakMeter: number;
  kendaraanNama?: string;
  onConfirmPickup: (taskId: number) => Promise<void>;
  onSkipOverdue: (taskId: number, catatan: string) => Promise<void>;
  onOpenFullForm: (tugas: ProximityTugas) => void;
  onDismiss: () => void;
};

export default function ProximityPickupModal({
  tugas,
  jarakMeter,
  kendaraanNama,
  onConfirmPickup,
  onSkipOverdue,
  onOpenFullForm,
  onDismiss,
}: ProximityPickupModalProps) {
  const [loading, setLoading] = useState(false);
  const [showOverrideConfirm, setShowOverrideConfirm] = useState(false);

  const isMenunggak = Boolean(tugas.tunggakan?.isMenunggak);
  const jumlahBulan = tugas.tunggakan?.jumlahBulan || 0;
  const totalNominal = tugas.tunggakan?.totalNominal || 0;

  const waUrl = buildWhatsAppDriverUrl({
    phone: tugas.pelanggan.noTelepon,
    nama: tugas.pelanggan.nama,
    alamat: tugas.pelanggan.alamat,
    patokan: tugas.pelanggan.patokanLokasi,
    isMenunggak,
  });

  const navUrl =
    typeof tugas.pelanggan.latitude === "number" &&
    typeof tugas.pelanggan.longitude === "number"
      ? buildNavigationUrl(tugas.pelanggan.latitude, tugas.pelanggan.longitude)
      : null;

  const telUrl = buildCallUrl(tugas.pelanggan.noTelepon);

  async function handleQuickPickup() {
    setLoading(true);
    try {
      await onConfirmPickup(tugas.id);
    } finally {
      setLoading(false);
    }
  }

  async function handleSkip() {
    setLoading(true);
    try {
      const catatan = `Dilewati otomatis: Konsumen menunggak ${jumlahBulan} bulan (${formatRupiah(totalNominal)})`;
      await onSkipOverdue(tugas.id, catatan);
    } finally {
      setLoading(false);
    }
  }

  async function handleOverridePickup() {
    setLoading(true);
    try {
      await onConfirmPickup(tugas.id);
    } finally {
      setLoading(false);
      setShowOverrideConfirm(false);
    }
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-4 sm:p-6 bg-slate-950/75 backdrop-blur-xs flex items-end justify-center animate-in fade-in duration-200">
      <div
        className={`w-full max-w-lg rounded-3xl p-5 shadow-2xl transition-all border ${
          isMenunggak
            ? "bg-slate-900 border-rose-500/60 ring-4 ring-rose-500/20 text-white"
            : "bg-slate-900 border-emerald-500/60 ring-4 ring-emerald-500/20 text-white"
        }`}
      >
        {/* Header Strip */}
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                isMenunggak
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse"
                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isMenunggak ? "bg-rose-500" : "bg-emerald-400 animate-ping"
                }`}
              />
              <span>{isMenunggak ? "⛔ JANGAN ANGKUT (MENUNGGAK)" : "✓ LUNAS - SIAP ANGKUT"}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-300 bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700">
              📍 {jarakMeter}m
            </span>
            <button
              onClick={onDismiss}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center font-bold text-sm transition-colors"
              title="Tutup sementara"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Customer Info Card */}
        <div className="py-3 flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <h2 className="text-xl font-black text-white tracking-tight leading-tight truncate">
                {tugas.pelanggan.nama}
              </h2>
              <span className="text-[11px] font-mono font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md shrink-0 border border-slate-700">
                {tugas.pelanggan.kodePelanggan}
              </span>
            </div>

            <p className="text-xs text-slate-300 font-medium leading-relaxed">
              {tugas.pelanggan.alamat}
            </p>

            {tugas.pelanggan.patokanLokasi && (
              <div className="pt-0.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-950/60 text-amber-200 text-xs font-semibold border border-amber-600/50">
                  <span>📍 Patokan:</span>
                  <span className="font-bold">{tugas.pelanggan.patokanLokasi}</span>
                </span>
              </div>
            )}
          </div>

          {/* Thumbnail Foto Rumah */}
          {tugas.pelanggan.fotoRumah && (
            <div className="w-14 h-14 rounded-xl overflow-hidden border border-slate-700 shrink-0 relative bg-slate-800">
              <Image
                src={tugas.pelanggan.fotoRumah}
                alt="Foto Rumah"
                fill
                className="object-cover"
                sizes="56px"
              />
            </div>
          )}
        </div>

        {/* Quick Action Button Bar (Gojek / Grab Mitra Style) */}
        <div className="grid grid-cols-3 gap-2 pb-3">
          {navUrl ? (
            <a
              href={navUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-100 font-bold text-xs flex items-center justify-center gap-1.5 transition-all border border-slate-700"
            >
              <span>🧭</span>
              <span>Navigasi</span>
            </a>
          ) : (
            <div className="py-2 px-2.5 rounded-xl bg-slate-800/40 text-slate-500 text-xs text-center border border-slate-800">
              No GPS
            </div>
          )}

          {waUrl ? (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 px-2.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 active:scale-95 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all border border-emerald-700/60"
            >
              <span>💬</span>
              <span>WA Warga</span>
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="py-2 px-2.5 rounded-xl bg-slate-800/40 text-slate-500 text-xs text-center border border-slate-800 cursor-not-allowed"
            >
              No WA
            </button>
          )}

          {telUrl ? (
            <a
              href={telUrl}
              className="py-2 px-2.5 rounded-xl bg-sky-950/80 hover:bg-sky-900 active:scale-95 text-sky-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all border border-sky-700/60"
            >
              <span>📞</span>
              <span>Telpon</span>
            </a>
          ) : (
            <button
              type="button"
              onClick={() => onOpenFullForm(tugas)}
              className="py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 font-bold text-xs flex items-center justify-center gap-1 transition-all border border-slate-700"
            >
              <span>📝</span>
              <span>Detail</span>
            </button>
          )}
        </div>

        {/* Conditional Content: WARNING ARREARS vs NORMAL */}
        {isMenunggak ? (
          <div className="my-2 p-3.5 rounded-2xl bg-rose-950/70 border border-rose-800 text-rose-200 space-y-2">
            <div className="flex items-center justify-between text-xs font-extrabold">
              <span className="flex items-center gap-1 text-rose-300">
                ⚠️ Tunggakan Iuran Retribusi
              </span>
              <span className="bg-rose-900 px-2 py-0.5 rounded-md text-rose-200">
                {jumlahBulan} Bulan Menunggak
              </span>
            </div>
            <div className="text-sm font-bold text-white flex justify-between">
              <span className="text-xs font-medium text-rose-300">Total Tertunggak:</span>
              <span className="text-rose-400 font-black">{formatRupiah(totalNominal)}</span>
            </div>
            <p className="text-[11px] text-rose-300 leading-snug">
              Sesuai SOP, pelanggan yang belum melunasi kewajiban retribusi dilewati penjemputannya hingga tagihan diselesaikan.
            </p>
          </div>
        ) : (
          <div className="my-1.5 flex items-center justify-between text-[11px] text-slate-400 bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60">
            <span className="font-medium">Armada Aktif:</span>
            <span className="font-bold text-white">{kendaraanNama || "Truk Operasional"}</span>
          </div>
        )}

        {/* Action Buttons with SlideToConfirm (Gojek / Grab Swipe Gesture) */}
        <div className="pt-2 space-y-2.5">
          {isMenunggak ? (
            <>
              {!showOverrideConfirm ? (
                <SlideToConfirm
                  variant="danger"
                  text="Geser Lewati (Menunggak)"
                  successText="Mencatat Lewati..."
                  onConfirm={handleSkip}
                />
              ) : (
                <div className="p-3 bg-amber-950/80 rounded-2xl border border-amber-600/60 space-y-2">
                  <p className="text-xs font-bold text-amber-200 text-center">
                    Dispensasi: Yakin tetap angkut meski menunggak?
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowOverrideConfirm(false)}
                      className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleOverridePickup}
                      disabled={loading}
                      className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-black"
                    >
                      {loading ? "Menyimpan..." : "Ya, Dispensasi"}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between gap-2 pt-1 text-xs text-slate-400">
                {!showOverrideConfirm && (
                  <button
                    type="button"
                    onClick={() => setShowOverrideConfirm(true)}
                    className="text-amber-400 hover:text-amber-300 font-bold underline"
                  >
                    Tetap Angkut (Dispensasi) ⚠️
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onOpenFullForm(tugas)}
                  className="text-slate-400 hover:text-white font-bold ml-auto"
                >
                  Form Detail 📝
                </button>
              </div>
            </>
          ) : (
            <>
              {/* SLIDE TO CONFIRM: ANTI-ACCIDENTAL TOUCH */}
              <SlideToConfirm
                variant="success"
                text="Geser untuk Selesaikan Pickup"
                successText="Mencatat Selesai..."
                onConfirm={handleQuickPickup}
              />

              <div className="flex items-center justify-between gap-2 pt-1 text-xs text-slate-400">
                <button
                  type="button"
                  onClick={() => onOpenFullForm(tugas)}
                  className="text-slate-300 hover:text-emerald-400 font-bold flex items-center gap-1"
                >
                  <span>📸</span>
                  <span>Form Lengkap (Foto / Timbangan)</span>
                </button>
                <button
                  type="button"
                  onClick={onDismiss}
                  className="text-slate-500 hover:text-slate-300 font-bold"
                >
                  Tutup Sementara ✕
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
