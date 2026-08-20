import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const paket = await prisma.paket.findMany({
    orderBy: { nama: "asc" },
  });
  return NextResponse.json(paket);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nama, harga, deskripsi } = body;

    if (!nama || !harga) {
      return NextResponse.json(
        { error: "Nama dan harga paket harus diisi" },
        { status: 400 }
      );
    }

    const paket = await prisma.paket.create({
      data: {
        nama,
        harga: parseFloat(harga),
        deskripsi,
      },
    });

    return NextResponse.json(paket, { status: 201 });
  } catch (err: unknown) {
    console.error("POST /api/paket error:", err);
    const message = (err as Error)?.message || "Gagal menambah paket";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
