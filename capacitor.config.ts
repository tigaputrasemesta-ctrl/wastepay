import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Konfigurasi APK internal O2W Lapangan.
 *
 * APK ini adalah "shell" Android yang memuat aplikasi web WastePay (Next.js)
 * yang sudah di-deploy. Jadi sumber data & logika tetap dari app web — APK
 * hanya menyediakan: ikon di homescreen, fullscreen tanpa bar browser, izin
 * kamera/GPS native, dan pengalaman yang lebih rapi untuk petugas lapangan.
 *
 * webDir  : aset statis cadangan (fallback) yang dibundle ke APK.
 * server  : URL aplikasi web yang dimuat webview. Override lewat env
 *           CAPACITOR_URL saat build bila deploy ke domain lain.
 */
const config: CapacitorConfig = {
  appId: "id.o2whero.lapangan",
  appName: "UPS HERU Lapangan",
  webDir: "public",
  server: {
    url: process.env.CAPACITOR_URL || "https://upsheru.com",
    cleartext: true,
    // Buka langsung ke dashboard mobile petugas (bukan landing page publik)
    appStartPath: "/m",
  },
  android: {
    allowMixedContent: true,
    // Wajib untuk background geolocation: mencegah update lokasi berhenti
    // setelah ~5 menit di background (lihat plugin background-geolocation).
    useLegacyBridge: true,
  },
  plugins: {
    LocalNotifications: {
      // Warna aksen ikon notifikasi kecil (hijau O2W).
      // `smallIcon` sengaja TIDAK diisi: drawable-nya belum ada, dan mengarahkan
      // ke resource yang tidak ada membuat notifikasi gagal tampil.
      iconColor: "#047857",
    },
  },
};

export default config;
