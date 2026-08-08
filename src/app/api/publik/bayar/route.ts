import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hitungRincian } from "@/lib/invoice";

const METODE_VALID = ["transfer", "ewallet", "qris", "virtual_account"];

/**
 * POST /api/publik/bayar
 * Pelanggan mengirim bukti pembayaran (non-tunai → pending, diverifikasi admin).
 * Body: { kode, tagihanId, metode, buktiBayar?, catatan? }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { kode, tagihanId, metode, buktiBayar, catatan } = body;

    if (!kode || !tagihanId || !metode) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }
    if (!METODE_VALID.includes(metode)) {
      return NextResponse.json({ error: "Metode tidak valid" }, { status: 400 });
    }

    const pelanggan = await prisma.pelanggan.findUnique({
      where: { kodePelanggan: kode.trim() },
      select: { id: true, deletedAt: true },
    });
    if (!pelanggan || pelanggan.deletedAt) {
      return NextResponse.json({ error: "Kode pelanggan tidak ditemukan" }, { status: 404 });
    }

    const tagihan = await prisma.tagihan.findUnique({
      where: { id: parseInt(tagihanId) },
      select: { id: true, pelangganId: true, jumlah: true, denda: true, status: true },
    });
    if (!tagihan || tagihan.pelangganId !== pelanggan.id) {
      return NextResponse.json({ error: "Tagihan tidak ditemukan" }, { status: 404 });
    }
    if (tagihan.status === "lunas" || tagihan.status === "dibatalkan") {
      return NextResponse.json(
        { error: "Tagihan sudah lunas atau dibatalkan" },
        { status: 400 }
      );
    }

    // Cegah spam: batasi ukuran bukti (data URL base64, max ~2MB)
    if (buktiBayar && typeof buktiBayar === "string" && buktiBayar.length > 2_800_000) {
      return NextResponse.json({ error: "Ukuran bukti terlalu besar (maks 2MB)" }, { status: 400 });
    }

    // Total yang ditagih = jumlah + PPN 11% + denda — konsisten dengan invoice & Duitku
    const total = hitungRincian(tagihan.jumlah, tagihan.denda).total;

    const pembayaran = await prisma.pembayaran.create({
      data: {
        tagihanId: tagihan.id,
        pelangganId: pelanggan.id,
        jumlah: total,
        metode,
        buktiBayar: buktiBayar || null,
        catatan: catatan || null,
        status: "pending",
      },
    });

    return NextResponse.json(
      {
        message: "Bukti pembayaran diterima. Status pembayaran menunggu verifikasi admin.",
        id: pembayaran.id,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Gagal memproses pembayaran" }, { status: 500 });
  }
}
