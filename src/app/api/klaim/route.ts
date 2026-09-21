import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ROLE_HIERARCHY } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isPetugas = session.role === "petugas";
  let petugasId = undefined;

  if (isPetugas) {
    const petugas = await prisma.petugas.findUnique({ where: { userId: session.id } });
    if (!petugas) return NextResponse.json({ error: "Petugas tidak ditemukan" }, { status: 400 });
    petugasId = petugas.id;
  }

  const where = isPetugas ? { petugasId } : {};

  const klaim = await prisma.klaimPetugas.findMany({
    where,
    omit: { fotoBukti: true },
    orderBy: { tanggal: "desc" },
    include: {
      petugas: { select: { nama: true } },
      diperiksaBy: { select: { nama: true } }
    }
  });

  return NextResponse.json({ klaim });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "petugas") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const petugas = await prisma.petugas.findUnique({ where: { userId: session.id } });
  if (!petugas) return NextResponse.json({ error: "Petugas tidak ditemukan" }, { status: 400 });

  const body = await request.json();
  const { kategori, nominal, keterangan, fotoBukti } = body;

  if (!kategori || !nominal || !keterangan) {
    return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
  }

  const klaim = await prisma.klaimPetugas.create({
    data: {
      petugasId: petugas.id,
      kategori,
      nominal: parseFloat(nominal),
      keterangan,
      fotoBukti
    }
  });

  return NextResponse.json({ ok: true, klaim });
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roleLevel = ROLE_HIERARCHY[session.role as keyof typeof ROLE_HIERARCHY] || 0;
  if (roleLevel < 50) return NextResponse.json({ error: "Hanya Admin/Superadmin yang bisa memproses klaim" }, { status: 403 });

  const body = await request.json();
  const { id, status, catatanAdmin } = body;

  if (!id || !status) return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });

  const klaim = await prisma.klaimPetugas.findUnique({ where: { id: parseInt(id) } });
  if (!klaim) return NextResponse.json({ error: "Klaim tidak ditemukan" }, { status: 404 });
  if (klaim.status !== "menunggu") return NextResponse.json({ error: "Klaim sudah diproses sebelumnya" }, { status: 400 });

  const updatedKlaim = await prisma.$transaction(async (tx) => {
    // 1. Update status klaim
    const res = await tx.klaimPetugas.update({
      where: { id: klaim.id },
      data: {
        status,
        catatanAdmin,
        diperiksaById: session.id,
        waktuDiperiksa: new Date()
      }
    });

    // 2. Jika disetujui, catat ke Pengeluaran
    if (status === "disetujui") {
      await tx.pengeluaran.create({
        data: {
          kategori: klaim.kategori,
          jumlah: klaim.nominal,
          keterangan: `[Klaim Disetujui] ${klaim.keterangan}`,
          bukti: klaim.fotoBukti,
          dicatatById: session.id
        }
      });
    }

    return res;
  });

  return NextResponse.json({ ok: true, klaim: updatedKlaim });
}
