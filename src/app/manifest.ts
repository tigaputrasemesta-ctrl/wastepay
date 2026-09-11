import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "UPS HERU WastePay - Pengelolaan Sampah Depok",
    short_name: "UPS HERU",
    description: "Sistem Pengelolaan Retribusi dan Layanan Angkut Sampah Terpadu Kota Depok",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#059669",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
      {
        src: "/o2w-logo-v3.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
