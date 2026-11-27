import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const kategoriTarif = await prisma.kategoriTarif.findMany();

  // Natural numeric sort: Level 1, Level 2, ... Level 10
  kategoriTarif.sort((a, b) => {
    const numA = parseInt(a.kategori.replace(/\D/g, "") || "0", 10);
    const numB = parseInt(b.kategori.replace(/\D/g, "") || "0", 10);
    if (numA !== 0 && numB !== 0 && numA !== numB) {
      return numA - numB;
    }
    return a.kategori.localeCompare(b.kategori, undefined, { numeric: true });
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
  } catch (err: unknown) {
    console.error("POST /api/kategori-tarif error:", err);
    const code = (err as { code?: string })?.code;
    if (code === "P2002") {
      return NextResponse.json({ error: "Kode Kategori tersebut sudah terdaftar di database." }, { status: 400 });
    }
    const message = (err as Error)?.message || "Gagal menambah kategori";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
