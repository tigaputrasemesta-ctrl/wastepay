"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BellRing, BellOff, Send, Clock, Info, ShieldAlert, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DEFAULT_PREFS,
  NOTIF_PREFS_EVENT,
  NOTIF_PREFS_KEY,
  formatHm,
  parseHm,
  parsePrefs,
  serializePrefs,
  type NotifPrefs,
} from "@/lib/notifications";
import { cekStatusIzin, isNative, kirimNotifTes, mintaIzin } from "@/lib/notif-native";

/**
 * Pengaturan notifikasi APK lapangan.
 *
 * Semua setelan disimpan di localStorage perangkat (bukan server): preferensi
 * ini milik HP masing-masing petugas, dan bridge (`NotificationBridge`) membaca
 * nilai yang sama untuk memasang alarm.
 */

function Switch({
  id,
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <label htmlFor={id} className="block text-xs font-bold text-slate-900 leading-tight">
          {label}
        </label>
        {hint && <p className="text-[10px] text-slate-500 leading-snug mt-0.5">{hint}</p>}
      </div>
      <div className="shrink-0 flex items-center gap-1.5">
        <span aria-hidden="true" className={cn("text-[10px] font-bold", checked ? "text-emerald-700" : "text-slate-500")}>
          {checked ? "Aktif" : "Nonaktif"}
        </span>
        <button
          id={id}
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label={label}
          disabled={disabled}
          onClick={() => onChange(!checked)}
          className={cn(
            "relative w-11 h-6 rounded-full border transition-colors shrink-0 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed",
            checked ? "bg-emerald-700 border-emerald-800" : "bg-slate-300 border-slate-400"
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              "absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white shadow transition-all",
              checked ? "left-[22px]" : "left-[3px]"
            )}
          />
        </button>
      </div>
    </div>
  );
}

function JamField({
  id,
  label,
  hint,
  value,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  value: { hour: number; minute: number };
  disabled?: boolean;
  onChange: (next: { hour: number; minute: number }) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 pl-1 pb-2">
      <div className="min-w-0 flex items-start gap-1.5">
        <Clock className="w-3 h-3 text-slate-400 mt-0.5 shrink-0" aria-hidden="true" />
        <div>
          <label htmlFor={id} className="block text-[11px] font-semibold text-slate-700 leading-tight">
            {label}
          </label>
          <p className="text-[10px] text-slate-500 leading-snug">{hint}</p>
        </div>
      </div>
      <input
        id={id}
        type="time"
        value={formatHm(value)}
        disabled={disabled}
        onChange={(e) => {
          const jam = parseHm(e.target.value);
          if (jam) onChange(jam);
        }}
        className="shrink-0 px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 font-semibold outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 disabled:opacity-40 disabled:bg-slate-100"
      />
    </div>
  );
}

function bacaPrefs(): NotifPrefs {
  try {
    return parsePrefs(window.localStorage.getItem(NOTIF_PREFS_KEY));
  } catch {
    return DEFAULT_PREFS;
  }
}

