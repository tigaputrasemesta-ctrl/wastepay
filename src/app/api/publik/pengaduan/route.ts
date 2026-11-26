import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { allowAttempt, retryAfterSeconds } from "@/lib/rate-limit";
import {
  isWaEnabled,
  kirimWhatsApp,
  templateDisposisiKomplainPetugas,
  templateKonfirmasiPengaduanPelanggan,
} from "@/lib/wa";
import { formatRupiahSkylite, BULAN_INDO } from "@/lib/invoice-format";
import { persistBase64Image } from "@/lib/server/media-storage";
import { getTenantFromRequest, buildTenantFilter } from "@/lib/tenant";
import { getDefaultMapToken } from "@/lib/tv-token";

const JENIS_VALID = ["tidak_diangkut", "sampah_menumpuk", "lainnya"];

function buildPhoneCandidates(rawInput: string): string[] {
  const digits = rawInput.replace(/\D/g, "");
  if (digits.length < 7) return [];
  const candidates = new Set<string>([rawInput.trim(), digits]);
  if (digits.startsWith("0")) {
    candidates.add(`62${digits.slice(1)}`);
    candidates.add(`+62${digits.slice(1)}`);
  } else if (digits.startsWith("62")) {
    candidates.add(`0${digits.slice(2)}`);
    candidates.add(`+${digits}`);
  } else if (digits.startsWith("8")) {
    candidates.add(`0${digits}`);
    candidates.add(`62${digits}`);
    candidates.add(`+62${digits}`);
  }
  return Array.from(candidates);
}

export const dynamic = "force-dynamic";

/**
 * Pengaduan publik: pelanggan memasukkan KODE PELANGGAN atau NOMOR WHATSAPP lalu mengisi keluhan.
 * Komplain langsung muncul di peta admin (live view) sesuai tenant domain.
 */
