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
    const {
      status,
      statusBayar,
      biayaFinal,
      petugasId,
      kendaraanId,
      catatanPetugas,
      fotoSelesai,
    } = body;

    const data: any = {};
    if (status !== undefined) data.status = status;
    if (statusBayar !== undefined) data.statusBayar = statusBayar;
    if (biayaFinal !== undefined) data.biayaFinal = Number(biayaFinal);
    if (petugasId !== undefined) data.petugasId = petugasId ? Number(petugasId) : null;
    if (kendaraanId !== undefined) data.kendaraanId = kendaraanId ? Number(kendaraanId) : null;
    if (catatanPetugas !== undefined) data.catatanPetugas = catatanPetugas;
    if (fotoSelesai !== undefined) data.fotoSelesai = fotoSelesai;
    if (status === 'selesai' && !data.selesaiAt) {
      data.selesaiAt = new Date();
    }

    const updated = await prisma.pesananPickup.update({
      where: { id: orderId },
      data,
      include: {
        kategoriPickup: true,
        petugas: { select: { id: true, nama: true, noTelepon: true } },
        kendaraan: { select: { id: true, nama: true, jenis: true, platNomor: true } },
      },
    });

    return NextResponse.json(
      { ok: true, message: 'Pesanan pickup berhasil diperbarui', data: updated },
      { headers: buildCorsHeaders(request) }
    );
  } catch (error) {
    console.error('Error updating pickup order:', error);
    return NextResponse.json(
      { ok: false, error: 'Gagal memperbarui pesanan pickup' },
      { status: 500, headers: buildCorsHeaders(request) }
    );
  }
}
