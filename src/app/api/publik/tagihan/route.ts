import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hitungRincian } from "@/lib/invoice";
import { updateTunggakan } from "@/lib/tagihan";

/**
 * GET /api/publik/tagihan?kode=XXX
 * Cek tagihan pelanggan publik via kode pelanggan (tanpa auth).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const kode = searchParams.get("kode")?.trim();

  if (!kode) {
    return NextResponse.json({ error: "Kode pelanggan wajib diisi" }, { status: 400 });
  }

  await updateTunggakan();

  const pelanggan = await prisma.pelanggan.findUnique({
    where: { kodePelanggan: kode },
    select: {
      id: true,
      nama: true,
      kodePelanggan: true,
      alamat: true,
      noTelepon: true,
      kategori: true,
      deletedAt: true,
    },
  });

  if (!pelanggan || pelanggan.deletedAt) {
    return NextResponse.json({ error: "Kode pelanggan tidak ditemukan" }, { status: 404 });
  }

  const tagihanList = await prisma.tagihan.findMany({
    where: { pelangganId: pelanggan.id, deletedAt: null },
    orderBy: [{ tahun: "desc" }, { bulan: "desc" }],
    select: {
      id: true,
      noInvoice: true,
      bulan: true,
      tahun: true,
      jumlah: true,
      denda: true,
      status: true,
      jatuhTempo: true,
    },
  });

  // total = jumlah + PPN 11% + denda — konsisten dengan invoice & gateway
  const tagihan = tagihanList.map((t) => ({
    ...t,
    total: hitungRincian(t.jumlah, t.denda).total,
  }));

  return NextResponse.json({
    pelanggan: {
      nama: pelanggan.nama,
      kodePelanggan: pelanggan.kodePelanggan,
      alamat: pelanggan.alamat,
    },
    tagihan,
  });
}
