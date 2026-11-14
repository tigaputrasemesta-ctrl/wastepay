import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { prisma as defaultPrisma } from "@/lib/prisma";
import { TenantConfig } from "./types";
import { resolveTenantByHost } from "./config";

// Global cache agar tetap persist di lingkungan serverless Lambda (jika warm instance)
const globalForTenantPrisma = globalThis as unknown as {
  tenantPrismaCache?: Map<string, PrismaClient>;
  tenantPoolCache?: Map<string, Pool>;
};

if (!globalForTenantPrisma.tenantPrismaCache) {
  globalForTenantPrisma.tenantPrismaCache = new Map<string, PrismaClient>();
}
if (!globalForTenantPrisma.tenantPoolCache) {
  globalForTenantPrisma.tenantPoolCache = new Map<string, Pool>();
}

const prismaCache = globalForTenantPrisma.tenantPrismaCache;
const poolCache = globalForTenantPrisma.tenantPoolCache;

/**
 * Membuat PrismaClient terisolasi untuk Tenant dengan Database mandiri (Database-per-Tenant)
 */
function createDedicatedTenantPrisma(connectionString: string): PrismaClient {
  const cleanConn = connectionString.replace(/[?&]sslmode=[^&]+/g, "").replace(/\?$/, "");
  const isProd = process.env.NODE_ENV === "production";

  const pool = new Pool({
    connectionString: cleanConn,
    idleTimeoutMillis: 5000,
    connectionTimeoutMillis: 8000,
    ssl:
      isProd ||
      process.env.DATABASE_SSL === "true" ||
      cleanConn.includes("supabase.com") ||
      cleanConn.includes("sumobase.my.id")
        ? { rejectUnauthorized: false }
        : undefined,
  });

  const adapter = new PrismaPg(pool);
  const client = new PrismaClient({ adapter });

  poolCache.set(cleanConn, pool);
  return client;
}

/**
 * Mendapatkan koneksi database untuk Tenant tertentu.
 * Jika tenant belum memiliki DB terpisah (atau mode dev/pilot default), gunakan default prisma.
 */
export function getTenantDb(tenantOrHost?: TenantConfig | string | null): PrismaClient {
  if (!tenantOrHost) {
    return defaultPrisma;
  }

  let tenant: TenantConfig;
  if (typeof tenantOrHost === "string") {
    tenant = resolveTenantByHost(tenantOrHost).tenant;
  } else {
    tenant = tenantOrHost;
  }

  const dedicatedConn = tenant.dbConfig?.connectionString?.trim();

  // Jika tidak ada dedicated DB atau sama persis dengan DB default
  if (!dedicatedConn || dedicatedConn === process.env.DATABASE_URL?.trim()) {
    return defaultPrisma;
  }

  // Cek cache
  const cached = prismaCache.get(tenant.slug);
  if (cached) {
    return cached;
  }

  // Buat koneksi baru dan simpan di cache
  const newClient = createDedicatedTenantPrisma(dedicatedConn);
  prismaCache.set(tenant.slug, newClient);
  return newClient;
}

/**
 * Helper untuk cleanup / disconnect semua koneksi saat shutdown server
 */
export async function disconnectAllTenantDbs(): Promise<void> {
  for (const [slug, client] of prismaCache.entries()) {
    try {
      await client.$disconnect();
    } catch (err) {
      console.error(`[MultiTenant] Gagal disconnect prisma tenant ${slug}:`, err);
    }
  }
  prismaCache.clear();

  for (const pool of poolCache.values()) {
    try {
      await pool.end();
    } catch (err) {
      console.error("[MultiTenant] Gagal menutup pool koneksi:", err);
    }
  }
  poolCache.clear();
}
