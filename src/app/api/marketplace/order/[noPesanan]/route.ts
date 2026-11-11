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

    // Hitung subtotal produk dari akumulasi item
    const subtotalProduk = order.items.reduce((sum, item) => sum + item.subtotal, 0);

    // Ambil info paymentUrl jika disimpan di buktiBayar
    let paymentUrl: string | null = null;
    let paymentGatewayInfo: any = null;
    if (order.buktiBayar) {
      try {
        const parsed = JSON.parse(order.buktiBayar);
        if (parsed?.paymentUrl) {
          paymentUrl = parsed.paymentUrl;
          paymentGatewayInfo = parsed;
        }
      } catch {
        // buktiBayar mungkin url langsung
        if (order.buktiBayar.startsWith('http')) {
          paymentUrl = order.buktiBayar;
        }
      }
    }

    return NextResponse.json(
      {
        ok: true,
        data: {
          ...order,
          subtotalProduk,
          paymentUrl,
          paymentGatewayInfo,
        },
      },
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
