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

    let foto = product.foto;
    if (foto && (foto.includes("photo-1585336261026-699708785089") || foto.includes("1585336261026"))) {
      foto = "https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?auto=format&fit=crop&w=800&q=80";
    }
    const sanitizedProduct = { ...product, foto };

    return NextResponse.json(
      { ok: true, data: sanitizedProduct },
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
