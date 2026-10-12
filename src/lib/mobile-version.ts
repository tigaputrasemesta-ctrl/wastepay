/**
 * Konfigurasi versi APK O2W Lapangan.
 *
 * versionCode / versionName DI SINI harus selalu sama dengan yang ada di
 * `android/app/build.gradle` (defaultConfig.versionCode & versionName).
 * Saat naik versi, update KEDUANYA lalu rebuild APK.
 *
 * `apkUrl` diambil dari env MOBILE_APK_URL (URL file APK terbaru yang di-hosting,
 * mis. di Vercel public, GitHub Releases, atau hosting lain). Kosong = fitur
 * unduh nonaktif (hanya info "versi baru tersedia").
 */
export const MOBILE_VERSION = {
  versionName: "2.0.3",
  versionCode: 23,
  /** Di bawah versi ini APK dianggap terlalu lama → update wajib (blocking). */
  minVersionCode: 15,
  changelog: [
    "Navigasi Rute Mandiri In-App Driver Cockpit (tanpa perlu keluar ke Google Maps)",
    "Rute jalan raya presisi OSRM & HUD belokan arah turn-by-turn",
    "Deteksi kedatangan proximity & 1-tap angkut sampah otomatis loncat ke stop berikutnya",
    "Monitor kapasitas muatan truk (0-100%) & timer durasi operasional",
    "Peta Interaktif Live Driver dengan beacon truk real-time",
  ],
};

export function getApkUrl(): string {
  // Default: APK di-serve publik dari folder public/apk/
  return (
    process.env.MOBILE_APK_URL ||
    "/apk/UPS-HERU-Petugas-Native.apk"
  );
}
