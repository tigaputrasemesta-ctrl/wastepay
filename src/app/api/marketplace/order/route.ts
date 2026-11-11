import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleCorsPreflight, buildCorsHeaders } from '@/lib/server/wastepay-backend-core-services';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request);
}

function generateNoPesanan(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `ORD/${year}${month}${day}/${random}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      namaPembeli,
      noTelepon,
      email,
      alamat,
      kelurahan,
      kecamatan,
      catatan,
      items, // array of { produkId: number, jumlah: number }
      metodeBayar,
    } = body;

    if (!namaPembeli || !noTelepon || !alamat || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Nama, No WhatsApp, Alamat lengkap, dan item produk wajib diisi.' },
        { status: 400, headers: buildCorsHeaders(request) }
      );
    }

    // Ambil data produk yang dibeli
    const productIds = items.map((i: any) => Number(i.produkId));
    const productsInDb = await prisma.produk.findMany({
      where: { id: { in: productIds } },
    });

    const productMap = new Map(productsInDb.map((p) => [p.id, p]));

    let calculatedTotal = 0;
    const validatedItems: { produkId: number; jumlah: number; hargaSatuan: number; subtotal: number }[] = [];

    for (const item of items) {
      const pid = Number(item.produkId);
      const qty = Math.max(Number(item.jumlah) || 1, 1);
      const prod = productMap.get(pid);

      if (!prod) {
        return NextResponse.json(
          { ok: false, error: `Produk ID #${pid} tidak ditemukan.` },
          { status: 400, headers: buildCorsHeaders(request) }
        );
      }

      if (prod.stok < qty) {
        return NextResponse.json(
          { ok: false, error: `Stok produk "${prod.nama}" tidak mencukupi (tersedia: ${prod.stok}).` },
          { status: 400, headers: buildCorsHeaders(request) }
        );
      }

      const subtotal = prod.harga * qty;
      calculatedTotal += subtotal;
      validatedItems.push({
        produkId: pid,
        jumlah: qty,
        hargaSatuan: prod.harga,
        subtotal,
      });
    }

    // Hitung ongkos kirim standar (flat 10.000 atau gratis jika di atas 100.000)
    const ongkir = calculatedTotal >= 150000 ? 0 : 10000;
    const totalHarga = calculatedTotal + ongkir;

    let noPesanan = generateNoPesanan();
    let existing = await prisma.marketplaceOrder.findUnique({ where: { noPesanan } });
    while (existing) {
      noPesanan = generateNoPesanan();
      existing = await prisma.marketplaceOrder.findUnique({ where: { noPesanan } });
    }

    // Buat order dan kurangi stok dalam Prisma transaction
    const order = await prisma.$transaction(async (tx) => {
      const createdOrder = await tx.marketplaceOrder.create({
        data: {
          noPesanan,
          namaPembeli: namaPembeli.trim(),
          noTelepon: noTelepon.trim(),
          email: email ? email.trim() : null,
          alamat: alamat.trim(),
          kelurahan: kelurahan ? kelurahan.trim() : null,
          kecamatan: kecamatan ? kecamatan.trim() : null,
          catatan: catatan ? catatan.trim() : null,
          totalHarga,
          ongkir,
          status: 'menunggu_pembayaran',
          metodeBayar: metodeBayar || 'cod',
          items: {
            create: validatedItems,
          },
        },
        include: {
          items: {
            include: { produk: true },
          },
        },
      });

      // Kurangi stok masing-masing produk
      for (const item of validatedItems) {
        await tx.produk.update({
          where: { id: item.produkId },
          data: { stok: { decrement: item.jumlah } },
        });
      }

      return createdOrder;
    });

    return NextResponse.json(
      {
        ok: true,
        message: 'Pesanan marketplace berhasil dibuat!',
        order,
      },
      { status: 201, headers: buildCorsHeaders(request) }
    );
  } catch (error) {
    console.error('Error creating marketplace order:', error);
    return NextResponse.json(
      { ok: false, error: 'Gagal membuat pesanan marketplace.' },
      { status: 500, headers: buildCorsHeaders(request) }
    );
  }
}
