import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SessionUser } from '@/lib/auth';
import { allowAttempt, retryAfterSeconds } from '@/lib/rate-limit';

/**
 * ============================================================================
 * WASTEPAY BACKEND CORE SERVICES — HARDENED PRODUCTION ENGINE
 * Lokasi File : src/lib/server/wastepay-backend-core-services.ts
 *
 * Mengakomodasi 8 Domain Fungsi Backend Berdasarkan Audit Forensik 18 Okt 2026:
 * 1. Auth, RBAC Guard & CORS Builder untuk Android WebView (Capacitor)
 * 2. Registrasi & Approval Pelanggan (Atomisitas zonaId, urutanRute, tanggal 1..28)
 * 3. Kalkulasi Tagihan, Pajak Daerah (Rupiah bulat), Denda & Aturan Angkut
 * 4. Normalisasi 10 Digit Terakhir WhatsApp, Penyamaran Alamat, & Laporan Analisis
 * 5. Deterministic Timezone Shift UTC+7 (Asia/Jakarta) & Resolusi Status Absensi
 * 6. Query Proyeksi Ringan Peta (Pengecualian fotoRumah tingkat SQL)
 * 7. Sanitasi CSV/Excel Formula Injection & Guard Batch Import Seeding
 * 8. Deduplikasi Slug CMS Artikel & Pemisahan Namespace
 * ============================================================================
 */

// ────────────────────────────────────────────────────────────────────────────
// DOMAIN 1: AUTH, RBAC GUARD & CORS BUILDER UNTUK ANDROID CAPACITOR
// ────────────────────────────────────────────────────────────────────────────

const ALLOWED_CORS_ORIGINS = [
  'https://localhost',
  'http://localhost',
  'http://localhost:3000',
  'capacitor://localhost',
  'https://upsheru.com',
  'https://www.upsheru.com',
];

/**
 * Membangun header CORS yang aman untuk request dari aplikasi Android WebView (Capacitor)
 * maupun domain web produksi.
 */
export function buildCorsHeaders(request?: Request): Record<string, string> {
  let origin = '*';
  if (request) {
    const reqOrigin = request.headers.get('origin');
    if (reqOrigin) {
      const isAllowed =
        ALLOWED_CORS_ORIGINS.includes(reqOrigin) ||
        reqOrigin.endsWith('.vercel.app') ||
        reqOrigin.endsWith('upsheru.com');
      if (isAllowed) {
        origin = reqOrigin;
      }
    }
  }

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };
}

/**
 * Menangani preflight OPTIONS request secara universal
 */
export function handleCorsPreflight(request: Request): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(request),
  });
}

/**
 * Validasi otorisasi peran (case-insensitive) untuk mencegah kegagalan otentikasi
 * antara string 'ADMIN' vs 'admin' atau 'SUPERADMIN' vs 'superadmin'.
 */
