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
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            // Next.js butuh 'unsafe-inline' untuk style; skrip inline di-hash oleh Next.
            // frame/object ditolak; base-uri dibatasi.
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://api.qrserver.com https://*.basemaps.cartocdn.com",
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
