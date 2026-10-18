import type { CapacitorConfig } from "@capacitor/cli";

const isStaticExport = process.env.CAPACITOR_BUILD === "true";

/**
 * Konfigurasi APK Native & Hybrid O2W Lapangan / WastePay.
 * Mendukung dual-mode:
 * 1. Static Native Bundle (offline-first, assets di folder out/)
 * 2. Live Hybrid Shell (memuat server https://upsheru.com dengan native bridge)
 */
const config: CapacitorConfig = {
  appId: "id.o2whero.lapangan",
  appName: "UPS HERU Lapangan",
  webDir: isStaticExport ? "out" : "public",
  bundledWebRuntime: false,
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
        appStartPath: "/m",
      },
  android: {
    allowMixedContent: true,
    useLegacyBridge: true,
  },
  plugins: {
    LocalNotifications: {
      iconColor: "#047857",
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#0F3D3E",
      showSpinner: false,
    },
  },
};

export default config;
