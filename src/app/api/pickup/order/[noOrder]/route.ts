import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleCorsPreflight, buildCorsHeaders } from '@/lib/server/wastepay-backend-core-services';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ noOrder: string }> }
) {
  try {
    const { noOrder } = await params;
    const decodedNoOrder = decodeURIComponent(noOrder);

    const order = await prisma.pesananPickup.findUnique({
      where: { noOrder: decodedNoOrder },
      include: {
        kategoriPickup: true,
        petugas: {
          select: {
            id: true,
            nama: true,
            noTelepon: true,
            foto: true,
          },
        },
        kendaraan: {
          select: {
            id: true,
            nama: true,
            jenis: true,
            platNomor: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { ok: false, error: 'Pesanan penjemputan tidak ditemukan.' },
        { status: 404, headers: buildCorsHeaders(request) }
      );
    }

    return NextResponse.json(
      { ok: true, data: order },
      { headers: buildCorsHeaders(request) }
    );
  } catch (error) {
    console.error('Error fetching pickup order detail:', error);
    return NextResponse.json(
      { ok: false, error: 'Gagal memuat detail pesanan.' },
      { status: 500, headers: buildCorsHeaders(request) }
    );
  }
}
