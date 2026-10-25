import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { getPengaturanNumber, getPengaturanString, setPengaturan } from '@/lib/pengaturan';
import { updateTunggakan } from '@/lib/tagihan';
import { hitungRincian } from '@/lib/invoice';
import {
  buildCorsHeaders,
  handleCorsPreflight,
  assertAuthorizedRole,
  getJakartaDateBounds,
  resolveOfficerStatusHariIni,
  extractTail10Digits,
  maskAddressForPublicView,
  checkIpRateLimit,
  getLightweightMapPins,
  sanitizeExcelCellValue,
  validateFillBatchLimit,
  generateUniqueArticleSlug,
} from './wastepay-backend-core-services';

/**
 * ============================================================================
 * WASTEPAY API ROUTE HANDLERS — MODULAR CONTROLLER LAYER
 * Lokasi File : src/lib/server/wastepay-api-route-handlers.ts
 *
 * Menghubungkan seluruh fungsi backend hardened ke endpoint Next.js App Router:
 * - /api/pengaturan
 * - /api/absensi
 * - /api/pembayaran/search & /api/publik/tagihan
 * - /api/peta
 * - /api/pelanggan/export
 * - /api/fill
 * - /api/admin/artikel & /api/artikel
 * ============================================================================
 */

// ────────────────────────────────────────────────────────────────────────────
// 1. HANDLER /api/pengaturan (AUTH, RBAC & CORS ANDROID APK)
// ────────────────────────────────────────────────────────────────────────────

export async function handlePengaturanGet(request: Request): Promise<NextResponse> {
  const session = await getSession(request);
  const rbac = assertAuthorizedRole(session, ['superadmin', 'admin']);
  if (!rbac.authorized) {
    return NextResponse.json({ error: rbac.error }, { status: rbac.status, headers: buildCorsHeaders(request) });
  }

  const pajakDaerahRate = await getPengaturanNumber('PAJAK_DAERAH_RATE', 0);
  const dendaRate = await getPengaturanNumber('DENDA_KETERLAMBATAN_RATE', 0);
  const batasBulanStop = await getPengaturanNumber('BATAS_BULAN_STOP_ANGKUT', 2);
  const biayaAdmin = await getPengaturanNumber('BIAYA_ADMIN', 1500);
  const waTemplateTagihan = await getPengaturanString(
    'WA_TEMPLATE_TAGIHAN',
    'Halo Bpk/Ibu *{nama}* ({kode_pelanggan}),\n\nBerikut rincian tagihan retribusi sampah CV Tiga Putra Semesta (UPS HERU) untuk periode *{bulan}*:\n\n• Tarif Pokok: *{nominal_pokok}*\n• Pajak Daerah ({pajak_persen}%): *{pajak_daerah}*\n• Denda Keterlambatan: *{denda}*\n----------------------------------\n*Total Tagihan: {total_tagihan}*\n\nJatuh tempo: *{jatuh_tempo}*\nLink pembayaran & rincian: {link_pembayaran}\n\nTerima kasih atas partisipasi Anda dalam menjaga kebersihan lingkungan.'
  );

  return NextResponse.json(
    {
      PAJAK_DAERAH_RATE: pajakDaerahRate,
      DENDA_KETERLAMBATAN_RATE: dendaRate,
      BATAS_BULAN_STOP_ANGKUT: batasBulanStop,
      BIAYA_ADMIN: biayaAdmin,
      WA_TEMPLATE_TAGIHAN: waTemplateTagihan,
    },
    { headers: buildCorsHeaders(request) }
  );
}

