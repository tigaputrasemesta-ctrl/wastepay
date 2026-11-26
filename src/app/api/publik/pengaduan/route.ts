import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { allowAttempt, retryAfterSeconds } from "@/lib/rate-limit";
import { isWaEnabled, kirimReportPengaduan, templatePengaduanAdmin } from "@/lib/wa";
import { formatRupiahSkylite, BULAN_INDO } from "@/lib/invoice-format";
import { persistBase64Image } from "@/lib/server/media-storage";
import { getTenantFromRequest, buildTenantFilter } from "@/lib/tenant";

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
        kelurahan: { select: { nama: true } },
        wilayah: {
          select: {
            nama: true,
            zona: { select: { nama: true } },
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

    const savedFoto = await persistBase64Image(foto, "komplain");
    const komplain = await prisma.komplain.create({
      data: {
        jenis,
        deskripsi,
        foto: savedFoto || null,
        status: "baru",
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

    // Status tagihan
    let statusTagihan = "Belum Ada Tagihan";
    if (pelanggan.tagihan && pelanggan.tagihan.length > 0) {
      const tagihanBelumLunas = pelanggan.tagihan.filter((t) => t.status !== "lunas");
      if (tagihanBelumLunas.length === 0) {
        const lastPaid = pelanggan.tagihan[0];
        statusTagihan = `✅ Lunas (${BULAN_INDO[lastPaid.bulan - 1]} ${lastPaid.tahun})`;
      } else {
        const totalTunggakan = tagihanBelumLunas.reduce((acc, t) => acc + t.jumlah, 0);
        const bulanTunggak = tagihanBelumLunas
          .map((t) => `${BULAN_INDO[t.bulan - 1]} ${t.tahun}`)
          .join(", ");
        statusTagihan = `⚠️ Belum Lunas (${formatRupiahSkylite(totalTunggakan)} — ${bulanTunggak})`;
      }
    }

    const labelJenis =
      jenis === "tidak_diangkut"
        ? "Sampah Tidak Diangkut"
        : jenis === "sampah_menumpuk"
        ? "Sampah Menumpuk"
        : "Lainnya";

    // Notifikasi WhatsApp lengkap ke Owner, Superadmin, dan Petugas Lapangan
    let notifTerkirim = false;
    if (isWaEnabled()) {
      try {
        const tPengaduan = await templatePengaduanAdmin({
          idKomplain: komplain.id,
          namaPelanggan: pelanggan.nama,
          kodePelanggan: pelanggan.kodePelanggan,
          noTelepon: pelanggan.noTelepon,
          alamat: pelanggan.alamat,
          patokanLokasi: pelanggan.patokanLokasi,
          googleMapsUrl,
          zonaAngkut,
          statusTagihan,
          jenisPengaduan: labelJenis,
          deskripsi,
          waktu: komplain.createdAt || new Date(),
        });
        await kirimReportPengaduan({
          tipe: "pengaduan_masuk",
          judul: tPengaduan.judul,
          pesan: tPengaduan.pesan,
          pelangganId: pelanggan.id,
        });
        notifTerkirim = true;
      } catch (err) {
        console.error("[Pengaduan] Gagal kirim WA ke pengelola & petugas:", err);
      }
    }

    return NextResponse.json(
      {
        ok: true,
        id: komplain.id,
        status: komplain.status,
        namaPelanggan: pelanggan.nama,
        kodePelanggan: pelanggan.kodePelanggan,
        notifWa: notifTerkirim,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Gagal mengirim pengaduan. Coba lagi." }, { status: 500 });
  }
}
