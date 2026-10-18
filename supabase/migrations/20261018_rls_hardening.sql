-- ==============================================================================
-- WASTEPLAY / UPS HERU SUPABASE SECURITY HARDENING & RLS POLICY
-- Target Proyek: melqztzdrcsiiimrwhky
-- Tanggal: 18 Oktober 2026
-- ==============================================================================

-- 1. Aktifkan Row-Level Security (RLS) pada seluruh tabel utama di skema public
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
    END LOOP;
END $$;

-- 2. Berikan akses penuh untuk service_role (backend server & background tasks)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Service role bypass RLS" ON public.%I;', r.tablename);
        EXECUTE format('CREATE POLICY "Service role bypass RLS" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true);', r.tablename);
    END LOOP;
END $$;

-- 3. Cabut akses SELECT langsung oleh role anon pada seluruh tabel
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;

-- 4. Berikan akses baca publik HANYA untuk artikel edukasi, referensi zona, rute, kelurahan, dan paket pendaftaran
GRANT SELECT ON TABLE public."Artikel", public."Zona", public."Rute", public."Kelurahan", public."Paket" TO anon, authenticated;

-- Kebijakan akses artikel publik
DROP POLICY IF EXISTS "Izinkan baca publik untuk artikel terpublikasi" ON public."Artikel";
CREATE POLICY "Izinkan baca publik untuk artikel terpublikasi"
ON public."Artikel" FOR SELECT TO anon, authenticated
USING ("diterbitkan" = true);

-- Kebijakan akses zona publik
DROP POLICY IF EXISTS "Izinkan baca publik untuk referensi zona" ON public."Zona";
CREATE POLICY "Izinkan baca publik untuk referensi zona"
ON public."Zona" FOR SELECT TO anon, authenticated
USING ("deletedAt" IS NULL);

-- Kebijakan akses rute publik
DROP POLICY IF EXISTS "Izinkan baca publik untuk daftar rute" ON public."Rute";
CREATE POLICY "Izinkan baca publik untuk daftar rute"
ON public."Rute" FOR SELECT TO anon, authenticated
USING ("aktif" = true);

-- Kebijakan akses kelurahan publik
DROP POLICY IF EXISTS "Izinkan baca publik untuk daftar kelurahan" ON public."Kelurahan";
CREATE POLICY "Izinkan baca publik untuk daftar kelurahan"
ON public."Kelurahan" FOR SELECT TO anon, authenticated
USING (true);

-- Kebijakan akses paket publik
DROP POLICY IF EXISTS "Izinkan baca publik untuk daftar paket" ON public."Paket";
CREATE POLICY "Izinkan baca publik untuk daftar paket"
ON public."Paket" FOR SELECT TO anon, authenticated
USING (true);

-- 5. Buat fungsi RPC (Security Definer) khusus Cek Tagihan via WhatsApp
-- Mencegah eksposur tabel Pelanggan & Tagihan secara penuh (mengatasi sensitive_columns_exposed)
CREATE OR REPLACE FUNCTION public.cek_tagihan_whatsapp(p_no_wa TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_normalized TEXT;
    v_result jsonb;
BEGIN
    -- Normalisasi format nomor WhatsApp (08xx / +628xx -> 628xx)
    v_normalized := regexp_replace(COALESCE(p_no_wa, ''), '[^0-9]', '', 'g');
    IF left(v_normalized, 1) = '0' THEN
        v_normalized := '62' || substring(v_normalized from 2);
    END IF;

    IF length(v_normalized) < 8 THEN
        RETURN '[]'::jsonb;
    END IF;

    SELECT jsonb_agg(jsonb_build_object(
        'id_pelanggan', p.id,
        'nama', p.nama,
        'kode_pelanggan', p."kodePelanggan",
        'zona', z.nama,
        'no_invoice', t."noInvoice",
        'status_tagihan', t.status,
        'nominal_pokok', t.jumlah,
        'denda', COALESCE(t.denda, 0),
        'total_bayar', (COALESCE(t.jumlah, 0) + COALESCE(t.denda, 0)),
        'periode', (t.tahun || '-' || LPAD(t.bulan::text, 2, '0')),
        'jatuh_tempo', t."jatuhTempo"
    ))
    INTO v_result
    FROM public."Pelanggan" p
    LEFT JOIN public."Wilayah" w ON w.id = p."wilayahId"
    LEFT JOIN public."Zona" z ON z.id = w."zonaId"
    LEFT JOIN public."Tagihan" t ON t."pelangganId" = p.id AND t."deletedAt" IS NULL
    WHERE regexp_replace(p."noTelepon", '[^0-9]', '', 'g') LIKE '%' || right(v_normalized, 10)
      AND p."deletedAt" IS NULL;

    RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.cek_tagihan_whatsapp(TEXT) TO anon, authenticated;
