import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleCorsPreflight, buildCorsHeaders } from '@/lib/server/wastepay-backend-core-services';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ noPesanan: string }> }
) {
  try {
    const { noPesanan } = await params;
    const decodedNo = decodeURIComponent(noPesanan);

    const order = await prisma.marketplaceOrder.findUnique({
      where: { noPesanan: decodedNo },
      include: {
        items: {
          include: {
            produk: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { ok: false, error: 'Pesanan tidak ditemukan' },
        { status: 404, headers: buildCorsHeaders(request) }
      );
    }

    return NextResponse.json(
      { ok: true, data: order },
      { headers: buildCorsHeaders(request) }
    );
  } catch (error) {
    console.error('Error fetching marketplace order detail:', error);
    return NextResponse.json(
      { ok: false, error: 'Gagal memuat detail pesanan' },
      { status: 500, headers: buildCorsHeaders(request) }
    );
  }
}
