import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getPetugasKelurahan, PETUGAS_SCOPE_ALL } from "@/lib/scope";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt((await params).id);
    const body = await request.json();
    const { tanggal, status, catatan, volume, berat, jenisSampah, petugasId, fotoBukti, tpaId, latitude, longitude, kendaraanId } = body;

    const data: Record<string, unknown> = {};
    if (tanggal !== undefined) data.tanggal = new Date(tanggal);
    if (status !== undefined) data.status = status;
    if (catatan !== undefined) data.catatan = catatan;
    if (fotoBukti !== undefined) data.fotoBukti = fotoBukti;
    if (volume !== undefined) data.volume = volume ? parseFloat(volume) : null;
    if (berat !== undefined) data.berat = berat ? parseFloat(berat) : null;
    if (jenisSampah !== undefined) data.jenisSampah = jenisSampah || null;
    if (tpaId !== undefined) data.tpaId = tpaId ? parseInt(tpaId) : null;
    if (petugasId !== undefined) {
      data.petugasId = petugasId ? parseInt(petugasId) : null;
    }
    if (kendaraanId !== undefined) data.kendaraanId = kendaraanId ? parseInt(kendaraanId) : null;
    if (latitude !== undefined) data.latitude = latitude ? parseFloat(latitude) : null;
    if (longitude !== undefined) data.longitude = longitude ? parseFloat(longitude) : null;

    // Petugas login → petugasId diambil dari profil (link userId), bukan dari body
    const session = await getSession();
    if (session && session.role === "petugas") {
      const profil = await prisma.petugas.findUnique({
        where: { userId: session.id },
        select: { id: true },
      });
      if (!profil) {
        return NextResponse.json({ error: "Akun belum ter-link ke profil petugas" }, { status: 403 });
      }
      data.petugasId = profil.id;

      const existing = await prisma.pengangkutan.findUnique({
        where: { id },
        select: { petugasId: true, pelanggan: { select: { wilayah: { select: { kelurahanId: true } } } } },
      });
      if (!existing) {
        return NextResponse.json({ error: "Data pengangkutan tidak ditemukan" }, { status: 404 });
      }

      // Scope: petugas hanya boleh update tugas miliknya / pelanggan di kelurahannya.
      // (nonaktif sementara — PETUGAS_SCOPE_ALL = semua kelurahan)
      if (!PETUGAS_SCOPE_ALL) {
        const kelurahanId = await getPetugasKelurahan(session.id);
        if (existing.petugasId !== profil.id && existing.pelanggan.wilayah?.kelurahanId !== kelurahanId) {
          return NextResponse.json(
            { error: "Data pengangkutan di luar wilayah Anda" },
            { status: 403 }
          );
        }
      }
      // Kendaraan yang dipakai harus milik petugas ini (pengemudi)
      if (kendaraanId !== undefined && kendaraanId) {
        const k = await prisma.kendaraan.findFirst({
          where: { id: parseInt(kendaraanId), deletedAt: null, petugasId: profil.id },
          select: { id: true },
        });
        if (!k) {
          return NextResponse.json({ error: "Kendaraan bukan milik Anda" }, { status: 403 });
        }
      }
    }

    const pengangkutan = await prisma.pengangkutan.update({
      where: { id },
      data,
      include: {
        pelanggan: { select: { id: true, nama: true } },
        petugas: { select: { id: true, nama: true } },
      },
    });

    // Audit log — atribusi dari session, bukan body (anti spoofing)
    await prisma.auditLog.create({
      data: {
        aksi: "update",
        entitas: "Pengangkutan",
        entitasId: id,
        dataBaru: JSON.stringify({ status, volume, berat, jenisSampah }),
        userId: session?.id ?? null,
      },
    });

    return NextResponse.json(pengangkutan);
  } catch {
    return NextResponse.json({ error: "Gagal mengupdate pengangkutan" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt((await params).id);
    // Soft delete
    await prisma.pengangkutan.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return NextResponse.json({ message: "Data pengangkutan berhasil dihapus" });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus pengangkutan" }, { status: 500 });
  }
}
