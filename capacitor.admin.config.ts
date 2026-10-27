import type { CapacitorConfig } from "@capacitor/cli";

const isStaticExport = process.env.CAPACITOR_BUILD === "true";

/**
 * Konfigurasi APK Khusus Admin (UPS HERU Admin)
 * Terpisah dari APK Petugas Lapangan.
 * Memuat Backoffice Dashboard secara native dengan dukungan IndexedDB Offline Caching.
 */
const config: CapacitorConfig = {
  appId: "id.o2whero.admin",
  appName: "UPS HERU Admin",
  webDir: isStaticExport ? "out" : "public",
  server: isStaticExport
    ? {
        androidScheme: "https",
        allowNavigation: [
          "*.supabase.co",
          "*.vercel.app",
          "upsheru.com",
          "*.upsheru.com",
        ],
      }
    : {
        url: process.env.CAPACITOR_URL || "https://upsheru.com",
        cleartext: true,
        appStartPath: "/dashboard",
      },
  android: {
    allowMixedContent: true,
    useLegacyBridge: true,
  },
  plugins: {
    LocalNotifications: {
      iconColor: "#0284C7",
    },
    SplashScreen: {
      launchShowDuration: 1800,
      launchAutoHide: true,
      backgroundColor: "#0B192C",
      showSpinner: false,
    },
  },
};

export default config;
