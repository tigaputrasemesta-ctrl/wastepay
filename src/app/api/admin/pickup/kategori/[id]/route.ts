import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { assertAuthorizedRole, handleCorsPreflight, buildCorsHeaders } from '@/lib/server/wastepay-backend-core-services';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession(request);
    const rbac = assertAuthorizedRole(session, ['superadmin', 'admin']);
    if (!rbac.authorized) {
      return NextResponse.json({ ok: false, error: rbac.error }, { status: rbac.status, headers: buildCorsHeaders(request) });
    }

    const { id } = await params;
    const catId = Number(id);
    if (isNaN(catId)) {
      return NextResponse.json({ ok: false, error: 'ID kategori tidak valid' }, { status: 400 });
    }

    const body = await request.json();
    const { nama, deskripsi, satuanMuatan, tarifDasar, tarifPerUnit, armadaStandar, icon, aktif } = body;

    const data: any = {};
    if (nama !== undefined) data.nama = nama.trim();
    if (deskripsi !== undefined) data.deskripsi = deskripsi ? deskripsi.trim() : null;
    if (satuanMuatan !== undefined) data.satuanMuatan = satuanMuatan.trim();
    if (tarifDasar !== undefined) data.tarifDasar = Math.max(0, parseFloat(tarifDasar));
    if (tarifPerUnit !== undefined) {
      data.tarifPerUnit = tarifPerUnit !== null && tarifPerUnit !== '' ? Math.max(0, parseFloat(tarifPerUnit)) : null;
    }
    if (armadaStandar !== undefined) data.armadaStandar = armadaStandar;
    if (icon !== undefined) data.icon = icon;
    if (aktif !== undefined) data.aktif = Boolean(aktif);

    const updated = await prisma.kategoriPickup.update({
      where: { id: catId },
      data,
      include: {
        _count: {
          select: { pesananPickup: true },
        },
      },
    });

    return NextResponse.json(
      { ok: true, message: 'Tarif & pengaturan kategori pickup berhasil diperbarui', data: updated },
      { headers: buildCorsHeaders(request) }
    );
  } catch (error) {
    console.error('Error updating kategori pickup:', error);
    return NextResponse.json(
      { ok: false, error: 'Gagal memperbarui kategori pickup' },
      { status: 500, headers: buildCorsHeaders(request) }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession(request);
    const rbac = assertAuthorizedRole(session, ['superadmin', 'admin']);
    if (!rbac.authorized) {
      return NextResponse.json({ ok: false, error: rbac.error }, { status: rbac.status, headers: buildCorsHeaders(request) });
    }

    const { id } = await params;
    const catId = Number(id);
    if (isNaN(catId)) {
      return NextResponse.json({ ok: false, error: 'ID kategori tidak valid' }, { status: 400 });
    }

    // Periksa apakah kategori sudah terikat ke pesanan pickup yang sudah ada
    const orderCount = await prisma.pesananPickup.count({
      where: { kategoriPickupId: catId },
    });

    if (orderCount > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: `Kategori ini tidak dapat dihapus permanen karena memiliki ${orderCount} data riwayat pesanan. Silakan ubah statusnya menjadi 'Nonaktif' agar tidak muncul di form pemesanan warga.`,
        },
        { status: 400, headers: buildCorsHeaders(request) }
      );
    }

    await prisma.kategoriPickup.delete({
      where: { id: catId },
    });

    return NextResponse.json(
      { ok: true, message: 'Kategori pickup berhasil dihapus' },
      { headers: buildCorsHeaders(request) }
    );
  } catch (error) {
    console.error('Error deleting kategori pickup:', error);
    return NextResponse.json(
      { ok: false, error: 'Gagal menghapus kategori pickup' },
      { status: 500, headers: buildCorsHeaders(request) }
    );
  }
}
