import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

type PesanView = {
  id: number;
  petugasId: number;
  dariPetugas: boolean;
  isi: string;
  dibaca: boolean;
  createdAt: Date;
  pengirim: { nama: string; role: string };
};

function toView(m: {
  id: number;
  petugasId: number;
  dariPetugas: boolean;
  isi: string;
  dibaca: boolean;
  createdAt: Date;
  petugas: { nama: string };
  user: { nama: string; role: string } | null;
}): PesanView {
  return {
    id: m.id,
    petugasId: m.petugasId,
    dariPetugas: m.dariPetugas,
    isi: m.isi,
    dibaca: m.dibaca,
    createdAt: m.createdAt,
    pengirim: m.dariPetugas
      ? { nama: m.petugas.nama, role: "petugas" }
      : { nama: m.user?.nama ?? "Admin", role: m.user?.role ?? "admin" },
  };
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
    }

    const url = new URL(request.url);
    const petugasIdParam = url.searchParams.get("petugasId");

    // Petugas: hanya bisa membaca thread miliknya sendiri
    if (session.role === "petugas") {
      const profil = await prisma.petugas.findUnique({
        where: { userId: session.id },
        select: { id: true, nama: true },
      });
      if (!profil) {
        return NextResponse.json({ error: "Akun belum ter-link ke profil petugas" }, { status: 403 });
      }
      const pesan = await prisma.chatPesan.findMany({
        where: { petugasId: profil.id },
        orderBy: { createdAt: "asc" },
        include: {
          petugas: { select: { nama: true } },
          user: { select: { nama: true, role: true } },
        },
      });
      return NextResponse.json({
        petugasId: profil.id,
        pesan: pesan.map(toView),
      });
    }

    // Admin/kasir/superadmin: thread spesifik atau daftar thread
    if (petugasIdParam) {
      const pid = parseInt(petugasIdParam);
      if (!Number.isFinite(pid)) {
        return NextResponse.json({ error: "petugasId tidak valid" }, { status: 400 });
      }
      const pesan = await prisma.chatPesan.findMany({
        where: { petugasId: pid },
        orderBy: { createdAt: "asc" },
        include: {
          petugas: { select: { nama: true } },
          user: { select: { nama: true, role: true } },
        },
      });
      const petugas = await prisma.petugas.findUnique({
        where: { id: pid },
        select: { id: true, nama: true, jabatan: true, wilayah: { select: { nama: true } } },
      });
      return NextResponse.json({
        petugasId: pid,
        petugas,
        pesan: pesan.map(toView),
      });
    }

    // Daftar thread: semua petugas aktif (termasuk yang belum ada pesan),
    // masing-masing dengan pesan terakhir + unread count.
    const petugasList = await prisma.petugas.findMany({
      where: { aktif: true },
      select: { id: true, nama: true, jabatan: true, wilayah: { select: { nama: true } } },
      orderBy: { nama: "asc" },
    });
    const pesan = await prisma.chatPesan.findMany({
      orderBy: { createdAt: "asc" },
    });

    const byPetugas = new Map<
      number,
      { petugasId: number; nama: string; jabatan: string | null; wilayah: string | null; pesanTerakhir: string; waktuTerakhir: Date; unread: number }
    >();
    for (const p of petugasList) {
      byPetugas.set(p.id, {
        petugasId: p.id,
        nama: p.nama,
        jabatan: p.jabatan,
        wilayah: p.wilayah?.nama ?? null,
        pesanTerakhir: "",
        waktuTerakhir: new Date(0),
        unread: 0,
      });
    }
    for (const m of pesan) {
      const cur = byPetugas.get(m.petugasId);
      if (!cur) continue;
      if (m.dariPetugas && !m.dibaca) cur.unread += 1;
      cur.pesanTerakhir = m.isi;
      cur.waktuTerakhir = m.createdAt;
    }

    return NextResponse.json(
      [...byPetugas.values()].sort((a, b) => b.waktuTerakhir.getTime() - a.waktuTerakhir.getTime())
    );
  } catch {
    return NextResponse.json({ error: "Gagal memuat chat" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
    }

    const body = await request.json();
    const isi = String(body.isi ?? "").trim();
    if (!isi) {
      return NextResponse.json({ error: "Pesan tidak boleh kosong" }, { status: 400 });
    }

    let petugasId: number;
    let dariPetugas: boolean;
    let userId: number | null = null;

    if (session.role === "petugas") {
      const profil = await prisma.petugas.findUnique({
        where: { userId: session.id },
        select: { id: true },
      });
      if (!profil) {
        return NextResponse.json({ error: "Akun belum ter-link ke profil petugas" }, { status: 403 });
      }
      petugasId = profil.id;
      dariPetugas = true;
    } else {
      const pid = parseInt(body.petugasId);
      if (!Number.isFinite(pid)) {
        return NextResponse.json({ error: "Pilih petugas tujuan" }, { status: 400 });
      }
      petugasId = pid;
      dariPetugas = false;
      userId = session.id;
    }

    const pesan = await prisma.chatPesan.create({
      data: {
        petugasId,
        userId,
        dariPetugas,
        isi,
      },
      include: {
        petugas: { select: { nama: true } },
        user: { select: { nama: true, role: true } },
      },
    });

    return NextResponse.json(toView(pesan), { status: 201 });
  } catch {
    return NextResponse.json({ error: "Gagal mengirim pesan" }, { status: 500 });
  }
}
