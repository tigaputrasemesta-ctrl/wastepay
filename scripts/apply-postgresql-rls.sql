-- ============================================================================
-- WASTE PAY / O2WHERO — PRODUCTION-GRADE POSTGRESQL ROW-LEVEL SECURITY (RLS)
-- Multi-Tenant Data Isolation Engine
-- ============================================================================

-- 1. Buat role aplikasi tanpa privilege BYPASSRLS
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'wastepay_app') THEN
    CREATE ROLE wastepay_app WITH LOGIN PASSWORD 'wastepay_secure_app_pass_2026';
  END IF;
END $$;

-- 2. Daftar seluruh tabel operasional milik tenant
-- Enable RLS & FORCE RLS untuk memastikan bahkan DB owner tunduk pada kebijakan RLS

DO $$
DECLARE
  tbl text;
  tenant_tables text[] := ARRAY[
    'Pelanggan',
    'Petugas',
    'LokasiPetugas',
    'Kendaraan',
    'LokasiKendaraan',
    'TitikTransit',
    'Rute',
    'Jadwal',
    'Tagihan',
    'Pembayaran',
    'Pengangkutan',
    'Komplain',
    'LiburSementara',
    'Pengumuman',
    'Pengeluaran',
    'Tpa',
    'AuditLog',
    'Notifikasi',
    'Rekonsiliasi',
    'Pengaturan',
    'DuitkuTransaction',
    'Absensi',
    'KlaimPetugas',
    'ChatPesan',
    'Wilayah',
    'Zona',
    'ZonaPetugas',
    'KategoriTarif',
    'Paket',
    'Artikel',
    'Produk',
    'MarketplaceOrder',
    'MarketplaceOrderItem',
    'KategoriPickup',
    'PesananPickup',
    'TenantMembership',
    'TenantSubscription',
    'TenantWhatsAppConfig',
    'TenantQuotaUsage',
    'TenantPaymentConfig',
    'TenantLedger',
    'TenantPayout'
  ];
BEGIN
  FOREACH tbl IN ARRAY tenant_tables LOOP
    -- Pastikan kolom tenantId ada sebelum menerapkan RLS
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'tenantId'
    ) THEN
      -- A. Aktifkan RLS dan paksa (FORCE) untuk table owner
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
      EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY;', tbl);

      -- B. Hapus policy lama jika ada untuk idempoten
      EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON public.%I;', tbl);

      -- C. Buat policy isolasi transaksi lokal
      -- Menegakkan pembacaan (USING) dan penulisan/pembaruan (WITH CHECK)
      EXECUTE format('
        CREATE POLICY tenant_isolation_policy ON public.%I
        FOR ALL
        USING (
          current_setting(''app.current_tenant_id'', true) = "tenantId"
          OR current_setting(''app.is_superadmin'', true) = ''true''
        )
        WITH CHECK (
          current_setting(''app.current_tenant_id'', true) = "tenantId"
          OR current_setting(''app.is_superadmin'', true) = ''true''
        );', tbl);

      -- D. Berikan hak akses CRUD kepada role aplikasi
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO wastepay_app;', tbl);
      
      RAISE NOTICE 'RLS Policy successfully applied to table: %', tbl;
    ELSE
      RAISE NOTICE 'Table % does not have tenantId column, skipped.', tbl;
    END IF;
  END LOOP;
END $$;

-- 3. Berikan akses ke sequence (agar auto-increment ID tetap berfungsi untuk wastepay_app)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO wastepay_app;

-- 4. Hak akses tabel global (Tenant, TenantDomain, MitraRegistration, Category, Kelurahan, User)
GRANT SELECT ON public."Tenant" TO wastepay_app;
GRANT SELECT ON public."TenantDomain" TO wastepay_app;
GRANT SELECT, INSERT, UPDATE ON public."TenantSubscription" TO wastepay_app;
GRANT SELECT, INSERT, UPDATE ON public."User" TO wastepay_app;
GRANT SELECT, INSERT, UPDATE ON public."MitraRegistration" TO wastepay_app;
GRANT SELECT ON public."Category" TO wastepay_app;
GRANT SELECT ON public."Kelurahan" TO wastepay_app;

RAISE NOTICE 'PostgreSQL Row-Level Security setup complete for O2WHERO / WastePay!';
