import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Arahkan Turbopack ke root project ini (hindari salah deteksi lockfile)
  turbopack: {
    root: __dirname,
  },
  // Allow phone testing
  allowedDevOrigins: ["192.168.100.19"],
  async headers() {
    const isProd = process.env.NODE_ENV === "production";
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          // geolocation=(self): form daftar/absensi butuh GPS browser; hanya izinkan
          // di konteks halaman sendiri (bukan iframe pihak ketiga).
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
          {
            key: "Content-Security-Policy",
            // Next.js butuh 'unsafe-inline' untuk style; skrip inline di-hash oleh Next.
            // 'unsafe-eval' hanya dibutuhkan dev mode (Turbopack HMR) — dihilangkan
            // di production untuk menutup vektor eval.
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://api.qrserver.com https://*.basemaps.cartocdn.com https://*.tile.openstreetmap.org https://tile.openstreetmap.org https://server.arcgisonline.com https://*.google.com https://*.googleapis.com https://*.gstatic.com",
              "font-src 'self' data:",
              "connect-src 'self' https://sandbox.duitku.com https://passport.duitku.com https://api.qrserver.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
