import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { assertAuthorizedRole, handleCorsPreflight, buildCorsHeaders } from '@/lib/server/wastepay-backend-core-services';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession(request);
    const rbac = assertAuthorizedRole(session, ['superadmin', 'admin', 'kasir']);
    if (!rbac.authorized) {
      return NextResponse.json({ error: rbac.error }, { status: rbac.status, headers: buildCorsHeaders(request) });
    }

    const { id } = await params;
    const orderId = Number(id);
    if (isNaN(orderId)) {
      return NextResponse.json({ ok: false, error: 'ID tidak valid' }, { status: 400 });
    }

    const body = await request.json();
    const { status, kurirNama, noResi, buktiBayar, tanggalBayar } = body;

    const data: any = {};
    if (status !== undefined) data.status = status;
    if (kurirNama !== undefined) data.kurirNama = kurirNama;
    if (noResi !== undefined) data.noResi = noResi;
    if (buktiBayar !== undefined) data.buktiBayar = buktiBayar;
    if (tanggalBayar !== undefined) data.tanggalBayar = tanggalBayar ? new Date(tanggalBayar) : null;

    const updated = await prisma.marketplaceOrder.update({
      where: { id: orderId },
      data,
      include: {
        items: { include: { produk: true } },
      },
    });

    return NextResponse.json(
      { ok: true, message: 'Pesanan marketplace berhasil diperbarui', data: updated },
      { headers: buildCorsHeaders(request) }
    );
  } catch (error) {
    console.error('Error updating marketplace order:', error);
    return NextResponse.json(
      { ok: false, error: 'Gagal memperbarui pesanan' },
      { status: 500, headers: buildCorsHeaders(request) }
    );
  }
}
