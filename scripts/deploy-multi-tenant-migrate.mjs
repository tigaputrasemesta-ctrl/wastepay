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
    // Aktifkan superadmin bypass untuk sesi migrasi deployment (RLS bypass)
    await client.query("SET app.is_core_superadmin = 'true';");
    await client.query("SET app.is_superadmin = 'true';");

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

    await client.query(`
      INSERT INTO "Tenant" (
        "id", "slug", "namaMitra", "tipePengelola", "status", "paketLangganan",
        "customDomain", "subdomain", "warnaTema", "kota", "provinsi", "createdAt", "updatedAt"
      ) VALUES (
        'tenant-mitra-test', 'mitra-test', 'Mitra Test', 'mitra_mandiri', 'aktif', 'starter',
        'mitra-test.vercel.app', 'mitra-test.o2whero.com', '#0284c7', 'Kota Mandiri', 'Jawa Barat', NOW(), NOW()
      ) ON CONFLICT ("id") DO NOTHING;
    `);

    await client.query(`
      INSERT INTO "Tenant" (
        "id", "slug", "namaMitra", "tipePengelola", "status", "paketLangganan",
        "customDomain", "subdomain", "warnaTema", "kota", "provinsi", "createdAt", "updatedAt"
      ) VALUES (
        'tenant-potonglink', 'potonglink', 'PotongLink', 'mitra_mandiri', 'aktif', 'starter',
        'potonglink.com', 'potonglink.o2whero.com', '#0284c7', 'Indonesia', 'Indonesia', NOW(), NOW()
      ) ON CONFLICT ("id") DO NOTHING;
    `);

    const seedDomains = [
      { tenantId: CORE_TENANT_ID, domain: "o2whero.com", isPrimary: true },
      { tenantId: CORE_TENANT_ID, domain: "www.o2whero.com", isPrimary: false },
      { tenantId: CORE_TENANT_ID, domain: "core.o2whero.com", isPrimary: false },
      { tenantId: PILOT_TENANT_ID, domain: "upsheru.com", isPrimary: true },
      { tenantId: PILOT_TENANT_ID, domain: "www.upsheru.com", isPrimary: false },
      { tenantId: PILOT_TENANT_ID, domain: "upsheru.o2whero.com", isPrimary: false },
      { tenantId: "tenant-mitra-test", domain: "mitra-test.vercel.app", isPrimary: true },
      { tenantId: "tenant-mitra-test", domain: "www.mitra-test.vercel.app", isPrimary: false },
      { tenantId: "tenant-mitra-test", domain: "mitra-test.o2whero.com", isPrimary: false },
      { tenantId: "tenant-potonglink", domain: "potonglink.com", isPrimary: true },
      { tenantId: "tenant-potonglink", domain: "www.potonglink.com", isPrimary: false },
      { tenantId: "tenant-potonglink", domain: "potonglink.o2whero.com", isPrimary: false },
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

    // 4b. Tetapkan akun cv.herozerowaste@gmail.com sebagai admin resmi di tenant-pilot-upsheru
    const upsheruAdminEmail = "cv.herozerowaste@gmail.com";
    const existingAdminRes = await client.query(
      `SELECT "id" FROM "User" WHERE LOWER("email") = LOWER($1);`,
      [upsheruAdminEmail]
    );

    let upsheruUserId;
    // Precomputed bcrypt cost 12 hash untuk "Hero2026!" tanpa runtime dependency bcrypt
    const defaultAdminHash = "$2b$12$3ztQ.y84FdNIeOqw7dDfPOXgJ2r.6mVtzUOFMWb63ns8aPSdOLeiK";

    if (existingAdminRes.rows.length > 0) {
      upsheruUserId = existingAdminRes.rows[0].id;
      // Jangan pernah menimpa password atau tokenVersion user yang sudah ada agar password tidak ter-reset saat deploy
      await client.query(
        `UPDATE "User" SET "role" = 'admin', "tenantId" = $1, "aktif" = true, "updatedAt" = NOW() WHERE "id" = $2;`,
        [PILOT_TENANT_ID, upsheruUserId]
      );
      console.log(`✓ User ${upsheruAdminEmail} (ID: ${upsheruUserId}) dipastikan role 'admin' di ${PILOT_TENANT_ID} (password pengguna dipertahankan).`);
    } else {
      const insertRes = await client.query(
        `INSERT INTO "User" ("email", "password", "nama", "role", "noTelepon", "aktif", "tenantId", "tokenVersion", "createdAt", "updatedAt")
         VALUES ($1, $2, 'Admin UPS HERU', 'admin', '081400782617', true, $3, 1, NOW(), NOW())
         RETURNING "id";`,
        [upsheruAdminEmail, defaultAdminHash, PILOT_TENANT_ID]
      );
      upsheruUserId = insertRes.rows[0].id;
      console.log(`✓ User ${upsheruAdminEmail} (ID: ${upsheruUserId}) berhasil dibuat sebagai role 'admin' di ${PILOT_TENANT_ID}.`);
    }

    await client.query(
      `INSERT INTO "TenantMembership" ("userId", "tenantId", "role", "aktif", "createdAt", "updatedAt")
       VALUES ($1, $2, 'admin', true, NOW(), NOW())
       ON CONFLICT ("userId", "tenantId")
       DO UPDATE SET "role" = 'admin', "aktif" = true, "updatedAt" = NOW();`,
      [upsheruUserId, PILOT_TENANT_ID]
    );

    // 5. Pastikan pilot UPS HERU memiliki record subscription aktif (domainSetupFee = 0 sebagai pilot)
    await client.query(
      `INSERT INTO "TenantSubscription" (
         "id", "tenantId", "planName", "status", "billingCycle", "pricePerMonth", "domainSetupFee", "setupFeePaid", "autoRenew", "createdAt", "updatedAt"
       )
       SELECT 'sub-pilot-upsheru', $1, 'percontohan', 'aktif', 'lifetime', 0, 0, true, true, NOW(), NOW()
       WHERE NOT EXISTS (SELECT 1 FROM "TenantSubscription" WHERE "tenantId" = $1);`,
      [PILOT_TENANT_ID]
    );

    // 5b. Pastikan katalog produk resmi UPS HERU tersedia di database
    const defaultProdukData = [
      {
        nama: "Pupuk Kompos Organik TPS 3R (5 kg)",
        slug: "pupuk-kompos-organik-5kg",
        kategori: "pupuk_kompos",
        harga: 25000,
        stok: 150,
        satuan: "sak",
        beratGram: 5000,
        deskripsi: "Pupuk organik kaya unsur hara makro & mikro hasil fermentasi sampah organik rumah tangga terpilah di TPS 3R Kalibaru. Menggemburkan tanah, menjaga kelembapan, dan menyuburkan tanaman bunga, buah, serta sayuran pekarangan.",
        foto: "https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?auto=format&fit=crop&w=800&q=80",
      },
      {
        nama: "Pupuk Kompos Super Curah (20 kg)",
        slug: "pupuk-kompos-super-20kg",
        kategori: "pupuk_kompos",
        harga: 75000,
        stok: 80,
        satuan: "sak",
        beratGram: 20000,
        deskripsi: "Kemasan curah hemat 20 kg untuk kebutuhan taman perumahan, penghijauan fasilitas umum, kebun sayur, dan paguyuban lingkungan RT/RW.",
        foto: "https://images.unsplash.com/photo-1592417817098-8f3d6910985c?auto=format&fit=crop&w=800&q=80",
      },
      {
        nama: "Pupuk Organik Cair POC (1 Liter)",
        slug: "poc-nutrisi-tanaman-1l",
        kategori: "pupuk_cair",
        harga: 35000,
        stok: 100,
        satuan: "botol",
        beratGram: 1000,
        deskripsi: "Konsentrat nutrisi cair siap pakai hasil fermentasi mikroorganisme lokal (MOL). Mempercepat pertumbuhan tunas, menguatkan akar, dan mencegah kerontokan bunga.",
        foto: "https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&w=600&q=80",
      },
      {
        nama: "Maggot BSF Kering Panggang (500 gr)",
        slug: "maggot-bsf-kering-500g",
        kategori: "maggot",
        harga: 45000,
        stok: 60,
        satuan: "pouch",
        beratGram: 500,
        deskripsi: "Pakan alternatif kaya protein tinggi (40-45%) untuk unggas, ikan hias, kura-kura, dan burung kicau. Bersih, higienis, dan tahan simpan lama.",
        foto: "https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=800&q=80",
      },
      {
        nama: "Tempat Sampah Pilah 2 in 1 (40 Liter)",
        slug: "tempat-sampah-pilah-2in1",
        kategori: "tempat_sampah",
        harga: 85000,
        stok: 40,
        satuan: "set",
        beratGram: 3000,
        deskripsi: "Set dua tempat sampah bertutup (Organik & Anorganik) berbahan plastik tebal tahan panas dan hujan. Memudahkan pemilahan dari dapur dan teras rumah.",
        foto: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=600&q=80",
      },
      {
        nama: "Kantong Sampah Biodegradable Ramah Lingkungan",
        slug: "kantong-sampah-biodegradable-roll",
        kategori: "kantong_sampah",
        harga: 20000,
        stok: 200,
        satuan: "roll",
        beratGram: 300,
        deskripsi: "Kantong sampah ramah lingkungan berbahan pati singkong (cassava bag) yang mudah terurai hayati di tanah dalam 3-6 bulan. Kapasitas 25 liter per lembar.",
        foto: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=800&q=80",
      },
    ];

    for (const p of defaultProdukData) {
      await client.query(`
        INSERT INTO "Produk" (
          "nama", "slug", "kategori", "harga", "stok", "satuan", "beratGram", "deskripsi", "foto", "aktif", "tenantId", "createdAt", "updatedAt"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, $10, NOW(), NOW())
        ON CONFLICT ("slug") DO UPDATE SET
          "nama" = EXCLUDED."nama",
          "kategori" = EXCLUDED."kategori",
          "harga" = EXCLUDED."harga",
          "stok" = EXCLUDED."stok",
          "satuan" = EXCLUDED."satuan",
          "beratGram" = EXCLUDED."beratGram",
          "deskripsi" = EXCLUDED."deskripsi",
          "foto" = EXCLUDED."foto",
          "tenantId" = COALESCE("Produk"."tenantId", EXCLUDED."tenantId"),
          "aktif" = true,
          "updatedAt" = NOW();
      `, [p.nama, p.slug, p.kategori, p.harga, p.stok, p.satuan, p.beratGram, p.deskripsi, p.foto, PILOT_TENANT_ID]);
    }
    console.log(`✓ Katalog produk resmi UPS HERU (${defaultProdukData.length} item) terpasang di database.`);

    // 6. Jalankan Hardened RLS Policy & Composite Indexes (20261127000000_vps_rls_hardening)
    const hardeningMigrationPath = path.join(
      process.cwd(),
      "prisma",
      "migrations",
      "20261127000000_vps_rls_hardening",
      "migration.sql"
    );
    if (fs.existsSync(hardeningMigrationPath)) {
      const hardeningSql = fs.readFileSync(hardeningMigrationPath, "utf8");
      await client.query(hardeningSql);
      console.log("✓ PostgreSQL ENABLE & FORCE ROW LEVEL SECURITY, Tenant Isolation Policy, & Indeks Komposit berhasil diterapkan.");
    }

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
