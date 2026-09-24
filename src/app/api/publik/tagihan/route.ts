import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hitungRincian } from "@/lib/invoice";
import { updateTunggakan } from "@/lib/tagihan";
import { allowAttempt, retryAfterSeconds } from "@/lib/rate-limit";

/**
 * GET /api/publik/tagihan?kode=XXX
 * Cek tagihan pelanggan publik via kode pelanggan (tanpa auth).
 *
 * Keamanan: kode pelanggan berformat P-XXXXXX (enumerable), jadi endpoint
 * ini diberi rate limit per IP + Cache-Control no-store agar data pribadi
 * (nama, alamat, riwayat tagihan) tidak bisa di-scrape massal.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const kode = searchParams.get("kode")?.trim();

  // Rate limit per IP DULU (sebelum validasi kode) — request dengan kode
  // invalid pun ikut dihitung, sehingga enumerasi kode pelanggan tetap terhambat.
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const key = `tagihan:${ip}`;
  if (!(await allowAttempt(key, { max: 60, windowMs: 15 * 60 * 1000 }))) {
    const retry = retryAfterSeconds(key);
    return NextResponse.json(
      { error: `Terlalu banyak permintaan. Coba lagi dalam ${Math.ceil(retry / 60)} menit.` },
      { status: 429, headers: { "Retry-After": String(retry) } }
    );
  }

  if (!kode) {
    return NextResponse.json({ error: "Nomor WhatsApp wajib diisi" }, { status: 400 });
  }

  await updateTunggakan();

  const pelanggan = await prisma.pelanggan.findFirst({
    where: { 
      OR: [
        { kodePelanggan: kode },
        { noTelepon: kode }
      ]
    },
    select: {
      id: true,
      nama: true,
      kodePelanggan: true,
      alamat: true,
      noTelepon: true,
      kategori: true,
      deletedAt: true,
    },
  });

  if (!pelanggan || pelanggan.deletedAt) {
    return NextResponse.json({ error: "Nomor WhatsApp tidak ditemukan dalam sistem. Pastikan pendaftaran sudah disetujui." }, { status: 404 });
  }

  const tagihanList = await prisma.tagihan.findMany({
    where: { pelangganId: pelanggan.id, deletedAt: null },
    orderBy: [{ tahun: "desc" }, { bulan: "desc" }],
    select: {
      id: true,
      noInvoice: true,
      bulan: true,
      tahun: true,
      jumlah: true,
      denda: true,
      status: true,
      jatuhTempo: true,
    },
  });

  // total = jumlah + PPN 11% + denda — konsisten dengan invoice & gateway
  const tagihan = tagihanList.map((t) => ({
    ...t,
    total: hitungRincian(t.jumlah, t.denda).total,
  }));

  return NextResponse.json(
    {
      pelanggan: {
        nama: pelanggan.nama,
        kodePelanggan: pelanggan.kodePelanggan,
        alamat: pelanggan.alamat,
      },
      tagihan,
    },
    {
      // Data pribadi pelanggan tidak boleh di-cache oleh proxy/CDN mana pun
      headers: { "Cache-Control": "no-store" },
    }
  );
}
