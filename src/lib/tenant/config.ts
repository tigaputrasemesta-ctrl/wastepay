import { TenantConfig, TenantContext } from "./types";

/**
 * Fallback objek untuk tenant yang gagal di-resolve (TIDAK pernah memakai PILOT_TENANT sebagai fallback diam-diam).
 */
export const UNRESOLVED_TENANT: TenantConfig = {
  id: "tenant-unresolved",
  slug: "unresolved",
  namaMitra: "Domain Tidak Terdaftar",
  tipe: "mitra_mandiri",
  domains: [],
  primaryDomain: "",
  branding: {
    namaMitra: "Domain Tidak Terdaftar",
    tagline: "Domain tidak terdaftar dalam platform O2W HERO.",
  },
  dbConfig: {
    isDedicated: false,
  },
  status: "suspend",
  fitur: {
    retribusiSampah: false,
    tabunganSampah: false,
    jemputSampah: false,
    jualOfftaker: false,
    qrisDuitku: false,
    whatsappNotif: false,
  },
};

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
  ],
  primaryDomain: "o2whero.com",
  branding: {
    namaMitra: "O2W Hero Platform",
    tagline: "Ekosistem & Solusi Terpadu Pengelolaan Sampah Multi-Mitra",
    logoUrl: "/images/o2w-logo.svg",
    warnaTema: "#0369a1", // Accessible Sky/Blue for Core SaaS
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
  ],
  primaryDomain: "upsheru.com",
  branding: {
    namaMitra: "UPS HERU",
    tagline: "Unit Pengelolaan & Retribusi Kebersihan (TPS 3R)",
    logoUrl: "/ups-heru-logo.jpg",
    warnaTema: "#047857", // Accessible Emerald green
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
    isDedicated: true, // Upsheru memiliki opsi database mandiri
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
 * Tenant Pengujian Mitra Mandiri (mitra-test.vercel.app)
 */
export const MITRA_TEST_TENANT: TenantConfig = {
  id: "tenant-mitra-test",
  slug: "mitra-test",
  namaMitra: "Mitra Test",
  tipe: "mitra_mandiri",
  domains: [
    "mitra-test.vercel.app",
    "www.mitra-test.vercel.app",
    "mitra-test.o2whero.com",
  ],
  primaryDomain: "mitra-test.vercel.app",
  branding: {
    namaMitra: "Mitra Test",
    tagline: "Unit Pengelolaan & Retribusi Sampah Mandiri",
    logoUrl: "/images/o2w-logo.svg",
    warnaTema: "#0284c7",
    alamat: "Kawasan Uji Coba Mitra Mandiri",
    kota: "Kota Mandiri",
    emailKontak: "kontak@mitra-test.vercel.app",
    whatsappKontak: "+62 812-0000-0000",
  },
  dbConfig: {
    isDedicated: false,
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
 * Baseline tenant statis untuk fail-safe lookup
 */
export const KNOWN_TENANTS: TenantConfig[] = [
  CORE_TENANT,
  PILOT_TENANT,
  MITRA_TEST_TENANT,
];

/**
 * Daftar domain internal, lokal, dan IP VPS yang sah untuk healthcheck & development
 */
export const ALLOWED_INTERNAL_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "43.173.40.166",
  "capacitor://localhost",
]);

/**
 * Global In-Memory Dynamic Tenant Registry Cache
 */
const globalTenantRegistry = globalThis as unknown as {
  _tenantDomainMap?: Map<string, TenantConfig>;
  _tenantSlugMap?: Map<string, TenantConfig>;
};

if (!globalTenantRegistry._tenantDomainMap) {
  globalTenantRegistry._tenantDomainMap = new Map<string, TenantConfig>();
  globalTenantRegistry._tenantSlugMap = new Map<string, TenantConfig>();

  // Pre-seed in-memory registry dengan KNOWN_TENANTS
  for (const t of KNOWN_TENANTS) {
    globalTenantRegistry._tenantSlugMap.set(t.slug, t);
    for (const d of t.domains) {
      globalTenantRegistry._tenantDomainMap.set(d.toLowerCase(), t);
    }
  }
}

const domainRegistry = globalTenantRegistry._tenantDomainMap!;
const slugRegistry = globalTenantRegistry._tenantSlugMap!;

/**
 * Daftarkan tenant baru ke dalam in-memory cache secara dinamis
 */
export function registerDynamicTenant(tenant: TenantConfig): void {
  slugRegistry.set(tenant.slug, tenant);
  for (const domain of tenant.domains) {
    if (domain) {
      domainRegistry.set(domain.toLowerCase().trim(), tenant);
    }
  }
  if (tenant.primaryDomain) {
    domainRegistry.set(tenant.primaryDomain.toLowerCase().trim(), tenant);
  }
}

/**
 * Hapus tenant dari in-memory cache secara dinamis
 */
export function unregisterDynamicTenant(slugOrDomain: string): void {
  const clean = slugOrDomain.toLowerCase().trim();
  const existingBySlug = slugRegistry.get(clean);
  const target = existingBySlug || domainRegistry.get(clean);

  if (target) {
    slugRegistry.delete(target.slug);
    for (const domain of target.domains) {
      if (domain) {
        domainRegistry.delete(domain.toLowerCase().trim());
      }
    }
    if (target.primaryDomain) {
      domainRegistry.delete(target.primaryDomain.toLowerCase().trim());
    }
  }
}

/**
 * Dapatkan tenant berdasarkan host/domain dari in-memory cache
 */
export function getDynamicTenant(domainOrHost: string): TenantConfig | undefined {
  const clean = normalizeHost(domainOrHost);
  return domainRegistry.get(clean);
}

/**
 * Dapatkan seluruh tenant yang terdaftar di in-memory cache
 */
export function getAllCachedTenants(): TenantConfig[] {
  return Array.from(slugRegistry.values());
}

/**
 * Normalisasi host header secara ketat (validasi trusted proxy & pembersihan port/whitespace)
 */
export function normalizeHost(rawHost?: string | null): string {
  if (!rawHost) return "";
  
  // Jika x-forwarded-host mengandung koma (proxy chain), ambil first hop yang valid
  const firstHop = rawHost.split(",")[0].trim();
  
  return firstHop
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split(":")[0]
    .replace(/[^a-z0-9.-]/g, ""); // Anti-injection: hanya karakter valid hostname
}

/**
 * Resolve Tenant dari hostname atau request header secara ketat (Strict Matching)
 * Aturan Ketat: Tidak pernah fallback ke Pilot Tenant saat resolusi domain gagal!
 */
export function resolveTenantByHost(rawHost?: string | null): TenantContext {
  const host = normalizeHost(rawHost);

  // 1. Cek Core Platform exact domains
  const isCoreDomain =
    CORE_TENANT.domains.includes(host) ||
    host === "o2whero.com" ||
    host === "www.o2whero.com" ||
    host === "core.o2whero.com";

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

  // 2. Cek apakah cocok dengan daftar domain di in-memory cache (UPS HERU & Dynamic Tenants)
  if (host && domainRegistry.has(host)) {
    const t = domainRegistry.get(host)!;
    const protocol = host.includes("localhost") || host === "127.0.0.1" ? "http" : "https";

    if (t.status === "suspend") {
      return {
        tenant: t,
        isCore: t.tipe === "core",
        isPilot: t.slug === "upsheru",
        isValid: false,
        isSuspended: true,
        rejectionReason: "Organisasi tenant sedang ditangguhkan (suspend). Hubungi administrator O2W HERO.",
        currentHost: host,
        baseUrl: `${protocol}://${host}`,
      };
    }

    return {
      tenant: t,
      isCore: t.tipe === "core",
      isPilot: t.slug === "upsheru",
      isValid: true,
      currentHost: host,
      baseUrl: `${protocol}://${host}`,
    };
  }

  // 2b. Dukungan subdomain dinamis (*.o2whero.com)
  if (host && host.endsWith(".o2whero.com")) {
    const sub = host.replace(/\.o2whero\.com$/, "").trim();
    if (sub && sub !== "www" && sub !== "core" && slugRegistry.has(sub)) {
      const t = slugRegistry.get(sub)!;
      if (t.status === "suspend") {
        return {
          tenant: t,
          isCore: false,
          isPilot: t.slug === "upsheru",
          isValid: false,
          isSuspended: true,
          rejectionReason: "Organisasi tenant sedang ditangguhkan (suspend).",
          currentHost: host,
          baseUrl: `https://${host}`,
        };
      }
      return {
        tenant: t,
        isCore: false,
        isPilot: t.slug === "upsheru",
        isValid: true,
        currentHost: host,
        baseUrl: `https://${host}`,
      };
    }
  }

  // 3. Akses internal / development / direct VPS IP / Capacitor local bridge
  if (ALLOWED_INTERNAL_HOSTS.has(host) || (!host && process.env.NODE_ENV !== "production")) {
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
  // Menjamin Aturan #5: Never assign a default tenant when tenant resolution fails.
  return {
    tenant: UNRESOLVED_TENANT,
    isCore: false,
    isPilot: false,
    isValid: false,
    rejectionReason: "Domain tidak terdaftar dalam jaringan resmi platform O2W HERO / WastePay.",
    currentHost: host,
    baseUrl: `https://${host}`,
  };
}
