import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { formatRupiah } from "@/lib/utils";

export const dynamic = "force-dynamic";

export type NotificationItem = {
  id: string;
  category: "pembayaran" | "pendaftaran" | "komplain";
  title: string;
  desc: string;
  time: string;
  link: string;
  badge: string;
  severity: "danger" | "warning" | "info";
};

export type NotificationSummaryResponse = {
  totalCount: number;
  counts: {
    pembayaran: number;
    pendaftaran: number;
    komplain: number;
  };
  items: NotificationItem[];
};

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [
      pendingPembayaranCount,
      calonPelangganCount,
      komplainBaruCount,
      pembayaranList,
      calonList,
      komplainList,
    ] = await Promise.all([
      prisma.pembayaran.count({ where: { status: "pending" } }),
      prisma.pelanggan.count({ where: { status: "calon", deletedAt: null } }),
      prisma.komplain.count({ where: { status: "baru" } }),
      prisma.pembayaran.findMany({
        where: { status: "pending" },
        include: {
          pelanggan: { select: { nama: true } },
          tagihan: { select: { id: true, noInvoice: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.pelanggan.findMany({
        where: { status: "calon", deletedAt: null },
        select: { id: true, nama: true, noTelepon: true, alamat: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.komplain.findMany({
        where: { status: "baru" },
        include: {
          pelanggan: { select: { nama: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    const items: NotificationItem[] = [
      ...pembayaranList.map((p): NotificationItem => ({
        id: `pembayaran-${p.id}`,
        category: "pembayaran",
        title: `Pembayaran: ${p.pelanggan.nama}`,
        desc: `${formatRupiah(p.jumlah)} (${p.metode.toUpperCase()}) butuh verifikasi bukti transfer`,
        time: p.createdAt.toISOString(),
        link: `/tagihan`,
        badge: "VERIFIKASI BAYAR",
        severity: "warning",
      })),
      ...calonList.map((c): NotificationItem => ({
        id: `pelanggan-${c.id}`,
        category: "pendaftaran",
        title: `Warga Baru: ${c.nama}`,
        desc: `${c.alamat ? c.alamat.slice(0, 45) : "Alamat belum ada"} (${c.noTelepon})`,
        time: c.createdAt.toISOString(),
        link: `/pelanggan/${c.id}`,
        badge: "PENDAFTARAN BARU",
        severity: "info",
      })),
      ...komplainList.map((k): NotificationItem => ({
        id: `komplain-${k.id}`,
        category: "komplain",
        title: `Komplain: ${k.pelanggan.nama}`,
        desc: `${k.jenis.replace(/_/g, " ").toUpperCase()}: ${k.deskripsi.slice(0, 50)}...`,
        time: k.createdAt.toISOString(),
        link: `/komplain`,
        badge: "KOMPLAIN WARGA",
        severity: "danger",
      })),
    ];

    // Urutkan berdasarkan waktu paling baru
    items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    const totalCount = pendingPembayaranCount + calonPelangganCount + komplainBaruCount;

    const response: NotificationSummaryResponse = {
      totalCount,
      counts: {
        pembayaran: pendingPembayaranCount,
        pendaftaran: calonPelangganCount,
        komplain: komplainBaruCount,
      },
      items: items.slice(0, 10),
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Error fetching notification summary:", error);
    return NextResponse.json(
      { error: "Gagal mengambil ringkasan notifikasi" },
      { status: 500 }
    );
  }
}
