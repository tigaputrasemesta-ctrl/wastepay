import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleCorsPreflight, buildCorsHeaders } from '@/lib/server/wastepay-backend-core-services';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request);
}

function generateNoOrder(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `PKP/${year}${month}${day}/${random}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      namaPemesan,
      noTelepon,
      alamat,
      patokan,
      kelurahan,
      kecamatan,
      latitude,
      longitude,
      kategoriPickupId,
      estimasiMuatan,
      jumlahUnit,
      fotoSampah,
      tanggalJemput,
      waktuJemput,
      metodeBayar,
      pelangganId,
    } = body;

    if (!namaPemesan || !noTelepon || !alamat || !kategoriPickupId || !tanggalJemput) {
      return NextResponse.json(
        { ok: false, error: 'Nama, No WhatsApp, Alamat, Kategori Sampah, dan Tanggal Penjemputan wajib diisi.' },
        { status: 400, headers: buildCorsHeaders(request) }
      );
    }

    const kategori = await prisma.kategoriPickup.findUnique({
      where: { id: Number(kategoriPickupId) },
    });

    if (!kategori) {
      return NextResponse.json(
        { ok: false, error: 'Kategori pickup tidak ditemukan.' },
        { status: 404, headers: buildCorsHeaders(request) }
      );
    }

    // Kalkulasi estimasi biaya
    let estimasiBiaya = kategori.tarifDasar;
    const units = Number(jumlahUnit) || 1;
    if (kategori.tarifPerUnit && units > 1) {
      estimasiBiaya += (units - 1) * kategori.tarifPerUnit;
    }

    let noOrder = generateNoOrder();
    // Safety check duplicate noOrder
    let existing = await prisma.pesananPickup.findUnique({ where: { noOrder } });
    while (existing) {
      noOrder = generateNoOrder();
      existing = await prisma.pesananPickup.findUnique({ where: { noOrder } });
    }

    const order = await prisma.pesananPickup.create({
      data: {
        noOrder,
        namaPemesan: namaPemesan.trim(),
        noTelepon: noTelepon.trim(),
        alamat: alamat.trim(),
        patokan: patokan ? patokan.trim() : null,
        kelurahan: kelurahan ? kelurahan.trim() : null,
        kecamatan: kecamatan ? kecamatan.trim() : null,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        kategoriPickupId: kategori.id,
        estimasiMuatan: estimasiMuatan ? estimasiMuatan.trim() : `${units} ${kategori.satuanMuatan}`,
        fotoSampah: fotoSampah || null,
        tanggalJemput: new Date(tanggalJemput),
        waktuJemput: waktuJemput || 'fleksibel',
        estimasiBiaya,
        biayaFinal: estimasiBiaya,
        metodeBayar: metodeBayar || 'cod',
        statusBayar: 'belum_bayar',
        status: 'menunggu_konfirmasi',
        pelangganId: pelangganId ? Number(pelangganId) : null,
      },
      include: {
        kategoriPickup: true,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        message: 'Pesanan penjemputan berhasil dibuat!',
        order,
      },
      { status: 201, headers: buildCorsHeaders(request) }
    );
  } catch (error) {
    console.error('Error creating pickup order:', error);
    return NextResponse.json(
      { ok: false, error: 'Terjadi kesalahan saat memproses pesanan pickup.' },
      { status: 500, headers: buildCorsHeaders(request) }
    );
  }
}
