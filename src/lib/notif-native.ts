import { Capacitor } from "@capacitor/core";
import { NOTIF_ID } from "@/lib/notifications";

/**
 * Helper tipis untuk memanggil plugin notifikasi dari UI.
 *
 * Berbeda dengan `lib/notifications.ts` (murni & teruji), berkas ini memang
 * menyentuh native — karena itu dipisah agar modul keputusan tetap bisa diuji
 * di Node tanpa perangkat.
 *
 * Semua fungsi mengembalikan nilai "gagal dengan tenang" (bukan throw) karena
 * kegagalan notifikasi tidak boleh merusak alur kerja petugas.
 */

export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

/** Status izin: 'granted' | 'denied' | 'prompt' | 'prompt-with-rationale' | null (bukan APK). */
export async function cekStatusIzin(): Promise<string | null> {
  if (!isNative()) return null;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const status = await LocalNotifications.checkPermissions();
    return status.display;
  } catch {
    return null;
  }
}

/** Minta izin secara eksplisit (dipicu tombol pengguna, bukan otomatis). */
export async function mintaIzin(): Promise<string | null> {
  if (!isNative()) return null;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const status = await LocalNotifications.requestPermissions();
    return status.display;
  } catch {
    return null;
  }
}

export async function kirimNotifTes(judul: string, isi: string): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const status = await LocalNotifications.checkPermissions();
    if (status.display !== "granted") {
      const diminta = await LocalNotifications.requestPermissions();
      if (diminta.display !== "granted") return false;
    }
    await LocalNotifications.schedule({
      notifications: [
        {
          id: NOTIF_ID.tes,
          title: judul,
          body: isi,
          schedule: { at: new Date(Date.now() + 1200) },
          extra: { page: "/m/notifikasi" },
        },
      ],
    });
    return true;
  } catch {
    return false;
  }
}
