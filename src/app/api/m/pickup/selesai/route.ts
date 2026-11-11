import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { handleCorsPreflight, buildCorsHeaders } from '@/lib/server/wastepay-backend-core-services';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request);
}

export async function POST(request: Request) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { orderId, status, catatanPetugas, fotoSelesai, statusBayar } = body;

    if (!orderId || !status) {
      return NextResponse.json(
        { ok: false, error: 'Order ID dan status wajib disertakan' },
        { status: 400 }
      );
    }

    const order = await prisma.pesananPickup.findUnique({
      where: { id: Number(orderId) },
    });

    if (!order) {
      return NextResponse.json(
        { ok: false, error: 'Pesanan penjemputan tidak ditemukan' },
        { status: 404 }
      );
    }

    const data: any = { status };
    if (catatanPetugas !== undefined) data.catatanPetugas = catatanPetugas;
    if (fotoSelesai !== undefined) data.fotoSelesai = fotoSelesai;
    if (statusBayar !== undefined) data.statusBayar = statusBayar;

    if (status === 'selesai') {
      data.selesaiAt = new Date();
      if (order.metodeBayar === 'cod' && !order.statusBayar) {
        data.statusBayar = 'lunas';
      }
    }

    const updated = await prisma.pesananPickup.update({
      where: { id: Number(orderId) },
      data,
    });

    return NextResponse.json(
      {
        ok: true,
        message: status === 'selesai' ? 'Tugas penjemputan berhasil diselesaikan!' : 'Status perjalanan diperbarui.',
        data: updated,
      },
      { headers: buildCorsHeaders(request) }
    );
  } catch (error) {
    console.error('Error completing pickup task:', error);
    return NextResponse.json(
      { ok: false, error: 'Gagal memperbarui status tugas' },
      { status: 500, headers: buildCorsHeaders(request) }
    );
  }
}
