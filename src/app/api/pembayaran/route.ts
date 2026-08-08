import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { hitungRincian } from "@/lib/invoice";
import { getSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tagihanId, pelangganId, jumlah, metode, catatan, buktiBayar } = body;

    if (!tagihanId || !pelangganId || !jumlah || !metode) {
      return NextResponse.json(
        { error: "Data tidak lengkap" },
        { status: 400 }
      );
    }

    // Petugas boleh mencatat pembayaran tunai hanya jika punya jabatan tagih
    const session = await getSession();
    if (session && session.role === "petugas") {
      const profil = await prisma.petugas.findUnique({
        where: { userId: session.id },
        select: { jabatan: true, wilayahId: true },
      });
      const jabatan = (profil?.jabatan || "").split(",");
      if (!jabatan.includes("tagih")) {
        return NextResponse.json(
          { error: "Jabatan Anda tidak berwenang mencatat pembayaran" },
          { status: 403 }
        );
      }
      if (metode !== "tunai") {
        return NextResponse.json(
          { error: "Petugas tagih hanya bisa mencatat pembayaran tunai — non-tunai lewat unggah bukti/gateway" },
          { status: 403 }
        );
      }
    }

    const tagihan = await prisma.tagihan.findUnique({
      where: { id: parseInt(tagihanId) },
      include: { pelanggan: true },
    });

    if (!tagihan) {
      return NextResponse.json({ error: "Tagihan tidak ditemukan" }, { status: 404 });
    }
    if (tagihan.pelangganId !== parseInt(pelangganId)) {
      return NextResponse.json(
        { error: "Tagihan tidak cocok dengan pelanggan" },
        { status: 400 }
      );
    }
    if (tagihan.status === "lunas" || tagihan.status === "dibatalkan") {
      return NextResponse.json(
        { error: `Tagihan sudah ${tagihan.status === "lunas" ? "lunas" : "dibatalkan"}` },
        { status: 400 }
      );
    }

    // Nominal minimal = jumlah + PPN 11% + denda (konsisten dengan invoice & gateway)
    const nominal = parseFloat(jumlah);
    const totalTagihan = hitungRincian(tagihan.jumlah, tagihan.denda).total;
    if (nominal < totalTagihan) {
      return NextResponse.json(
        { error: `Nominal kurang: minimal ${totalTagihan}` },
        { status: 400 }
      );
    }

    // Tunai dicatat langsung lunas (verifikasi admin saat mencatat).
    // Non-tunai (transfer/ewallet/qris/va) menunggu verifikasi.
    const metodeTunai = metode === "tunai";

    const pembayaran = await prisma.$transaction(async (tx) => {
      const created = await tx.pembayaran.create({
        data: {
          tagihanId: parseInt(tagihanId),
          pelangganId: parseInt(pelangganId),
          jumlah: nominal,
          metode,
          buktiBayar: buktiBayar || null,
          catatan: catatan || null,
          status: metodeTunai ? "terverifikasi" : "pending",
          // Siapa yang mencatat/menerima — penting utk rekonsiliasi kas harian
          verifiedById: session?.id ?? null,
        },
      });

      if (metodeTunai) {
        await tx.tagihan.update({
          where: { id: parseInt(tagihanId) },
          data: { status: "lunas", tanggalLunas: new Date() },
        });
      }

      return created;
    });

    await logAudit("create", "Pembayaran", pembayaran.id, undefined, {
      tagihanId: pembayaran.tagihanId,
      pelangganId: pembayaran.pelangganId,
      jumlah: pembayaran.jumlah,
      metode: pembayaran.metode,
      status: pembayaran.status,
    });

    return NextResponse.json(
      {
        ...pembayaran,
        message: metodeTunai
          ? "Pembayaran tunai dicatat dan tagihan lunas"
          : "Pembayaran dicatat, menunggu verifikasi admin",
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Gagal mencatat pembayaran" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tagihanId = searchParams.get("tagihanId");
  const pelangganId = searchParams.get("pelangganId");
  const status = searchParams.get("status");
  // ?saya=1 → petugas tagih: pembayaran pelanggan di wilayahnya
  const saya = searchParams.get("saya") === "1";

  const where: Prisma.PembayaranWhereInput = {};
  if (tagihanId) where.tagihanId = parseInt(tagihanId);
  if (pelangganId) where.pelangganId = parseInt(pelangganId);
  if (status) where.status = status;
  if (saya) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const profil = await prisma.petugas.findUnique({
      where: { userId: session.id },
      select: { wilayahId: true },
    });
    if (!profil) {
      return NextResponse.json({ error: "Akun belum ter-link ke profil petugas" }, { status: 403 });
    }
    where.pelanggan = { wilayahId: profil.wilayahId };
  }

  const pembayaran = await prisma.pembayaran.findMany({
    where,
    include: {
      pelanggan: { select: { id: true, nama: true, kodePelanggan: true } },
      tagihan: { select: { bulan: true, tahun: true, jumlah: true } },
      duitkuTransaction: {
        select: { orderId: true, statusCode: true, paymentUrl: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(pembayaran);
}
