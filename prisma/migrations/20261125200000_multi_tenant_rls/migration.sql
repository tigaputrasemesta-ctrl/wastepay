-- CreateTable TenantMembership
CREATE TABLE IF NOT EXISTS "TenantMembership" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "tenantId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable TenantSubscription
CREATE TABLE IF NOT EXISTS "TenantSubscription" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "planName" TEXT NOT NULL DEFAULT 'basic',
    "status" TEXT NOT NULL DEFAULT 'aktif',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "billingCycle" TEXT NOT NULL DEFAULT 'monthly',
    "pricePerMonth" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "domainSetupFee" DOUBLE PRECISION NOT NULL DEFAULT 2000000,
    "setupFeePaid" BOOLEAN NOT NULL DEFAULT false,
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantSubscription_pkey" PRIMARY KEY ("id")
);

-- Indexes for TenantMembership
CREATE UNIQUE INDEX IF NOT EXISTS "TenantMembership_userId_tenantId_key" ON "TenantMembership"("userId", "tenantId");
CREATE INDEX IF NOT EXISTS "TenantMembership_tenantId_idx" ON "TenantMembership"("tenantId");
CREATE INDEX IF NOT EXISTS "TenantMembership_userId_idx" ON "TenantMembership"("userId");

-- Indexes for TenantSubscription
CREATE INDEX IF NOT EXISTS "TenantSubscription_tenantId_idx" ON "TenantSubscription"("tenantId");
CREATE INDEX IF NOT EXISTS "TenantSubscription_status_idx" ON "TenantSubscription"("status");

-- Idempotent foreign keys for new tables & User
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TenantMembership_userId_fkey') THEN
    ALTER TABLE "TenantMembership" ADD CONSTRAINT "TenantMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TenantMembership_tenantId_fkey') THEN
    ALTER TABLE "TenantMembership" ADD CONSTRAINT "TenantMembership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TenantSubscription_tenantId_fkey') THEN
    ALTER TABLE "TenantSubscription" ADD CONSTRAINT "TenantSubscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "TenantSubscription" ADD COLUMN IF NOT EXISTS "domainSetupFee" DOUBLE PRECISION NOT NULL DEFAULT 2000000;
ALTER TABLE "TenantSubscription" ADD COLUMN IF NOT EXISTS "setupFeePaid" BOOLEAN NOT NULL DEFAULT false;

-- Ensure dynamic fee columns exist on TenantPaymentConfig if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'TenantPaymentConfig') THEN
    ALTER TABLE "TenantPaymentConfig" ADD COLUMN IF NOT EXISTS "platformFeeRate" DOUBLE PRECISION NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Add tenantId column and indexes to tenant-owned models (IF NOT EXISTS pattern for backward-compatibility)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
CREATE INDEX IF NOT EXISTS "User_tenantId_idx" ON "User"("tenantId");
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_tenantId_fkey') THEN
    ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "Pelanggan" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
CREATE INDEX IF NOT EXISTS "Pelanggan_tenantId_idx" ON "Pelanggan"("tenantId");

ALTER TABLE "Petugas" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
CREATE INDEX IF NOT EXISTS "Petugas_tenantId_idx" ON "Petugas"("tenantId");

ALTER TABLE "LokasiPetugas" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
CREATE INDEX IF NOT EXISTS "LokasiPetugas_tenantId_idx" ON "LokasiPetugas"("tenantId");

ALTER TABLE "Kendaraan" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
CREATE INDEX IF NOT EXISTS "Kendaraan_tenantId_idx" ON "Kendaraan"("tenantId");

ALTER TABLE "LokasiKendaraan" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
CREATE INDEX IF NOT EXISTS "LokasiKendaraan_tenantId_idx" ON "LokasiKendaraan"("tenantId");

ALTER TABLE "TitikTransit" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
CREATE INDEX IF NOT EXISTS "TitikTransit_tenantId_idx" ON "TitikTransit"("tenantId");

ALTER TABLE "Rute" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
CREATE INDEX IF NOT EXISTS "Rute_tenantId_idx" ON "Rute"("tenantId");

ALTER TABLE "Jadwal" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
CREATE INDEX IF NOT EXISTS "Jadwal_tenantId_idx" ON "Jadwal"("tenantId");

ALTER TABLE "Tagihan" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
CREATE INDEX IF NOT EXISTS "Tagihan_tenantId_idx" ON "Tagihan"("tenantId");

