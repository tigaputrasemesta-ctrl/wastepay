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
  versionName: "2.0.5",
  versionCode: 25,
  /** Di bawah versi ini APK dianggap terlalu lama → update wajib (blocking). */
  minVersionCode: 15,
  changelog: [
    "Auto-Popup Geofence radius penjemputan (< 30m) dengan respon getar Haptic Buzz",
    "Fitur Swipe to Pickup (Slide to Confirm) anti salah sentuh untuk supir armada",
    "Quick Skip Presets 1-ketukan tanpa mengetik (Sampah Kosong, Pagar Gembok, Akses Ditutup)",
    "Modernisasi tampilan UI Driver Cockpit (elevasi halus, kontras tinggi, navigasi dinamis)",
    "Urutan rute fisik searah jalur jalan terdekat Nearest Neighbor (#1, #2, dst.)",
    "Integrasi jadwal 3 armada (Ago, Piat, Raka) mencakup 23 blok lengkap",
  ],
};

export function getApkUrl(): string {
  // Gunakan env bila disediakan, atau fallback ke GitHub Releases aset rilis resmi stabil
  return (
    process.env.MOBILE_APK_URL ||
    "https://github.com/tigaputrasemesta-ctrl/wastepay/releases/download/apk-latest/UPS-HERU-Petugas-Native.apk"
  );
}
