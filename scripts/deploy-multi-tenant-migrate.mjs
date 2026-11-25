/**
 * Standalone Production Pre-Boot Migration & Backfill Runner (Zero-Downtime)
 *
 * Dirancang untuk dieksekusi di dalam container Docker CI/CD sebelum `docker compose up -d`
 * menggantikan container produksi yang sedang berjalan.
 * Menggunakan driver `pg` langsung agar tidak bergantung pada Prisma CLI di container runner.
 *
 * Langkah eksekusi (Idempoten):
 * 1. Pastikan tabel Tenant & TenantDomain beserta seed pilot ('tenant-pilot-upsheru') & core ('tenant-core-o2w') ada.
 * 2. Jalankan `prisma/migrations/20261125200000_multi_tenant_rls/migration.sql` (IF NOT EXISTS / DO $$ guarded).
 * 3. Backfill seluruh baris dengan `tenantId IS NULL` pada 35 tabel operasional (+ User) -> 'tenant-pilot-upsheru'.
 * 4. Pastikan akun role='superadmin' terhubung ke 'tenant-core-o2w'.
 * 5. Sinkronisasi `TenantMembership` dari tabel `User` (ON CONFLICT DO NOTHING).
 * 6. Validasi tidak ada data yang hilang sebelum exit 0.
 */

import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const { Pool } = pg;

// Muat .env secara manual bila dijalankan di luar docker compose
if (!process.env.DATABASE_URL) {
  try {
    const envPath = path.join(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const lines = fs.readFileSync(envPath, "utf8").split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx === -1) continue;
        const k = trimmed.slice(0, eqIdx).trim();
        const v = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
        if (!process.env[k]) process.env[k] = v;
      }
    }
  } catch {
    // Abaikan error parsing env opsional
  }
}

const PILOT_TENANT_ID = "tenant-pilot-upsheru";
const CORE_TENANT_ID = "tenant-core-o2w";

// Daftar eksak seluruh nama tabel SQL PascalCase berkolom tenantId di prisma/schema.prisma
const TENANT_OPERATIONAL_TABLES = [
  "User",
  "Wilayah",
  "Zona",
  "ZonaPetugas",
  "KategoriTarif",
  "Paket",
  "Pelanggan",
  "Petugas",
  "LokasiPetugas",
  "Kendaraan",
  "LokasiKendaraan",
  "TitikTransit",
  "Rute",
  "Jadwal",
  "Tagihan",
  "Pembayaran",
  "DuitkuTransaction",
  "Pengangkutan",
  "Absensi",
  "KlaimPetugas",
  "Komplain",
  "LiburSementara",
  "Pengumuman",
  "Pengeluaran",
  "Tpa",
  "AuditLog",
  "Notifikasi",
  "Rekonsiliasi",
  "Pengaturan",
  "ChatPesan",
  "Artikel",
  "Produk",
  "MarketplaceOrder",
  "MarketplaceOrderItem",
  "KategoriPickup",
  "PesananPickup",
];

