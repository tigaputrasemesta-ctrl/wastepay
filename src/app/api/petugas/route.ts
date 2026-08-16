import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function GET(request: Request) {
  const url = new URL(request.url);
  // ?includeUser=1 → sertakan akun login yang belum ter-link (untuk dropdown admin)
  const includeUser = url.searchParams.get("includeUser") === "1";

  const petugas = await prisma.petugas.findMany({
    where: { deletedAt: null },
    include: {
      wilayah: true,
      kelurahan: true,
      user: { select: { id: true, nama: true, email: true, role: true } },
      _count: { select: { rute: true, pengangkutan: true } },
    },
    orderBy: { nama: "asc" },
  });

  if (!includeUser) return NextResponse.json(petugas);

  // Akun login ber-role petugas yang belum ter-link ke profil lapangan mana pun
  const linked = new Set(petugas.map((p) => p.userId).filter((x): x is number => x != null));
  const akun = await prisma.user.findMany({
    where: { role: "petugas" },
    select: { id: true, nama: true, email: true },
    orderBy: { nama: "asc" },
  });
  const tersedia = akun.filter((u) => !linked.has(u.id));
  return NextResponse.json({ petugas, akunTersedia: tersedia });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nama, noTelepon, email, foto, wilayahId, kelurahanId, jabatan, userId } = body;

    if (!nama || !noTelepon || !wilayahId) {
      return NextResponse.json({ error: "Nama, no telepon, dan wilayah harus diisi" }, { status: 400 });
    }

    const petugas = await prisma.petugas.create({
      data: {
        nama,
        noTelepon,
        email,
        foto,
        jabatan: Array.isArray(jabatan) ? jabatan.join(",") : (jabatan || null),
        userId: userId ? parseInt(userId) : null,
        wilayahId: parseInt(wilayahId),
        kelurahanId: kelurahanId ? parseInt(kelurahanId) : null,
      },
      include: { wilayah: true, kelurahan: true },
    });

    await logAudit("create", "Petugas", petugas.id, undefined, { nama: petugas.nama, jabatan: petugas.jabatan });
    return NextResponse.json(petugas, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Gagal menambah petugas" }, { status: 500 });
  }
}
