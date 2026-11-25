import { PrismaClient, Prisma } from "@prisma/client";
import { prisma as defaultPrisma } from "@/lib/prisma";

/**
 * Utilitas PostgreSQL Row-Level Security (RLS) untuk Prisma 7 & Connection Pooler (PgBouncer/Supavisor).
 *
 * Menggunakan transaksi lokal `set_config('app.current_tenant_id', tenantId, true)`.
 * Parameter ke-3 bernilai `true` (is_local = true) memastikan bahwa konfigurasi hanya
 * aktif selama transaksi berlangsung (setara dengan SET LOCAL).
 * Saat transaksi COMMIT atau ROLLBACK, variabel `app.current_tenant_id` otomatis dibersihkan
 * dari koneksi fisik PostgreSQL, sehingga tidak ada risiko kebocoran konteks saat koneksi
 * digunakan kembali oleh request lain di dalam pool (connection pool reuse safety).
 */

export async function withTenantRls<T>(
  tenantId: string,
  callback: (tx: Prisma.TransactionClient) => Promise<T>,
  client: PrismaClient = defaultPrisma
): Promise<T> {
  if (!tenantId || typeof tenantId !== "string") {
    throw new Error("withTenantRls: tenantId valid wajib diberikan untuk menegakkan PostgreSQL RLS");
  }

  return client.$transaction(
    async (tx) => {
      // 1. Set context tenant_id pada level transaksi PostgreSQL (SET LOCAL)
      await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;

      // 2. Eksekusi operasi query/mutasi di dalam batas RLS
      return callback(tx);
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      maxWait: 5000,
      timeout: 10000,
    }
  );
}

/**
 * Utilitas untuk menjalankan operasi administratif Superadmin dengan mem-bypass RLS
 * secara terkontrol melalui setting sesi transaksi lokal `app.is_superadmin = true`.
 */
export async function withSuperadminPrivilegedContext<T>(
  callback: (tx: Prisma.TransactionClient) => Promise<T>,
  client: PrismaClient = defaultPrisma
): Promise<T> {
  return client.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.is_superadmin', 'true', true)`;
    return callback(tx);
  });
}
