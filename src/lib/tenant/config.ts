import { TenantConfig, TenantContext } from "./types";

/**
 * Tenant Inti / Core Hub (o2whero.com)
 * Bertindak sebagai SaaS Control Plane sebelum domain baru dipasang.
 */
export const CORE_TENANT: TenantConfig = {
  id: "tenant-core-o2w",
  slug: "o2w-core",
  namaMitra: "O2W Hero",
  tipe: "core",
  domains: [
    "o2whero.com",
    "www.o2whero.com",
    "core.o2whero.com",
    "o2w.vercel.app",
    "o2w-o2-w.vercel.app",
  ],
  primaryDomain: "o2whero.com",
  branding: {
    namaMitra: "O2W Hero Platform",
    tagline: "Ekosistem & Solusi Terpadu Pengelolaan Sampah Multi-Mitra",
    logoUrl: "/images/o2w-logo.png",
    warnaTema: "#0284c7", // Sky/Blue for Core SaaS
    kota: "Indonesia",
    emailKontak: "kontak@o2whero.com",
    whatsappKontak: "+62 815-3284-3224",
  },
  dbConfig: {
    isDedicated: false, // Core menggunakan database pusat
  },
  status: "aktif",
  fitur: {
    retribusiSampah: true,
    tabunganSampah: true,
    jemputSampah: true,
    jualOfftaker: true,
    qrisDuitku: true,
    whatsappNotif: true,
  },
};

/**
 * Tenant Percontohan Pertama (upsheru.com)
 * Pilot partner untuk pengelola sampah Kota Depok (TPS 3R Heru)
 */
export const PILOT_TENANT: TenantConfig = {
  id: "tenant-pilot-upsheru",
  slug: "upsheru",
  namaMitra: "UPS HERU",
  tipe: "mitra_percontohan",
  domains: [
    "upsheru.com",
    "www.upsheru.com",
    "upsheru.o2whero.com",
    "tpsheru.vercel.app",
    "wastepay.vercel.app",
    "wastepay-o2-w.vercel.app",
  ],
  primaryDomain: "upsheru.com",
  branding: {
    namaMitra: "UPS HERU",
    tagline: "Unit Pengelolaan & Retribusi Kebersihan (TPS 3R)",
    logoUrl: "/ups_heru_logo.jpg",
    warnaTema: "#059669", // Emerald green
    alamat: "Jl. Kandang Ayam, Kalibaru, Kec. Cilodong, Kota Depok, Jawa Barat 16414",
    kota: "Kota Depok",
    emailKontak: process.env.COMPANY_EMAIL || "cv.herozerowaste@gmail.com",
    whatsappKontak: process.env.COMPANY_WHATSAPP || "+62 814-0078-2617",
    nomorPengaduan: process.env.PETUGAS_PENGADUAN_PHONE || "0895385058054",
  },
  waConfig: {
    apiKey: process.env.WA_API_KEY,
    apiUrl: process.env.WA_API_URL,
    adminPhone: process.env.ADMIN_PHONE,
    ownerPhone: process.env.OWNER_PHONE,
    pengaduanPhone: process.env.PETUGAS_PENGADUAN_PHONE,
  },
  dbConfig: {
    connectionString: process.env.DATABASE_URL,
    isDedicated: true, // Upsheru memiliki database mandiri
  },
  status: "aktif",
  fitur: {
    retribusiSampah: true,
    tabunganSampah: true,
    jemputSampah: true,
    jualOfftaker: true,
    qrisDuitku: true,
    whatsappNotif: true,
  },
};

/**
 * Registry tenant statis untuk lookup cepat O(1)
 */
export const KNOWN_TENANTS: TenantConfig[] = [
  CORE_TENANT,
  PILOT_TENANT,
];

/**
 * Daftar domain internal, lokal, dan IP VPS yang sah untuk healthcheck & mobile apps
 */
export const ALLOWED_INTERNAL_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "43.173.40.166",
  "capacitor://localhost",
]);

/**
 * Normalisasi host header (hapus port, whitespace, protocol jika ada)
 */
export function normalizeHost(rawHost?: string | null): string {
  if (!rawHost) return "";
  return rawHost
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split(":")[0];
}

/**
 * Resolve Tenant dari hostname atau request header secara ketat (Strict Matching)
 */
export function resolveTenantByHost(rawHost?: string | null): TenantContext {
  const host = normalizeHost(rawHost);

  // 1. Cek Core Platform exact domains
  const isCoreDomain =
    CORE_TENANT.domains.includes(host) ||
    host === "o2whero.com" ||
    host === "www.o2whero.com" ||
    host === "core.o2whero.com" ||
    host === "o2w.vercel.app" ||
    host === "o2w-o2-w.vercel.app";

  if (isCoreDomain) {
    const protocol = host.includes("localhost") || host === "127.0.0.1" ? "http" : "https";
    return {
      tenant: CORE_TENANT,
      isCore: true,
      isPilot: false,
      isValid: true,
      currentHost: host,
      baseUrl: `${protocol}://${host || CORE_TENANT.primaryDomain}`,
    };
  }

  // 2. Cek apakah cocok dengan daftar domain Known Tenants (misal UPS HERU)
  if (host) {
    for (const t of KNOWN_TENANTS) {
      if (t.domains.includes(host)) {
        const protocol = host.includes("localhost") || host === "127.0.0.1" ? "http" : "https";
        return {
          tenant: t,
          isCore: t.tipe === "core",
          isPilot: t.slug === "upsheru",
          isValid: true,
          currentHost: host,
          baseUrl: `${protocol}://${host}`,
        };
      }
    }
  }

  // 3. Akses internal / development / direct VPS IP / healthcheck
  if (ALLOWED_INTERNAL_HOSTS.has(host) || !host) {
    const protocol = host.includes("localhost") || host === "127.0.0.1" ? "http" : "https";
    const currentHost = host || PILOT_TENANT.primaryDomain;
    return {
      tenant: PILOT_TENANT,
      isCore: false,
      isPilot: true,
      isValid: true,
      currentHost,
      baseUrl: `${protocol}://${currentHost}`,
    };
  }

  // 4. Domain asing / liar tidak dikenal (TOLAK - Menutup celah keamanan)
  return {
    tenant: PILOT_TENANT,
    isCore: false,
    isPilot: false,
    isValid: false,
    currentHost: host,
    baseUrl: `https://${host}`,
  };
}
