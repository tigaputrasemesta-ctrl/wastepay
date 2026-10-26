import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { allowAttempt, retryAfterSeconds } from "@/lib/rate-limit";
import { isWaEnabled, kirimReportPengaduan, templatePengaduanAdmin } from "@/lib/wa";
import { formatRupiahSkylite, BULAN_INDO } from "@/lib/invoice-format";

const JENIS_VALID = ["tidak_diangkut", "sampah_menumpuk", "lainnya"];

export const dynamic = "force-dynamic";

/**
 * Pengaduan publik: pelanggan memasukkan KODE PELANGGAN lalu mengisi keluhan.
 * Komplain langsung muncul di peta admin (live view).
 */
export async function POST(request: Request) {
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
    const kodePelanggan = String(body.kodePelanggan ?? "").trim().toUpperCase();
    const jenis = JENIS_VALID.includes(body.jenis) ? body.jenis : "lainnya";
    const deskripsi = String(body.deskripsi ?? "").trim();
    const foto = body.foto && typeof body.foto === "string" ? body.foto : null;

    if (!kodePelanggan) {
      return NextResponse.json({ error: "Kode pelanggan wajib diisi." }, { status: 400 });
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

    const pelanggan = await prisma.pelanggan.findFirst({
      where: { kodePelanggan, deletedAt: null },
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
        { error: "Kode pelanggan tidak ditemukan. Periksa kembali kode di kartu/barcode Anda." },
        { status: 404 }
      );
    }

    const komplain = await prisma.komplain.create({
      data: { jenis, deskripsi, foto, status: "baru", pelangganId: pelanggan.id },
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
      const q = `${pelanggan.alamat}${pelanggan.kelurahan?.nama ? `, Kel. ${pelanggan.kelurahan.nama}` : ""}, Depok`;
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
