import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { assertAuthorizedRole, handleCorsPreflight, buildCorsHeaders } from '@/lib/server/wastepay-backend-core-services';
import { handleAdminArtikelPost } from '@/lib/server/wastepay-api-route-handlers';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request);
}

export async function GET(request: Request) {
  const session = await getSession(request);
  const rbac = assertAuthorizedRole(session, ['superadmin', 'admin']);
  if (!rbac.authorized) {
    return NextResponse.json({ error: rbac.error }, { status: rbac.status, headers: buildCorsHeaders(request) });
  }

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

  const articles = await prisma.artikel.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { penulis: { select: { nama: true } } },
  });

  return NextResponse.json(articles, { headers: buildCorsHeaders(request) });
}

export async function POST(request: Request) {
  return handleAdminArtikelPost(request);
}
