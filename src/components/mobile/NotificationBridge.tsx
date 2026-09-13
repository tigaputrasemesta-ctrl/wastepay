"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import {
  NOTIF_ID_PENGUMUMAN,
  NOTIF_PREFS_EVENT,
  NOTIF_PREFS_KEY,
  NOTIF_SEEN_KEY,
  REPEAT_IDS,
  buildReminderPlan,
  diffUnseen,
  notifPengumuman,
  parsePrefs,
  pruneSeen,
  tanggalLokal,
  type PengumumanRingkas,
} from "@/lib/notifications";

/**
 * Jembatan notifikasi perangkat untuk APK lapangan.
 *
 * Komponen ini tidak menampilkan apa pun (return null). Tugasnya:
 *  1. memasang pengingat HARIAN (absen & jadwal) lewat alarm sistem — tetap
 *     berbunyi walau aplikasi ditutup;
 *  2. mengirim notifikasi SEKETIKA untuk pengumuman yang belum pernah dilihat;
 *  3. membuka halaman yang relevan saat notifikasi diketuk.
 *
 * Keputusan "apa yang dipasang" ada di `src/lib/notifications.ts` (murni,
 * teruji). Berkas ini hanya eksekusi native + I/O.
 *
 * Catatan: hanya aktif di APK (`Capacitor.isNativePlatform()`), jadi versi web
 * tidak terpengaruh sama sekali.
 */

type NotifModule = typeof import("@capacitor/local-notifications");
type Plugin = NotifModule["LocalNotifications"];

type TugasApi = Array<{ id: number; kendaraan?: { nama?: string | null; platNomor?: string | null } | null }>;
type AbsensiApi = { statusHariIni?: { id: number } | null };

/** Jeda antar notifikasi pengumuman dalam satu batch agar tidak menumpuk. */
const JEDA_BATCH_MS = 1500;
/** Interval cek pengumuman saat aplikasi sedang dilihat. */
const INTERVAL_PENGUMUMAN_MS = 90_000;

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Mode privat / storage penuh — notifikasi tetap jalan, hanya dedupe yang hilang.
  }
}

/**
 * `null` = belum pernah diinisialisasi (instalasi baru), bukan "tidak ada id".
 * Perbedaan ini penting: instalasi baru tidak boleh memunculkan notifikasi
 * untuk SEMUA pengumuman lama sekaligus.
 */
function readSeen(): string[] | null {
  const raw = safeGet(NOTIF_SEEN_KEY);
  if (raw === null) return null;
  try {
    const arr: unknown = JSON.parse(raw);
    if (!Array.isArray(arr)) return null;
    return arr.filter((x): x is string => typeof x === "string");
  } catch {
    return null;
  }
}