export default function NotifikasiMobilePage() {
  // Satu objek untuk nilai yang berasal dari perangkat (localStorage & Capacitor).
  const [muat, setMuat] = useState<{ prefs: NotifPrefs; native: boolean; siap: boolean }>({
    prefs: DEFAULT_PREFS,
    native: false,
    siap: false,
  });
  const [izin, setIzin] = useState<string | null>(null);
  const [pesan, setPesan] = useState<string | null>(null);
  const [mengirim, setMengirim] = useState(false);
  const { prefs, native, siap } = muat;

  useEffect(() => {
    // Dibaca setelah mount, bukan di initializer useState: localStorage tidak ada
    // saat render di server, dan membacanya di initializer memicu hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sinkronisasi sekali dengan penyimpanan perangkat
    setMuat({ prefs: bacaPrefs(), native: isNative(), siap: true });
    void cekStatusIzin().then(setIzin);
  }, []);

  const simpan = useCallback((next: NotifPrefs) => {
    setMuat((sebelum) => ({ ...sebelum, prefs: next }));
    try {
      window.localStorage.setItem(NOTIF_PREFS_KEY, serializePrefs(next));
    } catch {
      setPesan("Setelan tidak bisa disimpan di perangkat ini.");
      return;
    }
    // Beri tahu bridge agar pengingat langsung dipasang/dibatalkan.
    window.dispatchEvent(new Event(NOTIF_PREFS_EVENT));
  }, []);

  const ubah = useCallback(
    (patch: Partial<NotifPrefs>) => {
      const next = { ...prefs, ...patch };
      simpan(next);
      if (patch.enabled === true && izin !== "granted") {
        void mintaIzin().then((hasil) => {
          setIzin(hasil);
          if (hasil !== "granted") setPesan("Izin notifikasi belum diberikan. Aktifkan lewat Setelan Android.");
          else setPesan(null);
        });
      }
    },
    [prefs, simpan, izin]
  );

  async function ujiNotifikasi() {
    setMengirim(true);
    setPesan(null);
    const ok = await kirimNotifTes(
      "Notifikasi uji coba",
      "Kalau kamu melihat ini, notifikasi APK sudah berfungsi."
    );
    setIzin(await cekStatusIzin());
    setMengirim(false);
    setPesan(
      ok
        ? "Notifikasi uji dikirim — cek panel notifikasi Android dalam beberapa detik."
        : "Gagal mengirim. Pastikan izin notifikasi aktif (hanya bisa di APK Android)."
    );
  }

  const aktifkanSemua = prefs.enabled;
  const izinTeks =
    izin === "granted"
      ? "Izin notifikasi aktif"
      : izin === "denied"
      ? "Izin ditolak di Setelan Android"
      : izin
      ? "Izin belum diberikan"
      : "Bukan aplikasi Android";

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-200/80">
        <div>
          <h1 className="text-sm font-bold text-slate-900 leading-tight">Notifikasi</h1>
          <p className="text-[10px] text-slate-500">Pengingat absen, jadwal & pengumuman</p>
        </div>
        <span
          className={cn(
            "px-2 py-1 rounded-lg text-[10px] font-bold border flex items-center gap-1 shrink-0",
            izin === "granted"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-slate-100 text-slate-600 border-slate-300"
          )}
        >
          {izin === "granted" ? <BellRing className="w-3 h-3" aria-hidden="true" /> : <BellOff className="w-3 h-3" aria-hidden="true" />}
          {izinTeks}
        </span>
      </div>

      {/* Status / arahan izin */}
      {!native && (
        <div className="bg-sky-50 border border-sky-200 rounded-xl px-3 py-2 flex items-start gap-2">
          <Smartphone className="w-3.5 h-3.5 text-sky-700 mt-0.5 shrink-0" aria-hidden="true" />
          <p className="text-[10px] text-sky-900 leading-snug">
            Notifikasi perangkat hanya bekerja di <strong>APK Android</strong>. Halaman ini tersimpan per HP,
            jadi setelannya perlu diatur lagi setelah aplikasi dipasang.
          </p>
        </div>
      )}

      {native && izin !== "granted" && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-start gap-2">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-700 mt-0.5 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-[10px] text-amber-900 leading-snug">
              {izin === "denied"
                ? "Izin ditolak. Buka Setelan Android → Aplikasi → UPS HERU Lapangan → Notifikasi, lalu izinkan."
                : "Izinkan notifikasi agar pengingat bisa muncul walau aplikasi ditutup."}
            </p>
            {izin !== "denied" && (
              <button
                type="button"
                onClick={() => void mintaIzin().then(setIzin)}
                className="mt-1.5 px-2.5 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-[10px] font-bold active:scale-95 transition-all"
              >
                Izinkan notifikasi
              </button>
            )}
          </div>
        </div>
      )}

      {/* Saklar utama */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-3">
        <Switch
          id="notif-enabled"
          label="Aktifkan notifikasi"
          hint="Saklar utama. Mematikan ini menonaktifkan semua pengingat."
          checked={prefs.enabled}
          onChange={(next) => ubah({ enabled: next })}
        />
      </div>

      {/* Pengingat harian */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-3">
        <p className="text-[10px] font-black uppercase tracking-wide text-slate-500 mb-1">Pengingat harian</p>

        <Switch
          id="notif-absen"
          label="Pengingat absen masuk"
          hint="Hanya muncul bila absen hari itu belum tercatat."
          checked={prefs.absen}
          disabled={!aktifkanSemua}
          onChange={(next) => ubah({ absen: next })}
        />
        <JamField
          id="notif-jam-absen"
          label="Jam pengingat absen"
          hint="Waktu pengingat dikirim tiap hari"
          value={prefs.jamAbsen}
          disabled={!aktifkanSemua || !prefs.absen}
          onChange={(jam) => ubah({ jamAbsen: jam })}
        />

        <div className="border-t border-slate-100 pt-1">
          <Switch
            id="notif-jadwal"
            label="Ringkasan tugas hari ini"
            hint="Berisi jumlah pelanggan rute. Tidak muncul saat tidak ada tugas."
            checked={prefs.jadwal}
            disabled={!aktifkanSemua}
            onChange={(next) => ubah({ jadwal: next })}
          />
          <JamField
            id="notif-jam-jadwal"
            label="Jam ringkasan tugas"
            hint="Sebaiknya sebelum jam berangkat"
            value={prefs.jamJadwal}
            disabled={!aktifkanSemua || !prefs.jadwal}
            onChange={(jam) => ubah({ jamJadwal: jam })}
          />
        </div>
      </div>

      {/* Pengumuman */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-3">
        <p className="text-[10px] font-black uppercase tracking-wide text-slate-500 mb-1">Dari admin</p>
        <Switch
          id="notif-pengumuman"
          label="Pengumuman baru"
          hint="Dikirim saat ada pengumuman yang belum pernah kamu lihat."
          checked={prefs.pengumuman}
          disabled={!aktifkanSemua}
          onChange={(next) => ubah({ pengumuman: next })}
        />
      </div>

      {/* Uji coba */}
      <button
        type="button"
        onClick={() => void ujiNotifikasi()}
        disabled={mengirim}
        className="w-full py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
      >
        <Send className="w-3.5 h-3.5" aria-hidden="true" />
        {mengirim ? "Mengirim…" : "Kirim notifikasi uji coba"}
      </button>

      {pesan && (
        <div role="status" className="bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 flex items-start gap-2">
          <Info className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" aria-hidden="true" />
          <p className="text-[10px] text-slate-700 leading-snug">{pesan}</p>
        </div>
      )}

      {!siap && <span className="sr-only">Memuat setelan</span>}

      <p className="text-[10px] text-slate-500 leading-snug px-1">
        Pengingat dipasang di sistem Android, jadi tetap muncul walau aplikasi ditutup atau HP baru
        di-restart. Notifikasi bisa diblokir bila mode Hemat Baterai sangat agresif —{" "}
        <Link href="/m" className="font-bold text-emerald-700 hover:text-emerald-800">
          kembali ke Beranda
        </Link>
        .
      </p>
    </div>
  );
}
