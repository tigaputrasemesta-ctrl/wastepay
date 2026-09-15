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

type DriverTaskHUDProps = {
  activeTask: ProximityTugas | null;
  jarakMeter: number | null;
  radiusMeter: number;
  totalTasks: number;
  completedTasks: number;
  muatanTruk: number; // 25, 50, 75, 100
  onMuatanChange: (persen: number) => void;
  onQuickPickup: (taskId: number) => Promise<void>;
  onSkipOverdue: (taskId: number, catatan: string) => Promise<void>;
  onOpenFullForm: (tugas: ProximityTugas) => void;
  onDismissActive?: () => void;
  tpaCoords?: { lat: number; lng: number; nama?: string };
};

export default function DriverTaskHUD({
  activeTask,
  jarakMeter,
  radiusMeter,
  totalTasks,
  completedTasks,
  muatanTruk,
  onMuatanChange,
  onQuickPickup,
  onSkipOverdue,
  onOpenFullForm,
  onDismissActive,
  tpaCoords,
}: DriverTaskHUDProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showOverride, setShowOverride] = useState(false);
  const [showCapacityMenu, setShowCapacityMenu] = useState(false);

  const percentProgress =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const isWithinRadius =
    jarakMeter !== null && jarakMeter <= radiusMeter;

  const isMenunggak = Boolean(activeTask?.tunggakan?.isMenunggak);
  const jumlahBulan = activeTask?.tunggakan?.jumlahBulan || 0;
  const totalNominal = activeTask?.tunggakan?.totalNominal || 0;

  // WhatsApp, Navigasi, Telp URLs
  const waUrl = activeTask
    ? buildWhatsAppDriverUrl({
        phone: activeTask.pelanggan.noTelepon,
        nama: activeTask.pelanggan.nama,
        alamat: activeTask.pelanggan.alamat,
        patokan: activeTask.pelanggan.patokanLokasi,
        isMenunggak,
      })
    : null;

  const navUrl =
    activeTask &&
    typeof activeTask.pelanggan.latitude === "number" &&
    typeof activeTask.pelanggan.longitude === "number"
      ? buildNavigationUrl(
          activeTask.pelanggan.latitude,
          activeTask.pelanggan.longitude
        )
      : null;

  const telUrl = activeTask
    ? buildCallUrl(activeTask.pelanggan.noTelepon)
    : null;

  const tpaNavUrl = tpaCoords
    ? buildNavigationUrl(tpaCoords.lat, tpaCoords.lng)
    : null;

  return (
    <div className="space-y-2">
      {/* 1. TOP MULTI-STOP TRIP PROGRESS BAR (ALA GOJEK / GRAB) */}
      <div className="bg-slate-900/90 backdrop-blur-md text-white rounded-2xl p-3 shadow-lg border border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-extrabold text-slate-200">
              Stop #{completedTasks + 1} dari {totalTasks}
            </span>
            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800/60">
              {percentProgress}% Selesai
            </span>
          </div>

          {/* Muatan Truk Badge */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowCapacityMenu(!showCapacityMenu)}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-black flex items-center gap-1.5 transition-all ${
                muatanTruk >= 100
                  ? "bg-rose-600 text-white animate-pulse shadow-md shadow-rose-600/30"
                  : muatanTruk >= 75
                  ? "bg-amber-500 text-slate-950"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-200"
              }`}
            >
              <span>🚛 Bak: {muatanTruk}%</span>
              <span>▾</span>
            </button>

            {/* Capacity Dropdown Menu */}
            {showCapacityMenu && (
              <div className="absolute right-0 top-full mt-1.5 z-50 bg-slate-900 border border-slate-700 rounded-2xl p-2 shadow-2xl space-y-1 w-44">
                <div className="text-[10px] font-bold text-slate-400 px-2 py-0.5">
                  Kapasitas Muatan Truk:
                </div>
                {[25, 50, 75, 100].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      onMuatanChange(p);
                      setShowCapacityMenu(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-between ${
                      muatanTruk === p
                        ? "bg-emerald-700 text-white"
                        : "hover:bg-slate-800 text-slate-300"
                    }`}
                  >
                    <span>{p}% {p === 100 ? "🚨 Penuh" : ""}</span>
                    {muatanTruk === p && <span>✓</span>}
                  </button>
                ))}
                {muatanTruk >= 100 && tpaNavUrl && (
                  <a
                    href={tpaNavUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block text-center py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black"
                  >
                    🚛 Rute ke TPS/TPA
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar Track */}
        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
            style={{ width: `${percentProgress}%` }}
          />
        </div>
      </div>

      {/* 2. FLOATING BOTTOM SHEET HUD FOR CURRENT TARGET */}
      {activeTask && (
        <div
          className={`rounded-3xl shadow-xl transition-all border overflow-hidden ${
            isMenunggak
              ? "bg-slate-950 border-rose-500/50 shadow-rose-950/40"
              : "bg-slate-950 border-emerald-500/40 shadow-emerald-950/40"
          }`}
        >
          {/* Header Bar with Toggle Collapse */}
          <div className="p-3.5 pb-2 flex items-center justify-between gap-2 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider ${
                  isMenunggak
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse"
                    : isWithinRadius
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isMenunggak
                      ? "bg-rose-500"
                      : isWithinRadius
                      ? "bg-emerald-400 animate-ping"
                      : "bg-sky-400"
                  }`}
                />
                <span>
                  {isMenunggak
                    ? "⛔ JANGAN ANGKUT (MENUNGGAK)"
                    : isWithinRadius
                    ? "🎯 SIAP PICKUP (DI LOKASI)"
                    : "👉 TARGET BERIKUTNYA"}
                </span>
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {jarakMeter !== null && (
                <span
                  className={`text-[11px] font-black px-2 py-0.5 rounded-lg ${
                    isWithinRadius
                      ? "bg-emerald-500 text-slate-950"
                      : "bg-slate-800 text-slate-300"
                  }`}
                >
                  📍 {jarakMeter}m
                </span>
              )}
              <button
                type="button"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xs font-bold transition-colors"
                title={isCollapsed ? "Perluas" : "Ciutkan"}
              >
                {isCollapsed ? "▲" : "▼"}
              </button>
              {onDismissActive && (
                <button
                  type="button"
                  onClick={onDismissActive}
                  className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xs font-bold transition-colors"
                  title="Tutup"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Content Body (Visible when not collapsed) */}
          {!isCollapsed && (
            <div className="p-4 space-y-3">
              {/* Customer Row */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-white truncate">
                      {activeTask.pelanggan.nama}
                    </h3>
                    <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded-md shrink-0">
                      {activeTask.pelanggan.kodePelanggan}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                    {activeTask.pelanggan.alamat}
                  </p>

                  {activeTask.pelanggan.patokanLokasi && (
                    <div className="text-[11px] text-amber-300 font-medium flex items-center gap-1">
                      <span>📍 Patokan:</span>
                      <span className="font-bold">
                        {activeTask.pelanggan.patokanLokasi}
                      </span>
                    </div>
                  )}
                </div>

                {/* Thumbnail foto rumah jika ada */}
                {activeTask.pelanggan.fotoRumah && (
                  <div className="w-[3.25rem] h-[3.25rem] rounded-xl overflow-hidden border border-slate-700 shrink-0 bg-slate-800 relative">
                    <Image
                      src={activeTask.pelanggan.fotoRumah}
                      alt="Foto Rumah"
                      fill
                      className="object-cover"
                      sizes="52px"
                    />
                  </div>
                )}
              </div>

              {/* Overdue Warning Details if Applicable */}
              {isMenunggak && (
                <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-200 text-xs space-y-1">
                  <div className="flex items-center justify-between font-extrabold">
                    <span>⚠️ Menunggak {jumlahBulan} Bulan</span>
                    <span className="text-rose-400 font-black">
                      {formatRupiah(totalNominal)}
                    </span>
                  </div>
                  <p className="text-[10px] text-rose-300 leading-tight">
                    SOP: Warga dengan tunggakan dilewati hingga tagihan diselesaikan.
                  </p>
                </div>
              )}

              {/* 3. GOJEK-STYLE QUICK ACTION BUTTON BAR */}
              <div className="grid grid-cols-3 gap-2 pt-0.5">
                {/* 1-Tap Google Maps Navigation */}
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
                  <div className="py-2 px-2.5 rounded-xl bg-slate-900 text-slate-600 text-xs text-center border border-slate-800">
                    No GPS
                  </div>
                )}

                {/* 1-Tap WhatsApp Customer with polite template */}
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
                    className="py-2 px-2.5 rounded-xl bg-slate-900 text-slate-600 text-xs text-center border border-slate-800 cursor-not-allowed"
                  >
                    No WA
                  </button>
                )}

                {/* 1-Tap Call Phone or Full Form */}
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
                    onClick={() => onOpenFullForm(activeTask)}
                    className="py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 font-bold text-xs flex items-center justify-center gap-1 transition-all border border-slate-700"
                  >
                    <span>📝</span>
                    <span>Detail</span>
                  </button>
                )}
              </div>

              {/* 4. SLIDE TO CONFIRM ACTION GESTURE (ALA GOJEK / GRAB) */}
              <div className="pt-1">
                {isMenunggak ? (
                  <div className="space-y-2">
                    {!showOverride ? (
                      <SlideToConfirm
                        variant="danger"
                        text="Geser Lewati (Menunggak)"
                        successText="Mencatat Lewati..."
                        onConfirm={async () => {
                          const catatan = `Dilewati otomatis: Konsumen menunggak ${jumlahBulan} bulan (${formatRupiah(
                            totalNominal
                          )})`;
                          await onSkipOverdue(activeTask.id, catatan);
                        }}
                      />
                    ) : (
                      <div className="p-3 bg-amber-950/80 border border-amber-600/60 rounded-2xl text-center space-y-2">
                        <p className="text-xs font-bold text-amber-200">
                          Dispensasi: Yakin tetap angkut meski menunggak?
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setShowOverride(false)}
                            className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"
                          >
                            Batal
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await onQuickPickup(activeTask.id);
                              setShowOverride(false);
                            }}
                            className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-black"
                          >
                            Ya, Tetap Angkut
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] px-1 text-slate-400">
                      {!showOverride && (
                        <button
                          type="button"
                          onClick={() => setShowOverride(true)}
                          className="hover:text-amber-300 underline font-medium"
                        >
                          Dispensasi Tetap Angkut ⚠️
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onOpenFullForm(activeTask)}
                        className="hover:text-slate-200 ml-auto font-medium"
                      >
                        Form Lengkap / Foto 📸
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <SlideToConfirm
                      variant="success"
                      text="Geser untuk Selesaikan"
                      successText="Mencatat Pickup..."
                      onConfirm={async () => {
                        await onQuickPickup(activeTask.id);
                      }}
                    />

                    <div className="flex items-center justify-between text-[11px] px-1 text-slate-400">
                      <button
                        type="button"
                        onClick={() => onOpenFullForm(activeTask)}
                        className="hover:text-emerald-300 font-medium flex items-center gap-1"
                      >
                        <span>📸</span>
                        <span>Form Lengkap (Foto / Timbangan)</span>
                      </button>
                      <span className="text-slate-500">
                        {isWithinRadius ? "🎯 Radius Sesuai" : "Manual Pickup"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
