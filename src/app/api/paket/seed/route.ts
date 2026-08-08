import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_PAKET = [
  { nama: "Paket A (2x/minggu)", harga: 30000, deskripsi: "Pengangkutan 2 kali seminggu (Senin & Kamis)" },
  { nama: "Paket B (3x/minggu)", harga: 45000, deskripsi: "Pengangkutan 3 kali seminggu (Senin, Rabu, Jumat)" },
  { nama: "Paket C (6x/minggu)", harga: 65000, deskripsi: "Pengangkutan setiap hari kecuali Minggu" },
  { nama: "Paket D (Premium)", harga: 100000, deskripsi: "Pengangkutan setiap hari + prioritas layanan" },
];

export async function POST() {
  try {
    let created = 0;
    for (const p of DEFAULT_PAKET) {
      const existing = await prisma.paket.findFirst({ where: { nama: p.nama } });
      if (!existing) {
        await prisma.paket.create({ data: p });
        created++;
      }
    }
    return NextResponse.json({ message: `${created} paket berhasil dibuat` });
  } catch {
    return NextResponse.json({ error: "Gagal membuat paket" }, { status: 500 });
  }
}
