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
      zona: { select: { zonaId: true } },
      user: { select: { id: true, nama: true, email: true, role: true } },
      _count: { select: { rute: true, pengangkutan: true } },
    },
    orderBy: { nama: "asc" },
  });

  // Agregasi jumlah referral dari pelanggan
  const referralCounts = await prisma.pelanggan.groupBy({
    by: ["referal"],
    where: {
      referal: { not: null },
      deletedAt: null,
    },
    _count: { id: true },
  });

  const refMap = new Map<string, number>();
  for (const r of referralCounts) {
    if (r.referal) {
      refMap.set(r.referal.trim().toLowerCase(), r._count.id);
    }
  }

  const petugasWithReferral = petugas.map((p) => {
    const countNama = refMap.get(p.nama.trim().toLowerCase()) || 0;
    const countUser = p.user?.nama ? (refMap.get(p.user.nama.trim().toLowerCase()) || 0) : 0;
    const referralCount = Math.max(countNama, countUser);
    return {
      ...p,
      _count: {
        ...p._count,
        referral: referralCount,
      },
    };
  });

  if (!includeUser) return NextResponse.json(petugasWithReferral);

  // Akun login ber-role petugas yang belum ter-link ke profil lapangan mana pun
  const linked = new Set(petugas.map((p) => p.userId).filter((x): x is number => x != null));
  const akun = await prisma.user.findMany({
    where: { role: "petugas" },
    select: { id: true, nama: true, email: true },
    orderBy: { nama: "asc" },
  });
  const tersedia = akun.filter((u) => !linked.has(u.id));
  return NextResponse.json({ petugas: petugasWithReferral, akunTersedia: tersedia });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nama, noTelepon, email, foto, kelurahanId, jabatan, userId, zonaIds } = body;

    if (!nama || !noTelepon || !kelurahanId) {
      return NextResponse.json({ error: "Nama, no telepon, dan kelurahan harus diisi" }, { status: 400 });
    }

    const petugas = await prisma.petugas.create({
      data: {
        nama,
        noTelepon,
        email,
        foto,
        jabatan: Array.isArray(jabatan) ? jabatan.join(",") : (jabatan || null),
        userId: userId ? parseInt(userId) : null,
        kelurahanId: parseInt(kelurahanId),
      },
      include: { wilayah: true, kelurahan: true },
    });

    if (zonaIds && Array.isArray(zonaIds)) {
      const validZonaIds = zonaIds.map(id => parseInt(id)).filter(id => !isNaN(id));
      if (validZonaIds.length > 0) {
        await prisma.zonaPetugas.createMany({
          data: validZonaIds.map(zonaId => ({
            zonaId,
            petugasId: petugas.id
          })),
          skipDuplicates: true
        });
      }
    }

    await logAudit("create", "Petugas", petugas.id, undefined, { nama: petugas.nama, jabatan: petugas.jabatan });
    return NextResponse.json(petugas, { status: 201 });
  } catch (err: unknown) {
    console.error("POST /api/petugas error:", err);
    const code = (err as { code?: string })?.code;
    if (code === "P2002") {
      return NextResponse.json({ error: "Akun login (User) sudah terhubung ke petugas lain." }, { status: 400 });
    }
    if (code === "P2003") {
      return NextResponse.json({ error: "Data Kelurahan atau User yang dipilih tidak ditemukan di database. Pastikan data kelurahan sudah tersinkron." }, { status: 400 });
    }
    const message = (err as Error)?.message || "Gagal menambah petugas";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
