import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleCorsPreflight, buildCorsHeaders } from '@/lib/server/wastepay-backend-core-services';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const isNum = !isNaN(Number(id));

    const product = await prisma.produk.findFirst({
      where: isNum ? { id: Number(id) } : { slug: id },
    });

    if (!product) {
      return NextResponse.json(
        { ok: false, error: 'Produk tidak ditemukan' },
        { status: 404, headers: buildCorsHeaders(request) }
      );
    }

    return NextResponse.json(
      { ok: true, data: product },
      { headers: buildCorsHeaders(request) }
    );
  } catch (error) {
    console.error('Error fetching product detail:', error);
    return NextResponse.json(
      { ok: false, error: 'Gagal memuat detail produk' },
      { status: 500, headers: buildCorsHeaders(request) }
    );
  }
}