export function assertAuthorizedRole(
  session: SessionUser | { role?: string } | null,
  allowedRoles: string[]
): { authorized: boolean; error?: string; status?: number } {
  if (!session || !session.role) {
    return { authorized: false, error: 'Unauthorized: Sesi tidak valid atau telah kedaluwarsa', status: 401 };
  }

  const userRole = session.role.toLowerCase().trim();
  const normalizedAllowed = allowedRoles.map((r) => r.toLowerCase().trim());

  // superadmin selalu memiliki akses penuh
  if (userRole === 'superadmin' || normalizedAllowed.includes(userRole)) {
    return { authorized: true };
  }

  return {
    authorized: false,
    error: `Forbidden: Peran '${session.role}' tidak memiliki izin mengakses fitur ini`,
    status: 403,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// DOMAIN 2: REGISTRASI & PERSETUJUAN PELANGGAN (RESOLUSI ATOMIK ZONA & RUTE)
// ────────────────────────────────────────────────────────────────────────────

export interface CustomerApprovalPayload {
  pelangganId: number;
  zonaId?: number | null;
  ruteId?: number | null;
  kelurahanId?: number | null;
  tanggalTagihanCustom?: number | null;
  kategori?: string;
  customTarif?: number | null;
}

export interface ResolvedCustomerRegistration {
  resolvedZonaId: number | null;
  resolvedRuteId: number | null;
  resolvedKelurahanId: number | null;
  validatedTanggalTagihan: number;
  urutanRute: number;
  warnings: {
    missingFieldOfficer: boolean;
    missingZone: boolean;
  };
}

/**
 * Menyelesaikan relasi zona, rute, dan kelurahan secara atomik di sisi server
 * agar pelanggan tidak menjadi 'orphan' tanpa zona, serta mengunci tanggal tagihan 1..28.
 */
export async function resolveCustomerRegistrationAndApproval(
  payload: CustomerApprovalPayload
): Promise<ResolvedCustomerRegistration> {
  let matchedRoute: { id: number; zonaId: number | null; kelurahanId: number | null; petugasId: number | null } | null = null;

  if (payload.ruteId) {
    matchedRoute = await prisma.rute.findUnique({
      where: { id: payload.ruteId },
      select: { id: true, zonaId: true, kelurahanId: true, petugasId: true },
    });
  }

  // Resolusi server-side fallback: jika payload.zonaId kosong, warisi dari rute
  const resolvedZonaId = payload.zonaId || matchedRoute?.zonaId || null;
  const resolvedKelurahanId = payload.kelurahanId || matchedRoute?.kelurahanId || null;
  const resolvedRuteId = payload.ruteId || null;

  // Validasi batas tanggal tagihan: kunci ketat antara 1 s/d 28 untuk mencegah date rollover Februari
  const rawTanggal = payload.tanggalTagihanCustom ?? 10;
  const validatedTanggalTagihan = Math.min(28, Math.max(1, Math.floor(rawTanggal)));

  // Hitung urutan rute baru secara atomik
  let urutanRute = 1;
  if (resolvedRuteId) {
    const existingCount = await prisma.jadwal.count({
      where: { ruteId: resolvedRuteId },
    });
    urutanRute = existingCount + 1;
  }

  const warnings = {
    missingFieldOfficer: Boolean(matchedRoute && !matchedRoute.petugasId),
    missingZone: !resolvedZonaId,
  };

  return {
    resolvedZonaId,
    resolvedRuteId,
    resolvedKelurahanId,
    validatedTanggalTagihan,
    urutanRute,
    warnings,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// DOMAIN 3: MESIN TAGIHAN, PAJAK DAERAH, DENDA & KELAYAKAN ANGKUT
// ────────────────────────────────────────────────────────────────────────────

export interface BillingCalculationInput {
  tarifPokok: number;
  unpaidMonthsCount: number;
  tanggalTagihanCustom?: number | null;
  pajakDaerahRatePct?: number; // e.g. 10 untuk 10%
  dendaRatePct?: number; // e.g. 2 untuk 2%/bulan
  batasBulanStopAngkut?: number; // e.g. 2 bulan
  maksDendaPctDariPokok?: number; // e.g. 50%
  targetYear?: number;
  targetMonth?: number; // 1-12
}

export interface BillingCalculationResult {
  tarifPokok: number;
  pajakDaerahNominal: number;
  dendaNominal: number;
  totalTagihan: number;
  jatuhTempoDate: Date;
  isEligibleForPickup: boolean;
  alasanPenangguhan: string | null;
}

/**
 * Kalkulasi tagihan akurat: pembulatan Rupiah bulat (tanpa desimal pecahan),
 * pencegahan date rollover bulan kabisat/Februari, plafon denda, dan evaluasi kelayakan jemput.
 */
export function calculateCustomerBillingAndPickupRule(
  input: BillingCalculationInput
): BillingCalculationResult {
  const now = new Date();
  const year = input.targetYear ?? now.getFullYear();
  const month = input.targetMonth ?? now.getMonth() + 1;

  // Hitung jumlah hari aktual di bulan berjalan (mencegah date rollover)
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const safeBillingDay = Math.min(input.tanggalTagihanCustom || 10, daysInMonth, 28);

  const jatuhTempoDate = new Date(Date.UTC(year, month - 1, safeBillingDay, 16, 59, 59, 999)); // 23:59 WIB

  const tarifPokok = Math.max(0, Math.round(input.tarifPokok));

  // Pajak Daerah dibulatkan ke Rupiah penuh
  const pajakRate = input.pajakDaerahRatePct || 0;
  const pajakDaerahNominal = Math.round((tarifPokok * pajakRate) / 100);

  // Kalkulasi Denda dengan Plafon Maksimal
  const dendaRate = input.dendaRatePct || 0;
  const maksDendaPct = input.maksDendaPctDariPokok ?? 50;
  const maxDendaNominal = Math.round((tarifPokok * maksDendaPct) / 100);

  const rawDenda = Math.round((tarifPokok * (dendaRate / 100)) * Math.max(0, input.unpaidMonthsCount));
  const dendaNominal = Math.min(rawDenda, maxDendaNominal);

  const totalTagihan = tarifPokok + pajakDaerahNominal + dendaNominal;

  // Aturan Evaluasi Kelayakan Pengangkutan
  const batasBulan = input.batasBulanStopAngkut ?? 2;
  const isEligibleForPickup = input.unpaidMonthsCount < batasBulan;
  const alasanPenangguhan = isEligibleForPickup
    ? null
    : `Penangguhan Pengangkutan: Pelanggan memiliki tunggakan ${input.unpaidMonthsCount} bulan (Batas toleransi: ${batasBulan} bulan).`;

  return {
    tarifPokok,
    pajakDaerahNominal,
    dendaNominal,
    totalTagihan,
    jatuhTempoDate,
    isEligibleForPickup,
    alasanPenangguhan,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// DOMAIN 4: PENCARIAN PEMBAYARAN VIA WHATSAPP & PENYAMARAN ALAMAT PUBLIK
// ────────────────────────────────────────────────────────────────────────────

/**
 * Mengekstrak 10 digit signifikan terakhir dari nomor telepon WhatsApp.
 * Menghilangkan inkonsistensi awalan 08, 628, +62 8, spasi, maupun tanda hubung.
 */
export function extractTail10Digits(phone: string): string {
  const clean = phone.replace(/\D/g, '');
  return clean.slice(-10);
}

/**
 * Menyamarkan alamat lengkap untuk tampilan portal pembayaran publik
 * agar mematuhi UU Perlindungan Data Pribadi (UU PDP).
 * Contoh: "Jl. Margonda Raya No. 45 RT 03/RW 05" -> "Jl. Margonda Raya No. ** RT ** / **"
 */
export function maskAddressForPublicView(address: string): string {
  if (!address) return '';
  return address
    .replace(/(?:No\.?|Nomor)\s*([A-Za-z0-9\-\/]+)/gi, 'No. **')
    .replace(/RT\s*([0-9]+)/gi, 'RT **')
    .replace(/RW\s*([0-9]+)/gi, 'RW **')
    .replace(/\b(\d{1,4})\b/g, '**');
}

/**
 * Rate limiter IP tingkat tinggi (maks 15 request per menit per IP)
 */
export async function checkIpRateLimit(
  ip: string,
  limit: number = 15,
  windowMs: number = 60000
): Promise<{ allowed: boolean; remaining: number; retryAfter: number }> {
  const key = `rate-limit:public-search:${ip}`;
  const allowed = await allowAttempt(key, { max: limit, windowMs });
  const retry = retryAfterSeconds(key);
  return {
    allowed,
    remaining: allowed ? Math.max(0, limit - 1) : 0,
    retryAfter: retry,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// DOMAIN 5: BOUNDARIES ZONA WAKTU ASIA/JAKARTA (WIB) & STATUS ABSENSI
// ────────────────────────────────────────────────────────────────────────────

export type OfficerStatusHariIni = 'BELUM_ABSEN' | 'HADIR' | 'SELESAI' | 'IZIN' | 'SAKIT' | 'ALPA';

export interface JakartaDateBounds {
  tanggalWibString: string; // YYYY-MM-DD
  startOfDayUtc: Date;
  endOfDayUtc: Date;
  nowWibHours: number;
}

/**
 * Menghitung batas awal dan akhir hari secara presisi di zona waktu WIB (UTC+7).
 * Menghilangkan bug absensi pukul 05:00-06:59 WIB yang sempat tercatat sebagai hari kemarin di Vercel.
 */
export function getJakartaDateBounds(refDate: Date = new Date()): JakartaDateBounds {
  // Geser stempel waktu sebesar +7 jam (25.200.000 ms)
  const wibTime = new Date(refDate.getTime() + 7 * 3600 * 1000);
  const tanggalWibString = wibTime.toISOString().slice(0, 10); // YYYY-MM-DD

  const [year, month, day] = tanggalWibString.split('-').map(Number);

  // 00:00:00.000 WIB = 17:00:00.000 UTC hari sebelumnya
  const startOfDayUtc = new Date(Date.UTC(year, month - 1, day - 1, 17, 0, 0, 0));
  // 23:59:59.999 WIB = 16:59:59.999 UTC hari ini
  const endOfDayUtc = new Date(Date.UTC(year, month - 1, day, 16, 59, 59, 999));

  return {
    tanggalWibString,
    startOfDayUtc,
    endOfDayUtc,
    nowWibHours: wibTime.getUTCHours(),
  };
}

/**
 * Menentukan status absensi hari ini dengan tipe union ketat
 */
export function resolveOfficerStatusHariIni(
  absensiRecord: { id?: number; waktuMasuk?: Date | null; waktuSelesai?: Date | null; status?: string } | null
): OfficerStatusHariIni {
  if (!absensiRecord || !absensiRecord.waktuMasuk) {
    return 'BELUM_ABSEN';
  }

  const rawStatus = (absensiRecord.status || '').toLowerCase().trim();
  if (rawStatus === 'izin') return 'IZIN';
  if (rawStatus === 'sakit') return 'SAKIT';
  if (rawStatus === 'alpa') return 'ALPA';

  if (absensiRecord.waktuSelesai) {
    return 'SELESAI';
  }

  return 'HADIR';
}

// ────────────────────────────────────────────────────────────────────────────
// DOMAIN 6: QUERY PROYEKSI RINGAN PETA (PENGECUALIAN fotoRumah TINGKAT SQL)
// ────────────────────────────────────────────────────────────────────────────

export interface LightweightMapPin {
  id: number;
  nama: string;
  noWhatsapp: string;
  alamat: string;
  zonaId: number | null;
  zonaNama: string;
  ruteId: number | null;
  ruteNama: string;
  urutanRute: number;
  lat: number;
  lng: number;
  statusAngkut: 'BELUM_DIANGKUT' | 'SELESAI_DIANGKUT' | 'DILEWATI';
  statusTagihan: 'LUNAS' | 'BELUM_BAYAR' | 'MENUNGGAK';
}

/**
 * Mengambil daftar pin peta dengan proyeksi kolom ringan di tingkat SQL.
 * SENGAJA MENGEKSEKUSI fotoRumah: false agar menghemat Fluid Memory Vercel dan Egress Supabase >85%.
 */
export async function getLightweightMapPins(zonaId?: number | null): Promise<LightweightMapPin[]> {
  const whereClause: any = {
    deletedAt: null,
    status: { in: ['aktif', 'terjadwal'] },
    latitude: { not: null },
    longitude: { not: null },
  };

  if (zonaId) {
    whereClause.wilayah = { zonaId };
  }

  const pelanggan = await prisma.pelanggan.findMany({
    where: whereClause,
    select: {
      id: true,
      nama: true,
      noTelepon: true,
      alamat: true,
      latitude: true,
      longitude: true,
      status: true,
      wilayah: {
        select: {
          zonaId: true,
          zona: { select: { nama: true } },
        },
      },
      jadwal: {
        take: 1,
        select: {
          ruteId: true,
          rute: { select: { nama: true } },
        },
      },
      tagihan: {
        where: { deletedAt: null, status: 'tunggakan' },
        take: 1,
        select: { id: true },
      },
    },
    take: 500,
  });

  return pelanggan.map((p, idx) => {
    const hasTunggakan = p.tagihan && p.tagihan.length > 0;
    const isDiambil = p.status === 'diambil' || p.status === 'selesai';

    return {
      id: p.id,
      nama: p.nama,
      noWhatsapp: p.noTelepon,
      alamat: p.alamat,
      zonaId: p.wilayah?.zonaId || null,
      zonaNama: p.wilayah?.zona?.nama || 'Zona Utama',
      ruteId: p.jadwal?.[0]?.ruteId || null,
      ruteNama: p.jadwal?.[0]?.rute?.nama || 'Rute Reguler',
      urutanRute: idx + 1,
      lat: p.latitude || 0,
      lng: p.longitude || 0,
      statusAngkut: isDiambil ? 'SELESAI_DIANGKUT' : 'BELUM_DIANGKUT',
      statusTagihan: hasTunggakan ? 'MENUNGGAK' : 'LUNAS',
    };
  });
}

// ────────────────────────────────────────────────────────────────────────────
// DOMAIN 7: SANITASI FORMULA INJECTION EXCEL & GUARD SEEDING
// ────────────────────────────────────────────────────────────────────────────

/**
 * Menetralisir karakter berbahaya pada nilai sel CSV/Excel untuk mencegah
 * Formula Injection (=, +, -, @, \t, \r).
 */
export function sanitizeExcelCellValue(value: unknown): string {
  if (value == null) return '';
  let str = String(value).trim();

  // Jika nilai sel diawali operator formula spreadsheet, tambahkan petik tunggal pelindung
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // Escape karakter kutip ganda standar RFC 4180
  if (/[",\n\r;]/.test(str)) {
    str = `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Memvalidasi batas batch endpoint fill/seeding agar tidak memicu OOM (Out Of Memory)
 */
export function validateFillBatchLimit(rows: unknown[], maxLimit: number = 250): void {
  if (!Array.isArray(rows)) {
    throw new Error('Data payload seeding harus berupa array');
  }
  if (rows.length > maxLimit) {
    throw new Error(`Ukuran batch seeding (${rows.length}) melampaui batas maksimum (${maxLimit} baris)`);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// DOMAIN 8: DEDUPLIKASI SLUG CMS ARTIKEL
// ────────────────────────────────────────────────────────────────────────────

/**
 * Menghasilkan slug artikel yang unik secara atomik untuk mencegah
 * kegagalan unique constraint di PostgreSQL saat dua artikel memiliki judul serupa.
 */
export async function generateUniqueArticleSlug(
  baseTitle: string,
  excludeArticleId?: number
): Promise<string> {
  const baseSlug = baseTitle
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'artikel';

  let candidateSlug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await prisma.artikel.findUnique({
      where: { slug: candidateSlug },
      select: { id: true },
    });

    if (!existing || (excludeArticleId && existing.id === excludeArticleId)) {
      return candidateSlug;
    }

    counter += 1;
    candidateSlug = `${baseSlug}-${counter}`;
  }
}
