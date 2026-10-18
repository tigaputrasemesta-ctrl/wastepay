import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { DEFAULT_ARTIKEL, getArticleCoverImage } from '@/lib/default-articles';
import {
  handleCorsPreflight,
  buildCorsHeaders,
  generateUniqueArticleSlug,
} from '@/lib/server/wastepay-backend-core-services';
import { handlePublicArtikelGet } from '@/lib/server/wastepay-api-route-handlers';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request);
}

export async function GET(request: Request) {
  const session = await getSession(request);
  const isAdmin =
    session &&
    (session.role.toLowerCase() === 'admin' || session.role.toLowerCase() === 'superadmin');

  // Jika pengunjung publik (tanpa login admin), layani artikel publik dengan ISR cache
  if (!isAdmin) {
    return handlePublicArtikelGet(request);
  }

  // Jika admin, layani seluruh artikel (termasuk draf/belum diterbitkan) untuk manajemen CMS
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search')?.trim() || '';

  const where = search
    ? {
        OR: [
          { judul: { contains: search, mode: 'insensitive' as const } },
          { isi: { contains: search, mode: 'insensitive' as const } },
        ],
      }
    : {};

  try {
    let validPenulisId: number | null = null;
    if (session?.id) {
      const u = await prisma.user
        .findUnique({
          where: { id: session.id },
          select: { id: true },
        })
        .catch(() => null);
      if (u) validPenulisId = u.id;
    }

    // Pastikan artikel SEO unggulan tersedia di database saat inisialisasi awal
    if (!search) {
      for (const item of DEFAULT_ARTIKEL) {
        const existing = await prisma.artikel
          .findUnique({
            where: { slug: item.slug },
            select: { id: true, gambar: true },
          })
          .catch(() => null);

        if (!existing) {
          await prisma.artikel
            .create({
              data: {
                slug: item.slug,
                judul: item.judul,
                isi: item.isi,
                kategori: item.kategori,
                gambar: item.gambar,
                diterbitkan: item.diterbitkan,
                penulisId: validPenulisId,
              },
            })
            .catch(() => null);
        } else if (!existing.gambar && item.gambar) {
          await prisma.artikel
            .update({
              where: { id: existing.id },
              data: { gambar: item.gambar },
            })
            .catch(() => null);
        }
      }
    }

    const artikel = await prisma.artikel.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { penulis: { select: { nama: true } } },
    });

    const enriched = artikel.map((a) => ({
      ...a,
      gambar: getArticleCoverImage(a.gambar, a.kategori),
    }));

    return NextResponse.json(enriched, { headers: buildCorsHeaders(request) });
  } catch {
    const enrichedDefault = DEFAULT_ARTIKEL.map((a) => ({
      ...a,
      gambar: getArticleCoverImage(a.gambar, a.kategori),
    }));
    return NextResponse.json(enrichedDefault, { headers: buildCorsHeaders(request) });
  }
}

export async function POST(request: Request) {
  const session = await getSession(request);
  if (!session || (session.role.toLowerCase() !== 'admin' && session.role.toLowerCase() !== 'superadmin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403, headers: buildCorsHeaders(request) });
  }

  try {
    const body = await request.json();

    // Dukungan 1-click sync / re-seed 5 artikel SEO unggulan
    if (body.action === 'sync') {
      let validPenulisId: number | null = null;
      if (session?.id) {
        const u = await prisma.user
          .findUnique({
            where: { id: session.id },
            select: { id: true },
          })
          .catch(() => null);
        if (u) validPenulisId = u.id;
      }

      let count = 0;
      for (const item of DEFAULT_ARTIKEL) {
        await prisma.artikel
          .upsert({
            where: { slug: item.slug },
            create: {
              slug: item.slug,
              judul: item.judul,
              isi: item.isi,
              kategori: item.kategori,
              gambar: item.gambar,
              diterbitkan: true,
              penulisId: validPenulisId,
            },
            update: {
              judul: item.judul,
              isi: item.isi,
              kategori: item.kategori,
              gambar: item.gambar,
              diterbitkan: true,
            },
          })
          .catch(() => null);
        count++;
      }

      return NextResponse.json({ ok: true, synced: count }, { headers: buildCorsHeaders(request) });
    }

    const { judul, isi, kategori, gambar, diterbitkan } = body;
    const judulTrimmed = String(judul || '').trim();
    const isiTrimmed = String(isi || '').trim();

    if (!judulTrimmed || !isiTrimmed) {
      return NextResponse.json(
        { error: 'Judul dan isi artikel wajib diisi' },
        { status: 400, headers: buildCorsHeaders(request) }
      );
    }

    // Gunakan fungsi deduplikasi slug atomik dari core-services
    const slug = await generateUniqueArticleSlug(judulTrimmed);

    let validPenulisId: number | null = null;
    if (session?.id) {
      const u = await prisma.user.findUnique({
        where: { id: session.id },
        select: { id: true },
      });
      if (u) validPenulisId = u.id;
    }

    const assignedGambar =
      gambar && typeof gambar === 'string' && gambar.trim()
        ? gambar.trim()
        : getArticleCoverImage(null, kategori);

    const artikel = await prisma.artikel.create({
      data: {
        judul: judulTrimmed,
        slug,
        isi: isiTrimmed,
        kategori: kategori || 'edukasi',
        gambar: assignedGambar,
        diterbitkan: Boolean(diterbitkan),
        penulisId: validPenulisId,
      },
    });

    return NextResponse.json({ ok: true, data: artikel }, { headers: buildCorsHeaders(request) });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Gagal menyimpan artikel: ' + error.message },
      { status: 500, headers: buildCorsHeaders(request) }
    );
  }
}
