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
  versionName: "1.2.1",
  versionCode: 13,
  /** Di bawah versi ini APK dianggap terlalu lama → update wajib (blocking). */
  minVersionCode: 11,
  changelog: [
    "Background GPS: posisi tetap terkirim saat aplikasi di background / layar terkunci",
    "Logo aplikasi baru",
    "Sistem cek & unduh versi terbaru (auto-update)",
  ],
};

export function getApkUrl(): string {
  // Default: APK di-serve publik dari folder public/apk/
  // Gunakan relative path agar jalan di localhost maupun production.
  return (
    process.env.MOBILE_APK_URL ||
    "/apk/O2W-Lapangan.apk"
  );
}
