import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { allowAttempt, retryAfterSeconds } from "@/lib/rate-limit";
import { generateKodePelanggan } from "@/lib/kode-pelanggan";
import {
  adminPhone,
  kirimNotifikasi,
  kirimReportPendaftaran,
  templatePendaftaranAdmin,
  templatePendaftaranDiterima,
  templatePendaftaranPelangganOlehPetugas,
} from "@/lib/wa";
import { logAudit } from "@/lib/audit";
import { formatRtRw, normalisasiTelepon, teleponValid } from "@/lib/daftar";
import { tetapkanJadwalDanPetugasPelanggan } from "@/lib/penugasan-jadwal";
import { persistBase64Image } from "@/lib/server/media-storage";
import { getTenantFromRequest, buildTenantFilter } from "@/lib/tenant";

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
  tenantId: string;
  isPilot: boolean;
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

  // Wilayah (RT/RW) opsional — hanya utk presisi anchor RT bila ada & terisolasi per tenant
  let wilayahId: number | null = null;
  if (rt || rw) {
    const w = await prisma.wilayah.findFirst({
      where: {
        ...buildTenantFilter(opts.tenantId, opts.isPilot),
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
  const tenantCtx = await getTenantFromRequest(request);
  if (!tenantCtx.isValid || tenantCtx.isCore) {
    return NextResponse.json(
      { error: "Pendaftaran pelanggan hanya tersedia pada portal mitra operasional." },
      { status: 403 }
    );
  }
  const activeTenantId = tenantCtx.tenant.id;

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
    const customTarifRaw = body.customTarif ? parseFloat(body.customTarif) : NaN;
    const customTarif = !isNaN(customTarifRaw) ? customTarifRaw : undefined;
    const fotoRumah = typeof body.fotoRumah === "string" ? body.fotoRumah.trim() : "";
    const isPetugas = Boolean(body.isPetugas);

    // Foto bisa berupa URL /uploads/... atau data URL base64
    if (fotoRumah && !fotoRumah.startsWith("/uploads/") && (!fotoRumah.startsWith("data:image/") || fotoRumah.length > 2_500_000)) {
      return NextResponse.json(
        { error: "Foto rumah tidak valid atau terlalu besar (maksimal 2.5MB)." },
        { status: 400 }
      );
    }

    // Koordinat: gunakan input user jika valid, atau fallback ke titik pusat Kota Depok
    const latParsed = body.latitude != null ? parseFloat(String(body.latitude)) : NaN;
    const lngParsed = body.longitude != null ? parseFloat(String(body.longitude)) : NaN;
    const hasValidGps = !Number.isNaN(latParsed) && !Number.isNaN(lngParsed);
    const latitude = hasValidGps ? latParsed : -6.424838;
    const longitude = hasValidGps ? lngParsed : 106.832667;
    const koordinatSumber = body.koordinatSumber
      ? String(body.koordinatSumber)
      : hasValidGps
      ? "manual"
      : "perkiraan_wilayah";
    const koordinatAkurasi = body.koordinatAkurasi ? parseFloat(body.koordinatAkurasi) : hasValidGps ? null : 500;

    if (nama.length < 3) {
      return NextResponse.json({ error: "Nama minimal 3 karakter." }, { status: 400 });
    }
    if (!teleponValid(noTelepon)) {
      return NextResponse.json({ error: "Nomor WhatsApp tidak valid (minimal 9 digit angka)." }, { status: 400 });
    }
    if (!kecamatan || !kelurahan) {
      return NextResponse.json(
        { error: "Pilih kecamatan & kelurahan tempat tinggal." },
        { status: 400 }
      );
    }
    if (alamat.length < 10) {
      return NextResponse.json({ error: "Alamat terlalu singkat (minimal 10 karakter)." }, { status: 400 });
    }

    let zonaId = body.zonaId ? parseInt(body.zonaId) : null;
    const kendaraanId = body.kendaraanId ? parseInt(body.kendaraanId) : null;
    const petugasId = body.petugasId ? parseInt(body.petugasId) : null;
    const ruteId = body.ruteId ? parseInt(body.ruteId) : null;
    let tanggalPenagihanCustom = body.tanggalPenagihanCustom ? String(body.tanggalPenagihanCustom).trim() : null;
    if (tanggalPenagihanCustom) {
      const parsedTgl = parseInt(tanggalPenagihanCustom, 10);
      if (!isNaN(parsedTgl)) {
        tanggalPenagihanCustom = String(Math.min(28, Math.max(1, parsedTgl)));
      }
    }
    const jadwalHari = typeof body.jadwalHari === "string" && body.jadwalHari.trim() ? body.jadwalHari.trim() : null;

    const tenantScope = buildTenantFilter(activeTenantId, tenantCtx.isPilot);

    if (!zonaId && ruteId) {
      const r = await prisma.rute.findFirst({
        where: { id: ruteId, ...tenantScope },
        select: { zonaId: true },
      });
      if (r?.zonaId) zonaId = r.zonaId;
    }

    // Cocokkan lokasi: anchor kelurahan (canonical) + opsional RT/RW
    const lokasi = await cariLokasi({
      rt,
      rw,
      kelurahan,
      kecamatan,
      tenantId: activeTenantId,
      isPilot: tenantCtx.isPilot,
    });

    // Kelurahan wajib cocok — kode pelanggan berbasis kelurahan ({kodeKelurahan}-{token})
    if (!lokasi) {
      return NextResponse.json(
        { error: "Kelurahan tidak ditemukan — pastikan kelurahan/kecamatan benar atau hubungi pengelola" },
        { status: 400 }
      );
    }

    const kelurahanId = lokasi.kelurahanId;
    let wilayahId = lokasi.wilayahId;

    if (zonaId) {
      const zonaInfo = await prisma.zona.findFirst({
        where: { id: zonaId, ...tenantScope },
        select: { nama: true },
      });
      if (zonaInfo) {
        if (wilayahId) {
          await prisma.wilayah.update({
            where: { id: wilayahId },
            data: { zonaId },
          });
        } else {
          const newW = await prisma.wilayah.create({
            data: {
              nama: formatRtRw(rt, rw) ? `RT/RW ${formatRtRw(rt, rw)}` : (zonaInfo.nama || `Zona ${zonaId}`),
              kelurahanId,
              zonaId,
              rt: rt || null,
              rw: rw || null,
              tenantId: activeTenantId,
            },
          });
          wilayahId = newW.id;
        }
      } else {
        zonaId = null;
      }
    }

    // Paket (opsional) — validasi keberadaan dalam scope tenant
    let paketNama: string | null = null;
    let paketHarga: number | null = null;
    const paketIdRaw = body.paketId ? parseInt(body.paketId) : NaN;
    let paketId: number | null = null;
    if (Number.isFinite(paketIdRaw)) {
      const p = await prisma.paket.findFirst({
        where: { id: paketIdRaw, ...tenantScope },
        select: { id: true, nama: true, harga: true },
      });
      if (p) {
        paketId = p.id;
        paketNama = p.id === 18 ? (p.nama || "Paket Langganan") : p.nama;
        paketHarga = p.id === 18 ? (p.harga ?? 40000) : p.harga;
      } else if (paketIdRaw === 18 && tenantCtx.isPilot) {
        paketId = 18;
        paketNama = "Paket Langganan";
        paketHarga = 40000;
      }
    }

    // Simpan foto rumah ke file storage jika berupa Base64
    const savedFotoRumah = fotoRumah ? await persistBase64Image(fotoRumah, "pelanggan", activeTenantId) : null;

    // Kode pelanggan kini menggunakan nomor WhatsApp (noTelepon)
    const kodePelanggan = noTelepon;
    const rtRw = formatRtRw(rt, rw);

    const cleanPhoneDigits = noTelepon.replace(/[^\d]/g, "");
    const localPhone = cleanPhoneDigits.startsWith("62") ? `0${cleanPhoneDigits.slice(2)}` : cleanPhoneDigits;
    const intlPhone = cleanPhoneDigits.startsWith("0") ? `62${cleanPhoneDigits.slice(1)}` : cleanPhoneDigits;
    const phoneCandidates = Array.from(new Set([noTelepon, cleanPhoneDigits, localPhone, intlPhone].filter(Boolean)));

    // Periksa apakah nomor sudah pernah ada di database tenant ini
    const existingPelanggan = await prisma.pelanggan.findFirst({
      where: {
        ...tenantScope,
        OR: phoneCandidates.map((n) => ({ noTelepon: n })),
      },
      select: { id: true, nama: true, status: true, kodePelanggan: true, deletedAt: true },
    });

    let pelanggan;
    if (existingPelanggan) {
      if (existingPelanggan.deletedAt === null && existingPelanggan.status === "aktif") {
        return NextResponse.json(
          {
            error: `Nomor WhatsApp ${noTelepon} sudah terdaftar aktif atas nama "${existingPelanggan.nama}". Anda dapat mengecek tagihan langsung di menu Pembayaran.`,
          },
          { status: 400 }
        );
      }

      // Jika calon atau sebelumnya soft-deleted, lakukan pembaruan data registrasi
      pelanggan = await prisma.pelanggan.update({
        where: { id: existingPelanggan.id },
        data: {
          nama,
          noTelepon,
          kategori,
          alamat,
          rtRw: rtRw || null,
          fotoRumah: savedFotoRumah || undefined,
          patokanLokasi: patokanLokasi || null,
          penanggungjawab: penanggungjawab || null,
          referal: referal || null,
          customTarif: customTarif ?? (paketHarga ?? undefined),
          latitude,
          longitude,
          koordinatSumber,
          koordinatAkurasi,
          status: "calon",
          wilayahId,
          kelurahanId,
          paketId,
          deletedAt: null,
          catatan: [
            "Pendaftaran diperbarui mandiri via website",
            `(${kecamatan} / ${kelurahan})`,
            rtRw ? `RT/RW: ${rtRw}` : null,
            tanggalPenagihanCustom ? `Req Tgl Tagihan: ${tanggalPenagihanCustom}` : null,
            jadwalHari ? `Req Hari: ${jadwalHari}` : null,
            !savedFotoRumah ? "Foto rumah: Survei rute lapangan" : null,
          ]
            .filter(Boolean)
            .join(" | "),
        },
      });
    } else {
      try {
        pelanggan = await prisma.pelanggan.create({
          data: {
            nama,
            noTelepon,
            kategori,
            alamat,
            rtRw: rtRw || null,
            kodePelanggan,
            fotoRumah: savedFotoRumah || null,
            patokanLokasi: patokanLokasi || null,
            penanggungjawab: penanggungjawab || null,
            referal: referal || null,
            customTarif: customTarif ?? (paketHarga ?? undefined),
            latitude,
            longitude,
            koordinatSumber,
            koordinatAkurasi,
            status: "calon", // belum aktif — tagihan dibuat setelah disetujui
            wilayahId,
            kelurahanId,
            paketId,
            tenantId: activeTenantId,
            catatan: [
              "Daftar mandiri via website",
              `(${kecamatan} / ${kelurahan})`,
              rtRw ? `RT/RW: ${rtRw}` : null,
              tanggalPenagihanCustom ? `Req Tgl Tagihan: ${tanggalPenagihanCustom}` : null,
              jadwalHari ? `Req Hari: ${jadwalHari}` : null,
              !savedFotoRumah ? "Foto rumah: Survei rute lapangan" : null,
            ]
              .filter(Boolean)
              .join(" | "),
          },
        });
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && (e as any).code === "P2002") {
          return NextResponse.json(
            { error: "Nomor WhatsApp ini sudah pernah didaftarkan. Silakan hubungi admin operasional." },
            { status: 400 }
          );
        }
        throw e;
      }
    }

    if (zonaId || kendaraanId || petugasId || jadwalHari || ruteId) {
      await tetapkanJadwalDanPetugasPelanggan({
        pelangganId: pelanggan.id,
        kelurahanId: pelanggan.kelurahanId,
        zonaId,
        kendaraanId,
        petugasId,
        ruteId,
        hari: jadwalHari,
      });
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
    let tDiterima;
    if (isPetugas) {
      tDiterima = await templatePendaftaranPelangganOlehPetugas({
        nama: pelanggan.nama,
        kodePelanggan: pelanggan.kodePelanggan,
        noTelepon: pelanggan.noTelepon,
        alamat: pelanggan.alamat,
        kategori,
        nominalTagihan: customTarif || paketHarga || undefined,
        patokanLokasi: patokanLokasi || undefined,
        referal: referal || undefined,
        tanggalPenagihanCustom: tanggalPenagihanCustom || undefined,
        jadwalHari: jadwalHari || undefined,
      });
    } else {
      tDiterima = await templatePendaftaranDiterima(pelanggan.nama, pelanggan.kodePelanggan);
    }
    await kirimNotifikasi({
      tipe: "pendaftaran_diterima",
      judul: tDiterima.judul,
      pesan: tDiterima.pesan,
      noTelepon: pelanggan.noTelepon,
      pelangganId: pelanggan.id,
    });

    // WA report ke Owner & Helpdesk: pendaftaran baru masuk
    try {
      const tAdmin = await templatePendaftaranAdmin({
        nama: pelanggan.nama,
        kodePelanggan: pelanggan.kodePelanggan,
        noTelepon: pelanggan.noTelepon,
        alamat: pelanggan.alamat,
        kategori,
        nominalTagihan: customTarif || paketHarga || undefined,
        patokanLokasi: patokanLokasi || undefined,
        referal: referal || undefined,
        tanggalPenagihanCustom: tanggalPenagihanCustom || undefined,
        jadwalHari: jadwalHari || undefined,
      });
      await kirimReportPendaftaran({
        tipe: "pendaftaran_masuk",
        judul: tAdmin.judul,
        pesan: tAdmin.pesan,
        pelangganId: pelanggan.id,
      });
    } catch (err) {
      console.error("[Pendaftaran] Gagal kirim WA ke owner/admin:", err);
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
