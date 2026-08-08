import { NextResponse } from "next/server";
import { updateTunggakan } from "@/lib/tagihan";
import { isDuitkuEnabled } from "@/lib/duitku";
import {
  getTagihanByNoInvoice,
  hitungRincian,
  PPN_RATE,
} from "@/lib/invoice";

/**
 * GET /api/publik/tagihan-detail?invoice=INV/XXX/202606
 * Detail tagihan publik berdasarkan nomor invoice (tanpa auth).
 * Dipakai oleh halaman /bayar-tagihan dan /invoice-tagihan.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const invoice = searchParams.get("invoice")?.trim();

  if (!invoice) {
    return NextResponse.json({ error: "Nomor invoice wajib diisi" }, { status: 400 });
  }

  await updateTunggakan();

  const tagihan = await getTagihanByNoInvoice(invoice);
  if (!tagihan) {
    return NextResponse.json({ error: "Tagihan tidak ditemukan" }, { status: 404 });
  }

  const rincian = hitungRincian(tagihan.jumlah, tagihan.denda);
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
    ppnRate: PPN_RATE,
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
  });
}
