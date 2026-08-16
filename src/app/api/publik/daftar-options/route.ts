import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/publik/daftar-options
 * Opsi form pendaftaran mandiri (tanpa login):
 *  - wilayah: daftar kecamatan → kelurahan (dari data Wilayah, non-sensitif)
 *  - paket: daftar paket layanan yang bisa dipilih konsumen
 *  - kategoriTarif: tarif default per kategori (ditampilkan sebagai hint)
 */
export async function GET() {
  const [wilayahRows, paket, kategoriTarif] = await Promise.all([
    prisma.kelurahan.findMany({
      select: { nama: true, kecamatan: true },
      orderBy: [{ kecamatan: "asc" }, { nama: "asc" }],
    }),
    prisma.paket.findMany({
      orderBy: { harga: "asc" },
      select: { id: true, nama: true, harga: true, deskripsi: true },
    }),
    prisma.kategoriTarif.findMany({
      orderBy: { tarif: "asc" },
      select: { kategori: true, label: true, tarif: true, deskripsi: true },
    }),
  ]);

  // Kelompokkan kelurahan per kecamatan (unik, urut alfabet)
  const map = new Map<string, Set<string>>();
  for (const k of wilayahRows) {
    const kec = k.kecamatan?.trim() || "Lainnya";
    const kel = k.nama?.trim() || "Lainnya";
    if (!map.has(kec)) map.set(kec, new Set());
    map.get(kec)!.add(kel);
  }
  const wilayah = [...map.entries()]
    .map(([kecamatan, kelset]) => ({
      kecamatan,
      kelurahan: [...kelset].sort(),
    }))
    .sort((a, b) => a.kecamatan.localeCompare(b.kecamatan));

  return NextResponse.json({ wilayah, paket, kategoriTarif });
}
