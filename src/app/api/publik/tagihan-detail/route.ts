import { NextResponse } from "next/server";
import { updateTunggakan } from "@/lib/tagihan";
import { isDuitkuEnabled } from "@/lib/duitku";
import {
  getTagihanByNoInvoice,
  hitungRincian,
  PPN_RATE,
} from "@/lib/invoice";
import { allowAttempt, retryAfterSeconds } from "@/lib/rate-limit";

/**
 * GET /api/publik/tagihan-detail?invoice=INV/XXX/202606
 * Detail tagihan publik berdasarkan nomor invoice (tanpa auth).
 * Dipakai oleh halaman /bayar-tagihan dan /invoice-tagihan.
 *
 * Keamanan: nomor invoice mengandung kode pelanggan (enumerable), jadi
 * endpoint ini diberi rate limit per IP + Cache-Control no-store agar
 * tidak bisa di-scrape massal. (Data yang diekspos juga dibatasi —
 * alamat & noTelepon tidak dikembalikan.)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const invoice = searchParams.get("invoice")?.trim();

  // Rate limit per IP DULU (sebelum validasi invoice) — request dengan invoice
  // invalid pun ikut dihitung, sehingga enumerasi nomor invoice tetap terhambat.
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const key = `tagihan-detail:${ip}`;
  if (!(await allowAttempt(key, { max: 60, windowMs: 15 * 60 * 1000 }))) {
    const retry = retryAfterSeconds(key);
    return NextResponse.json(
      { error: `Terlalu banyak permintaan. Coba lagi dalam ${Math.ceil(retry / 60)} menit.` },
      { status: 429, headers: { "Retry-After": String(retry) } }
    );
  }

  if (!invoice) {
    return NextResponse.json({ error: "Nomor invoice wajib diisi" }, { status: 400 });
  }

  await updateTunggakan();

  const tagihan = await getTagihanByNoInvoice(invoice);
  if (!tagihan) {
    return NextResponse.json({ error: "Tagihan tidak ditemukan" }, { status: 404 });
  }

  const rincian = hitungRincian(tagihan.jumlah, tagihan.denda);
  const pembayaranLunas = tagihan.pembayaran.find(
    (p) => p.status === "terverifikasi" || p.status === "lunas"
  );

  return NextResponse.json({
    id: tagihan.id,
    noInvoice: tagihan.noInvoice,
    status: tagihan.status,
    bulan: tagihan.bulan,
    tahun: tagihan.tahun,
    jumlah: tagihan.jumlah,
    denda: tagihan.denda || 0,
    ppn: rincian.ppn,
    ppnRate: PPN_RATE,
    total: rincian.total,
    duitkuAktif: isDuitkuEnabled(),
    jatuhTempo: tagihan.jatuhTempo,
    tanggalLunas: tagihan.tanggalLunas,
    keterangan: tagihan.keterangan,
    pelanggan: {
      id: tagihan.pelanggan.id,
      nama: tagihan.pelanggan.nama,
      kodePelanggan: tagihan.pelanggan.kodePelanggan,
      kategori: tagihan.pelanggan.kategori,
      // alamat & noTelepon sengaja TIDAK diekspos — endpoint publik, invoice bisa ditebak
    },
    pembayaranLunas: pembayaranLunas
      ? {
          metode: pembayaranLunas.metode,
          jumlah: pembayaranLunas.jumlah,
          tanggal: pembayaranLunas.createdAt,
        }
      : null,
  }, {
    // Data pribadi tagihan tidak boleh di-cache oleh proxy/CDN mana pun
    headers: { "Cache-Control": "no-store" },
  });
}
