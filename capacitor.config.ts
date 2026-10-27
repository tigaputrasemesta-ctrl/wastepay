import type { CapacitorConfig } from "@capacitor/cli";

const isStaticExport = process.env.CAPACITOR_BUILD === "true";
const appTarget = process.env.APP_TARGET || "admin";
const isAdmin = appTarget === "admin";

/**
 * Konfigurasi APK Native & Hybrid WastePay / UPS HERU
 * Target build dapat diset via variabel env APP_TARGET:
 * - APP_TARGET=admin   -> APK Khusus Admin (id.o2whero.admin, appStartPath: /dashboard)
 * - APP_TARGET=lapangan -> APK Petugas Lapangan (id.o2whero.lapangan, appStartPath: /m)
 */
const config: CapacitorConfig = {
  appId: isAdmin ? "id.o2whero.admin" : "id.o2whero.lapangan",
  appName: isAdmin ? "UPS HERU Admin" : "UPS HERU Lapangan",
  webDir: isStaticExport ? "out" : "public",
  server: isStaticExport
    ? {
        androidScheme: "https",
        allowNavigation: [
          "*.supabase.co",
          "*.vercel.app",
          "upsheru.com",
          "*.upsheru.com",
          "router.project-osrm.org",
          "*.tile.openstreetmap.org",
        ],
      }
    : {
        url: process.env.CAPACITOR_URL || "https://upsheru.com",
        cleartext: true,
        appStartPath: isAdmin ? "/dashboard" : "/m",
      },
  android: {
    allowMixedContent: true,
    useLegacyBridge: true,
  },
  plugins: {
    LocalNotifications: {
      iconColor: isAdmin ? "#0284C7" : "#047857",
    },
    SplashScreen: {
      launchShowDuration: 1800,
      launchAutoHide: true,
      backgroundColor: isAdmin ? "#0B192C" : "#0F3D3E",
      showSpinner: false,
    },
  },
};

export default config;
