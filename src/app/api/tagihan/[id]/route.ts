import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt((await params).id);
    const body = await request.json();
    const { status, tanggalLunas } = body;

    const tagihan = await prisma.tagihan.update({
      where: { id },
      data: {
        status,
        ...(tanggalLunas ? { tanggalLunas: new Date(tanggalLunas) } : {}),
      },
    });

    return NextResponse.json(tagihan);
  } catch {
    return NextResponse.json({ error: "Gagal mengupdate tagihan" }, { status: 500 });
  }
}
