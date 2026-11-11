import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { assertAuthorizedRole, handleCorsPreflight, buildCorsHeaders } from '@/lib/server/wastepay-backend-core-services';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request);
}

export async function GET(request: Request) {
  try {
    const session = await getSession(request);
    const rbac = assertAuthorizedRole(session, ['superadmin', 'admin', 'kasir']);
    if (!rbac.authorized) {
      return NextResponse.json({ error: rbac.error }, { status: rbac.status, headers: buildCorsHeaders(request) });
    }

    const products = await prisma.produk.findMany({
      orderBy: { id: 'asc' },
    });

    return NextResponse.json(
      { ok: true, data: products },
      { headers: buildCorsHeaders(request) }
    );
  } catch (error) {
    console.error('Error fetching admin products:', error);
    return NextResponse.json(
      { ok: false, error: 'Gagal memuat produk' },
      { status: 500, headers: buildCorsHeaders(request) }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession(request);
    const rbac = assertAuthorizedRole(session, ['superadmin', 'admin']);
    if (!rbac.authorized) {
      return NextResponse.json({ error: rbac.error }, { status: rbac.status, headers: buildCorsHeaders(request) });
    }

    const body = await request.json();
    const { nama, slug, kategori, harga, stok, satuan, beratGram, deskripsi, foto, aktif } = body;

    if (!nama || !harga || !deskripsi) {
      return NextResponse.json(
        { ok: false, error: 'Nama, harga, dan deskripsi produk wajib diisi' },
        { status: 400, headers: buildCorsHeaders(request) }
      );
    }

    const finalSlug = slug
      ? slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')
      : nama.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString().slice(-4);

    const product = await prisma.produk.create({
      data: {
        nama: nama.trim(),
        slug: finalSlug,
        kategori: kategori || 'pupuk_kompos',
        harga: Number(harga),
        stok: Number(stok) || 0,
        satuan: satuan || 'sak',
        beratGram: Number(beratGram) || 1000,
        deskripsi: deskripsi.trim(),
        foto: foto || null,
        aktif: aktif !== undefined ? Boolean(aktif) : true,
      },
    });

    return NextResponse.json(
      { ok: true, message: 'Produk berhasil ditambahkan', data: product },
      { status: 201, headers: buildCorsHeaders(request) }
    );
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { ok: false, error: 'Gagal menambahkan produk' },
      { status: 500, headers: buildCorsHeaders(request) }
    );
  }
}
