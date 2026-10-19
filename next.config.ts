import type { NextConfig } from "next";

const isCapacitorBuild = process.env.CAPACITOR_BUILD === "true";

const nextConfig: NextConfig = {
  // Aktifkan static export hanya saat mem-build bundle untuk APK Android
  output: isCapacitorBuild ? "export" : undefined,
  distDir: isCapacitorBuild ? "out" : undefined,
  trailingSlash: isCapacitorBuild,

  // Arahkan Turbopack ke root project ini (hindari salah deteksi lockfile)
  turbopack: {
    root: process.cwd(),
  },
  // Allow phone testing
  allowedDevOrigins: ["192.168.100.19"],

  images: {
    unoptimized: isCapacitorBuild ? true : false,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "**.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },

  async redirects() {
    return [
      {
        source: "/jangkauan",
        destination: "/coverage",
        permanent: true,
      },
      {
        source: "/peta-coverage",
        destination: "/coverage",
        permanent: true,
      },
    ];
  },

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
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=(self), fullscreen=(self)",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https: https://images.unsplash.com https://*.unsplash.com https://images.duitku.com https://api.qrserver.com https://*.basemaps.cartocdn.com https://*.tile.openstreetmap.org https://tile.openstreetmap.org https://server.arcgisonline.com https://*.google.com https://*.googleapis.com https://*.gstatic.com https://*.supabase.co",
              "font-src 'self' data:",
              "connect-src 'self' https://sandbox.duitku.com https://passport.duitku.com https://api.qrserver.com https://*.supabase.co https://*.project-osrm.org router.project-osrm.org https://*.tile.openstreetmap.org",
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
