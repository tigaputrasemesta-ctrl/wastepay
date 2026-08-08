import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const wilayah = await prisma.wilayah.findMany({
    orderBy: { nama: "asc" },
  });
  return NextResponse.json(wilayah);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nama, rt, rw, kelurahan, kecamatan, kota } = body;

    if (!nama) {
      return NextResponse.json({ error: "Nama wilayah harus diisi" }, { status: 400 });
    }

    const wilayah = await prisma.wilayah.create({
      data: { nama, rt, rw, kelurahan, kecamatan, kota },
    });

    await logAudit("create", "Wilayah", wilayah.id, undefined, { nama: wilayah.nama });
    return NextResponse.json(wilayah, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Gagal menambah wilayah" }, { status: 500 });
  }
}
