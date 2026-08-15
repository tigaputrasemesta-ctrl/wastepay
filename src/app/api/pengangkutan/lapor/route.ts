import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const STATUS_VALID = ["diambil", "tidak_diangkut", "kosong"];

function rentangHariIni() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/**
 * Lapor cepat petugas lapangan: cukup input KODE PELANGGAN → tandai status angkut.
 * - GET  ?kode=XXX → cek pelanggan (scope wilayah petugas) + laporan hari ini
 * - POST → buat/update data Pengangkutan hari ini
 */
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "petugas") {
      return NextResponse.json({ error: "Hanya petugas lapangan" }, { status: 403 });
    }
    const profil = await prisma.petugas.findUnique({
      where: { userId: session.id },
      select: { id: true, wilayahId: true },
    });
    if (!profil) {
      return NextResponse.json({ error: "Akun belum ter-link ke profil petugas" }, { status: 403 });
    }

    const kode = new URL(request.url).searchParams.get("kode")?.trim().toUpperCase();
    if (!kode) {
      return NextResponse.json({ error: "Kode pelanggan harus diisi" }, { status: 400 });
    }

    const pelanggan = await prisma.pelanggan.findFirst({
      where: {
        kodePelanggan: { equals: kode, mode: "insensitive" },
        deletedAt: null,
        wilayahId: profil.wilayahId,
      },
      select: {
        id: true,
        nama: true,
        alamat: true,
        kodePelanggan: true,
        status: true,
        patokanLokasi: true,
      },
    });
    if (!pelanggan) {
      return NextResponse.json(
        { error: `Kode "${kode}" tidak ditemukan di wilayah Anda` },
        { status: 404 }
      );
    }

    const { start, end } = rentangHariIni();
    const laporan = await prisma.pengangkutan.findMany({
      where: { pelangganId: pelanggan.id, deletedAt: null, tanggal: { gte: start, lte: end } },
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true, createdAt: true, petugas: { select: { nama: true } } },
    });

    return NextResponse.json({ pelanggan, laporan });
  } catch {
    return NextResponse.json({ error: "Gagal cek pelanggan" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "petugas") {
      return NextResponse.json({ error: "Hanya petugas lapangan" }, { status: 403 });
    }
    const profil = await prisma.petugas.findUnique({
      where: { userId: session.id },
      select: { id: true, wilayahId: true },
    });
    if (!profil) {
      return NextResponse.json({ error: "Akun belum ter-link ke profil petugas" }, { status: 403 });
    }

    const body = await request.json();
    const kode = String(body.kodePelanggan ?? "").trim().toUpperCase();
    const status = body.status;
    if (!kode) {
      return NextResponse.json({ error: "Kode pelanggan harus diisi" }, { status: 400 });
    }
    if (!STATUS_VALID.includes(status)) {
      return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });
    }

    const pelanggan = await prisma.pelanggan.findFirst({
      where: {
        kodePelanggan: { equals: kode, mode: "insensitive" },
        deletedAt: null,
        wilayahId: profil.wilayahId,
      },
      select: { id: true, nama: true, kodePelanggan: true },
    });
    if (!pelanggan) {
      return NextResponse.json(
        { error: `Kode "${kode}" tidak ditemukan di wilayah Anda` },
        { status: 404 }
      );
    }

    // Validasi kendaraan (jika diisi) milik petugas ini
    let kendaraanId: number | null = null;
    if (body.kendaraanId) {
      const k = await prisma.kendaraan.findFirst({
        where: { id: parseInt(body.kendaraanId), deletedAt: null, petugasId: profil.id },
        select: { id: true },
      });
      if (!k) {
        return NextResponse.json({ error: "Kendaraan bukan milik Anda" }, { status: 403 });
      }
      kendaraanId = k.id;
    }

    const data = {
      status,
      catatan: body.catatan || null,
      fotoBukti: body.fotoBukti || null,
      volume: body.volume ? parseFloat(body.volume) : null,
      berat: body.berat ? parseFloat(body.berat) : null,
      jenisSampah: body.jenisSampah || null,
      latitude: body.latitude ? parseFloat(body.latitude) : null,
      longitude: body.longitude ? parseFloat(body.longitude) : null,
      kendaraanId,
      petugasId: profil.id,
    };

    const { start, end } = rentangHariIni();
    const existing = await prisma.pengangkutan.findFirst({
      where: { pelangganId: pelanggan.id, deletedAt: null, tanggal: { gte: start, lte: end } },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    let result;
    let dibuat: boolean;
    if (existing) {
      result = await prisma.pengangkutan.update({
        where: { id: existing.id },
        data,
        include: { pelanggan: { select: { id: true, nama: true, kodePelanggan: true } } },
      });
      dibuat = false;
    } else {
      result = await prisma.pengangkutan.create({
        data: { ...data, tanggal: new Date(), pelangganId: pelanggan.id },
        include: { pelanggan: { select: { id: true, nama: true, kodePelanggan: true } } },
      });
      dibuat = true;
    }

    await logAudit(dibuat ? "create" : "update", "Pengangkutan", result.id, undefined, {
      pelangganId: pelanggan.id,
      kodePelanggan: pelanggan.kodePelanggan,
      status,
      via: "lapor_kode",
    });

    return NextResponse.json({ ...result, dibuat }, { status: dibuat ? 201 : 200 });
  } catch {
    return NextResponse.json({ error: "Gagal menyimpan laporan" }, { status: 500 });
  }
}
