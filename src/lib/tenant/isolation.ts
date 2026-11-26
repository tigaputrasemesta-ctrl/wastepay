import { NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";

export class TenantIsolationError extends Error {
  public status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "TenantIsolationError";
    this.status = status;
  }
}

/**
 * Menyuntikkan tenantId secara aman ke dalam where clause Prisma.
 * Menjamin parameter client tidak dapat memalsukan atau mengubah tenantId yang sah.
 */
export function scopeTenantWhere<T extends Record<string, any>>(
  tenantId: string,
  where?: T
): T & { tenantId: string } {
  const safeWhere = { ...(where || {}) } as any;
  safeWhere.tenantId = tenantId;
  return safeWhere;
}

/**
 * Bangun filter `where` Prisma yang terisolasi pada `tenantId`.
 * Hanya untuk tenant percontohan (`allowPilotNullFallback = true`), data lama dengan `tenantId: null`
 * tetap terbaca agar kompatibel mundur sebelum backfill penuh.
 */
export function buildTenantFilter(tenantId: string, allowPilotNullFallback = false) {
  if (allowPilotNullFallback) {
    return { OR: [{ tenantId }, { tenantId: null }] };
  }
  return { tenantId };
}

/**
 * Menyuntikkan tenantId secara aman ke dalam data mutasi (create/insert).
 */
export function scopeTenantCreate<T extends Record<string, any>>(
  tenantId: string,
  data: T
): T & { tenantId: string } {
  const safeData = { ...data } as any;
  safeData.tenantId = tenantId;
  return safeData;
}

/**
 * Memverifikasi kepemilikan record agar tidak dapat dibaca, diubah, atau dihapus oleh tenant lain (IDOR Prevention).
 * Menghasilkan 404 (Not Found) jika record tidak ada, atau 403 (Forbidden) jika record milik tenant lain.
 */
export function assertTenantOwnership<T extends { tenantId?: string | null }>(
  record: T | null | undefined,
  expectedTenantId: string,
  entityName = "Data"
): asserts record is T & { tenantId: string } {
  if (!record) {
    throw new TenantIsolationError(404, `${entityName} tidak ditemukan.`);
  }
  if (record.tenantId && record.tenantId !== expectedTenantId) {
    throw new TenantIsolationError(403, `Akses ditolak: ${entityName} bukan milik organisasi tenant Anda.`);
  }
}

/**
 * Helper error response untuk menangani TenantIsolationError secara seragam di API route
 */
export function handleTenantError(err: unknown): NextResponse {
  if (err instanceof TenantIsolationError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  const msg = err instanceof Error ? err.message : "Kesalahan server internal";
  return NextResponse.json({ error: msg }, { status: 500 });
}

/**
 * Membuat Prisma Client terisolasi per tenant dengan Prisma Client Extensions ($extends).
 * Setiap operasi query, create, update, dan delete otomatis disuntikkan filter tenantId
 * sehingga tidak ada kebocoran data lintas tenant.
 */
export function createTenantScopedPrisma(tenantId: string, basePrisma: PrismaClient) {
  return basePrisma.$extends({
    query: {
      $allModels: {
        async findMany({ model, args, query }) {
          if ("tenantId" in (basePrisma as any)[model]?.fields || model !== "Tenant" && model !== "TenantDomain" && model !== "Category" && model !== "Kelurahan") {
            args.where = { ...(args.where || {}), tenantId } as any;
          }
          return query(args);
        },
        async findFirst({ model, args, query }) {
          if (model !== "Tenant" && model !== "TenantDomain" && model !== "Category" && model !== "Kelurahan") {
            args.where = { ...(args.where || {}), tenantId } as any;
          }
          return query(args);
        },
        async count({ model, args, query }) {
          if (model !== "Tenant" && model !== "TenantDomain" && model !== "Category" && model !== "Kelurahan") {
            args.where = { ...(args.where || {}), tenantId } as any;
          }
          return query(args);
        },
        async create({ model, args, query }) {
          if (model !== "Tenant" && model !== "TenantDomain" && model !== "Category" && model !== "Kelurahan") {
            args.data = { ...(args.data || {}), tenantId } as any;
          }
          return query(args);
        },
        async update({ model, args, query }) {
          if (model !== "Tenant" && model !== "TenantDomain" && model !== "Category" && model !== "Kelurahan") {
            args.where = { ...(args.where || {}), tenantId } as any;
          }
          return query(args);
        },
        async delete({ model, args, query }) {
          if (model !== "Tenant" && model !== "TenantDomain" && model !== "Category" && model !== "Kelurahan") {
            args.where = { ...(args.where || {}), tenantId } as any;
          }
          return query(args);
        },
      },
    },
  });
}
