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
    const rbac = assertAuthorizedRole(session, ['superadmin', 'admin']);
    if (!rbac.authorized) {
      return NextResponse.json({ error: rbac.error }, { status: rbac.status, headers: buildCorsHeaders(request) });
    }

    const { id } = await params;
    const prodId = Number(id);
    if (isNaN(prodId)) {
      return NextResponse.json({ ok: false, error: 'ID tidak valid' }, { status: 400 });
    }

    const body = await request.json();
    const { nama, slug, kategori, harga, stok, satuan, beratGram, deskripsi, foto, aktif } = body;

    const data: any = {};
    if (nama !== undefined) data.nama = nama.trim();
    if (slug !== undefined) data.slug = slug.trim();
    if (kategori !== undefined) data.kategori = kategori;
    if (harga !== undefined) data.harga = Number(harga);
    if (stok !== undefined) data.stok = Number(stok);
    if (satuan !== undefined) data.satuan = satuan;
    if (beratGram !== undefined) data.beratGram = Number(beratGram);
    if (deskripsi !== undefined) data.deskripsi = deskripsi;
    if (foto !== undefined) data.foto = foto;
    if (aktif !== undefined) data.aktif = Boolean(aktif);

    const updated = await prisma.produk.update({
      where: { id: prodId },
      data,
    });

    return NextResponse.json(
      { ok: true, message: 'Produk berhasil diperbarui', data: updated },
      { headers: buildCorsHeaders(request) }
    );
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { ok: false, error: 'Gagal memperbarui produk' },
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
      return NextResponse.json({ error: rbac.error }, { status: rbac.status, headers: buildCorsHeaders(request) });
    }

    const { id } = await params;
    const prodId = Number(id);
    if (isNaN(prodId)) {
      return NextResponse.json({ ok: false, error: 'ID tidak valid' }, { status: 400 });
    }

    await prisma.produk.delete({
      where: { id: prodId },
    });

    return NextResponse.json(
      { ok: true, message: 'Produk berhasil dihapus' },
      { headers: buildCorsHeaders(request) }
    );
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { ok: false, error: 'Gagal menghapus produk' },
      { status: 500, headers: buildCorsHeaders(request) }
    );
  }
}