async function createConnectedPool() {
  const rawConn = (process.env.DATABASE_URL || "").trim().replace(/^["']|["']$/g, "");
  if (!rawConn) {
    throw new Error("DATABASE_URL tidak ditemukan di environment container/host!");
  }

  const cleanConn = rawConn.replace(/[?&]sslmode=[^&]+/g, "").replace(/\?$/, "");
  const preferSsl =
    process.env.NODE_ENV === "production" ||
    process.env.DATABASE_SSL === "true" ||
    rawConn.includes("supabase.com") ||
    rawConn.includes("sumobase.my.id");

  const makePool = (ssl) =>
    new Pool({
      connectionString: cleanConn,
      ssl,
      connectionTimeoutMillis: 15000,
    });

  let pool = makePool(preferSsl ? { rejectUnauthorized: false } : undefined);
  try {
    const client = await pool.connect();
    return { pool, client };
  } catch (err) {
    const msg = String(err?.message || "");
    if (preferSsl && (msg.includes("does not support SSL") || msg.includes("ECONNRESET"))) {
      await pool.end().catch(() => {});
      pool = makePool(undefined);
      const client = await pool.connect();
      return { pool, client };
    }
    throw err;
  }
}

async function main() {
  console.log("🚀 [Pre-Deploy] Memulai migrasi idempoten multi-tenant & backfill UPS HERU...");
  const { pool, client } = await createConnectedPool();

  try {
    // 1. Pastikan Tenant Core & UPS HERU terdaftar sebelum FK atau backfill berjalan
    await client.query(`
      INSERT INTO "Tenant" (
        "id", "slug", "namaMitra", "tipePengelola", "status", "paketLangganan",
        "customDomain", "subdomain", "warnaTema", "createdAt", "updatedAt"
      ) VALUES (
        'tenant-core-o2w', 'o2w-core', 'O2W Hero', 'core', 'aktif', 'enterprise',
        'o2whero.com', 'core.o2whero.com', '#0284c7', NOW(), NOW()
      ) ON CONFLICT ("id") DO NOTHING;
    `);

    await client.query(`
      INSERT INTO "Tenant" (
        "id", "slug", "namaMitra", "tipePengelola", "status", "paketLangganan",
        "customDomain", "subdomain", "warnaTema", "kota", "provinsi", "createdAt", "updatedAt"
      ) VALUES (
        'tenant-pilot-upsheru', 'upsheru', 'UPS HERU', 'tps3r', 'aktif', 'percontohan',
        'upsheru.com', 'upsheru.o2whero.com', '#059669', 'Kota Depok', 'Jawa Barat', NOW(), NOW()
      ) ON CONFLICT ("id") DO NOTHING;
    `);

    const seedDomains = [
      { tenantId: CORE_TENANT_ID, domain: "o2whero.com", isPrimary: true },
      { tenantId: CORE_TENANT_ID, domain: "www.o2whero.com", isPrimary: false },
      { tenantId: CORE_TENANT_ID, domain: "core.o2whero.com", isPrimary: false },
      { tenantId: PILOT_TENANT_ID, domain: "upsheru.com", isPrimary: true },
      { tenantId: PILOT_TENANT_ID, domain: "www.upsheru.com", isPrimary: false },
      { tenantId: PILOT_TENANT_ID, domain: "upsheru.o2whero.com", isPrimary: false },
    ];
    for (const d of seedDomains) {
      await client.query(
        `INSERT INTO "TenantDomain" ("tenantId", "domain", "isPrimary", "isVerified", "sslStatus", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, true, 'active', NOW(), NOW())
         ON CONFLICT ("domain") DO NOTHING;`,
        [d.tenantId, d.domain, d.isPrimary]
      );
    }
    console.log("✓ Tenant Core & Pilot UPS HERU beserta domain terverifikasi.");

    // 2. Jalankan SQL migrasi DDL idempoten
    const migrationPath = path.join(
      process.cwd(),
      "prisma",
      "migrations",
      "20261125200000_multi_tenant_rls",
      "migration.sql"
    );
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`File migrasi tidak ditemukan: ${migrationPath}`);
    }
    const migrationSql = fs.readFileSync(migrationPath, "utf8");
    await client.query(migrationSql);
    console.log("✓ Skema DDL TenantMembership, TenantSubscription, & 36 kolom tenantId selesai diterapkan.");

    // 3. Backfill seluruh baris legacy NULL -> tenant-pilot-upsheru dengan verifikasi total count
    let totalUpdated = 0;
    for (const tableName of TENANT_OPERATIONAL_TABLES) {
      const tableCheck = await client.query(
        `SELECT EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = $1 AND column_name = 'tenantId'
         ) AS ready;`,
        [tableName]
      );
      if (!tableCheck.rows[0]?.ready) {
        console.warn(`! Tabel "${tableName}" atau kolom tenantId tidak ditemukan, dilewati.`);
        continue;
      }

      const { rows: beforeCounts } = await client.query(
        `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE "tenantId" IS NULL)::int AS nulls FROM "${tableName}";`
      );
      const beforeTotal = beforeCounts[0]?.total ?? 0;
      const beforeNulls = beforeCounts[0]?.nulls ?? 0;

      if (beforeNulls > 0) {
        const res = await client.query(
          `UPDATE "${tableName}" SET "tenantId" = $1 WHERE "tenantId" IS NULL;`,
          [PILOT_TENANT_ID]
        );
        totalUpdated += res.rowCount ?? 0;
        console.log(`  -> "${tableName}": mengisi ${res.rowCount} baris ke ${PILOT_TENANT_ID}`);
      }

      const { rows: afterCounts } = await client.query(
        `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE "tenantId" IS NULL)::int AS nulls FROM "${tableName}";`
      );
      if ((afterCounts[0]?.total ?? 0) !== beforeTotal) {
        throw new Error(`CRITICAL: Anomali jumlah baris pada tabel "${tableName}" (${beforeTotal} -> ${afterCounts[0]?.total})`);
      }
      if ((afterCounts[0]?.nulls ?? 0) > 0) {
        throw new Error(`CRITICAL: Masih terdapat ${afterCounts[0]?.nulls} baris NULL pada "${tableName}"`);
      }
    }

    // 4. Pastikan akun superadmin diarahkan ke tenant-core-o2w & sinkronkan TenantMembership
    await client.query(
      `UPDATE "User" SET "tenantId" = $1 WHERE "role" = 'superadmin' AND ("tenantId" = $2 OR "tenantId" IS NULL);`,
      [CORE_TENANT_ID, PILOT_TENANT_ID]
    );

    await client.query(`
      INSERT INTO "TenantMembership" ("userId", "tenantId", "role", "aktif", "createdAt", "updatedAt")
      SELECT "id", "tenantId", "role", "aktif", NOW(), NOW()
      FROM "User"
      WHERE "tenantId" IS NOT NULL AND "aktif" = true
      ON CONFLICT ("userId", "tenantId") DO NOTHING;
    `);

    // 5. Pastikan pilot UPS HERU memiliki record subscription aktif (domainSetupFee = 0 sebagai pilot)
    await client.query(
      `INSERT INTO "TenantSubscription" (
         "id", "tenantId", "planName", "status", "billingCycle", "pricePerMonth", "domainSetupFee", "setupFeePaid", "autoRenew", "createdAt", "updatedAt"
       )
       SELECT 'sub-pilot-upsheru', $1, 'percontohan', 'aktif', 'lifetime', 0, 0, true, true, NOW(), NOW()
       WHERE NOT EXISTS (SELECT 1 FROM "TenantSubscription" WHERE "tenantId" = $1);`,
      [PILOT_TENANT_ID]
    );

    console.log(`✅ [Pre-Deploy] Migrasi multi-tenant & backfill selesai sempurna (${totalUpdated} baris legacy terhubung ke UPS HERU).`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("❌ [Pre-Deploy] GAGAL menjalankan migrasi:", err);
  process.exit(1);
});
