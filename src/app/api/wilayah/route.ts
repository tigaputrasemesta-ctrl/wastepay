import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { normalisasiKodeWilayah } from "@/lib/kode-pelanggan";

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

    // Kode zona wajib + unik — dipakai utk generate kode pelanggan (misal KAL-001)
    const kode = normalisasiKodeWilayah(body.kode);
    if (!kode) {
      return NextResponse.json(
        { error: "Kode zona wajib diisi (2–3 huruf unik, misal KB untuk Kalibaru)" },
        { status: 400 }
      );
    }

    const wilayah = await prisma.wilayah.create({
      data: { nama, kode, rt, rw, kelurahan, kecamatan, kota },
    });

    await logAudit("create", "Wilayah", wilayah.id, undefined, { nama: wilayah.nama, kode });
    return NextResponse.json(wilayah, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json(
        { error: "Kode zona sudah dipakai wilayah lain" },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Gagal menambah wilayah" }, { status: 500 });
  }
}
