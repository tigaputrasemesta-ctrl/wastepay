import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { getSession } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";

export async function GET() {
  const tpa = await prisma.tpa.findMany({
    orderBy: { nama: "asc" },
  });
  return NextResponse.json(tpa);
}

export async function POST(request: Request) {
  const user = await getSession();
  if (!user || !hasRole(user, "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { nama, alamat, kota, jarak } = body;

    if (!nama) {
      return NextResponse.json({ error: "Nama TPA harus diisi" }, { status: 400 });
    }

    const tpa = await prisma.tpa.create({
      data: {
        nama,
        alamat,
        kota,
        jarak: jarak ? parseFloat(jarak) : null,
      },
    });

    await logAudit("create", "TPA", tpa.id, undefined, { nama: tpa.nama });
    return NextResponse.json(tpa, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Gagal menambah TPA" }, { status: 500 });
  }
}
