import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { allowAttempt, retryAfterSeconds } from "@/lib/rate-limit";
import { generateKodePelanggan } from "@/lib/kode-pelanggan";
import {
  adminPhone,
  kirimNotifikasi,
  templatePendaftaranAdmin,
  templatePendaftaranDiterima,
} from "@/lib/wa";
import { logAudit } from "@/lib/audit";
import { formatRtRw, normalisasiTelepon, teleponValid } from "@/lib/daftar";

export const dynamic = "force-dynamic";

const KATEGORI_VALID = [
  "rumah_tangga",
  "bisnis",
  "kost",
  "sekolah",
  "rm_makan",
  "perkantoran",
  "industri",
  "lainnya",
];

/**
 * Cari wilayah paling presisi: prefer RT/RW + kelurahan + kecamatan,
 * fallback kelurahan + kecamatan.
 */
async function cariWilayah(opts: {
  rt?: string;
  rw?: string;
  kelurahan: string;
  kecamatan: string;
}) {
  const rt = opts.rt?.trim();
  const rw = opts.rw?.trim();
  const base = { kelurahan: opts.kelurahan, kecamatan: opts.kecamatan };

  if (rt || rw) {
    const presisi = await prisma.wilayah.findFirst({
      where: rt && rw ? { ...base, rt, rw } : rt ? { ...base, rt } : { ...base, rw },
      orderBy: { id: "asc" },
      select: { id: true },
    });
    if (presisi) return presisi;
  }

  return prisma.wilayah.findFirst({
    where: base,
    orderBy: { id: "asc" },
    select: { id: true },
  });
}

/**
 * POST /api/publik/daftar
 * Pendaftaran mandiri konsumen (tanpa login):
 *  - Status pelanggan dibuat "calon" — tagihan tidak diterbitkan sampai
 *    pengelola mengaktifkannya di aplikasi.
 *  - Notifikasi WA ke pelanggan (templatePendaftaranDiterima) + ke helpdesk
 *    ADMIN_PHONE (templatePendaftaranAdmin).
 *  - Anti-spam: rate limit per IP + honeypot (field tersembunyi "website").
 * Body: { nama, noTelepon, kategori, kecamatan, kelurahan, alamat,
 *         patokanLokasi?, paketId?, website? (honeypot) }
 */