export async function handlePengaturanPost(request: Request): Promise<NextResponse> {
  const session = await getSession(request);
  const rbac = assertAuthorizedRole(session, ['superadmin', 'admin']);
  if (!rbac.authorized) {
    return NextResponse.json({ error: rbac.error }, { status: rbac.status, headers: buildCorsHeaders(request) });
  }

  try {
    const body = await request.json();
    if (typeof body.PAJAK_DAERAH_RATE !== 'undefined') {
      await setPengaturan('PAJAK_DAERAH_RATE', String(body.PAJAK_DAERAH_RATE));
    }
    if (typeof body.DENDA_KETERLAMBATAN_RATE !== 'undefined') {
      await setPengaturan('DENDA_KETERLAMBATAN_RATE', String(body.DENDA_KETERLAMBATAN_RATE));
    }
    if (typeof body.BATAS_BULAN_STOP_ANGKUT !== 'undefined') {
      await setPengaturan('BATAS_BULAN_STOP_ANGKUT', String(body.BATAS_BULAN_STOP_ANGKUT));
    }
    if (typeof body.BIAYA_ADMIN !== 'undefined') {
      await setPengaturan('BIAYA_ADMIN', String(body.BIAYA_ADMIN));
    }
    if (typeof body.WA_TEMPLATE_TAGIHAN !== 'undefined') {
      await setPengaturan('WA_TEMPLATE_TAGIHAN', String(body.WA_TEMPLATE_TAGIHAN));
    }

    return NextResponse.json({ success: true }, { headers: buildCorsHeaders(request) });
  } catch {
    return NextResponse.json(
      { error: 'Gagal memperbarui pengaturan sistem' },
      { status: 500, headers: buildCorsHeaders(request) }
    );
  }
}

// ────────────────────────────────────────────────────────────────────────────
// 2. HANDLER /api/absensi (ZONA WAKTU ASIA/JAKARTA & DETERMINISTIK UTC+7)
// ────────────────────────────────────────────────────────────────────────────

export async function handleAbsensiGet(request: Request): Promise<NextResponse> {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: buildCorsHeaders(request) });
  }

  const petugas = await prisma.petugas.findUnique({ where: { userId: session.id } });
  if (session.role.toLowerCase() === 'petugas' && !petugas) {
    return NextResponse.json(
      { error: 'Data profil petugas tidak ditemukan' },
      { status: 400, headers: buildCorsHeaders(request) }
    );
  }

  const where = session.role.toLowerCase() === 'petugas' ? { petugasId: petugas?.id } : {};

  const absensiList = await prisma.absensi.findMany({
    where,
    orderBy: { waktuMasuk: 'desc' },
    take: 50,
    include: {
      petugas: { select: { nama: true, jabatan: true } },
    },
  });

  // Hitung status hari ini menggunakan rentang waktu Asia/Jakarta (WIB)
  let statusHariIniRecord: any = null;
  let statusHariIni = 'BELUM_ABSEN';

  if (petugas) {
    const { startOfDayUtc, endOfDayUtc } = getJakartaDateBounds(new Date());

    statusHariIniRecord = await prisma.absensi.findFirst({
      where: {
        petugasId: petugas.id,
        waktuMasuk: { gte: startOfDayUtc, lte: endOfDayUtc },
      },
    });

    statusHariIni = resolveOfficerStatusHariIni(statusHariIniRecord);
  }

  return NextResponse.json(
    {
      absensi: absensiList,
      statusHariIni,
      statusHariIniRecord,
    },
    { headers: buildCorsHeaders(request) }
  );
}

