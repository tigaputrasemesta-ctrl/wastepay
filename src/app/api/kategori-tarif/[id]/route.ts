import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt((await params).id);
    const body = await request.json();
    const { tarif } = body;

    if (tarif === undefined || tarif < 0) {
      return NextResponse.json({ error: "Tarif tidak valid" }, { status: 400 });
    }

    const updated = await prisma.kategoriTarif.update({
      where: { id },
      data: { tarif: parseFloat(tarif) },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Gagal mengupdate tarif" }, { status: 500 });
  }
}
