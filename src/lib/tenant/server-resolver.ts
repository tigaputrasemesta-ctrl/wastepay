import { prisma } from "@/lib/prisma";
import { TenantConfig, TenantContext } from "./types";
import {
  resolveTenantByHost,
  registerDynamicTenant,
  normalizeHost,
  UNRESOLVED_TENANT,
} from "./config";

/**
 * Konversi record Tenant dari database menjadi TenantConfig standar
 */
export function dbTenantToConfig(t: any): TenantConfig {
  const domains: string[] = Array.isArray(t.domains)
    ? t.domains.map((d: any) => (typeof d === "string" ? d : d.domain).toLowerCase().trim())
    : [];

  if (t.customDomain && !domains.includes(t.customDomain.toLowerCase().trim())) {
    domains.push(t.customDomain.toLowerCase().trim());
  }
  if (t.subdomain && !domains.includes(t.subdomain.toLowerCase().trim())) {
    domains.push(t.subdomain.toLowerCase().trim());
  }

  let fiturParsed = {
    retribusiSampah: true,
    tabunganSampah: true,
    jemputSampah: true,
    jualOfftaker: true,
    qrisDuitku: true,
    whatsappNotif: true,
  };

  if (t.fiturAktif) {
    try {
      fiturParsed = { ...fiturParsed, ...JSON.parse(t.fiturAktif) };
    } catch {
      // gunakan default
    }
  }

  const primaryDomain = t.customDomain || t.subdomain || domains[0] || `${t.slug}.o2whero.com`;

  return {
    id: t.id,
    slug: t.slug,
    namaMitra: t.namaMitra,
    tipe: t.slug === "o2w-core" ? "core" : t.slug === "upsheru" ? "mitra_percontohan" : "mitra_mandiri",
    domains,
    primaryDomain,
    branding: {
      namaMitra: t.namaMitra,
      tagline: t.catatan || `Unit Pengelolaan Sampah ${t.namaMitra}`,
      logoUrl: t.logoUrl || "/ups_heru_logo.jpg",
      warnaTema: t.warnaTema || "#059669",
      alamat: t.alamat || undefined,
      kota: t.kota || "Indonesia",
      emailKontak: t.email || undefined,
      whatsappKontak: t.noTelepon || undefined,
    },
    dbConfig: {
      connectionString: t.dbConnectionString || undefined,
      schemaName: t.dbSchemaName || undefined,
      isDedicated: Boolean(t.dbConnectionString),
    },
    status: (t.status === "suspend" ? "suspend" : t.status === "maintenance" ? "maintenance" : "aktif") as any,
    fitur: fiturParsed,
  };
}

/**
 * Sinkronisasi seluruh tenant aktif dari Database ke In-Memory Cache
 */
export async function syncTenantsFromDatabase(): Promise<void> {
  try {
    const tenants = await prisma.tenant.findMany({
      where: { status: "aktif" },
      include: { domains: true },
    });

    for (const t of tenants) {
      const config = dbTenantToConfig(t);
      registerDynamicTenant(config);
    }
  } catch (error) {
    // Fail silently jika database offline / belum ter-migrate
    console.warn("[MultiTenant] syncTenantsFromDatabase skipped:", error);
  }
}

/**
 * Resolve tenant dengan database fallback jika belum ada di memory cache.
 * Mendukung domain kustom terverifikasi, subdomain [slug].o2whero.com, dan deteksi status tenant.
 * Tidak pernah fallback ke pilot tenant untuk domain yang gagal di-resolve.
 */
export async function resolveTenantWithDbFallback(rawHost?: string | null): Promise<TenantContext> {
  // 1. Coba resolve dari in-memory cache (0ms latency untuk domain terdaftar)
  const initial = resolveTenantByHost(rawHost);
  if (initial.isValid || initial.isSuspended) {
    return initial;
  }

  const host = normalizeHost(rawHost);
  if (!host) {
    return initial;
  }

  // 2. Jika tidak ada di cache, coba cari di tabel TenantDomain & Tenant
  try {
    // 2a. Cari di tabel TenantDomain
    const domainRecord = await prisma.tenantDomain.findUnique({
      where: { domain: host },
      include: {
        tenant: {
          include: { domains: true },
        },
      },
    });

    if (domainRecord?.tenant) {
      const tenant = domainRecord.tenant;
      const config = dbTenantToConfig(tenant);
      registerDynamicTenant(config);
      return resolveTenantByHost(host);
    }

    // 2b. Cek subdomain [slug].o2whero.com atau customDomain langsung
    let tenantRecord = await prisma.tenant.findFirst({
      where: {
        OR: [{ customDomain: host }, { subdomain: host }],
      },
      include: { domains: true },
    });

    // 2c. Cek slug jika format subdomain [slug].o2whero.com
    if (!tenantRecord && host.endsWith(".o2whero.com")) {
      const sub = host.replace(/\.o2whero\.com$/, "").trim();
      if (sub && sub !== "www" && sub !== "core") {
        tenantRecord = await prisma.tenant.findUnique({
          where: { slug: sub },
          include: { domains: true },
        });
      }
    }

    if (tenantRecord) {
      const config = dbTenantToConfig(tenantRecord);
      registerDynamicTenant(config);
      return resolveTenantByHost(host);
    }
  } catch (err) {
    console.warn(`[MultiTenant] Gagal lookup tenant dari DB untuk host "${host}":`, err);
  }

  // 3. Domain tetap tidak terdaftar -> Tolak secara tegas
  return {
    tenant: UNRESOLVED_TENANT,
    isCore: false,
    isPilot: false,
    isValid: false,
    rejectionReason: `Domain "${host}" tidak terdaftar dalam jaringan O2W HERO.`,
    currentHost: host,
    baseUrl: `https://${host}`,
  };
}