ALTER TABLE "Pembayaran" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
CREATE INDEX IF NOT EXISTS "Pembayaran_tenantId_idx" ON "Pembayaran"("tenantId");

ALTER TABLE "DuitkuTransaction" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
CREATE INDEX IF NOT EXISTS "DuitkuTransaction_tenantId_idx" ON "DuitkuTransaction"("tenantId");

ALTER TABLE "Pengangkutan" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
CREATE INDEX IF NOT EXISTS "Pengangkutan_tenantId_idx" ON "Pengangkutan"("tenantId");

ALTER TABLE "Komplain" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
CREATE INDEX IF NOT EXISTS "Komplain_tenantId_idx" ON "Komplain"("tenantId");

ALTER TABLE "LiburSementara" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
CREATE INDEX IF NOT EXISTS "LiburSementara_tenantId_idx" ON "LiburSementara"("tenantId");

ALTER TABLE "Pengumuman" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
CREATE INDEX IF NOT EXISTS "Pengumuman_tenantId_idx" ON "Pengumuman"("tenantId");

ALTER TABLE "Pengeluaran" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
CREATE INDEX IF NOT EXISTS "Pengeluaran_tenantId_idx" ON "Pengeluaran"("tenantId");

ALTER TABLE "Tpa" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
CREATE INDEX IF NOT EXISTS "Tpa_tenantId_idx" ON "Tpa"("tenantId");

ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
CREATE INDEX IF NOT EXISTS "AuditLog_tenantId_idx" ON "AuditLog"("tenantId");

ALTER TABLE "Notifikasi" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
CREATE INDEX IF NOT EXISTS "Notifikasi_tenantId_idx" ON "Notifikasi"("tenantId");

ALTER TABLE "Rekonsiliasi" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
CREATE INDEX IF NOT EXISTS "Rekonsiliasi_tenantId_idx" ON "Rekonsiliasi"("tenantId");

ALTER TABLE "Pengaturan" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
CREATE INDEX IF NOT EXISTS "Pengaturan_tenantId_idx" ON "Pengaturan"("tenantId");

ALTER TABLE "Absensi" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
CREATE INDEX IF NOT EXISTS "Absensi_tenantId_idx" ON "Absensi"("tenantId");

ALTER TABLE "KlaimPetugas" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
CREATE INDEX IF NOT EXISTS "KlaimPetugas_tenantId_idx" ON "KlaimPetugas"("tenantId");

ALTER TABLE "ChatPesan" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
CREATE INDEX IF NOT EXISTS "ChatPesan_tenantId_idx" ON "ChatPesan"("tenantId");

ALTER TABLE "Wilayah" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
CREATE INDEX IF NOT EXISTS "Wilayah_tenantId_idx" ON "Wilayah"("tenantId");

ALTER TABLE "Zona" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
CREATE INDEX IF NOT EXISTS "Zona_tenantId_idx" ON "Zona"("tenantId");

ALTER TABLE "ZonaPetugas" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
CREATE INDEX IF NOT EXISTS "ZonaPetugas_tenantId_idx" ON "ZonaPetugas"("tenantId");

ALTER TABLE "KategoriTarif" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
CREATE INDEX IF NOT EXISTS "KategoriTarif_tenantId_idx" ON "KategoriTarif"("tenantId");

ALTER TABLE "Paket" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
CREATE INDEX IF NOT EXISTS "Paket_tenantId_idx" ON "Paket"("tenantId");

ALTER TABLE "Artikel" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
CREATE INDEX IF NOT EXISTS "Artikel_tenantId_idx" ON "Artikel"("tenantId");

ALTER TABLE "Produk" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
CREATE INDEX IF NOT EXISTS "Produk_tenantId_idx" ON "Produk"("tenantId");

ALTER TABLE "MarketplaceOrder" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
CREATE INDEX IF NOT EXISTS "MarketplaceOrder_tenantId_idx" ON "MarketplaceOrder"("tenantId");

ALTER TABLE "MarketplaceOrderItem" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
CREATE INDEX IF NOT EXISTS "MarketplaceOrderItem_tenantId_idx" ON "MarketplaceOrderItem"("tenantId");

ALTER TABLE "KategoriPickup" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
CREATE INDEX IF NOT EXISTS "KategoriPickup_tenantId_idx" ON "KategoriPickup"("tenantId");

ALTER TABLE "PesananPickup" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
CREATE INDEX IF NOT EXISTS "PesananPickup_tenantId_idx" ON "PesananPickup"("tenantId");
