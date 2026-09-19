import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const artikel = await prisma.artikel.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(artikel);
  } catch (error) {
    return NextResponse.json({ error: "Gagal mengambil artikel" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { judul, isi, kategori, diterbitkan } = body;
    const slug = judul.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
    
    const newArtikel = await prisma.artikel.create({
      data: {
        judul,
        isi,
        slug,
        kategori: kategori || "edukasi",
        diterbitkan: Boolean(diterbitkan),
      },
    });
    return NextResponse.json(newArtikel);
  } catch (error) {
    return NextResponse.json({ error: "Gagal menyimpan artikel" }, { status: 500 });
  }
}
