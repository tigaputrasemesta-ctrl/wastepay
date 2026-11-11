import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleCorsPreflight, buildCorsHeaders } from '@/lib/server/wastepay-backend-core-services';
import { createPayment, isDuitkuEnabled, getAppBaseUrl } from '@/lib/duitku';

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
      metodeBayar, // 'duitku' | 'qris' | 'cod'
      opsiPengiriman, // 'kurir_depok' | 'ambil_sendiri'
      duitkuChannel, // 'SP' | 'VA' | dll
    } = body;

    if (!namaPembeli || !noTelepon || !alamat || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Nama pembeli, No WhatsApp, Alamat lengkap, dan item produk wajib diisi.' },
        { status: 400, headers: buildCorsHeaders(request) }
      );
    }

    // Ambil data produk yang dibeli dari database (Official Store UPS HERU)
    const productIds = items.map((i: any) => Number(i.produkId));
    const productsInDb = await prisma.produk.findMany({
      where: { id: { in: productIds } },
    });

    const productMap = new Map(productsInDb.map((p) => [p.id, p]));

    let subtotalProduk = 0;
    const validatedItems: { produkId: number; jumlah: number; hargaSatuan: number; subtotal: number }[] = [];

    for (const item of items) {
      const pid = Number(item.produkId);
      const qty = Math.max(Number(item.jumlah) || 1, 1);
      const prod = productMap.get(pid);

      if (!prod) {
        return NextResponse.json(
          { ok: false, error: `Produk ID #${pid} tidak ditemukan di katalog resmi UPS HERU.` },
          { status: 400, headers: buildCorsHeaders(request) }
        );
      }

      if (prod.stok < qty) {
        return NextResponse.json(
          { ok: false, error: `Stok produk "${prod.nama}" tidak mencukupi (tersedia: ${prod.stok} ${prod.satuan}).` },
          { status: 400, headers: buildCorsHeaders(request) }
        );
      }

      const itemSubtotal = prod.harga * qty;
      subtotalProduk += itemSubtotal;
      validatedItems.push({
        produkId: pid,
        jumlah: qty,
        hargaSatuan: prod.harga,
        subtotal: itemSubtotal,
      });
    }

    // ==========================================
    // AKUMULASI PERHITUNGAN TERPISAH
    // ==========================================
    // 1. Subtotal Produk: akumulasi harga item murni dari DB
    // 2. Ongkos Kirim:
    //    - 'ambil_sendiri' => Rp 0 (ambil mandiri di TPS 3R Kalibaru)
    //    - 'kurir_depok'   => Rp 0 jika subtotal >= 150.000 (promo gratis ongkir), selain itu Rp 10.000 flat
    const isAmbilSendiri = opsiPengiriman === 'ambil_sendiri';
    const isGratisOngkir = !isAmbilSendiri && subtotalProduk >= 150000;
    const ongkir = isAmbilSendiri ? 0 : isGratisOngkir ? 0 : 10000;
    const totalHarga = subtotalProduk + ongkir;

    let noPesanan = generateNoPesanan();
    let existing = await prisma.marketplaceOrder.findUnique({ where: { noPesanan } });
    while (existing) {
      noPesanan = generateNoPesanan();
      existing = await prisma.marketplaceOrder.findUnique({ where: { noPesanan } });
    }

    const shippingLabel = isAmbilSendiri
      ? '[Ambil Sendiri di TPS 3R Kalibaru]'
      : '[Diantar Armada Kurir UPS HERU Depok]';
    const finalCatatan = catatan?.trim() ? `${shippingLabel} ${catatan.trim()}` : shippingLabel;

    // ==========================================
    // INTEGRASI PEMBAYARAN VIA DUITKU
    // ==========================================
    const isDuitku = metodeBayar === 'duitku' || metodeBayar === 'qris';
    let paymentUrl: string | null = null;
    let duitkuReference: string | null = null;
    const merchantOrderId = noPesanan.replace(/\//g, '-');
    const selectedChannel = duitkuChannel || 'SP'; // SP: ShopeePay QRIS (semua bank & e-wallet)

    if (isDuitku && isDuitkuEnabled()) {
      try {
        const duitkuRes = await createPayment({
          orderId: merchantOrderId,
          amount: Math.round(totalHarga),
          paymentMethod: selectedChannel,
          productDetails: `Marketplace UPS HERU - ${noPesanan}`.slice(0, 100),
          customerVaName: namaPembeli.trim().slice(0, 30),
          phoneNumber: noTelepon.trim(),
          email: email?.trim() || undefined,
          returnUrl: `${getAppBaseUrl()}/marketplace/order/${encodeURIComponent(noPesanan)}`,
        });

        if (duitkuRes.paymentUrl) {
          paymentUrl = duitkuRes.paymentUrl;
          duitkuReference = duitkuRes.reference || null;
        }
      } catch (err: any) {
        console.error('[Marketplace] Gagal generate Duitku paymentUrl:', err?.message || err);
        // Lanjutkan order agar pembeli tidak kehilangan data pesanan
      }
    }

    const initialStatus = 'menunggu_pembayaran';
    const finalMetodeBayar = isDuitku
      ? `duitku_${selectedChannel}`
      : (metodeBayar || 'cod');

    const buktiBayarData = paymentUrl
      ? JSON.stringify({
          gateway: 'duitku',
          merchantOrderId,
          paymentUrl,
          reference: duitkuReference,
          channel: selectedChannel,
          createdAt: new Date().toISOString(),
        })
      : null;

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
          catatan: finalCatatan,
          totalHarga,
          ongkir,
          status: initialStatus,
          metodeBayar: finalMetodeBayar,
          buktiBayar: buktiBayarData,
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
        data: order, // Dukung pemanggil yang membaca response.order maupun response.data
        paymentUrl,
        rincianPerhitungan: {
          subtotalProduk,
          ongkir,
          isGratisOngkir,
          opsiPengiriman: isAmbilSendiri ? 'ambil_sendiri' : 'kurir_depok',
          totalHarga,
        },
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
