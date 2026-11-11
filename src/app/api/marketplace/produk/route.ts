import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleCorsPreflight, buildCorsHeaders } from '@/lib/server/wastepay-backend-core-services';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const kategori = searchParams.get('kategori')?.trim();
    const search = searchParams.get('search')?.trim();

    const where: any = { aktif: true };

    if (kategori && kategori !== 'semua') {
      where.kategori = kategori;
    }

    if (search) {
      where.OR = [
        { nama: { contains: search, mode: 'insensitive' } },
        { deskripsi: { contains: search, mode: 'insensitive' } },
      ];
    }

    const products = await prisma.produk.findMany({
      where,
      orderBy: { id: 'asc' },
    });

    return NextResponse.json(
      { ok: true, data: products },
      { headers: buildCorsHeaders(request) }
    );
  } catch (error) {
    console.error('Error fetching marketplace products:', error);
    return NextResponse.json(
      { ok: false, error: 'Gagal memuat produk marketplace' },
      { status: 500, headers: buildCorsHeaders(request) }
    );
  }
}
