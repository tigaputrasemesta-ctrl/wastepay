import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleCorsPreflight, buildCorsHeaders } from '@/lib/server/wastepay-backend-core-services';
import { resolveTenantByHost, buildTenantFilter } from '@/lib/tenant';
import { DEFAULT_MARKETPLACE_PRODUCTS } from '@/lib/default-products';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rawHost = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
    const tenantCtx = resolveTenantByHost(rawHost);

    const { id } = await params;
    const isNum = !isNaN(Number(id));

    const tenantFilter = buildTenantFilter(tenantCtx.tenant.id, tenantCtx.isPilot);
    const where: any = isNum ? { id: Number(id), ...tenantFilter } : { slug: id, ...tenantFilter };

    let product = await prisma.produk.findFirst({
      where,
    });

    // Fallback ke default products jika belum ada di database
    if (!product && tenantCtx.isPilot) {
      const fallback = DEFAULT_MARKETPLACE_PRODUCTS.find(
        (p) => (isNum && p.id === Number(id)) || p.slug === id
      );
      if (fallback) {
        product = fallback as any;
      }
    }

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
