import { NextResponse } from "next/server";
import { updateTunggakan } from "@/lib/tagihan";
import { isDuitkuEnabled } from "@/lib/duitku";
import { prisma } from "@/lib/prisma";
import {
  getTagihanByNoInvoice,
  hitungRincian,
} from "@/lib/invoice";
import { getPajakDaerahRate } from "@/lib/pengaturan";
import { allowAttempt, retryAfterSeconds } from "@/lib/rate-limit";

/**
 * GET /api/publik/tagihan-detail?invoice=INV/XXX/202606
 * (atau ?merchantOrderId=DW-...)
 * Detail tagihan publik berdasarkan nomor invoice (tanpa auth).
 * Dipakai oleh halaman /bayar-tagihan dan /invoice-tagihan.
 *
 * Keamanan: nomor invoice mengandung kode pelanggan (enumerable), jadi
 * endpoint ini diberi rate limit per IP + Cache-Control no-store agar
 * tidak bisa di-scrape massal. (Data yang diekspos juga dibatasi —
 * alamat & noTelepon tidak dikembalikan.)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const invoiceParam = searchParams.get("invoice")?.trim();
  const merchantOrderId = searchParams.get("merchantOrderId")?.trim();

  // Rate limit per IP DULU (sebelum validasi invoice) — request dengan invoice
  // invalid pun ikut dihitung, sehingga enumerasi nomor invoice tetap terhambat.
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const key = `tagihan-detail:${ip}`;
  if (!(await allowAttempt(key, { max: 60, windowMs: 15 * 60 * 1000 }))) {
    const retry = retryAfterSeconds(key);
    return NextResponse.json(
      { error: `Terlalu banyak permintaan. Coba lagi dalam ${Math.ceil(retry / 60)} menit.` },
      { status: 429, headers: { "Retry-After": String(retry) } }
    );
  }

  let invoice = invoiceParam;

  if (!invoice && merchantOrderId) {
    // Jika kembali dari Duitku, kita dapat merchantOrderId, cari noInvoice-nya
    const dt = await prisma.duitkuTransaction.findUnique({
      where: { orderId: merchantOrderId },
      include: {
        pembayaran: {
          include: { tagihan: true }
        }
      }
    });
    if (dt?.pembayaran?.tagihan?.noInvoice) {
      invoice = dt.pembayaran.tagihan.noInvoice;
    }
  }

  if (!invoice) {
    return NextResponse.json({ error: "Nomor invoice atau ID order wajib diisi" }, { status: 400 });
  }

  await updateTunggakan();

  const tagihan = await getTagihanByNoInvoice(invoice);
  if (!tagihan) {
    return NextResponse.json({ error: `Tagihan tidak ditemukan untuk invoice: ${invoice}` }, { status: 404 });
  }

  const ppnRate = await getPajakDaerahRate();
  const rincian = hitungRincian(tagihan.jumlah, tagihan.denda, ppnRate);
  const pembayaranLunas = tagihan.pembayaran.find(
    (p) => p.status === "terverifikasi" || p.status === "lunas"
  );

  return NextResponse.json({
    id: tagihan.id,
    noInvoice: tagihan.noInvoice,
    status: tagihan.status,
    bulan: tagihan.bulan,
    tahun: tagihan.tahun,
    jumlah: tagihan.jumlah,
    denda: tagihan.denda || 0,
    ppn: rincian.ppn,
    ppnRate: ppnRate,
    total: rincian.total,
    duitkuAktif: isDuitkuEnabled(),
    jatuhTempo: tagihan.jatuhTempo,
    tanggalLunas: tagihan.tanggalLunas,
    keterangan: tagihan.keterangan,
    pelanggan: {
      id: tagihan.pelanggan.id,
      nama: tagihan.pelanggan.nama,
      kodePelanggan: tagihan.pelanggan.kodePelanggan,
      kategori: tagihan.pelanggan.kategori,
      // alamat & noTelepon sengaja TIDAK diekspos — endpoint publik, invoice bisa ditebak
    },
    pembayaranLunas: pembayaranLunas
      ? {
          metode: pembayaranLunas.metode,
          jumlah: pembayaranLunas.jumlah,
          tanggal: pembayaranLunas.createdAt,
        }
      : null,
  }, {
    // Data pribadi tagihan tidak boleh di-cache oleh proxy/CDN mana pun
    headers: { "Cache-Control": "no-store" },
  });
}
