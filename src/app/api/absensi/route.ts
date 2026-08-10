import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const petugas = await prisma.petugas.findUnique({ where: { userId: session.id } });
  
  if (session.role === "petugas" && !petugas) {
     return NextResponse.json({ error: "Data petugas tidak ditemukan" }, { status: 400 });
  }

  const where = session.role === "petugas" ? { petugasId: petugas?.id } : {};

  const absensi = await prisma.absensi.findMany({
    where,
    orderBy: { waktuMasuk: "desc" },
    take: 50,
    include: {
      petugas: { select: { nama: true, jabatan: true } }
    }
  });

  let statusHariIni = null;
  if (petugas) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    
    statusHariIni = await prisma.absensi.findFirst({
      where: {
        petugasId: petugas.id,
        waktuMasuk: { gte: startOfDay, lte: endOfDay }
      }
    });
  }

  return NextResponse.json({ absensi, statusHariIni });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "petugas") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const petugas = await prisma.petugas.findUnique({ where: { userId: session.id } });
  if (!petugas) return NextResponse.json({ error: "Data petugas tidak ditemukan" }, { status: 400 });

  const body = await request.json();
  const action = body.action; 
  const latitude = body.latitude;
  const longitude = body.longitude;
  
  const lokasiData = JSON.stringify({ lat: latitude, lng: longitude });

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  if (action === "masuk") {
    const exists = await prisma.absensi.findFirst({
      where: {
        petugasId: petugas.id,
        waktuMasuk: { gte: startOfDay, lte: endOfDay }
      }
    });

    if (exists) return NextResponse.json({ error: "Sudah absen masuk hari ini" }, { status: 400 });

    const absensi = await prisma.absensi.create({
      data: {
        petugasId: petugas.id,
        lokasiMasuk: lokasiData,
        status: "hadir"
      }
    });
    return NextResponse.json({ ok: true, absensi });
  } 
  
  if (action === "selesai") {
    const exists = await prisma.absensi.findFirst({
      where: {
        petugasId: petugas.id,
        waktuMasuk: { gte: startOfDay, lte: endOfDay }
      }
    });

    if (!exists) return NextResponse.json({ error: "Belum absen masuk hari ini" }, { status: 400 });
    if (exists.waktuSelesai) return NextResponse.json({ error: "Sudah absen selesai hari ini" }, { status: 400 });

    const absensi = await prisma.absensi.update({
      where: { id: exists.id },
      data: {
        waktuSelesai: new Date(),
        lokasiSelesai: lokasiData,
      }
    });
    return NextResponse.json({ ok: true, absensi });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
