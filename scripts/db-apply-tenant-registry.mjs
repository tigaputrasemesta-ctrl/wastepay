import "dotenv/config";
import { Pool } from "pg";

const rawConnectionString = process.env.DATABASE_URL?.trim();
const connectionString = rawConnectionString?.replace(/[?&]sslmode=[^&]+/g, "").replace(/\?$/, "");

if (!connectionString) {
  console.error("❌ DATABASE_URL tidak ditemukan di environment variables!");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

async function main() {
  const client = await pool.connect();
  try {
    console.log("🚀 Menjalankan DDL migrasi Multi-Tenant Registry (Tenant, TenantDomain, MitraRegistration)...");

    await client.query("BEGIN");

    // 1. Tabel Tenant
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Tenant" (
        "id" TEXT NOT NULL,
        "slug" TEXT NOT NULL,
        "namaMitra" TEXT NOT NULL,
        "penanggungJawab" TEXT,
        "noTelepon" TEXT,
        "email" TEXT,
        "alamat" TEXT,
        "kota" TEXT DEFAULT 'Depok',
        "provinsi" TEXT DEFAULT 'Jawa Barat',
        "tipePengelola" TEXT NOT NULL DEFAULT 'tps3r',
        "status" TEXT NOT NULL DEFAULT 'aktif',
        "paketLangganan" TEXT NOT NULL DEFAULT 'percontohan',
        "dbConnectionString" TEXT,
        "dbSchemaName" TEXT,
        "customDomain" TEXT,
        "subdomain" TEXT,
        "logoUrl" TEXT,
        "warnaTema" TEXT DEFAULT '#059669',
        "fiturAktif" TEXT,
        "catatan" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
      );
    `);

    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS "Tenant_slug_key" ON "Tenant"("slug");`);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS "Tenant_customDomain_key" ON "Tenant"("customDomain");`);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS "Tenant_subdomain_key" ON "Tenant"("subdomain");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "Tenant_slug_idx" ON "Tenant"("slug");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "Tenant_customDomain_idx" ON "Tenant"("customDomain");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "Tenant_subdomain_idx" ON "Tenant"("subdomain");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "Tenant_status_idx" ON "Tenant"("status");`);

    // 2. Tabel TenantDomain
    await client.query(`
      CREATE TABLE IF NOT EXISTS "TenantDomain" (
        "id" SERIAL NOT NULL,
        "tenantId" TEXT NOT NULL,
        "domain" TEXT NOT NULL,
        "isPrimary" BOOLEAN NOT NULL DEFAULT false,
        "isVerified" BOOLEAN NOT NULL DEFAULT true,
        "sslStatus" TEXT NOT NULL DEFAULT 'active',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "TenantDomain_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "TenantDomain_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS "TenantDomain_domain_key" ON "TenantDomain"("domain");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "TenantDomain_domain_idx" ON "TenantDomain"("domain");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "TenantDomain_tenantId_idx" ON "TenantDomain"("tenantId");`);

    // 3. Tabel MitraRegistration
    await client.query(`
      CREATE TABLE IF NOT EXISTS "MitraRegistration" (
        "id" SERIAL NOT NULL,
        "namaLengkap" TEXT NOT NULL,
        "namaInstansi" TEXT NOT NULL,
        "jenisUsaha" TEXT NOT NULL,
        "noWhatsapp" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "kota" TEXT NOT NULL,
        "estimasiWarga" INTEGER NOT NULL DEFAULT 0,
        "kebutuhanDb" TEXT NOT NULL DEFAULT 'dedicated',
        "status" TEXT NOT NULL DEFAULT 'menunggu_review',
        "catatanAdmin" TEXT,
        "tenantId" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "MitraRegistration_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "MitraRegistration_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);

    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS "MitraRegistration_tenantId_key" ON "MitraRegistration"("tenantId");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "MitraRegistration_status_idx" ON "MitraRegistration"("status");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "MitraRegistration_noWhatsapp_idx" ON "MitraRegistration"("noWhatsapp");`);

    // 4. Seed Builtin: O2W Hero Core Platform
    await client.query(`
      INSERT INTO "Tenant" (
        "id", "slug", "namaMitra", "tipePengelola", "status", "paketLangganan",
        "customDomain", "subdomain", "warnaTema", "createdAt", "updatedAt"
      ) VALUES (
        'tenant-core-o2w', 'o2w-core', 'O2W Hero', 'core', 'aktif', 'enterprise',
        'o2whero.com', 'core.o2whero.com', '#0284c7', NOW(), NOW()
      ) ON CONFLICT ("id") DO NOTHING;
    `);

    const coreDomains = [
      { domain: "o2whero.com", isPrimary: true },
      { domain: "www.o2whero.com", isPrimary: false },
      { domain: "core.o2whero.com", isPrimary: false },
      { domain: "o2w.vercel.app", isPrimary: false },
      { domain: "o2w-o2-w.vercel.app", isPrimary: false },
    ];

    for (const d of coreDomains) {
      await client.query(`
        INSERT INTO "TenantDomain" ("tenantId", "domain", "isPrimary", "isVerified", "sslStatus", "createdAt", "updatedAt")
        VALUES ('tenant-core-o2w', $1, $2, true, 'active', NOW(), NOW())
        ON CONFLICT ("domain") DO NOTHING;
      `, [d.domain, d.isPrimary]);
    }

    // 5. Seed Builtin: UPS HERU Pilot Tenant (Protected)
    await client.query(`
      INSERT INTO "Tenant" (
        "id", "slug", "namaMitra", "tipePengelola", "status", "paketLangganan",
        "customDomain", "subdomain", "warnaTema", "kota", "provinsi",
        "alamat", "email", "noTelepon", "createdAt", "updatedAt"
      ) VALUES (
        'tenant-pilot-upsheru', 'upsheru', 'UPS HERU Kota Depok', 'tps3r', 'aktif', 'percontohan',
        'upsheru.com', 'upsheru.o2whero.com', '#059669', 'Kota Depok', 'Jawa Barat',
        'Jl. Kandang Ayam, Kalibaru, Kec. Cilodong, Kota Depok, Jawa Barat 16414',
        'cv.herozerowaste@gmail.com', '+62 814-0078-2617', NOW(), NOW()
      ) ON CONFLICT ("id") DO NOTHING;
    `);

    const pilotDomains = [
      { domain: "upsheru.com", isPrimary: true },
      { domain: "www.upsheru.com", isPrimary: false },
      { domain: "upsheru.o2whero.com", isPrimary: false },
      { domain: "tpsheru.vercel.app", isPrimary: false },
      { domain: "wastepay.vercel.app", isPrimary: false },
      { domain: "wastepay-o2-w.vercel.app", isPrimary: false },
    ];

    for (const d of pilotDomains) {
      await client.query(`
        INSERT INTO "TenantDomain" ("tenantId", "domain", "isPrimary", "isVerified", "sslStatus", "createdAt", "updatedAt")
        VALUES ('tenant-pilot-upsheru', $1, $2, true, 'active', NOW(), NOW())
        ON CONFLICT ("domain") DO NOTHING;
      `, [d.domain, d.isPrimary]);
    }

    await client.query("COMMIT");
    console.log("✅ Sukses migrasi dan seeding tabel Multi-Tenant Registry!");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Gagal migrasi tabel Tenant:", error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
