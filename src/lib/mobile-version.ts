/**
 * Konfigurasi versi APK UPS HERU (Petugas & Admin).
 */
export const MOBILE_VERSION = {
  versionName: "2.0.6",
  versionCode: 26,
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

export const ADMIN_VERSION = {
  versionName: "2.0.6",
  versionCode: 26,
  changelog: [
    "Aplikasi dedicated Flutter Native khusus Admin & Backoffice (id.o2whero.admin)",
    "Penyimpanan data lokal di HP (Offline-First via SharedPreferences/Cache) tanpa menarik ulang database setiap login",
    "Fitur Delta Sync otomatis untuk mengunduh perubahan baru secara efisien & hemat kuota",
    "Akses dashboard, data warga, rute & peta armada berkecepatan 0 milidetik",
  ],
};

export function getApkUrl(): string {
  // Fallback ke GitHub Releases rilis resmi supir/petugas
  return (
    process.env.MOBILE_APK_URL ||
    "https://github.com/tigaputrasemesta-ctrl/wastepay/releases/download/apk-latest/UPS-HERU-Petugas-Native.apk"
  );
}

export function getAdminApkUrl(): string {
  // Fallback ke GitHub Releases rilis resmi admin
  return (
    process.env.ADMIN_APK_URL ||
    "https://github.com/tigaputrasemesta-ctrl/wastepay/releases/download/apk-latest/UPS-HERU-Admin.apk"
  );
}
