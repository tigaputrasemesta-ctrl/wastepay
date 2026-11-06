import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { todayLocalISO } from "@/lib/utils";

const HARI_MAP = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tanggalStr = searchParams.get("tanggal") || todayLocalISO();
    const kendaraanIdParam = searchParams.get("kendaraanId");

    // Ambil daftar kendaraan aktif
    const allKendaraan = await prisma.kendaraan.findMany({
      where: { aktif: true, deletedAt: null },
      select: {
        id: true,
        nama: true,
        platNomor: true,
        jenis: true,
        kapasitas: true,
      },
      orderBy: { id: "asc" },
    });

    let selectedKendaraanId = kendaraanIdParam ? parseInt(kendaraanIdParam) : null;
    if (!selectedKendaraanId && allKendaraan.length > 0) {
      // Default: armada pertama
      selectedKendaraanId = allKendaraan[0].id;
    }

    if (!selectedKendaraanId) {
      return NextResponse.json({ error: "Tidak ada armada aktif" }, { status: 400 });
    }

    const kendaraan = allKendaraan.find((k) => k.id === selectedKendaraanId) || allKendaraan[0];

    // Tentukan hari dalam seminggu
    const dateObj = new Date(`${tanggalStr}T00:00:00`);
    const dayIndex = dateObj.getDay(); // 0 = Minggu, 1 = Senin, ...
    const hariIndo = HARI_MAP[dayIndex] || "Senin";

    // Cari rute aktif kendaraan ini untuk hari tersebut
    const rutes = await prisma.rute.findMany({
      where: {
        aktif: true,
        kendaraanId: kendaraan.id,
        hari: { contains: hariIndo },
      },
      include: {
        zona: { select: { id: true, nama: true } },
        zonas: { select: { id: true, nama: true } },
      },
    });

    const activeRute = rutes[0] || null;
    const cakupanZonas = activeRute
      ? [activeRute.zona?.nama, ...(activeRute.zonas?.map((z) => z.nama) || [])].filter(Boolean)
      : [];

    // Ambil semua tugas pengangkutan untuk armada & tanggal tersebut
    const startDate = new Date(`${tanggalStr}T00:00:00.000Z`);
    const endDate = new Date(`${tanggalStr}T23:59:59.999Z`);

    const tugasList = await prisma.pengangkutan.findMany({
      where: {
        kendaraanId: kendaraan.id,
        tanggal: { gte: startDate, lte: endDate },
      },
      include: {
        pelanggan: {
          select: {
            id: true,
            nama: true,
            alamat: true,
            rtRw: true,
            wilayah: { select: { nama: true, zona: { select: { nama: true } } } },
          },
        },
        petugas: { select: { id: true, nama: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    const totalTarget = tugasList.length;
    const diambil = tugasList.filter((t) => t.status === "diambil").length;
    const kosong = tugasList.filter((t) => t.status === "kosong").length;
    const tidakDiangkut = tugasList.filter((t) => t.status === "tidak_diangkut").length;
    const belumDiambil = tugasList.filter((t) => t.status === "terjadwal").length;

    const totalSelesai = diambil + kosong;
    const persentase = totalTarget > 0 ? Math.round((totalSelesai / totalTarget) * 100) : 0;

    const totalVolume = tugasList.reduce((acc, t) => acc + (t.volume || 0), 0);
    const totalBerat = tugasList.reduce((acc, t) => acc + (t.berat || 0), 0);

    return NextResponse.json({
      tanggal: tanggalStr,
      hari: hariIndo,
      kendaraan,
      daftarKendaraan: allKendaraan,
      rute: activeRute
        ? {
            id: activeRute.id,
            nama: activeRute.nama,
            hari: activeRute.hari,
            zonas: cakupanZonas,
          }
        : null,
      ringkasan: {
        totalTarget,
        diambil,
        kosong,
        tidakDiangkut,
        belumDiambil,
        persentase,
        totalVolume,
        totalBerat,
      },
      tugasTerbaru: tugasList.slice(0, 50).map((t) => ({
        id: t.id,
        status: t.status,
        pelangganNama: t.pelanggan.nama,
        alamat: t.pelanggan.alamat,
        zona: t.pelanggan.wilayah?.zona?.nama || "-",
        petugasNama: t.petugas?.nama || "-",
        jam: t.updatedAt.toISOString().slice(11, 16),
        catatan: t.catatan,
      })),
    });
  } catch (error) {
    console.error("GET /api/m/report-armada error:", error);
    return NextResponse.json({ error: "Gagal memuat report armada" }, { status: 500 });
  }
}