export default function NotificationBridge() {
  const router = useRouter();
  const routerRef = useRef(router);
  // Disinkronkan lewat effect (bukan saat render) agar patuh aturan react-hooks/refs.
  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let alive = true;
    let mod: NotifModule | null = null;
    let interval: ReturnType<typeof setInterval> | null = null;
    let sudahMintaIzin = false;
    const cleanups: Array<() => void> = [];

    const native = async (): Promise<Plugin | null> => {
      if (!mod) {
        try {
          mod = await import("@capacitor/local-notifications");
        } catch {
          return null;
        }
      }
      return mod?.LocalNotifications ?? null;
    };

    const getJson = async <T,>(url: string): Promise<T | null> => {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) return null;
        return (await res.json()) as T;
      } catch {
        return null;
      }
    };

    /**
     * Minta izin paling banyak SEKALI per sesi. Bila pengguna sudah menolak,
     * jangan bertanya terus — halaman /m/notifikasi yang memberi arahan setelan.
     */
    const pastikanIzin = async (plugin: Plugin): Promise<boolean> => {
      const status = await plugin.checkPermissions().catch(() => null);
      if (!status) return false;
      if (status.display === "granted") return true;
      if (sudahMintaIzin || status.display === "denied") return false;
      sudahMintaIzin = true;
      const diminta = await plugin.requestPermissions().catch(() => null);
      return diminta?.display === "granted";
    };

    const batalkanPengingat = async (plugin: Plugin): Promise<void> => {
      await plugin.cancel({ notifications: REPEAT_IDS.map((id) => ({ id })) }).catch(() => {});
    };

    /** Pasang ulang pengingat harian dari keadaan nyata. Idempoten. */
    const pasangPengingat = async (): Promise<void> => {
      if (!alive) return;
      const plugin = await native();
      if (!plugin) return;
      const prefs = parsePrefs(safeGet(NOTIF_PREFS_KEY));

      // Selalu bersihkan lebih dulu: pengingat lama bisa sudah tidak relevan
      // (pengguna baru absen, atau jamnya diubah).
      await batalkanPengingat(plugin);
      if (!prefs.enabled || !alive) return;
      if (!(await pastikanIzin(plugin))) return;
      if (!alive) return;

      const [absensi, tugas] = await Promise.all([
        getJson<AbsensiApi>("/api/absensi"),
        getJson<TugasApi>(`/api/pengangkutan?saya=1&tanggal=${tanggalLokal(new Date())}`),
      ]);
      if (!alive) return;

      const daftar = Array.isArray(tugas) ? tugas : [];
      const armada = daftar.find((t) => t?.kendaraan?.platNomor)?.kendaraan?.platNomor ?? null;

      const plan = buildReminderPlan({
        prefs,
        sudahAbsenHariIni: Boolean(absensi?.statusHariIni),
        tugasHariIni: daftar.length,
        namaArmada: armada,
      });
      if (plan.length === 0) return;

      await plugin
        .schedule({
          notifications: plan.map((item) => ({
            id: item.id,
            title: item.title,
            body: item.body,
            // `on` tanpa `repeats` sudah berulang tiap hari (lihat catatan di lib).
            schedule: { on: { hour: item.hour, minute: item.minute }, allowWhileIdle: true },
            extra: { page: item.page },
          })),
        })
        .catch(() => {
          // Izin dicabut di tengah jalan — dicoba lagi saat aplikasi dibuka lagi.
        });
    };

    /** Notifikasi seketika untuk pengumuman yang belum pernah dilihat. */
    const cekPengumuman = async (): Promise<void> => {
      if (!alive) return;
      const plugin = await native();
      if (!plugin) return;
      const prefs = parsePrefs(safeGet(NOTIF_PREFS_KEY));
      if (!prefs.enabled || !prefs.pengumuman) return;

      const daftar = await getJson<PengumumanRingkas[]>("/api/pengumuman");
      if (!alive || !Array.isArray(daftar)) return;
      const valid = daftar.filter((p) => p && typeof p.id === "number");
      if (valid.length === 0) return;

      const seen = readSeen();
      if (seen === null) {
        // Instalasi baru: tandai semua yang ada sebagai "sudah dilihat" agar
        // tidak memunculkan belasan notifikasi lama sekaligus.
        safeSet(NOTIF_SEEN_KEY, JSON.stringify(pruneSeen([], valid.map((p) => String(p.id)))));
        return;
      }

      const baru = diffUnseen(seen, valid).slice(0, NOTIF_ID_PENGUMUMAN.length);
      if (baru.length === 0) return;
      if (!(await pastikanIzin(plugin))) return;
      if (!alive) return;

      const berhasil = await plugin
        .schedule({
          notifications: baru.map((item, i) => {
            const ringkas = notifPengumuman(item);
            return {
              id: NOTIF_ID_PENGUMUMAN[i],
              title: ringkas.title,
              body: ringkas.body,
              schedule: { at: new Date(Date.now() + JEDA_BATCH_MS * (i + 1)) },
              extra: { page: "/m" },
            };
          }),
        })
        .then(() => true)
        .catch(() => false);

      // Tandai terlihat HANYA setelah benar-benar terjadwal, supaya pengumuman
      // tidak hilang tanpa pernah muncul bila penjadwalan gagal.
      if (berhasil) safeSet(NOTIF_SEEN_KEY, JSON.stringify(pruneSeen(seen, baru.map((p) => String(p.id)))));
    };

    const sinkron = async (): Promise<void> => {
      await pasangPengingat();
      await cekPengumuman();
    };

    const daftarkanListener = async (): Promise<void> => {
      const plugin = await native();
      if (!plugin || !alive) return;

      const aksi = await plugin.addListener("localNotificationActionPerformed", (event) => {
        const page = (event?.notification?.extra as { page?: unknown } | undefined)?.page;
        if (typeof page === "string" && page.startsWith("/m")) routerRef.current.push(page);
      });
      cleanups.push(() => void aksi.remove());

      const appState = await App.addListener("appStateChange", ({ isActive }) => {
        // Saat kembali aktif: ambil data terbaru + pasang ulang pengingat.
        // Penting karena alarm eksak dihapus sistem bila pengguna mengubah
        // setelan "alarm & pengingat" sementara aplikasi tidak berjalan.
        if (isActive) void sinkron();
      });
      cleanups.push(() => void appState.remove());
    };

    const onPrefsBerubah = () => void pasangPengingat();
    window.addEventListener(NOTIF_PREFS_EVENT, onPrefsBerubah);

    void (async () => {
      await daftarkanListener();
      if (!alive) return;
      await sinkron();
      if (!alive) return;
      interval = setInterval(() => {
        if (document.visibilityState === "visible") void cekPengumuman();
      }, INTERVAL_PENGUMUMAN_MS);
    })();

    return () => {
      alive = false;
      window.removeEventListener(NOTIF_PREFS_EVENT, onPrefsBerubah);
      if (interval) clearInterval(interval);
      for (const bersihkan of cleanups) bersihkan();
    };
  }, []);

  return null;
}
