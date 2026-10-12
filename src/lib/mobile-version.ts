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
  versionName: "2.0.2",
  versionCode: 22,
  /** Di bawah versi ini APK dianggap terlalu lama → update wajib (blocking). */
  minVersionCode: 15,
  changelog: [
    "Peta Interaktif Live Driver (pantau sebaran titik jemput & navigasi armada)",
    "Perbaikan autentikasi & pemuatan rute operasional",
    "Aplikasi 100% Native Flutter (responsif, tanpa WebView)",
    "Navigasi rute multi-stop Google Maps menuju lokasi pelanggan",
    "Sistem pembaruan langsung di dalam aplikasi (In-App Auto Update)",
  ],
};

export function getApkUrl(): string {
  // Default: APK di-serve publik dari folder public/apk/
  return (
    process.env.MOBILE_APK_URL ||
    "/apk/UPS-HERU-Petugas-Native.apk"
  );
}
