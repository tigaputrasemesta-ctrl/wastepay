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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status')?.trim() || '';
    const search = searchParams.get('search')?.trim() || '';
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 100);
    const page = Math.max(Number(searchParams.get('page')) || 1, 1);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status && status !== 'semua') {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { noOrder: { contains: search, mode: 'insensitive' } },
        { namaPemesan: { contains: search, mode: 'insensitive' } },
        { noTelepon: { contains: search, mode: 'insensitive' } },
        { alamat: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, orders] = await Promise.all([
      prisma.pesananPickup.count({ where }),
      prisma.pesananPickup.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          kategoriPickup: true,
          petugas: {
            select: { id: true, nama: true, noTelepon: true },
          },
          kendaraan: {
            select: { id: true, nama: true, jenis: true, platNomor: true },
          },
        },
      }),
    ]);

    return NextResponse.json(
      {
        ok: true,
        data: orders,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
      { headers: buildCorsHeaders(request) }
    );
  } catch (error) {
    console.error('Error fetching admin pickup orders:', error);
    return NextResponse.json(
      { ok: false, error: 'Gagal mengambil data pesanan pickup.' },
      { status: 500, headers: buildCorsHeaders(request) }
    );
  }
}
