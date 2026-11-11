import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleCorsPreflight, buildCorsHeaders } from '@/lib/server/wastepay-backend-core-services';
import { createPayment, isDuitkuEnabled, getAppBaseUrl } from '@/lib/duitku';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ noPesanan: string }> }
) {
  try {
    const { noPesanan } = await params;
    const decodedNo = decodeURIComponent(noPesanan);

    const order = await prisma.marketplaceOrder.findUnique({
      where: { noPesanan: decodedNo },
    });

    if (!order) {
      return NextResponse.json(
        { ok: false, error: 'Pesanan tidak ditemukan' },
        { status: 404, headers: buildCorsHeaders(request) }
      );
    }

    if (order.status !== 'menunggu_pembayaran') {
      return NextResponse.json(
        { ok: false, error: `Pesanan sudah dalam status "${order.status}", tidak dapat dibayar lagi.` },
        { status: 400, headers: buildCorsHeaders(request) }
      );
    }

    if (!isDuitkuEnabled()) {
      return NextResponse.json(
        { ok: false, error: 'Layanan pembayaran online (Duitku) sedang dalam pemeliharaan. Silakan gunakan metode COD.' },
        { status: 503, headers: buildCorsHeaders(request) }
      );
    }

    // Cek apakah sudah ada paymentUrl yang valid
    if (order.buktiBayar) {
      try {
        const parsed = JSON.parse(order.buktiBayar);
        if (parsed?.paymentUrl) {
          return NextResponse.json(
            { ok: true, paymentUrl: parsed.paymentUrl, message: 'Menggunakan sesi pembayaran aktif' },
            { headers: buildCorsHeaders(request) }
          );
        }
      } catch {
        if (order.buktiBayar.startsWith('http')) {
          return NextResponse.json(
            { ok: true, paymentUrl: order.buktiBayar, message: 'Menggunakan sesi pembayaran aktif' },
            { headers: buildCorsHeaders(request) }
          );
        }
      }
    }

    // Buat sesi pembayaran baru ke Duitku
    const merchantOrderId = order.noPesanan.replace(/\//g, '-');
    const duitkuRes = await createPayment({
      orderId: merchantOrderId,
      amount: Math.round(order.totalHarga),
      paymentMethod: 'SP', // Default QRIS
      productDetails: `Marketplace UPS HERU - ${order.noPesanan}`.slice(0, 100),
      customerVaName: order.namaPembeli.trim().slice(0, 30),
      phoneNumber: order.noTelepon.trim(),
      email: order.email?.trim() || undefined,
      returnUrl: `${getAppBaseUrl()}/marketplace/order/${encodeURIComponent(order.noPesanan)}`,
    });

    if (!duitkuRes.paymentUrl) {
      return NextResponse.json(
        { ok: false, error: 'Duitku tidak mengembalikan link pembayaran.' },
        { status: 502, headers: buildCorsHeaders(request) }
      );
    }

    // Simpan ke buktiBayar
    await prisma.marketplaceOrder.update({
      where: { id: order.id },
      data: {
        metodeBayar: 'duitku_SP',
        buktiBayar: JSON.stringify({
          gateway: 'duitku',
          merchantOrderId,
          paymentUrl: duitkuRes.paymentUrl,
          reference: duitkuRes.reference || null,
          channel: 'SP',
          updatedAt: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json(
      { ok: true, paymentUrl: duitkuRes.paymentUrl, message: 'Sesi pembayaran berhasil dibuat' },
      { headers: buildCorsHeaders(request) }
    );
  } catch (error: any) {
    console.error('Error initiating Duitku payment for order:', error);
    return NextResponse.json(
      { ok: false, error: error?.message || 'Gagal memproses pembayaran Duitku' },
      { status: 500, headers: buildCorsHeaders(request) }
    );
  }
}
