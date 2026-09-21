import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalisasiTelepon } from "@/lib/daftar";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const telp = searchParams.get("telp");

  if (!telp) {
    return NextResponse.json({ error: "Nomor telepon tidak diberikan." }, { status: 400 });
  }

  const noTelepon = normalisasiTelepon(telp);

  try {
    const pelanggan = await prisma.pelanggan.findUnique({
      where: { noTelepon },
      select: { id: true, nama: true, status: true },
    });

    if (pelanggan) {
      return NextResponse.json({
        terdaftar: true,
        pesan: `Nomor sudah terdaftar atas nama ${pelanggan.nama} (Status: ${pelanggan.status}).`,
      });
    }

    return NextResponse.json({ terdaftar: false, pesan: "Nomor tersedia." });
  } catch (error) {
    return NextResponse.json({ error: "Terjadi kesalahan sistem." }, { status: 500 });
  }
}
