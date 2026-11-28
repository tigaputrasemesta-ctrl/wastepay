import { prisma } from "@/lib/prisma";

let isPatchDone = false;
let isKolektifPatchDone = false;

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

/**
 * Self-healing schema migration: memastikan kolom skemaBayar, indukKolektifId,
 * dan namaGrupKolektif sudah ada di tabel Pelanggan (Postgres & SQLite).
 */
export async function ensureKolektifSchema() {
  if (isKolektifPatchDone) return;
  try {
    // 1. Jalankan batch statement DDL terpadu
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Pelanggan" ADD COLUMN IF NOT EXISTS "skemaBayar" TEXT DEFAULT 'mandiri';
      ALTER TABLE "Pelanggan" ADD COLUMN IF NOT EXISTS "indukKolektifId" INTEGER;
      ALTER TABLE "Pelanggan" ADD COLUMN IF NOT EXISTS "namaGrupKolektif" TEXT;
      CREATE INDEX IF NOT EXISTS "Pelanggan_skemaBayar_idx" ON "Pelanggan"("skemaBayar");
      CREATE INDEX IF NOT EXISTS "Pelanggan_indukKolektifId_idx" ON "Pelanggan"("indukKolektifId");
    `).catch(async () => {
      // Fallback individual statement jika multi-statement tidak didukung pooler
      await prisma.$executeRawUnsafe(`ALTER TABLE "Pelanggan" ADD COLUMN IF NOT EXISTS "skemaBayar" TEXT DEFAULT 'mandiri';`).catch(() => {});
      await prisma.$executeRawUnsafe(`ALTER TABLE "Pelanggan" ADD COLUMN IF NOT EXISTS "indukKolektifId" INTEGER;`).catch(() => {});
      await prisma.$executeRawUnsafe(`ALTER TABLE "Pelanggan" ADD COLUMN IF NOT EXISTS "namaGrupKolektif" TEXT;`).catch(() => {});
    });

    isKolektifPatchDone = true;
  } catch (err) {
    console.warn("[ensureKolektifSchema] notice:", err);
  }
}

let isKesehatanPatchDone = false;

/**
 * Self-healing schema migration: memastikan kolom kondisiAkun, alasanKendala,
 * dan terakhirFollowUp sudah ada di tabel Pelanggan.
 */
export async function ensureKesehatanSchema() {
  if (isKesehatanPatchDone) return;
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Pelanggan" ADD COLUMN IF NOT EXISTS "kondisiAkun" TEXT DEFAULT 'sehat';
      ALTER TABLE "Pelanggan" ADD COLUMN IF NOT EXISTS "alasanKendala" TEXT;
      ALTER TABLE "Pelanggan" ADD COLUMN IF NOT EXISTS "terakhirFollowUp" TIMESTAMP;
      CREATE INDEX IF NOT EXISTS "Pelanggan_kondisiAkun_idx" ON "Pelanggan"("kondisiAkun");
    `).catch(async () => {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Pelanggan" ADD COLUMN IF NOT EXISTS "kondisiAkun" TEXT DEFAULT 'sehat';`).catch(() => {});
      await prisma.$executeRawUnsafe(`ALTER TABLE "Pelanggan" ADD COLUMN IF NOT EXISTS "alasanKendala" TEXT;`).catch(() => {});
      await prisma.$executeRawUnsafe(`ALTER TABLE "Pelanggan" ADD COLUMN IF NOT EXISTS "terakhirFollowUp" TIMESTAMP;`).catch(() => {});
    });

    isKesehatanPatchDone = true;
  } catch (err) {
    console.warn("[ensureKesehatanSchema] notice:", err);
  }
}