export async function handleAbsensiPost(request: Request): Promise<NextResponse> {
  const session = await getSession(request);
  if (!session || session.role.toLowerCase() !== 'petugas') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: buildCorsHeaders(request) });
  }

  const petugas = await prisma.petugas.findUnique({ where: { userId: session.id } });
  if (!petugas) {
    return NextResponse.json(
      { error: 'Data petugas tidak terdaftar di sistem' },
      { status: 400, headers: buildCorsHeaders(request) }
    );
  }

  const body = await request.json();
  const action = body.action || body.tipe; // 'masuk' | 'selesai'

  // Menolak payload foto Base64 mentah > 150 KB untuk mencegah pemborosan memori Vercel & Supabase
  const rawPhoto = body.foto || body.fotoBukti || body.fotoMasuk || body.fotoSelesai;
  if (rawPhoto && typeof rawPhoto === 'string') {
    const rawLen = rawPhoto.length;
    // Base64 encoding menambah ~33% overhead, jika string Base64 > 200.000 karakter (~150 KB binary)
    if (rawLen > 200000) {
      return NextResponse.json(
        { error: 'Ukuran foto melebihi batas 150 KB. Gunakan kompresi WebP native sebelum mengirim.' },
        { status: 413, headers: buildCorsHeaders(request) }
      );
    }
  }

  const lokasiData = JSON.stringify({
    lat: body.latitude,
    lng: body.longitude,
    akurasi: body.accuracy || body.akurasi || null,
  });

  // Batas hari akurat UTC+7 WIB
  const { startOfDayUtc, endOfDayUtc } = getJakartaDateBounds(new Date());

  if (action === 'masuk') {
    const existing = await prisma.absensi.findFirst({
      where: {
        petugasId: petugas.id,
        waktuMasuk: { gte: startOfDayUtc, lte: endOfDayUtc },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Anda sudah melakukan absensi masuk untuk hari ini' },
        { status: 400, headers: buildCorsHeaders(request) }
      );
    }

    const created = await prisma.absensi.create({
      data: {
        petugasId: petugas.id,
        lokasiMasuk: lokasiData,
        status: 'hadir',
      },
    });

    return NextResponse.json({ ok: true, absensi: created }, { headers: buildCorsHeaders(request) });
  }

  if (action === 'selesai') {
    const existing = await prisma.absensi.findFirst({
      where: {
        petugasId: petugas.id,
        waktuMasuk: { gte: startOfDayUtc, lte: endOfDayUtc },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Belum ada catatan absen masuk hari ini' },
        { status: 400, headers: buildCorsHeaders(request) }
      );
    }

    if (existing.waktuSelesai) {
      return NextResponse.json(
        { error: 'Anda sudah melakukan absensi selesai hari ini' },
        { status: 400, headers: buildCorsHeaders(request) }
      );
    }

    const updated = await prisma.absensi.update({
      where: { id: existing.id },
      data: {
        waktuSelesai: new Date(),
        lokasiSelesai: lokasiData,
      },
    });

    return NextResponse.json({ ok: true, absensi: updated }, { headers: buildCorsHeaders(request) });
  }

  return NextResponse.json(
    { error: "Aksi tidak dikenali (gunakan 'masuk' atau 'selesai')" },
    { status: 400, headers: buildCorsHeaders(request) }
  );
}

// ────────────────────────────────────────────────────────────────────────────
// 3. HANDLER PENCARIAN PEMBAYARAN VIA WHATSAPP (RATE LIMIT & MASKING ALAMAT)
// ────────────────────────────────────────────────────────────────────────────

export async function handlePublicSearchPayment(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const rawQuery = searchParams.get('kode') || searchParams.get('noWhatsapp') || searchParams.get('search') || '';
  const trimmed = rawQuery.trim();

  // Rate Limiting IP: Maksimal 15 request per menit
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';

  const rateLimit = await checkIpRateLimit(ip, 15, 60000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: `Terlalu banyak permintaan pencarian. Silakan coba kembali dalam ${rateLimit.retryAfter} detik.` },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimit.retryAfter),
          ...buildCorsHeaders(request),
        },
      }
    );
  }

  if (!trimmed) {
    return NextResponse.json(
      { error: 'Nomor WhatsApp atau Kode Pelanggan wajib diisi' },
      { status: 400, headers: buildCorsHeaders(request) }
    );
  }

  await updateTunggakan();

  // Ekstrak 10 digit terakhir untuk pencocokan toleran awalan 08 / 628 / +628
  const tail10 = extractTail10Digits(trimmed);

  const pelanggan = await prisma.pelanggan.findFirst({
    where: {
      deletedAt: null,
      OR: [
        { kodePelanggan: trimmed },
        { noTelepon: trimmed },
        ...(tail10.length >= 8 ? [{ noTelepon: { contains: tail10 } }] : []),
      ],
    },
    select: {
      id: true,
      nama: true,
      kodePelanggan: true,
      alamat: true,
      kategori: true,
      status: true,
      deletedAt: true,
    },
  });

  if (!pelanggan || pelanggan.deletedAt) {
    return NextResponse.json(
      {
        error:
          'Data pelanggan tidak ditemukan. Pastikan nomor WhatsApp sudah benar dan status pendaftaran telah disetujui.',
      },
      { status: 404, headers: buildCorsHeaders(request) }
    );
  }

  // Ambil daftar tagihan
  const tagihanList = await prisma.tagihan.findMany({
    where: { pelangganId: pelanggan.id, deletedAt: null },
    orderBy: [{ tahun: 'desc' }, { bulan: 'desc' }],
    select: {
      id: true,
      noInvoice: true,
      bulan: true,
      tahun: true,
      jumlah: true,
      denda: true,
      status: true,
      jatuhTempo: true,
    },
  });

  const tagihanWithRincian = tagihanList.map((t) => ({
    ...t,
    total: hitungRincian(t.jumlah, t.denda || 0).total,
  }));

  const unpaidCount = tagihanList.filter((t) => t.status === 'belum_bayar' || t.status === 'tunggakan').length;
  const totalUnpaidNominal = tagihanWithRincian
    .filter((t) => t.status === 'belum_bayar' || t.status === 'tunggakan')
    .reduce((acc, cur) => acc + cur.total, 0);

  const analysisReport = {
    totalUnpaidNominal,
    unpaidMonthsCount: unpaidCount,
    isEligibleForPickup: unpaidCount < 2,
    statusOperasional: unpaidCount < 2 ? 'Lancar / Terjadwal' : 'Ditangguhkan Sementara (Menunggak)',
  };

  return NextResponse.json(
    {
      pelanggan: {
        nama: pelanggan.nama,
        kodePelanggan: pelanggan.kodePelanggan,
        alamat: maskAddressForPublicView(pelanggan.alamat), // ALAMAT DISAMARKAN UNTUK PUBLIK
        kategori: pelanggan.kategori,
      },
      tagihan: tagihanWithRincian,
      analysisReport,
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        ...buildCorsHeaders(request),
      },
    }
  );
}

