#!/usr/bin/env node
/**
 * Utilitas untuk menjadikan cv.herozerowaste@gmail.com sebagai Admin di upsheru.com (tenant-pilot-upsheru).
 * 
 * Penggunaan:
 *   node scripts/set-upsheru-admin.mjs [password_opsional]
 */

import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import bcrypt from "bcryptjs";

const { Pool } = pg;

// Muat .env
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
  } catch {}
}

const TARGET_EMAIL = process.argv[2] || "cv.herozerowaste@gmail.com";
const NEW_PASSWORD = process.argv[3] || "Hero2026!";
const PILOT_TENANT_ID = "tenant-pilot-upsheru";

async function main() {
  const rawConn = (process.env.DATABASE_URL || "").trim().replace(/^["']|["']$/g, "");
  if (!rawConn) {
    console.error("❌ DATABASE_URL tidak ditemukan!");
    process.exit(1);
  }

  const cleanConn = rawConn.replace(/[?&]sslmode=[^&]+/g, "").replace(/\?$/, "");
  const pool = new Pool({
    connectionString: cleanConn,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });

  const client = await pool.connect();
  try {
    console.log(`🚀 Menetapkan ${TARGET_EMAIL} sebagai admin di ${PILOT_TENANT_ID}...`);

    const existingRes = await client.query(
      `SELECT "id", "email", "nama", "role", "tenantId" FROM "User" WHERE LOWER("email") = LOWER($1);`,
      [TARGET_EMAIL]
    );

    const hashedPassword = await bcrypt.hash(NEW_PASSWORD, 12);
    let userId;

    if (existingRes.rows.length > 0) {
      userId = existingRes.rows[0].id;
      await client.query(
        `UPDATE "User"
         SET "password" = $1, "role" = 'admin', "tenantId" = $2, "aktif" = true,
             "tokenVersion" = COALESCE("tokenVersion", 1) + 1, "updatedAt" = NOW()
         WHERE "id" = $3;`,
        [hashedPassword, PILOT_TENANT_ID, userId]
      );
      console.log(`✅ User ${TARGET_EMAIL} (ID: ${userId}) berhasil di-update:`);
      console.log(`   - Role     : admin`);
      console.log(`   - Tenant   : ${PILOT_TENANT_ID} (upsheru.com)`);
      console.log(`   - Password : ${NEW_PASSWORD}`);
    } else {
      const insertRes = await client.query(
        `INSERT INTO "User" ("email", "password", "nama", "role", "noTelepon", "aktif", "tenantId", "tokenVersion", "createdAt", "updatedAt")
         VALUES ($1, $2, 'Admin UPS HERU', 'admin', '081400782617', true, $3, 1, NOW(), NOW())
         RETURNING "id";`,
        [TARGET_EMAIL, hashedPassword, PILOT_TENANT_ID]
      );
      userId = insertRes.rows[0].id;
      console.log(`✅ User baru ${TARGET_EMAIL} (ID: ${userId}) berhasil dibuat:`);
      console.log(`   - Role     : admin`);
      console.log(`   - Tenant   : ${PILOT_TENANT_ID} (upsheru.com)`);
      console.log(`   - Password : ${NEW_PASSWORD}`);
    }

    await client.query(
      `INSERT INTO "TenantMembership" ("userId", "tenantId", "role", "aktif", "createdAt", "updatedAt")
       VALUES ($1, $2, 'admin', true, NOW(), NOW())
       ON CONFLICT ("userId", "tenantId")
       DO UPDATE SET "role" = 'admin', "aktif" = true, "updatedAt" = NOW();`,
      [userId, PILOT_TENANT_ID]
    );
    console.log(`✅ TenantMembership (${userId} -> ${PILOT_TENANT_ID}) tersinkronisasi sebagai role 'admin'.`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("❌ Gagal:", err);
  process.exit(1);
});
