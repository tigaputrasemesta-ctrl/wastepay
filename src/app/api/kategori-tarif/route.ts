import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const kategoriTarif = await prisma.kategoriTarif.findMany({
    orderBy: { kategori: "asc" },
  });
  return NextResponse.json(kategoriTarif);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { kategori, label, tarif, deskripsi } = body;

    if (!kategori || !label || tarif === undefined) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    const created = await prisma.kategoriTarif.create({
      data: {
        kategori,
        label,
        tarif: parseFloat(tarif),
        deskripsi,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Gagal menambah kategori" }, { status: 500 });
  }
}
