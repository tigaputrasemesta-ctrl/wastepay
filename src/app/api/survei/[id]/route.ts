import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getPetugasKelurahan, PETUGAS_SCOPE_ALL } from "@/lib/scope";

/**
 * Detail pendaftar khusus petugas — hanya field survei, TANPA data keuangan
 * (tagihan/pembayaran/pengangkutan/komplain tidak ikut dikirim).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = parseInt((await params).id);
  const pelanggan = await prisma.pelanggan.findUnique({
    where: { id },
    select: {
      id: true,
      nama: true,
      kodePelanggan: true,
      noTelepon: true,
      kategori: true,
      alamat: true,
      rtRw: true,
      patokanLokasi: true,
      fotoRumah: true,
      latitude: true,
      longitude: true,
      koordinatSumber: true,
      koordinatAkurasi: true,
      penanggungjawab: true,
      referal: true,
      catatan: true,
      status: true,
      createdAt: true,
      kelurahanId: true,
      wilayah: { select: { id: true, nama: true } },
      kelurahan: { select: { id: true, nama: true, kecamatan: true } },
      paket: { select: { id: true, nama: true, harga: true, deskripsi: true } },
    },
  });

  if (!pelanggan) {
    return NextResponse.json({ error: "Pelanggan tidak ditemukan" }, { status: 404 });
  }

  // Scope kelurahan: petugas hanya boleh lihat pelanggan di kelurahannya sendiri
  // (nonaktif sementara — PETUGAS_SCOPE_ALL = semua kelurahan).
  const session = await getSession();
  if (session && session.role === "petugas" && !PETUGAS_SCOPE_ALL) {
    const kelurahanId = await getPetugasKelurahan(session.id);
    // 404 (bukan 403) agar tidak membocorkan keberadaan pelanggan (anti-enumerasi).
    if (!kelurahanId || pelanggan.kelurahanId !== kelurahanId) {
      return NextResponse.json({ error: "Pelanggan tidak ditemukan" }, { status: 404 });
    }
  }

  return NextResponse.json(pelanggan);
}
