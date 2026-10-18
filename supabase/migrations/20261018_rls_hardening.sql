-- ==============================================================================
-- WASTEPLAY / UPS HERU SUPABASE SECURITY HARDENING & RLS POLICY
-- Tanggal: 18 Oktober 2026
-- Mengatasi kerentanan: rls_disabled_in_public dan sensitive_columns_exposed
-- ==============================================================================

-- 1. Aktifkan Row-Level Security (RLS) pada seluruh tabel utama di skema public
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
        EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY;', r.tablename);
    END LOOP;
END $$;

-- 2. Cabut akses SELECT langsung oleh role anon pada tabel user/petugas/admin yang memuat kolom password
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;

-- 3. Berikan akses baca publik HANYA untuk artikel edukasi, referensi zona, dan rute pendaftaran
GRANT SELECT ON TABLE public."Artikel", public."Zona", public."Rute", public."Kelurahan" TO anon, authenticated;

-- Kebijakan akses artikel publik
DROP POLICY IF EXISTS "Izinkan baca publik untuk artikel terpublikasi" ON public."Artikel";
CREATE POLICY "Izinkan baca publik untuk artikel terpublikasi"
ON public."Artikel" FOR SELECT TO anon, authenticated
USING (true);

-- Kebijakan akses zona publik
DROP POLICY IF EXISTS "Izinkan baca publik untuk referensi zona" ON public."Zona";
CREATE POLICY "Izinkan baca publik untuk referensi zona"
ON public."Zona" FOR SELECT TO anon, authenticated
USING (true);

-- Kebijakan akses rute publik
DROP POLICY IF EXISTS "Izinkan baca publik untuk daftar rute" ON public."Rute";
CREATE POLICY "Izinkan baca publik untuk daftar rute"
ON public."Rute" FOR SELECT TO anon, authenticated
USING (true);

-- Kebijakan akses kelurahan publik
DROP POLICY IF EXISTS "Izinkan baca publik untuk daftar kelurahan" ON public."Kelurahan";
CREATE POLICY "Izinkan baca publik untuk daftar kelurahan"
ON public."Kelurahan" FOR SELECT TO anon, authenticated
USING (true);

-- 4. Buat fungsi RPC (Security Definer) khusus Cek Tagihan via WhatsApp
-- Mencegah eksposur tabel pelanggan secara penuh (mengatasi sensitive_columns_exposed)
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
    v_normalized := regexp_replace(p_no_wa, '[^0-9]', '', 'g');
    IF left(v_normalized, 1) = '0' THEN
        v_normalized := '62' || substring(v_normalized from 2);
    END IF;

    SELECT jsonb_agg(jsonb_build_object(
        'id_pelanggan', p.id,
        'nama', p.nama,
        'kode_pelanggan', p."kodePelanggan",
        'zona', z.nama,
        'status_tagihan', t.status,
        'nominal_pokok', t.nominal,
        'denda', t.denda,
        'total_bayar', (COALESCE(t.nominal, 0) + COALESCE(t.denda, 0)),
        'periode', t.periode
    ))
    INTO v_result
    FROM public."Pelanggan" p
    LEFT JOIN public."Wilayah" w ON w.id = p."wilayahId"
    LEFT JOIN public."Zona" z ON z.id = w."zonaId"
    LEFT JOIN public."Tagihan" t ON t."pelangganId" = p.id
    WHERE regexp_replace(p."noTelepon", '[^0-9]', '', 'g') LIKE '%' || right(v_normalized, 10)
      AND p."deletedAt" IS NULL;

    RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.cek_tagihan_whatsapp(TEXT) TO anon, authenticated;