export async function POST(request: Request) {
  const tenantCtx = await getTenantFromRequest(request);
  if (!tenantCtx.isValid || tenantCtx.isCore) {
    return NextResponse.json(
      { error: "Layanan pengaduan warga hanya tersedia pada portal mitra operasional." },
      { status: 403 }
    );
  }

  // Rate limit per IP: mencegah spam formulir publik
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const key = `pengaduan:${ip}`;
  if (!(await allowAttempt(key))) {
    const retry = retryAfterSeconds(key);
    return NextResponse.json(
      { error: `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(retry / 60)} menit.` },
      { status: 429, headers: { "Retry-After": String(retry) } }
    );
  }

  try {
    const body = await request.json();
    const rawLookup = String(body.kodePelanggan ?? body.noWa ?? "").trim();
    const kodePelanggan = rawLookup.toUpperCase();
    const phoneCandidates = buildPhoneCandidates(rawLookup);
    const jenis = JENIS_VALID.includes(body.jenis) ? body.jenis : "lainnya";
    const deskripsi = String(body.deskripsi ?? "").trim();
    const foto = body.foto && typeof body.foto === "string" ? body.foto : null;

    if (!rawLookup) {
      return NextResponse.json({ error: "Nomor WhatsApp atau kode pelanggan wajib diisi." }, { status: 400 });
    }
    if (deskripsi.length < 10) {
      return NextResponse.json(
        { error: "Deskripsi keluhan minimal 10 karakter." },
        { status: 400 }
      );
    }
    if (deskripsi.length > 1000) {
      return NextResponse.json({ error: "Deskripsi maksimal 1000 karakter." }, { status: 400 });
    }

    const matchOr = [
      { kodePelanggan },
      ...(phoneCandidates.length > 0 ? [{ noTelepon: { in: phoneCandidates } }] : []),
    ];

    const pelanggan = await prisma.pelanggan.findFirst({
      where: {
        AND: [
          buildTenantFilter(tenantCtx.tenant.id, tenantCtx.isPilot),
          { deletedAt: null },
          { OR: matchOr },
        ],
      },
      include: {
        kelurahan: { select: { id: true, nama: true } },
        wilayah: {
          select: {
            nama: true,
            zonaId: true,
            zona: {
              select: {
                id: true,
                nama: true,
                petugas: {
                  include: {
                    petugas: { select: { id: true, nama: true, noTelepon: true, aktif: true } },
                  },
                },
              },
            },
          },
        },
        jadwal: {
          where: { aktif: true },
          take: 1,
          include: {
            rute: {
              include: {
                petugas: { select: { id: true, nama: true, noTelepon: true, aktif: true } },
                kendaraan: { select: { id: true, nama: true, platNomor: true } },
              },
            },
          },
        },
        tagihan: {
          where: { deletedAt: null },
          orderBy: [{ tahun: "desc" }, { bulan: "desc" }],
          take: 3,
        },
      },
    });
    if (!pelanggan) {
      return NextResponse.json(
        { error: "Nomor WhatsApp atau kode pelanggan tidak ditemukan. Periksa kembali data terdaftar Anda." },
        { status: 404 }
      );
    }

    // 1. Anti-Double Complaint Guard:
    // Cek apakah pelanggan masih memiliki tiket aktif (status: baru | proses | diproses) dalam 24 jam terakhir
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeKomplain = await prisma.komplain.findFirst({
      where: {
        pelangganId: pelanggan.id,
        status: { in: ["baru", "proses", "diproses"] },
        createdAt: { gte: twentyFourHoursAgo },
      },
      select: { id: true, status: true, jenis: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });

    if (activeKomplain) {
      const statusLabel =
        activeKomplain.status === "baru"
          ? "Menunggu Penanganan Tim Armada"
          : "Sedang Ditindaklanjuti Tim Lapangan";
      return NextResponse.json(
        {
          error: `Anda sudah memiliki laporan pengaduan aktif (#KMP-${activeKomplain.id}) dengan status "${statusLabel}". Tim kami sedang menindaklanjuti laporan ini ke lokasi Anda. Mohon tunggu hingga laporan selesai sebelum membuat pengaduan baru.`,
          isDuplicate: true,
          activeTicket: {
            id: activeKomplain.id,
            status: activeKomplain.status,
            jenis: activeKomplain.jenis,
            createdAt: activeKomplain.createdAt,
          },
        },
        { status: 409 }
      );
    }

    // Cek duplikasi isi laporan yang sama persis dalam 24 jam terakhir
    const duplicateContent = await prisma.komplain.findFirst({
      where: {
        pelangganId: pelanggan.id,
        jenis,
        deskripsi,
        createdAt: { gte: twentyFourHoursAgo },
      },
      select: { id: true },
    });

    if (duplicateContent) {
      return NextResponse.json(
        {
          error: `Laporan pengaduan yang sama persis telah terdaftar sebelumnya (#KMP-${duplicateContent.id}). Laporan ganda tidak dapat dikirimkan.`,
          isDuplicate: true,
        },
        { status: 409 }
      );
    }

    // 2. Cari Petugas Lapangan / Driver Armada Penanggung Jawab Rute Pelanggan
    let assignedPetugas: { id: number; nama: string; noTelepon: string } | null = null;
    let namaArmada: string | null = null;

    // Prioritas 1: Petugas pada rute jadwal aktif rumah warga
    const rutePetugas = pelanggan.jadwal?.[0]?.rute?.petugas;
    if (rutePetugas && rutePetugas.aktif && rutePetugas.noTelepon) {
      assignedPetugas = rutePetugas;
      namaArmada =
        pelanggan.jadwal?.[0]?.rute?.kendaraan?.nama ||
        pelanggan.jadwal?.[0]?.rute?.nama ||
        null;
    }

    // Prioritas 2: Petugas zona wilayah
    if (!assignedPetugas) {
      const zonaPetugasList = pelanggan.wilayah?.zona?.petugas;
      const validZonaPetugas = zonaPetugasList?.find(
        (zp) => zp.petugas?.aktif && zp.petugas?.noTelepon
      )?.petugas;
      if (validZonaPetugas) {
        assignedPetugas = validZonaPetugas;
      }
    }

    // Prioritas 3: Fallback ke koordinator pengaduan jika ada di env
    if (!assignedPetugas && process.env.PETUGAS_PENGADUAN_PHONE) {
      assignedPetugas = {
        id: 0,
        nama: "Koordinator Operasional",
        noTelepon: process.env.PETUGAS_PENGADUAN_PHONE,
      };
    }

    const savedFoto = await persistBase64Image(foto, "komplain");
    const awalStatus = assignedPetugas ? "proses" : "baru";
    const initialTanggapan = assignedPetugas
      ? `Otomatis didisposisikan ke driver/petugas: ${assignedPetugas.nama}`
      : null;

    const komplain = await prisma.komplain.create({
      data: {
        jenis,
        deskripsi,
        foto: savedFoto || null,
        status: awalStatus,
        tanggapan: initialTanggapan,
        pelangganId: pelanggan.id,
        tenantId: pelanggan.tenantId ?? (tenantCtx.isPilot ? tenantCtx.tenant.id : null),
      },
      select: { id: true, jenis: true, deskripsi: true, status: true, createdAt: true },
    });

    // Zona angkut
    const zonaAngkut =
      pelanggan.wilayah?.zona?.nama ||
      pelanggan.wilayah?.nama ||
      (pelanggan.kelurahan ? `Kel. ${pelanggan.kelurahan.nama}` : null) ||
      "-";

    // Google Maps link
    let googleMapsUrl: string | null = null;
    if (pelanggan.latitude && pelanggan.longitude) {
      googleMapsUrl = `https://www.google.com/maps?q=${pelanggan.latitude},${pelanggan.longitude}`;
    } else if (pelanggan.alamat) {
      const kotaLabel = tenantCtx.tenant.branding.kota ? `, ${tenantCtx.tenant.branding.kota}` : "";
      const q = `${pelanggan.alamat}${pelanggan.kelurahan?.nama ? `, Kel. ${pelanggan.kelurahan.nama}` : ""}${kotaLabel}`;
      googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
    }

    // Lembar Peta PDF & Foto Rumah per Pelanggan (dengan Token Map Resmi)
    const mapToken = getDefaultMapToken();
    const rawHost = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
    const baseUrl = rawHost ? `https://${rawHost}` : (process.env.NEXT_PUBLIC_APP_URL || "https://upsheru.com");
    const petaPdfUrl = `${baseUrl}/api/pelanggan/${pelanggan.id}/peta-pdf?t=${encodeURIComponent(mapToken)}`;
    const fotoKeluhanUrl = savedFoto ? `${baseUrl}${savedFoto}` : null;

    const labelJenis =
      jenis === "tidak_diangkut"
        ? "Sampah Tidak Diangkut"
        : jenis === "sampah_menumpuk"
        ? "Sampah Menumpuk"
        : "Lainnya";

    // 3. Pengiriman WhatsApp Cerdas & Hemat Kuota (Group Blast Dihilangkan)
    // Hanya mengirim 2 pesan tertarget: (1) Ke Petugas Lapangan, (2) Ke Warga Pelapor
    let notifPetugasTerkirim = false;
    let notifWargaTerkirim = false;

    if (isWaEnabled()) {
      // A. Disposisi Otomatis ke Driver / Petugas Lapangan
      if (assignedPetugas && assignedPetugas.noTelepon) {
        try {
          const tDisposisi = templateDisposisiKomplainPetugas({
            idKomplain: komplain.id,
            namaPetugas: assignedPetugas.nama,
            namaPelanggan: pelanggan.nama,
            kodePelanggan: pelanggan.kodePelanggan,
            noTeleponPelanggan: pelanggan.noTelepon,
            alamatPelanggan: pelanggan.alamat,
            patokanLokasi: pelanggan.patokanLokasi,
            zonaWilayah: zonaAngkut,
            googleMapsUrl,
            petaPdfUrl,
            fotoKeluhanUrl,
            jenisKomplain: labelJenis,
            deskripsi,
            catatanAdmin: namaArmada ? `Armada Penjemput: ${namaArmada}` : undefined,
            waktuKomplain: komplain.createdAt || new Date(),
          });

          const hasilPetugas = await kirimWhatsApp(assignedPetugas.noTelepon, tDisposisi.pesan);
          if (hasilPetugas.ok) {
            notifPetugasTerkirim = true;
          }

          // Catat ke log notifikasi
          await prisma.notifikasi.create({
            data: {
              tipe: "komplain_diteruskan",
              judul: tDisposisi.judul,
              pesan: tDisposisi.pesan,
              penerima: assignedPetugas.noTelepon,
              status: hasilPetugas.ok ? "terkirim" : "gagal",
              error: hasilPetugas.error,
              dikirimPada: hasilPetugas.ok ? new Date() : null,
              pelangganId: pelanggan.id,
            },
          });
        } catch (errPetugas) {
          console.error("[Pengaduan] Gagal auto-disposisi WA ke petugas:", errPetugas);
        }
      }

      // B. Konfirmasi Nomor Tiket ke Warga Pelapor
      if (pelanggan.noTelepon) {
        try {
          const tKonfirmasi = templateKonfirmasiPengaduanPelanggan({
            tiketId: komplain.id,
            namaPelanggan: pelanggan.nama,
            jenisPengaduan: labelJenis,
            deskripsi,
            namaPetugas: assignedPetugas ? assignedPetugas.nama : null,
            namaMitra: tenantCtx.tenant.branding.namaMitra,
          });

          const hasilWarga = await kirimWhatsApp(pelanggan.noTelepon, tKonfirmasi.pesan);
          if (hasilWarga.ok) {
            notifWargaTerkirim = true;
          }

          await prisma.notifikasi.create({
            data: {
              tipe: "komplain_konfirmasi_warga",
              judul: tKonfirmasi.judul,
              pesan: tKonfirmasi.pesan,
              penerima: pelanggan.noTelepon,
              status: hasilWarga.ok ? "terkirim" : "gagal",
              error: hasilWarga.error,
              dikirimPada: hasilWarga.ok ? new Date() : null,
              pelangganId: pelanggan.id,
            },
          });
        } catch (errWarga) {
          console.error("[Pengaduan] Gagal kirim WA konfirmasi ke warga:", errWarga);
        }
      }
    }

    return NextResponse.json(
      {
        ok: true,
        id: komplain.id,
        status: komplain.status,
        namaPelanggan: pelanggan.nama,
        kodePelanggan: pelanggan.kodePelanggan,
        assignedPetugas: assignedPetugas ? assignedPetugas.nama : null,
        notifPetugas: notifPetugasTerkirim,
        notifWarga: notifWargaTerkirim,
        petaPdfUrl,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/publik/pengaduan error:", err);
    return NextResponse.json({ error: "Gagal mengirim pengaduan. Coba lagi." }, { status: 500 });
  }
}

/**
 * GET /api/publik/pengaduan?telp=... atau ?kode=...
 * Memungkinkan warga memeriksa riwayat dan status tiket pengaduan aktif secara mandiri.
 */
export async function GET(request: Request) {
  const tenantCtx = await getTenantFromRequest(request);
  if (!tenantCtx.isValid || tenantCtx.isCore) {
    return NextResponse.json(
      { error: "Layanan pengaduan hanya tersedia pada portal mitra operasional." },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const q = String(searchParams.get("telp") || searchParams.get("kode") || searchParams.get("q") || "").trim();
  if (!q) {
    return NextResponse.json({ error: "Parameter nomor WhatsApp atau kode pelanggan wajib diisi." }, { status: 400 });
  }

  const phoneCandidates = buildPhoneCandidates(q);
  const pelanggan = await prisma.pelanggan.findFirst({
    where: {
      AND: [
        buildTenantFilter(tenantCtx.tenant.id, tenantCtx.isPilot),
        { deletedAt: null },
        {
          OR: [
            { kodePelanggan: q.toUpperCase() },
            ...(phoneCandidates.length > 0 ? [{ noTelepon: { in: phoneCandidates } }] : []),
          ],
        },
      ],
    },
    select: {
      id: true,
      nama: true,
      kodePelanggan: true,
      komplain: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          jenis: true,
          deskripsi: true,
          status: true,
          tanggapan: true,
          createdAt: true,
        },
      },
    },
  });

  if (!pelanggan) {
    return NextResponse.json({ error: "Pelanggan tidak ditemukan." }, { status: 404 });
  }

  return NextResponse.json({
    nama: pelanggan.nama,
    kodePelanggan: pelanggan.kodePelanggan,
    komplain: pelanggan.komplain,
  });
}
