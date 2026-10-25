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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt((await params).id);
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { fotoRumah, patokanLokasi, latitude, longitude, koordinatSumber, status, kategori, customTarif } = body;

    const data: Record<string, unknown> = {};
    if (fotoRumah !== undefined) data.fotoRumah = fotoRumah;
    if (patokanLokasi !== undefined) data.patokanLokasi = patokanLokasi;
    if (latitude !== undefined) data.latitude = latitude ? parseFloat(latitude) : null;
    if (longitude !== undefined) data.longitude = longitude ? parseFloat(longitude) : null;
    if (koordinatSumber !== undefined) data.koordinatSumber = koordinatSumber;
    if (status !== undefined) data.status = status;
    if (kategori !== undefined) data.kategori = kategori;
    if (customTarif !== undefined) data.customTarif = customTarif ? parseFloat(customTarif) : null;

    const updated = await prisma.pelanggan.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Gagal menyimpan hasil survei" }, { status: 500 });
  }
}

