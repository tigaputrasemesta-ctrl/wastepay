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
  versionName: "2.0.4",
  versionCode: 24,
  /** Di bawah versi ini APK dianggap terlalu lama → update wajib (blocking). */
  minVersionCode: 15,
  changelog: [
    "Urutan rute fisik searah jalur jalan terdekat Nearest Neighbor (#1, #2, dst.)",
    "Integrasi jadwal 3 armada (Ago, Piat, Raka) mencakup 23 blok lengkap",
    "Navigasi rute hari standby / hari libur dengan tombol pintas muat tugas besok",
    "Badge armada mobil dan plat nomor pada daftar rute driver",
    "Koneksi backend canonical upsheru.com dan autentikasi case-insensitive",
    "Navigasi Rute Mandiri In-App Driver Cockpit dengan OSRM & proximity arrival",
  ],
};

export function getApkUrl(): string {
  // Default: APK di-serve publik dari folder public/apk/
  return (
    process.env.MOBILE_APK_URL ||
    "/apk/UPS-HERU-Petugas-Native.apk"
  );
}
