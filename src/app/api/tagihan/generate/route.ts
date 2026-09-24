import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";
import { generateNoInvoice } from "@/lib/invoice";
import { hitungJatuhTempoKonsumen } from "@/lib/tagihan";
import {
  buildTagihanWa,
  isWaEnabled,
  kirimBlastWa,
  templateTagihanBaru,
  type TargetWa,
} from "@/lib/wa";

type Candidate = {
  pelangganId: number;
  nama: string;
  kodePelanggan: string;
  kategori: string;
  noTelepon: string | null;
  paket: string | null;
  jumlah: number;
  createdAt: string;
  hariSiklus: number;
  jatuhTempo: string;
};

/**
 * POST /api/tagihan/generate
 * Body:
 *   { bulan?, tahun? }                        → auto-generate untuk semua pelanggan aktif (tarif otomatis)
 *   { bulan?, tahun?, preview: true }         → kembalikan daftar kandidat + nominal hasil hitung (tanpa menyimpan)
 *   { bulan?, tahun?, items: [{pelangganId, jumlah}] } → generate dengan nominal kustom per pelanggan
 */
export async function POST(request: Request) {
  const user = await getSession();
  if (!user || !hasRole(user, "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const now = new Date();
    const bulan = Number(body.bulan) || now.getMonth() + 1;
    const tahun = Number(body.tahun) || now.getFullYear();
    const isPreview = body.preview === true;
    const itemsRaw: unknown = body.items;

    // Get all active customers
    const pelangganList = await prisma.pelanggan.findMany({
      where: { status: "aktif", deletedAt: null },
      include: { paket: true },
    });

    // Batch lookup — hindari N+1
    const existingSet = new Set(
      (
        await prisma.tagihan.findMany({
          where: {
            bulan,
            tahun,
            pelangganId: { in: pelangganList.map((p) => p.id) },
          },
          select: { pelangganId: true },
        })
      ).map((t) => t.pelangganId)
    );
    const kategoriTarifMap = new Map(
      (await prisma.kategoriTarif.findMany()).map((k) => [k.kategori, k.tarif])
    );

    // Build candidate list + calculated amount (customTarif > paket.harga > kategoriTarif)
    const candidates: Candidate[] = [];
    for (const pelanggan of pelangganList) {
      if (existingSet.has(pelanggan.id)) continue;
      let tarif = pelanggan.customTarif;
      if (!tarif && pelanggan.paket) tarif = pelanggan.paket.harga;
      if (!tarif) tarif = kategoriTarifMap.get(pelanggan.kategori) ?? 0;

      const jt = hitungJatuhTempoKonsumen(pelanggan.createdAt, bulan, tahun);
      const regDate = new Date(pelanggan.createdAt);

      candidates.push({
        pelangganId: pelanggan.id,
        nama: pelanggan.nama,
        kodePelanggan: pelanggan.kodePelanggan,
        kategori: pelanggan.kategori,
        noTelepon: pelanggan.noTelepon,
        paket: pelanggan.paket?.nama || null,
        jumlah: tarif ?? 0,
        createdAt: pelanggan.createdAt.toISOString(),
        hariSiklus: regDate.getDate(),
        jatuhTempo: jt.toISOString(),
      });
    }

    if (isPreview) {
      return NextResponse.json({
        bulan,
        tahun,
        total: candidates.length,
        preview: candidates,
      });
    }

    // Optional: custom amount per pelanggan (override hasil hitung otomatis)
    const overrideMap: Map<number, number> | null = Array.isArray(itemsRaw)
      ? new Map(
          (itemsRaw as { pelangganId: number; jumlah: number }[])
            .filter((it) => it && it.pelangganId != null)
            .map((it) => [Number(it.pelangganId), Number(it.jumlah) || 0])
        )
      : null;

    let created = 0;
    const skipped = pelangganList.length - candidates.length;
    const errors: string[] = [];
    const tagihanBaru: {
      pelangganId: number;
      nama: string;
      noTelepon: string | null;
      noInvoice: string | null;
      bulan: number;
      tahun: number;
      jumlah: number;
      denda: number | null;
      jatuhTempo: Date;
      kodePelanggan: string;
      paket?: string;
    }[] = [];

    for (const c of candidates) {
      // Jika daftar items dikirim, hanya buat pelanggan yang ada di daftar (nominal custom)
      if (overrideMap && !overrideMap.has(c.pelangganId)) continue;
      const jumlah = overrideMap ? (overrideMap.get(c.pelangganId) ?? 0) : c.jumlah;

      try {
        const jatuhTempo = new Date(c.jatuhTempo);
        const noInvoice = generateNoInvoice(c.kodePelanggan, bulan, tahun);

        await prisma.tagihan.create({
          data: {
            pelangganId: c.pelangganId,
            bulan,
            tahun,
            jumlah,
            status: "belum_bayar",
            jatuhTempo,
            keterangan: `Tagihan bulan ${bulan}/${tahun} (Siklus tgl ${c.hariSiklus})`,
            noInvoice,
          },
        });

        tagihanBaru.push({
          pelangganId: c.pelangganId,
          nama: c.nama,
          noTelepon: c.noTelepon,
          noInvoice,
          bulan,
          tahun,
          jumlah,
          denda: null,
          jatuhTempo,
          kodePelanggan: c.kodePelanggan,
          paket: c.paket || undefined,
        });

        created++;
      } catch (e) {
        errors.push(
          `Pelanggan #${c.pelangganId} (${c.nama}): ${e instanceof Error ? e.message : "Error"}`
        );
      }
    }

    // Auto-kirim WA invoice ke pelanggan yang tagihannya baru dibuat (skylite pattern).
    const waAutoSend = process.env.WA_AUTO_SEND !== "false" && isWaEnabled();
    let waHasil: {
      terkirim: number;
      pending: number;
      gagal: number;
      failures: string[];
    } | null = null;
    if (waAutoSend && tagihanBaru.length > 0) {
      const targets: TargetWa[] = tagihanBaru.map((t) => ({
        pelangganId: t.pelangganId,
        nama: t.nama,
        noTelepon: t.noTelepon,
      }));
      waHasil = await kirimBlastWa(
        targets,
        "tagihan_baru",
        (t) => {
          const row = tagihanBaru.find((x) => x.pelangganId === t.pelangganId)!;
          return await templateTagihanBaru(buildTagihanWa(row, t.nama));
        },
        { createdById: user.id }
      );
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        aksi: "create",
        entitas: "Tagihan",
        entitasId: 0,
        dataBaru: JSON.stringify({
          bulan,
          tahun,
          created,
          skipped,
          customAmount: !!overrideMap,
          errors: errors.length,
        }),
        userId: user.id,
      },
    });

    return NextResponse.json({
      message: `Tagihan berhasil digenerate: ${created} dibuat, ${skipped} sudah ada`,
      created,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
      waEnabled: waAutoSend,
      notifikasi: waHasil
        ? {
            terkirim: waHasil.terkirim,
            pending: waHasil.pending,
            gagal: waHasil.gagal,
            failures: waHasil.failures.length > 0 ? waHasil.failures : undefined,
          }
        : undefined,
    });
  } catch {
    return NextResponse.json(
      { error: "Gagal generate tagihan" },
      { status: 500 }
    );
  }
}
