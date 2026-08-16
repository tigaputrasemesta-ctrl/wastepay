import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { getSession } from "@/lib/auth";
import { getPetugasKelurahan, PETUGAS_SCOPE_ALL } from "@/lib/scope";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = parseInt((await params).id);
  const pelanggan = await prisma.pelanggan.findUnique({
    where: { id },
    include: {
      wilayah: true,
      paket: true,
      jadwal: { include: { rute: true } },
      tagihan: { orderBy: [{ tahun: "desc" }, { bulan: "desc" }], take: 12 },
      pembayaran: { orderBy: { createdAt: "desc" }, take: 12 },
      pengangkutan: { orderBy: { tanggal: "desc" }, take: 20 },
      komplain: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });

  if (!pelanggan) {
    return NextResponse.json({ error: "Pelanggan tidak ditemukan" }, { status: 404 });
  }

  // Scope kelurahan: petugas hanya boleh melihat pelanggan di kelurahannya sendiri
  // (nonaktif sementara — PETUGAS_SCOPE_ALL = semua kelurahan).
  const session = await getSession();
  if (session && session.role === "petugas" && !PETUGAS_SCOPE_ALL) {
    const kelurahanId = await getPetugasKelurahan(session.id);
    // 404 (bukan 403) agar tidak membocorkan keberadaan pelanggan (anti-enumerasi).
    if (!kelurahanId || pelanggan.wilayah?.kelurahanId !== kelurahanId) {
      return NextResponse.json({ error: "Pelanggan tidak ditemukan" }, { status: 404 });
    }
  }

  return NextResponse.json(pelanggan);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt((await params).id);
    const body = await request.json();
    const { nama, noTelepon, kategori, alamat, rtRw, fotoRumah, patokanLokasi, latitude, longitude, koordinatSumber, koordinatAkurasi, penanggungjawab, referal, wilayahId, paketId, status, catatan } = body;

    // Petugas (role petugas) hanya boleh melalui jabatan survei,
    // hanya mengubah field survei — bukan data keuangan/sebarang,
    // dan hanya untuk pelanggan di wilayahnya sendiri.
    const session = await getSession();
    if (session && session.role === "petugas") {
      const profil = await prisma.petugas.findUnique({
        where: { userId: session.id },
        select: { jabatan: true },
      });
      if (!profil) {
        return NextResponse.json(
          { error: "Akun belum ter-link ke profil petugas" },
          { status: 403 }
        );
      }
      if (!(profil.jabatan || "").split(",").includes("survei")) {
        return NextResponse.json(
          { error: "Jabatan Anda tidak berwenang mengubah data pelanggan" },
          { status: 403 }
        );
      }
      // Petugas survei hanya boleh mengubah pelanggan di KELURAHAN-nya sendiri
      // (nonaktif sementara — PETUGAS_SCOPE_ALL = semua kelurahan).
      if (!PETUGAS_SCOPE_ALL) {
        const kelurahanId = await getPetugasKelurahan(session.id);
        const target = await prisma.pelanggan.findUnique({
          where: { id },
          select: { wilayah: { select: { kelurahanId: true } } },
        });
        if (!target) {
          return NextResponse.json({ error: "Pelanggan tidak ditemukan" }, { status: 404 });
        }
        if (!kelurahanId || target.wilayah?.kelurahanId !== kelurahanId) {
          return NextResponse.json(
            { error: "Pelanggan di luar wilayah Anda" },
            { status: 403 }
          );
        }
      }
      // Whitelist: petugas survei hanya boleh menyentuh field survei + aktivasi.
      // wilayahId TIDAK termasuk — pindah wilayah hanya wewenang admin.
      const fieldSurvei: Record<string, unknown> = {};
      if (fotoRumah !== undefined) fieldSurvei.fotoRumah = fotoRumah;
      if (patokanLokasi !== undefined) fieldSurvei.patokanLokasi = patokanLokasi;
      if (latitude !== undefined) fieldSurvei.latitude = latitude ? parseFloat(latitude) : null;
      if (longitude !== undefined) fieldSurvei.longitude = longitude ? parseFloat(longitude) : null;
      if (koordinatSumber !== undefined) fieldSurvei.koordinatSumber = koordinatSumber || null;
      if (koordinatAkurasi !== undefined) fieldSurvei.koordinatAkurasi = koordinatAkurasi ? parseFloat(koordinatAkurasi) : null;
      if (alamat !== undefined) fieldSurvei.alamat = alamat;
      if (rtRw !== undefined) fieldSurvei.rtRw = rtRw;
      if (noTelepon !== undefined) fieldSurvei.noTelepon = noTelepon;
      if (penanggungjawab !== undefined) fieldSurvei.penanggungjawab = penanggungjawab;
      if (referal !== undefined) fieldSurvei.referal = referal;
      if (catatan !== undefined) fieldSurvei.catatan = catatan;
      if (status !== undefined && status === "aktif") fieldSurvei.status = "aktif";

      const hasil = await prisma.pelanggan.update({
        where: { id },
        data: fieldSurvei,
        include: { wilayah: true, paket: true },
      });
      await logAudit("update", "Pelanggan", id, { id }, { nama: hasil.nama, status: hasil.status, sumber: "survei_petugas" });
      return NextResponse.json(hasil);
    }

    const data: Record<string, unknown> = {};
    if (nama !== undefined) data.nama = nama;
    if (noTelepon !== undefined) data.noTelepon = noTelepon;
    if (kategori !== undefined) data.kategori = kategori;
    if (alamat !== undefined) data.alamat = alamat;
    if (rtRw !== undefined) data.rtRw = rtRw;
    if (fotoRumah !== undefined) data.fotoRumah = fotoRumah;
    if (patokanLokasi !== undefined) data.patokanLokasi = patokanLokasi;
    if (latitude !== undefined) data.latitude = latitude ? parseFloat(latitude) : null;
    if (longitude !== undefined) data.longitude = longitude ? parseFloat(longitude) : null;
    if (koordinatSumber !== undefined) data.koordinatSumber = koordinatSumber || null;
    if (koordinatAkurasi !== undefined) data.koordinatAkurasi = koordinatAkurasi ? parseFloat(koordinatAkurasi) : null;
    if (penanggungjawab !== undefined) data.penanggungjawab = penanggungjawab;
    if (referal !== undefined) data.referal = referal;
    if (body.customTarif !== undefined) data.customTarif = body.customTarif ? parseFloat(body.customTarif) : null;
    if (status !== undefined) data.status = status;
    if (wilayahId !== undefined) data.wilayahId = parseInt(wilayahId);
    if (paketId !== undefined) data.paketId = paketId ? parseInt(paketId) : null;

    const pelanggan = await prisma.pelanggan.update({
      where: { id },
      data,
      include: { wilayah: true, paket: true },
    });

    await logAudit("update", "Pelanggan", id, { id }, { nama: pelanggan.nama, status: pelanggan.status });

    return NextResponse.json(pelanggan);
  } catch {
    return NextResponse.json({ error: "Gagal mengupdate pelanggan" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt((await params).id);
    // Soft delete — pertahankan riwayat tagihan/pembayaran
    const pelanggan = await prisma.pelanggan.findUnique({ where: { id }, select: { nama: true } });
    await prisma.pelanggan.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await logAudit("delete", "Pelanggan", id, { nama: pelanggan?.nama }, undefined);
    return NextResponse.json({ message: "Pelanggan berhasil dihapus" });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus pelanggan" }, { status: 500 });
  }
}
