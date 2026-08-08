import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { updateTunggakan } from "@/lib/tagihan";
import { generateNoInvoice } from "@/lib/invoice";
import {
  buildTagihanWa,
  isWaEnabled,
  kirimBlastWa,
  kirimNotifikasi,
  templateTagihanBaru,
  type TargetWa,
} from "@/lib/wa";

export async function GET(request: Request) {
  await updateTunggakan();

  const { searchParams } = new URL(request.url);
  const bulan = searchParams.get("bulan");
  const tahun = searchParams.get("tahun");
  const status = searchParams.get("status");
  const pelangganId = searchParams.get("pelangganId");
  const wilayahId = searchParams.get("wilayahId");
  // ?saya=1 → petugas tagih: hanya tagihan pelanggan di wilayahnya
  const saya = searchParams.get("saya") === "1";

  const where: Prisma.TagihanWhereInput = { deletedAt: null };
  if (bulan) where.bulan = parseInt(bulan);
  if (tahun) where.tahun = parseInt(tahun);
  if (status) where.status = status;
  if (pelangganId) where.pelangganId = parseInt(pelangganId);
  if (wilayahId) {
    where.pelanggan = { wilayahId: parseInt(wilayahId) };
  }
  if (saya) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const profil = await prisma.petugas.findUnique({
      where: { userId: session.id },
      select: { wilayahId: true },
    });
    if (!profil) {
      return NextResponse.json({ error: "Akun belum ter-link ke profil petugas" }, { status: 403 });
    }
    where.pelanggan = { wilayahId: profil.wilayahId };
  }

  const tagihan = await prisma.tagihan.findMany({
    where,
    include: {
      pelanggan: { select: { id: true, nama: true, alamat: true, noTelepon: true, kodePelanggan: true, kategori: true, customTarif: true } },
      pembayaran: true,
    },
    orderBy: [{ tahun: "desc" }, { bulan: "desc" }, { pelanggan: { nama: "asc" } }],
  });

  return NextResponse.json(tagihan);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bulan, tahun, jumlah, pelangganId } = body;

    // Hitung tarif untuk pelanggan tertentu
    async function getTarif(pelangganId: number): Promise<number> {
      const pelanggan = await prisma.pelanggan.findUnique({
        where: { id: pelangganId },
        include: { paket: true },
      });
      if (!pelanggan) return 0;

      // Prioritas: customTarif > paket.harga > kategoriTarif default
      if (pelanggan.customTarif) return pelanggan.customTarif;
      if (pelanggan.paket?.harga) return pelanggan.paket.harga;

      const kategoriTarif = await prisma.kategoriTarif.findUnique({
        where: { kategori: pelanggan.kategori },
      });
      return kategoriTarif?.tarif ?? 0;
    }

    // Generate tagihan for one pelanggan
    if (pelangganId && bulan && tahun) {
      const pid = parseInt(pelangganId);
      const bln = parseInt(bulan);
      const thn = parseInt(tahun);

      const existing = await prisma.tagihan.findUnique({
        where: { pelangganId_bulan_tahun: { pelangganId: pid, bulan: bln, tahun: thn } },
      });
      if (existing) {
        return NextResponse.json({ error: "Tagihan sudah ada untuk pelanggan ini" }, { status: 400 });
      }

      const tarif = jumlah ? parseFloat(jumlah) : await getTarif(pid);

      const tagihan = await prisma.tagihan.create({
        data: {
          pelangganId: pid,
          bulan: bln,
          tahun: thn,
          jumlah: tarif,
          status: "belum_bayar",
          jatuhTempo: new Date(thn, bln - 1, 15),
        },
        include: { pelanggan: { include: { paket: true } } },
      });
      if (!tagihan.noInvoice) {
        await prisma.tagihan.update({
          where: { id: tagihan.id },
          data: {
            noInvoice: generateNoInvoice(tagihan.pelanggan.kodePelanggan, bln, thn),
          },
        });
      }
      // Auto-kirim WA invoice ke pelanggan (skylite pattern, jika WA aktif)
      if (process.env.WA_AUTO_SEND !== "false" && isWaEnabled() && tagihan.pelanggan.noTelepon) {
        await kirimNotifikasi({
          tipe: "tagihan_baru",
          ...templateTagihanBaru(
            buildTagihanWa(
              {
                noInvoice: tagihan.noInvoice || generateNoInvoice(tagihan.pelanggan.kodePelanggan, bln, thn),
                bulan: bln,
                tahun: thn,
                jumlah: tarif,
                denda: 0,
                jatuhTempo: new Date(thn, bln - 1, 15),
                kodePelanggan: tagihan.pelanggan.kodePelanggan,
                paket: tagihan.pelanggan.paket?.nama || undefined,
              },
              tagihan.pelanggan.nama
            )
          ),
          pelangganId: tagihan.pelanggan.id,
          noTelepon: tagihan.pelanggan.noTelepon,
        });
      }
      return NextResponse.json(tagihan, { status: 201 });
    }

    // Generate tagihan for all active pelanggan
    if (bulan && tahun) {
      const pelangganAktif = await prisma.pelanggan.findMany({
        where: { status: "aktif" },
        include: { paket: true },
      });

      let created = 0;
      let skipped = 0;
      const bln = parseInt(bulan);
      const thn = parseInt(tahun);
      const tagihanBaru: { pelangganId: number; nama: string; noTelepon: string | null; noInvoice: string | null; bulan: number; tahun: number; jumlah: number; denda: number | null; jatuhTempo: Date }[] = [];

      for (const p of pelangganAktif) {
        const existing = await prisma.tagihan.findUnique({
          where: { pelangganId_bulan_tahun: { pelangganId: p.id, bulan: bln, tahun: thn } },
        });
        if (existing) {
          skipped++;
          continue;
        }

        // Hitung tarif: jumlah manual > customTarif > paket.harga > kategoriTarif
        let tarif = jumlah ? parseFloat(jumlah) : 0;
        if (!tarif && p.customTarif) tarif = p.customTarif;
        if (!tarif && p.paket?.harga) tarif = p.paket.harga;
        if (!tarif) {
          const kategoriTarif = await prisma.kategoriTarif.findUnique({
            where: { kategori: p.kategori },
          });
          tarif = kategoriTarif?.tarif ?? 0;
        }

        await prisma.tagihan.create({
          data: {
            pelangganId: p.id,
            bulan: bln,
            tahun: thn,
            jumlah: tarif,
            status: "belum_bayar",
            jatuhTempo: new Date(thn, bln - 1, 15),
            noInvoice: generateNoInvoice(p.kodePelanggan, bln, thn),
          },
        });
        tagihanBaru.push({
          pelangganId: p.id,
          nama: p.nama,
          noTelepon: p.noTelepon,
          noInvoice: generateNoInvoice(p.kodePelanggan, bln, thn),
          bulan: bln,
          tahun: thn,
          jumlah: tarif,
          denda: null,
          jatuhTempo: new Date(thn, bln - 1, 15),
        });
        created++;
      }

      // Auto-kirim WA invoice (skylite pattern, jika WA aktif)
      if (process.env.WA_AUTO_SEND !== "false" && isWaEnabled() && tagihanBaru.length > 0) {
        const targets: TargetWa[] = tagihanBaru.map((t) => ({
          pelangganId: t.pelangganId,
          nama: t.nama,
          noTelepon: t.noTelepon,
        }));
        await kirimBlastWa(targets, "tagihan_baru", (t) => {
          const row = tagihanBaru.find((x) => x.pelangganId === t.pelangganId)!;
          return templateTagihanBaru(buildTagihanWa(row, t.nama));
        });
      }

      return NextResponse.json({ created, skipped });
    }

    return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Gagal membuat tagihan" }, { status: 500 });
  }
}