export async function POST(request: Request) {
  // Rate limit per IP: cegah spam formulir publik
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const key = `daftar:${ip}`;
  if (!(await allowAttempt(key))) {
    const retry = retryAfterSeconds(key);
    return NextResponse.json(
      { error: `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(retry / 60)} menit.` },
      { status: 429, headers: { "Retry-After": String(retry) } }
    );
  }

  try {
    const body = await request.json();

    // Honeypot — bot mengisi field tersembunyi; pura-pura sukses tanpa menyimpan
    if (body.website && String(body.website).trim().length > 0) {
      return NextResponse.json({ ok: true, kodePelanggan: "", namaPelanggan: "" });
    }

    const nama = String(body.nama ?? "").trim();
    const noTelepon = normalisasiTelepon(String(body.noTelepon ?? ""));
    const kategori = KATEGORI_VALID.includes(body.kategori) ? body.kategori : "rumah_tangga";
    const kecamatan = String(body.kecamatan ?? "").trim();
    const kelurahan = String(body.kelurahan ?? "").trim();
    const alamat = String(body.alamat ?? "").trim();
    const rt = String(body.rt ?? "").trim();
    const rw = String(body.rw ?? "").trim();
    const patokanLokasi = String(body.patokanLokasi ?? "").trim();
    const penanggungjawab = String(body.penanggungjawab ?? "").trim();
    const referal = String(body.referal ?? "").trim();
    const latitude = body.latitude ? parseFloat(body.latitude) : null;
    const longitude = body.longitude ? parseFloat(body.longitude) : null;
    const koordinatSumber = body.koordinatSumber ? String(body.koordinatSumber) : null;
    const koordinatAkurasi = body.koordinatAkurasi ? parseFloat(body.koordinatAkurasi) : null;

    if (nama.length < 3) {
      return NextResponse.json({ error: "Nama minimal 3 karakter." }, { status: 400 });
    }
    if (!teleponValid(noTelepon)) {
      return NextResponse.json({ error: "Nomor WhatsApp tidak valid." }, { status: 400 });
    }
    if (!kecamatan || !kelurahan) {
      return NextResponse.json(
        { error: "Pilih kecamatan & kelurahan tempat tinggal." },
        { status: 400 }
      );
    }
    if (alamat.length < 10) {
      return NextResponse.json({ error: "Alamat terlalu singkat." }, { status: 400 });
    }

    // Cocokkan wilayah: RT/RW (jika diisi) → fallback kelurahan+kecamatan
    const wilayah = await cariWilayah({ rt, rw, kelurahan, kecamatan });

    // Wilayah wajib cocok — kode pelanggan berbasis zona ({kodeWilayah}-001)
    if (!wilayah) {
      return NextResponse.json(
        { error: "Wilayah tidak ditemukan — pastikan kelurahan/kecamatan benar atau hubungi pengelola" },
        { status: 400 }
      );
    }

    // Paket (opsional) — validasi keberadaan
    let paketNama: string | null = null;
    const paketIdRaw = body.paketId ? parseInt(body.paketId) : NaN;
    let paketId: number | null = null;
    if (Number.isFinite(paketIdRaw)) {
      const p = await prisma.paket.findUnique({
        where: { id: paketIdRaw },
        select: { id: true, nama: true },
      });
      if (p) {
        paketId = p.id;
        paketNama = p.nama;
      }
    }

    let kodePelanggan = await generateKodePelanggan(wilayah.id);
    const rtRw = formatRtRw(rt, rw);

    // Retry bila kode bentrok (sangat jarang) — generate ulang lalu create lagi
    let pelanggan;
    for (let coba = 0; ; coba++) {
      try {
        pelanggan = await prisma.pelanggan.create({
          data: {
            nama,
            noTelepon,
            kategori,
            alamat,
            rtRw: rtRw || null,
            kodePelanggan,
            patokanLokasi: patokanLokasi || null,
            penanggungjawab: penanggungjawab || null,
            referal: referal || null,
            latitude,
            longitude,
            koordinatSumber,
            koordinatAkurasi,
            status: "calon", // belum aktif — tagihan dibuat setelah disetujui
            wilayahId: wilayah?.id ?? null,
            paketId,
            catatan: [
              "Daftar mandiri via website",
              `(${kecamatan} / ${kelurahan})`,
              rtRw ? `RT/RW: ${rtRw}` : null,
            ]
              .filter(Boolean)
              .join(" "),
          },
        });
        break;
      } catch (e) {
        const bentrok =
          e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
        if (coba >= 2 || !bentrok) throw e;
        kodePelanggan = await generateKodePelanggan(wilayah.id);
      }
    }

    await logAudit("create", "Pelanggan", pelanggan.id, undefined, {
      nama,
      kategori,
      status: "calon",
      sumber: "daftar_online",
      noTelepon: pelanggan.noTelepon,
      rtRw: rtRw || null,
      wilayahId: wilayah?.id ?? null,
    });

    // WA ke pelanggan: konfirmasi pendaftaran diterima
    const tDiterima = templatePendaftaranDiterima(pelanggan.nama, pelanggan.kodePelanggan);
    await kirimNotifikasi({
      tipe: "pendaftaran_diterima",
      judul: tDiterima.judul,
      pesan: tDiterima.pesan,
      noTelepon: pelanggan.noTelepon,
      pelangganId: pelanggan.id,
    });

    // WA ke helpdesk: pendaftaran baru masuk (jika ADMIN_PHONE diisi)
    const adm = adminPhone();
    if (adm) {
      const tAdmin = templatePendaftaranAdmin({
        nama: pelanggan.nama,
        kodePelanggan: pelanggan.kodePelanggan,
        noTelepon: pelanggan.noTelepon,
        alamat: pelanggan.alamat,
        kategori,
        paket: paketNama || undefined,
        patokanLokasi: patokanLokasi || undefined,
        referal: referal || undefined,
      });
      await kirimNotifikasi({
        tipe: "pendaftaran_masuk",
        judul: tAdmin.judul,
        pesan: tAdmin.pesan,
        noTelepon: adm,
        pelangganId: pelanggan.id,
      });
    }

    return NextResponse.json({
      ok: true,
      kodePelanggan: pelanggan.kodePelanggan,
      namaPelanggan: pelanggan.nama,
    });
  } catch {
    return NextResponse.json(
      { error: "Terjadi kesalahan. Coba lagi beberapa saat." },
      { status: 500 }
    );
  }
}