// ────────────────────────────────────────────────────────────────────────────
// 4. HANDLER /api/peta (PROYEKSI RINGAN SQL TANPA FOTO RUMAH)
// ────────────────────────────────────────────────────────────────────────────

export async function handlePetaPinsGet(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const zonaIdParam = searchParams.get('zonaId');
  const zonaId = zonaIdParam ? parseInt(zonaIdParam, 10) : null;

  try {
    const pins = await getLightweightMapPins(isNaN(zonaId || NaN) ? null : zonaId);

    return NextResponse.json(pins, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        ...buildCorsHeaders(request),
      },
    });
  } catch (err) {
    console.error('[API Peta Pins Error]:', err);
    return NextResponse.json(
      { error: 'Gagal memuat titik peta pelanggan' },
      { status: 500, headers: buildCorsHeaders(request) }
    );
  }
}

// ────────────────────────────────────────────────────────────────────────────
// 5. HANDLER /api/pelanggan/export (RBAC & SANITASI FORMULA INJECTION)
// ────────────────────────────────────────────────────────────────────────────

export async function handlePelangganExportGet(request: Request): Promise<Response> {
  const session = await getSession(request);
  const rbac = assertAuthorizedRole(session, ['superadmin', 'admin', 'kasir']);
  if (!rbac.authorized) {
    return NextResponse.json({ error: rbac.error }, { status: rbac.status, headers: buildCorsHeaders(request) });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const kelurahanId = searchParams.get('kelurahanId');

  const whereClause: any = { deletedAt: null };
  if (status) whereClause.status = status;
  if (kelurahanId && !isNaN(parseInt(kelurahanId, 10))) {
    whereClause.kelurahanId = parseInt(kelurahanId, 10);
  }

  const pelangganList = await prisma.pelanggan.findMany({
    where: whereClause,
    include: {
      kelurahan: true,
      wilayah: { include: { zona: true } },
    },
    orderBy: [{ kelurahanId: 'asc' }, { nama: 'asc' }],
  });

  const headers = [
    'No',
    'Kode Pelanggan',
    'Nama Pelanggan',
    'No Telepon',
    'Alamat',
    'RT/RW',
    'Kelurahan',
    'Zona',
    'Kategori',
    'Status',
    'Latitude',
    'Longitude',
  ];

  const csvRows: string[] = [headers.join(',')];

  pelangganList.forEach((p, idx) => {
    const row = [
      idx + 1,
      sanitizeExcelCellValue(p.kodePelanggan),
      sanitizeExcelCellValue(p.nama),
      sanitizeExcelCellValue(p.noTelepon),
      sanitizeExcelCellValue(p.alamat),
      sanitizeExcelCellValue(p.rtRw || ''),
      sanitizeExcelCellValue(p.kelurahan?.nama || ''),
      sanitizeExcelCellValue(p.wilayah?.zona?.nama || ''),
      sanitizeExcelCellValue(p.kategori),
      sanitizeExcelCellValue(p.status),
      p.latitude || '',
      p.longitude || '',
    ];
    csvRows.push(row.join(','));
  });

  const csvContent = '\uFEFF' + csvRows.join('\r\n');

  return new Response(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="data-pelanggan-wastepay-${new Date().toISOString().slice(0, 10)}.csv"`,
      ...buildCorsHeaders(request),
    },
  });
}

// ────────────────────────────────────────────────────────────────────────────
// 6. HANDLER /api/fill (GUARD KHUSUS SUPERADMIN DENGAN BATCH LIMIT 250)
// ────────────────────────────────────────────────────────────────────────────

export async function handleProtectedFillPost(request: Request): Promise<NextResponse> {
  const session = await getSession(request);
  const rbac = assertAuthorizedRole(session, ['superadmin']);
  if (!rbac.authorized) {
    return NextResponse.json({ error: rbac.error }, { status: rbac.status, headers: buildCorsHeaders(request) });
  }

  try {
    const body = await request.json();
    const rows = body.data || body.pelanggan || body;

    // Batasi maksimum 250 baris per batch untuk mencegah OOM dan timeout Vercel
    validateFillBatchLimit(rows, 250);

    let insertedCount = 0;
    await prisma.$transaction(async (tx) => {
      for (const item of rows) {
        if (!item.nama || !item.noTelepon) continue;
        await tx.pelanggan.upsert({
          where: { noTelepon: item.noTelepon },
          update: {
            nama: item.nama,
            alamat: item.alamat || 'Alamat Belum Diisi',
            kategori: item.kategori || 'level_1',
          },
          create: {
            nama: item.nama,
            noTelepon: item.noTelepon,
            alamat: item.alamat || 'Alamat Belum Diisi',
            kodePelanggan: item.kodePelanggan || `WP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            kategori: item.kategori || 'level_1',
            status: item.status || 'calon',
          },
        });
        insertedCount++;
      }
    });

    return NextResponse.json(
      { success: true, message: `Berhasil memproses ${insertedCount} data pelanggan batch.` },
      { headers: buildCorsHeaders(request) }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Terjadi kesalahan saat memproses data seeding' },
      { status: 400, headers: buildCorsHeaders(request) }
    );
  }
}

