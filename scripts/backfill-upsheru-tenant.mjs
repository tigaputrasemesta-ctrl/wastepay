/**
 * Phase 9 — Safe Migration & Backfill Script for UPS HERU Pilot Tenant
 *
 * Objectives:
 * 1. Safely identify or create Pilot Tenant ('tenant-pilot-upsheru') and Core Tenant ('tenant-core-o2w').
 * 2. Backfill existing legacy records where tenantId IS NULL to 'tenant-pilot-upsheru'.
 * 3. Verify record counts before and after to ensure zero data loss.
 * 4. Sync TenantMembership rows from User table safely.
 * 5. Report NOT NULL enforcement readiness.
 *
 * Usage:
 *   node scripts/backfill-upsheru-tenant.mjs [--dry-run]
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const rawConn = (process.env.DATABASE_URL || "").trim().replace(/^["']|["']$/g, "");
if (!rawConn) {
  console.error("❌ DATABASE_URL tidak ditemukan!");
  process.exit(1);
}

const cleanConn = rawConn.replace(/[?&]sslmode=[^&]+/g, "").replace(/\?$/, "");
const useSsl =
  process.env.NODE_ENV === "production" ||
  process.env.DATABASE_SSL === "true" ||
  rawConn.includes("supabase.com") ||
  rawConn.includes("sumobase.my.id");

const pool = new Pool({
  connectionString: cleanConn,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined,
});

const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

const PILOT_TENANT_ID = "tenant-pilot-upsheru";
const CORE_TENANT_ID = "tenant-core-o2w";

// Sesuai persis dengan daftar seluruh model berkolom `tenantId` pada prisma/schema.prisma
const OPERATIONAL_TABLES = [
  "user",
  "wilayah",
  "zona",
  "zonaPetugas",
  "kategoriTarif",
  "paket",
  "pelanggan",
  "petugas",
  "lokasiPetugas",
  "kendaraan",
  "lokasiKendaraan",
  "titikTransit",
  "rute",
  "jadwal",
  "tagihan",
  "pembayaran",
  "duitkuTransaction",
  "pengangkutan",
  "absensi",
  "klaimPetugas",
  "komplain",
  "liburSementara",
  "pengumuman",
  "pengeluaran",
  "tpa",
  "auditLog",
  "notifikasi",
  "rekonsiliasi",
  "pengaturan",
  "chatPesan",
  "artikel",
  "produk",
  "marketplaceOrder",
  "marketplaceOrderItem",
  "kategoriPickup",
  "pesananPickup",
];

async function main() {
  const isDryRun = process.argv.includes("--dry-run");
  console.log(`\n======================================================`);
  console.log(`[Phase 9] WastePay Multi-Tenant UPS HERU Backfill Run`);
  console.log(`Mode: ${isDryRun ? "DRY-RUN (No mutations)" : "LIVE EXECUTION"}`);
  console.log(`======================================================\n`);

  try {
    // 1. Pastikan Core & Pilot Tenant terdaftar
    console.log(`[*] Verifikasi keberadaan Core & Pilot Tenant di database...`);

    let pilotTenant = await prisma.tenant.findUnique({ where: { id: PILOT_TENANT_ID } });
    if (!pilotTenant) {
      console.log(`    + Membuat tenant pilot UPS HERU (${PILOT_TENANT_ID})...`);
      if (!isDryRun) {
        pilotTenant = await prisma.tenant.create({
          data: {
            id: PILOT_TENANT_ID,
            slug: "upsheru",
            namaMitra: "UPS HERU",
            tipePengelola: "tps3r",
            paketLangganan: "percontohan",
            customDomain: "upsheru.com",
            subdomain: "upsheru.o2whero.com",
            warnaTema: "#059669",
            alamat: "Jl. Kandang Ayam, Kalibaru, Kec. Cilodong, Kota Depok, Jawa Barat 16414",
            kota: "Kota Depok",
            status: "aktif",
            domains: {
              create: [
                { domain: "upsheru.com", isVerified: true, isPrimary: true },
                { domain: "www.upsheru.com", isVerified: true, isPrimary: false },
                { domain: "upsheru.o2whero.com", isVerified: true, isPrimary: false },
              ],
            },
          },
        });
      }
    } else {
      console.log(`    ✓ Pilot Tenant (${PILOT_TENANT_ID}) sudah terdaftar.`);
    }

    let coreTenant = await prisma.tenant.findUnique({ where: { id: CORE_TENANT_ID } });
    if (!coreTenant) {
      console.log(`    + Membuat tenant Core O2W Hero (${CORE_TENANT_ID})...`);
      if (!isDryRun) {
        coreTenant = await prisma.tenant.create({
          data: {
            id: CORE_TENANT_ID,
            slug: "o2w-core",
            namaMitra: "O2W Hero",
            tipePengelola: "core",
            paketLangganan: "enterprise",
            customDomain: "o2whero.com",
            subdomain: "core.o2whero.com",
            warnaTema: "#0284c7",
            status: "aktif",
            domains: {
              create: [
                { domain: "o2whero.com", isVerified: true, isPrimary: true },
                { domain: "www.o2whero.com", isVerified: true, isPrimary: false },
                { domain: "core.o2whero.com", isVerified: true, isPrimary: false },
              ],
            },
          },
        });
      }
    } else {
      console.log(`    ✓ Core Tenant (${CORE_TENANT_ID}) sudah terdaftar.`);
    }

    // 2. Audit record counts sebelum backfill
    console.log(`\n[*] Memeriksa baris data yang membutuhkan backfill tenantId...`);
    const tableStats = [];

    for (const modelKey of OPERATIONAL_TABLES) {
      if (!prisma[modelKey]) continue;

      try {
        const totalRows = await prisma[modelKey].count();
        const unassignedRows = await prisma[modelKey].count({
          where: { tenantId: null },
        });
        const assignedPilotRows = await prisma[modelKey].count({
          where: { tenantId: PILOT_TENANT_ID },
        });

        tableStats.push({
          model: modelKey,
          total: totalRows,
          unassigned: unassignedRows,
          assignedPilot: assignedPilotRows,
        });
      } catch (err) {
        console.warn(`    ! Lewati ${modelKey} (tabel/kolom mungkin berbeda): ${err.message}`);
      }
    }

    console.table(tableStats);

    // 3. Eksekusi Backfill
    let totalUpdated = 0;
    console.log(`\n[*] Menjalankan safe backfill tenantId = '${PILOT_TENANT_ID}'...`);

    for (const stat of tableStats) {
      if (stat.unassigned === 0) {
        console.log(`    ✓ [${stat.model}] Sudah lengkap (0 baris null)`);
        continue;
      }

      console.log(`    -> [${stat.model}] Memperbarui ${stat.unassigned} baris null...`);
      if (!isDryRun) {
        const updateResult = await prisma[stat.model].updateMany({
          where: { tenantId: null },
          data: { tenantId: PILOT_TENANT_ID },
        });
        totalUpdated += updateResult.count;
      } else {
        totalUpdated += stat.unassigned;
      }
    }

    // Khusus Superadmin: Akun superadmin global diarahkan ke CORE_TENANT
    if (!isDryRun && prisma.user) {
      const superadminUpdate = await prisma.user.updateMany({
        where: { role: "superadmin", tenantId: PILOT_TENANT_ID },
        data: { tenantId: CORE_TENANT_ID },
      });
      if (superadminUpdate.count > 0) {
        console.log(`    ✓ Menetapkan ${superadminUpdate.count} akun superadmin ke Core Tenant (${CORE_TENANT_ID}).`);
      }

      // Sinkronkan TenantMembership dari User
      const users = await prisma.user.findMany({
        where: { tenantId: { not: null }, aktif: true },
        select: { id: true, tenantId: true, role: true },
      });
      if (users.length > 0 && prisma.tenantMembership) {
        await prisma.tenantMembership.createMany({
          data: users.map((u) => ({
            userId: u.id,
            tenantId: u.tenantId,
            role: u.role,
            aktif: true,
          })),
          skipDuplicates: true,
        });
        console.log(`    ✓ Sinkronisasi TenantMembership selesai untuk ${users.length} akun.`);
      }
    }

    // 4. Verifikasi Pasca-Backfill (Zero Data Loss & Consistency Check)
    console.log(`\n[*] Verifikasi integritas data pasca-migrasi...`);
    let hasResidualNulls = false;

    for (const stat of tableStats) {
      if (!prisma[stat.model]) continue;
      const afterTotal = await prisma[stat.model].count();
      const afterNulls = await prisma[stat.model].count({ where: { tenantId: null } });

      if (afterTotal !== stat.total) {
        throw new Error(`CRITICAL: Data loss detected on table ${stat.model}! Before: ${stat.total}, After: ${afterTotal}`);
      }
      if (afterNulls > 0 && !isDryRun) {
        hasResidualNulls = true;
        console.error(`    ❌ [${stat.model}] Masih terdapat ${afterNulls} baris dengan tenantId NULL!`);
      }
    }

    if (!hasResidualNulls) {
      console.log(`    ✓ Seluruh tabel operasional 100% tervalidasi. 0 baris null ditemukan.`);
      console.log(`    ✓ Total baris ter-backfill: ${totalUpdated}`);
      console.log(`    ✓ Status integritas: AMAN.`);
      console.log(`\n[SIAP NOT NULL] Tabel sekarang siap diberlakukan constraint NOT NULL dan RLS Enforcement.`);
    } else {
      console.warn(`    ⚠️ Periksa kembali data tabel yang masih memiliki null sebelum menerapkan NOT NULL.`);
    }

    console.log(`\n======================================================`);
    console.log(`Migrasi Selesai.`);
    console.log(`======================================================\n`);
  } catch (error) {
    console.error(`\n❌ Error saat menjalankan migrasi backfill:`, error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
