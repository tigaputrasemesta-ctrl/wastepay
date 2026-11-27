import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleCorsPreflight, buildCorsHeaders } from '@/lib/server/wastepay-backend-core-services';
import { resolveTenantByHost, buildTenantFilter } from '@/lib/tenant';
import { DEFAULT_MARKETPLACE_PRODUCTS } from '@/lib/default-products';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request);
}

export async function GET(request: Request) {
  try {
    const rawHost = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
    const tenantCtx = resolveTenantByHost(rawHost);

    const { searchParams } = new URL(request.url);
    const kategori = searchParams.get('kategori')?.trim();
    const search = searchParams.get('search')?.trim();

    const tenantFilter = buildTenantFilter(tenantCtx.tenant.id, tenantCtx.isPilot);
    const where: any = { aktif: true, ...tenantFilter };

    if (kategori && kategori !== 'semua') {
      where.kategori = kategori;
    }

    if (search) {
      where.OR = [
        { nama: { contains: search, mode: 'insensitive' } },
        { deskripsi: { contains: search, mode: 'insensitive' } },
      ];
    }

    let products = await prisma.produk.findMany({
      where,
      orderBy: { id: 'asc' },
    });

    // Fallback jika database produk belum terisi untuk tenant pilot UPS HERU
    if (products.length === 0 && tenantCtx.isPilot) {
      let filtered = DEFAULT_MARKETPLACE_PRODUCTS;
      if (kategori && kategori !== 'semua') {
        filtered = filtered.filter((p) => p.kategori === kategori);
      }
      if (search) {
        const s = search.toLowerCase();
        filtered = filtered.filter(
          (p) => p.nama.toLowerCase().includes(s) || p.deskripsi.toLowerCase().includes(s)
        );
      }
      products = filtered as any;
    }

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
