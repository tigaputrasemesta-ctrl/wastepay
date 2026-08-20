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
    const { kode, nama, harga, deskripsi } = body;

    if (!nama) {
      return NextResponse.json(
        { error: "Nama paket harus diisi" },
        { status: 400 }
      );
    }

    const hargaParsed =
      harga !== undefined && harga !== null && String(harga).trim() !== ""
        ? parseFloat(harga)
        : null;

    const paket = await prisma.paket.create({
      data: {
        kode: kode && String(kode).trim() !== "" ? String(kode).trim() : null,
        nama,
        harga: hargaParsed,
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
