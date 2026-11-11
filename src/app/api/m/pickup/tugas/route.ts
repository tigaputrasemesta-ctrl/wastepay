import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { handleCorsPreflight, buildCorsHeaders } from '@/lib/server/wastepay-backend-core-services';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request);
}

export async function GET(request: Request) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Cari profil Petugas dari session.id (User.id)
    const petugas = await prisma.petugas.findFirst({
      where: { userId: session.id, aktif: true, deletedAt: null },
    });

    if (!petugas && session.role !== 'admin' && session.role !== 'superadmin') {
      return NextResponse.json({ ok: false, error: 'Profil petugas tidak ditemukan' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'aktif'; // aktif | riwayat | semua

    const where: any = {};
    if (petugas) {
      where.petugasId = petugas.id;
    }

    if (filter === 'aktif') {
      where.status = { in: ['ditugaskan', 'otw'] };
    } else if (filter === 'riwayat') {
      where.status = { in: ['selesai', 'dibatalkan'] };
    }

    const tugasList = await prisma.pesananPickup.findMany({
      where,
      orderBy: { tanggalJemput: 'asc' },
      include: {
        kategoriPickup: true,
        kendaraan: {
          select: { id: true, nama: true, platNomor: true, jenis: true },
        },
      },
    });

    return NextResponse.json(
      {
        ok: true,
        petugas: petugas ? { id: petugas.id, nama: petugas.nama } : null,
        data: tugasList,
      },
      { headers: buildCorsHeaders(request) }
    );
  } catch (error) {
    console.error('Error fetching driver pickup tasks:', error);
    return NextResponse.json(
      { ok: false, error: 'Gagal memuat tugas penjemputan' },
      { status: 500, headers: buildCorsHeaders(request) }
    );
  }
}
