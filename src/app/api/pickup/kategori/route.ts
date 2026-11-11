import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleCorsPreflight, buildCorsHeaders } from '@/lib/server/wastepay-backend-core-services';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request);
}

export async function GET(request: Request) {
  try {
    const categories = await prisma.kategoriPickup.findMany({
      where: { aktif: true },
      orderBy: { id: 'asc' },
    });

    return NextResponse.json({ ok: true, data: categories }, { headers: buildCorsHeaders(request) });
  } catch (error) {
    console.error('Error fetching kategori pickup:', error);
    return NextResponse.json(
      { ok: false, error: 'Gagal memuat kategori pickup' },
      { status: 500, headers: buildCorsHeaders(request) }
    );
  }
}