// ────────────────────────────────────────────────────────────────────────────
// 7. HANDLER CMS ARTIKEL (PEMISAHAN ADMIN & PUBLIK DENGAN DEDUPLIKASI SLUG)
// ────────────────────────────────────────────────────────────────────────────

export async function handleAdminArtikelPost(request: Request): Promise<NextResponse> {
  const session = await getSession(request);
  const rbac = assertAuthorizedRole(session, ['superadmin', 'admin']);
  if (!rbac.authorized) {
    return NextResponse.json({ error: rbac.error }, { status: rbac.status, headers: buildCorsHeaders(request) });
  }

  try {
    const body = await request.json();
    if (!body.judul || !body.isi) {
      return NextResponse.json(
        { error: 'Judul dan isi artikel wajib diisi' },
        { status: 400, headers: buildCorsHeaders(request) }
      );
    }

    const uniqueSlug = await generateUniqueArticleSlug(body.judul);

    const article = await prisma.artikel.create({
      data: {
        judul: body.judul,
        slug: uniqueSlug,
        isi: body.isi,
        kategori: body.kategori || 'edukasi',
        gambar: body.gambar || null,
        diterbitkan: Boolean(body.diterbitkan),
        penulisId: session?.id || null,
      },
    });

    return NextResponse.json({ success: true, article }, { status: 201, headers: buildCorsHeaders(request) });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Gagal menyimpan artikel baru' },
      { status: 500, headers: buildCorsHeaders(request) }
    );
  }
}

export async function handlePublicArtikelGet(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  try {
    if (slug) {
      const article = await prisma.artikel.findFirst({
        where: { slug, diterbitkan: true },
        include: { penulis: { select: { nama: true } } },
      });

      if (!article) {
        return NextResponse.json({ error: 'Artikel tidak ditemukan' }, { status: 404, headers: buildCorsHeaders(request) });
      }

      return NextResponse.json(article, {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
          ...buildCorsHeaders(request),
        },
      });
    }

    const articles = await prisma.artikel.findMany({
      where: { diterbitkan: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        slug: true,
        judul: true,
        kategori: true,
        gambar: true,
        createdAt: true,
      },
    });

    return NextResponse.json(articles, {
      headers: {
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=86400',
        ...buildCorsHeaders(request),
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Gagal memuat artikel' },
      { status: 500, headers: buildCorsHeaders(request) }
    );
  }
}
