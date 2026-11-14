import { prisma } from "@/lib/prisma";
import { TenantConfig, TenantContext } from "./types";
import {
  resolveTenantByHost,
  registerDynamicTenant,
  normalizeHost,
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
 * Digunakan oleh middleware / proxy untuk memastikan domain baru langsung dikenali.
 */
export async function resolveTenantWithDbFallback(rawHost?: string | null): Promise<TenantContext> {
  // 1. Coba resolve dari in-memory cache (0ms latency untuk domain terdaftar)
  const initial = resolveTenantByHost(rawHost);
  if (initial.isValid) {
    return initial;
  }

  const host = normalizeHost(rawHost);
  if (!host) {
    return initial;
  }

  // 2. Jika tidak ada di cache, coba cari di tabel TenantDomain & Tenant
  try {
    const domainRecord = await prisma.tenantDomain.findUnique({
      where: { domain: host },
      include: {
        tenant: {
          include: { domains: true },
        },
      },
    });

    if (domainRecord?.tenant && domainRecord.tenant.status === "aktif") {
      const config = dbTenantToConfig(domainRecord.tenant);
      registerDynamicTenant(config);
      return resolveTenantByHost(host);
    }

    // Cek juga kolom customDomain atau subdomain langsung
    const tenantRecord = await prisma.tenant.findFirst({
      where: {
        status: "aktif",
        OR: [{ customDomain: host }, { subdomain: host }],
      },
      include: { domains: true },
    });

    if (tenantRecord) {
      const config = dbTenantToConfig(tenantRecord);
      registerDynamicTenant(config);
      return resolveTenantByHost(host);
    }
  } catch (err) {
    console.warn(`[MultiTenant] Gagal lookup tenant dari DB untuk host "${host}":`, err);
  }

  // 3. Tetap tidak ditemukan -> tolak domain
  return initial;
}
