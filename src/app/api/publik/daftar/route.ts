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
  "level_1",
  "level_2",
  "level_3",
  "level_4",
  "level_5",
  "level_6",
  "level_7",
  "level_8",
  "level_9",
  "level_10",
];

/**
 * Cari lokasi paling presisi: anchor kelurahan (canonical) + opsional RT/RW.
 * Sumber kebenaran kini entitas Kelurahan, bukan string denormalisasi Wilayah.
 */
async function cariLokasi(opts: {
  rt?: string;
  rw?: string;
  kelurahan: string;
  kecamatan: string;
}) {
  const rt = opts.rt?.trim();
  const rw = opts.rw?.trim();

  // Nama kelurahan unik secara global (@unique) — cocokkan case-insensitive.
  const kel = await prisma.kelurahan.findFirst({
    where: { nama: { equals: opts.kelurahan, mode: "insensitive" } },
    orderBy: { id: "asc" },
    select: { id: true },
  });
  if (!kel) return null;

  // Wilayah (RT/RW) opsional — hanya utk presisi anchor RT bila ada
  let wilayahId: number | null = null;
  if (rt || rw) {
    const w = await prisma.wilayah.findFirst({
      where: {
        kelurahanId: kel.id,
        ...(rt && rw ? { rt, rw } : rt ? { rt } : { rw }),
      },
      orderBy: { id: "asc" },
      select: { id: true },
    });
    wilayahId = w?.id ?? null;
  }

  return { kelurahanId: kel.id, wilayahId };
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
    const kategori = KATEGORI_VALID.includes(body.kategori) ? body.kategori : "level_1";
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
    const fotoRumah = typeof body.fotoRumah === "string" ? body.fotoRumah.trim() : "";

    // Foto harus data URL gambar dan dibatasi ukurannya (base64 hasil kompres).
    if (fotoRumah && (!fotoRumah.startsWith("data:image/") || fotoRumah.length > 2_000_000)) {
      return NextResponse.json(
        { error: "Foto rumah tidak valid atau terlalu besar." },
        { status: 400 }
      );
    }

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

    // Cocokkan lokasi: anchor kelurahan (canonical) + opsional RT/RW
    const lokasi = await cariLokasi({ rt, rw, kelurahan, kecamatan });

    // Kelurahan wajib cocok — kode pelanggan berbasis kelurahan ({kodeKelurahan}-{token})
    if (!lokasi) {
      return NextResponse.json(
        { error: "Kelurahan tidak ditemukan — pastikan kelurahan/kecamatan benar atau hubungi pengelola" },
        { status: 400 }
      );
    }

    const kelurahanId = lokasi.kelurahanId;
    const wilayahId = lokasi.wilayahId;

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

    // Kode pelanggan kini menggunakan nomor WhatsApp (noTelepon)
    const kodePelanggan = noTelepon;
    const rtRw = formatRtRw(rt, rw);

    let pelanggan;
    try {
      pelanggan = await prisma.pelanggan.create({
        data: {
          nama,
          noTelepon,
          kategori,
          alamat,
          rtRw: rtRw || null,
          kodePelanggan,
          fotoRumah: fotoRumah || null,
          patokanLokasi: patokanLokasi || null,
          penanggungjawab: penanggungjawab || null,
          referal: referal || null,
          latitude,
          longitude,
          koordinatSumber,
          koordinatAkurasi,
          status: "calon", // belum aktif — tagihan dibuat setelah disetujui
          wilayahId,
          kelurahanId,
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
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        return NextResponse.json(
          { error: "Nomor WhatsApp ini sudah pernah didaftarkan. Silakan hubungi admin." },
          { status: 400 }
        );
      }
      throw e;
    }

    await logAudit("create", "Pelanggan", pelanggan.id, undefined, {
      nama,
      kategori,
      status: "calon",
      sumber: "daftar_online",
      noTelepon: pelanggan.noTelepon,
      rtRw: rtRw || null,
      wilayahId,
      kelurahanId,
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
