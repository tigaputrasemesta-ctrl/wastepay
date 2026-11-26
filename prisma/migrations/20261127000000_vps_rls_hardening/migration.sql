-- ==============================================================================
-- O2W HERO & UPS HERU — ADVANCED POSTGRESQL ROW LEVEL SECURITY (RLS) HARDENING
-- Target: 1 VPS + 1 Multi-Tenant PostgreSQL Database
-- Tanggal: 27 November 2026
-- ==============================================================================

-- 1. Backfill seluruh data legacy NULL -> 'tenant-pilot-upsheru'
DO $$
DECLARE
  pilot_id TEXT := 'tenant-pilot-upsheru';
  t TEXT;
  tables_to_backfill TEXT[] := ARRAY[
    'User', 'Wilayah', 'Zona', 'ZonaPetugas', 'KategoriTarif', 'Paket',
    'Pelanggan', 'Petugas', 'LokasiPetugas', 'Kendaraan', 'LokasiKendaraan',
    'TitikTransit', 'Rute', 'Jadwal', 'Tagihan', 'Pembayaran',
    'DuitkuTransaction', 'Pengangkutan', 'Absensi', 'KlaimPetugas', 'Komplain',
    'LiburSementara', 'Pengumuman', 'Pengeluaran', 'Tpa', 'AuditLog',
    'Notifikasi', 'Rekonsiliasi', 'Pengaturan', 'ChatPesan', 'Artikel',
    'Produk', 'MarketplaceOrder', 'MarketplaceOrderItem', 'KategoriPickup',
    'PesananPickup'
  ];
BEGIN
  FOREACH t IN ARRAY tables_to_backfill LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'tenantId'
    ) THEN
      EXECUTE format('UPDATE public.%I SET "tenantId" = %L WHERE "tenantId" IS NULL;', t, pilot_id);
    END IF;
  END LOOP;
END $$;

-- 2. Aktifkan ENABLE & FORCE ROW LEVEL SECURITY pada tabel inti ber-tenantId
DO $$
DECLARE
  t TEXT;
  core_tables TEXT[] := ARRAY[
    'Pelanggan', 'Tagihan', 'Pembayaran', 'DuitkuTransaction', 'Pengangkutan',
    'Komplain', 'Pengaturan', 'User', 'Petugas', 'Kendaraan', 'Rute', 'Jadwal',
    'Pengeluaran', 'Rekonsiliasi', 'Absensi', 'Notifikasi', 'AuditLog',
    'MarketplaceOrder', 'Produk'
  ];
BEGIN
  FOREACH t IN ARRAY core_tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
      EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY;', t);
    END IF;
  END LOOP;
END $$;

-- 3. Terapkan Policy Isolasi Tenant (tenant_isolation_policy)
-- Mendukung isolasi ketat per app.current_tenant_id dengan pengecualian superadmin
DO $$
DECLARE
  t TEXT;
  core_tables TEXT[] := ARRAY[
    'Pelanggan', 'Tagihan', 'Pembayaran', 'DuitkuTransaction', 'Pengangkutan',
    'Komplain', 'Pengaturan', 'User', 'Petugas', 'Kendaraan', 'Rute', 'Jadwal',
    'Pengeluaran', 'Rekonsiliasi', 'Absensi', 'Notifikasi', 'AuditLog',
    'MarketplaceOrder', 'Produk'
  ];
BEGIN
  FOREACH t IN ARRAY core_tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
      EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON public.%I;', t);
      EXECUTE format('
        CREATE POLICY tenant_isolation_policy ON public.%I
        FOR ALL
        USING (
          current_setting(''app.is_core_superadmin'', true) = ''true''
          OR current_setting(''app.is_superadmin'', true) = ''true''
          OR "tenantId" = current_setting(''app.current_tenant_id'', true)
        )
        WITH CHECK (
          current_setting(''app.is_core_superadmin'', true) = ''true''
          OR current_setting(''app.is_superadmin'', true) = ''true''
          OR "tenantId" = current_setting(''app.current_tenant_id'', true)
        );
      ', t);
    END IF;
  END LOOP;
END $$;

-- 4. Indeks Komposit untuk Performa Tinggi pada 1 Database Multi-Tenant
CREATE INDEX IF NOT EXISTS "Tagihan_tenantId_createdAt_idx" ON "Tagihan"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "Tagihan_tenantId_status_idx" ON "Tagihan"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "Pembayaran_tenantId_createdAt_idx" ON "Pembayaran"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "Pengangkutan_tenantId_createdAt_idx" ON "Pengangkutan"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "Pelanggan_tenantId_createdAt_idx" ON "Pelanggan"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "Pelanggan_tenantId_status_idx" ON "Pelanggan"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "Komplain_tenantId_createdAt_idx" ON "Komplain"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "Komplain_tenantId_status_idx" ON "Komplain"("tenantId", "status");
