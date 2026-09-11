import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getPetugasKelurahan, PETUGAS_SCOPE_ALL } from "@/lib/scope";
import { updateTunggakan, hitungJatuhTempoKonsumen } from "@/lib/tagihan";
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
  const kelurahanId = searchParams.get("kelurahanId");
  const zonaId = searchParams.get("zonaId");
  const wilayahId = searchParams.get("wilayahId");
  const rt = searchParams.get("rt")?.trim();
  // ?saya=1 → petugas tagih: hanya tagihan pelanggan di KELURAHAN-nya
  const saya = searchParams.get("saya") === "1";

  // Validasi status enum — nilai tak dikenal langsung 400 (bukan 500 dari Prisma)
  const STATUS_VALID = ["belum_bayar", "lunas", "tunggakan", "dibatalkan"];
  if (status && !STATUS_VALID.includes(status)) {
    return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });
  }

  const where: Prisma.TagihanWhereInput = { deletedAt: null };
  if (bulan) {
    const b = parseInt(bulan);
    if (!Number.isInteger(b) || b < 1 || b > 12) {
      return NextResponse.json({ error: "Bulan tidak valid" }, { status: 400 });
    }
    where.bulan = b;
  }
  if (tahun) {
    const t = parseInt(tahun);
    if (!Number.isInteger(t) || t < 2000 || t > 2100) {
      return NextResponse.json({ error: "Tahun tidak valid" }, { status: 400 });
    }
    where.tahun = t;
  }
  if (status) where.status = status;
  if (pelangganId) {
    const pid = parseInt(pelangganId);
    if (!Number.isInteger(pid)) {
      return NextResponse.json({ error: "pelangganId tidak valid" }, { status: 400 });
    }
    where.pelangganId = pid;
  }
  if (kelurahanId) {
    const kid = parseInt(kelurahanId);
    if (Number.isInteger(kid)) {
      where.pelanggan = { ...(where.pelanggan as Prisma.PelangganWhereInput || {}), kelurahanId: kid };
    }
  }
  if (zonaId) {
    const zid = parseInt(zonaId);
    if (Number.isInteger(zid)) {
      const wilayahInZona = await prisma.wilayah.findMany({
        where: { zonaId: zid },
        select: { id: true, rt: true },
      });
      const widList = wilayahInZona.map((w) => w.id);
      const rtList = wilayahInZona.map((w) => w.rt).filter((rtStr): rtStr is string => Boolean(rtStr));

      where.pelanggan = {
        ...(where.pelanggan as Prisma.PelangganWhereInput || {}),
        OR: [
          { wilayah: { zonaId: zid } },
          ...(widList.length > 0 ? [{ wilayahId: { in: widList } }] : []),
          ...rtList.map((rtStr) => ({
            rtRw: { contains: rtStr, mode: "insensitive" as const },
          })),
        ],
      };
    }
  }
  if (wilayahId) {
    const wid = parseInt(wilayahId);
    if (!Number.isInteger(wid)) {
      return NextResponse.json({ error: "wilayahId tidak valid" }, { status: 400 });
    }
    where.pelanggan = { ...(where.pelanggan as Prisma.PelangganWhereInput || {}), wilayahId: wid };
  }
  if (rt) {
    where.pelanggan = {
      ...(where.pelanggan as Prisma.PelangganWhereInput || {}),
      OR: [
        { wilayah: { rt } },
        { wilayah: { nama: { contains: rt, mode: "insensitive" } } },
        { rtRw: { contains: rt, mode: "insensitive" } },
      ],
    };
  }
  if (saya) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!PETUGAS_SCOPE_ALL) {
      const kid = await getPetugasKelurahan(session.id);
      if (!kid) {
        return NextResponse.json({ error: "Akun belum ter-link ke kelurahan petugas" }, { status: 403 });
      }
      where.pelanggan = { ...(where.pelanggan as Prisma.PelangganWhereInput || {}), kelurahanId: kid };
    }
  }

  const tagihan = await prisma.tagihan.findMany({
    where,
    include: {
      pelanggan: {
        select: {
          id: true,
          nama: true,
          alamat: true,
          noTelepon: true,
          kodePelanggan: true,
          kategori: true,
          customTarif: true,
          rtRw: true,
          createdAt: true,
          kelurahanId: true,
          kelurahan: { select: { id: true, nama: true, kecamatan: true } },
          wilayahId: true,
          wilayah: {
            select: {
              id: true,
              nama: true,
              rt: true,
              rw: true,
              zonaId: true,
              zona: { select: { id: true, nama: true, warna: true } },
            },
          },
        },
      },
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

      if (!Number.isInteger(pid) || !Number.isInteger(bln) || bln < 1 || bln > 12 || !Number.isInteger(thn)) {
        return NextResponse.json({ error: "Parameter tidak valid" }, { status: 400 });
      }

      const existing = await prisma.tagihan.findUnique({
        where: { pelangganId_bulan_tahun: { pelangganId: pid, bulan: bln, tahun: thn } },
      });
      if (existing) {
        return NextResponse.json({ error: "Tagihan sudah ada untuk pelanggan ini" }, { status: 400 });
      }

      // jumlah: string kosong/null/undefined → hitung otomatis; angka (termasuk 0) → pakai manual
      const jumlahDikirim = jumlah !== undefined && jumlah !== null && String(jumlah).trim() !== "";
      const tarif = jumlahDikirim ? parseFloat(jumlah) : await getTarif(pid);
      if (!Number.isFinite(tarif) || tarif <= 0) {
        return NextResponse.json({ error: "Tarif tidak valid atau tidak ditemukan" }, { status: 400 });
      }

      // Dapatkan data pelanggan untuk tanggal pendaftaran (Anniversary Billing)
      const pelangganData = await prisma.pelanggan.findUnique({
        where: { id: pid },
        select: { createdAt: true },
      });
      const jatuhTempo = hitungJatuhTempoKonsumen(pelangganData?.createdAt, bln, thn);

      const tagihan = await prisma.tagihan.create({
        data: {
          pelangganId: pid,
          bulan: bln,
          tahun: thn,
          jumlah: tarif,
          status: "belum_bayar",
          jatuhTempo,
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

      // Batch: 1 query semua tagihan periode tsb + 1 query semua kategori tarif
      // (sebelumnya 2 query per pelanggan → N+1).
      const bln = parseInt(bulan);
      const thn = parseInt(tahun);
      const [existingAll, kategoriTarifAll] = await Promise.all([
        prisma.tagihan.findMany({
          where: { bulan: bln, tahun: thn },
          select: { pelangganId: true },
        }),
        prisma.kategoriTarif.findMany(),
      ]);
      const existingIds = new Set(existingAll.map((t) => t.pelangganId));
      const kategoriTarifMap = new Map(kategoriTarifAll.map((k) => [k.kategori, k.tarif]));

      let created = 0;
      let skipped = 0;
      const tagihanBaru: { pelangganId: number; nama: string; noTelepon: string | null; noInvoice: string | null; bulan: number; tahun: number; jumlah: number; denda: number | null; jatuhTempo: Date }[] = [];

      for (const p of pelangganAktif) {
        if (existingIds.has(p.id)) {
          skipped++;
          continue;
        }

        // Hitung tarif: jumlah manual > customTarif > paket.harga > kategoriTarif
        let tarif = jumlah !== undefined && jumlah !== null && String(jumlah).trim() !== "" ? parseFloat(jumlah) : 0;
        if (!tarif && p.customTarif) tarif = p.customTarif;
        if (!tarif && p.paket?.harga) tarif = p.paket.harga;
        if (!tarif) tarif = kategoriTarifMap.get(p.kategori) ?? 0;

        const jatuhTempo = hitungJatuhTempoKonsumen(p.createdAt, bln, thn);
        const hariSiklus = new Date(p.createdAt).getDate();

        await prisma.tagihan.create({
          data: {
            pelangganId: p.id,
            bulan: bln,
            tahun: thn,
            jumlah: tarif,
            status: "belum_bayar",
            jatuhTempo,
            keterangan: `Tagihan bulan ${bln}/${thn} (Siklus tgl ${hariSiklus})`,
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
          jatuhTempo,
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
