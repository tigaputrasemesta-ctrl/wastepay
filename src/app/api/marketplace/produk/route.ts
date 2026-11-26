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

    const sanitizedProducts = products.map((p) => {
      let foto = p.foto;
      if (foto && (foto.includes("photo-1585336261026-699708785089") || foto.includes("1585336261026"))) {
        foto = "https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?auto=format&fit=crop&w=800&q=80";
      }
      return { ...p, foto };
    });

    return NextResponse.json(
      { ok: true, data: sanitizedProducts },
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
