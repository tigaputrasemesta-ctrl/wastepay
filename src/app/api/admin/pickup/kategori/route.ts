import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { assertAuthorizedRole, handleCorsPreflight, buildCorsHeaders } from '@/lib/server/wastepay-backend-core-services';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request);
}

export async function GET(request: Request) {
  try {
    const session = await getSession(request);
    const rbac = assertAuthorizedRole(session, ['superadmin', 'admin', 'kasir']);
    if (!rbac.authorized) {
      return NextResponse.json({ ok: false, error: rbac.error }, { status: rbac.status, headers: buildCorsHeaders(request) });
    }

    const categories = await prisma.kategoriPickup.findMany({
      orderBy: { id: 'asc' },
      include: {
        _count: {
          select: { pesananPickup: true },
        },
      },
    });

    return NextResponse.json({ ok: true, data: categories }, { headers: buildCorsHeaders(request) });
  } catch (error) {
    console.error('Error fetching admin kategori pickup:', error);
    return NextResponse.json(
      { ok: false, error: 'Gagal memuat kategori pickup' },
      { status: 500, headers: buildCorsHeaders(request) }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession(request);
    const rbac = assertAuthorizedRole(session, ['superadmin', 'admin']);
    if (!rbac.authorized) {
      return NextResponse.json({ ok: false, error: rbac.error }, { status: rbac.status, headers: buildCorsHeaders(request) });
    }

    const body = await request.json();
    const { kode, nama, deskripsi, satuanMuatan, tarifDasar, tarifPerUnit, armadaStandar, icon, aktif } = body;

    if (!kode || !nama || !satuanMuatan || tarifDasar === undefined) {
      return NextResponse.json(
        { ok: false, error: 'Kode, nama, satuan muatan, dan tarif dasar wajib diisi.' },
        { status: 400, headers: buildCorsHeaders(request) }
      );
    }

    const cleanKode = kode.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (!cleanKode) {
      return NextResponse.json(
        { ok: false, error: 'Format kode tidak valid. Gunakan huruf kecil, angka, atau tanda minus/garis bawah.' },
        { status: 400, headers: buildCorsHeaders(request) }
      );
    }

    const existing = await prisma.kategoriPickup.findUnique({
      where: { kode: cleanKode },
    });

    if (existing) {
      return NextResponse.json(
        { ok: false, error: `Kode '${cleanKode}' sudah digunakan oleh kategori lain.` },
        { status: 400, headers: buildCorsHeaders(request) }
      );
    }

    const created = await prisma.kategoriPickup.create({
      data: {
        kode: cleanKode,
        nama: nama.trim(),
        deskripsi: deskripsi?.trim() || null,
        satuanMuatan: satuanMuatan.trim(),
        tarifDasar: Math.max(0, parseFloat(tarifDasar)),
        tarifPerUnit: tarifPerUnit !== undefined && tarifPerUnit !== null && tarifPerUnit !== '' ? Math.max(0, parseFloat(tarifPerUnit)) : null,
        armadaStandar: armadaStandar || 'pickup',
        icon: icon || 'Hammer',
        aktif: aktif !== undefined ? Boolean(aktif) : true,
      },
    });

    return NextResponse.json(
      { ok: true, message: 'Kategori pickup baru berhasil ditambahkan', data: created },
      { status: 201, headers: buildCorsHeaders(request) }
    );
  } catch (error) {
    console.error('Error creating admin kategori pickup:', error);
    return NextResponse.json(
      { ok: false, error: 'Terjadi kesalahan server saat menambah kategori pickup.' },
      { status: 500, headers: buildCorsHeaders(request) }
    );
  }
}
