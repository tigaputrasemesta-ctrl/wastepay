import { prisma } from "@/lib/prisma";

let isPatchDone = false;

/**
 * Self-healing schema migration: memastikan kolom kendaraanId, join tables,
 * dan model pendukung sudah ada di PostgreSQL production tanpa manual migration.
 */
export async function ensureArmadaRuteSchema() {
  if (isPatchDone) return;
  try {
    // 1. Tambah kolom kendaraanId ke Rute (coba berbagai variasi identifier untuk Postgres & SQLite)
    await prisma.$executeRawUnsafe(`ALTER TABLE "Rute" ADD COLUMN IF NOT EXISTS "kendaraanId" INTEGER;`).catch(() => {});
    await prisma.$executeRawUnsafe(`ALTER TABLE public."Rute" ADD COLUMN IF NOT EXISTS "kendaraanId" INTEGER;`).catch(() => {});
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Rute_kendaraanId_idx" ON "Rute"("kendaraanId");`).catch(() => {});
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Rute_kendaraanId_idx" ON public."Rute"("kendaraanId");`).catch(() => {});

    // 2. Pastikan tabel many-to-many _RuteKelurahans ada
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "_RuteKelurahans" (
        "A" INTEGER NOT NULL,
        "B" INTEGER NOT NULL
      );
    `).catch(() => {});
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "_RuteKelurahans_AB_unique" ON "_RuteKelurahans"("A", "B");`).catch(() => {});
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "_RuteKelurahans_B_index" ON "_RuteKelurahans"("B");`).catch(() => {});

    // 3. Pastikan tabel many-to-many _RuteZonas ada
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "_RuteZonas" (
        "A" INTEGER NOT NULL,
        "B" INTEGER NOT NULL
      );
    `).catch(() => {});
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "_RuteZonas_AB_unique" ON "_RuteZonas"("A", "B");`).catch(() => {});
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "_RuteZonas_B_index" ON "_RuteZonas"("B");`).catch(() => {});

    isPatchDone = true;
  } catch (err) {
    console.warn("[ensureArmadaRuteSchema] notice:", err);
  }
}
