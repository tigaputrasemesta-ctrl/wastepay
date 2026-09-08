import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function csvEscape(value: string | number | null | undefined): string {
  let s = value == null ? "" : String(value);
  // Anti CSV formula injection: nilai yang diawali karakter formula Excel
  // (=, +, -, @) diberi prefix apostrophe agar tidak dieksekusi sebagai formula.
  if (/^[=+\-@]/.test(s)) {
    s = "'" + s;
  }
  if (/[",\n;]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * GET /api/laporan/export?bulan=&tahun=
 * Ekspor laporan keuangan & operasional dalam format CSV.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const now = new Date();
  const bulan = Math.min(12, Math.max(1, parseInt(searchParams.get("bulan") || String(now.getMonth() + 1)) || now.getMonth() + 1));
  const tahun = parseInt(searchParams.get("tahun") || String(now.getFullYear())) || now.getFullYear();

  const awalBulan = new Date(tahun, bulan - 1, 1);
  const akhirBulan = new Date(tahun, bulan, 1);
  const NAMA_BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

  const [pemasukan, pengeluaran, tagihan, pembayaran, pengangkutan, menunggak] = await Promise.all([
    prisma.pembayaran.aggregate({
      where: { status: "terverifikasi", createdAt: { gte: awalBulan, lt: akhirBulan } },
      _sum: { jumlah: true },
    }),
    prisma.pengeluaran.aggregate({
      where: { tanggal: { gte: awalBulan, lt: akhirBulan } },
      _sum: { jumlah: true },
    }),
    prisma.tagihan.findMany({
      where: { bulan, tahun, deletedAt: null },
      select: { id: true, bulan: true, tahun: true, jumlah: true, denda: true, status: true, jatuhTempo: true, pelanggan: { select: { nama: true, noTelepon: true, kodePelanggan: true } } },
      orderBy: { pelanggan: { nama: "asc" } },
    }),
    prisma.pembayaran.findMany({
      where: { createdAt: { gte: awalBulan, lt: akhirBulan } },
      include: {
        pelanggan: { select: { nama: true, kodePelanggan: true } },
        tagihan: { select: { bulan: true, tahun: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.pengangkutan.findMany({
      where: { tanggal: { gte: awalBulan, lt: akhirBulan } },
      include: {
        pelanggan: { select: { nama: true } },
        petugas: { select: { nama: true } },
        tpa: { select: { nama: true } },
      },
      orderBy: { tanggal: "desc" },
    }),
    prisma.tagihan.findMany({
      where: {
        status: { in: ["belum_bayar", "tunggakan"] },
        deletedAt: null,
        OR: [{ tahun: { lt: tahun } }, { tahun, bulan: { lt: bulan } }],
      },
      include: { pelanggan: { select: { nama: true, noTelepon: true } } },
      orderBy: [{ tahun: "asc" }, { bulan: "asc" }],
    }),
  ]);

  const rows: (string | number | null)[][] = [];
  rows.push(["LAPORAN TPS HERU DEPOK", "", ""]);
  rows.push([`Periode: ${NAMA_BULAN[bulan - 1]} ${tahun}`, "", ""]);
  rows.push([""]);
  rows.push(["RINGKASAN KEUANGAN", "", ""]);
  rows.push(["Pemasukan", (pemasukan._sum.jumlah || 0).toString(), ""]);
  rows.push(["Pengeluaran", (pengeluaran._sum.jumlah || 0).toString(), ""]);
  rows.push(["Saldo Bersih", ((pemasukan._sum.jumlah || 0) - (pengeluaran._sum.jumlah || 0)).toString(), ""]);
  rows.push([""]);

  rows.push(["TAGIHAN"]);
  rows.push(["Kode", "Pelanggan", "No. Telepon", "Periode", "Jumlah", "Denda", "Status", "Jatuh Tempo"]);
  for (const t of tagihan) {
    rows.push([
      t.pelanggan.kodePelanggan,
      t.pelanggan.nama,
      t.pelanggan.noTelepon,
      `${NAMA_BULAN[t.bulan - 1]} ${t.tahun}`,
      t.jumlah,
      t.denda || "",
      t.status,
      t.jatuhTempo.toISOString().split("T")[0],
    ]);
  }
  rows.push([""]);

  rows.push(["PEMBAYARAN"]);
  rows.push(["Tanggal", "Kode", "Pelanggan", "Periode", "Jumlah", "Metode", "Status"]);
  for (const p of pembayaran) {
    rows.push([
      p.createdAt.toISOString().split("T")[0],
      p.pelanggan.kodePelanggan,
      p.pelanggan.nama,
      `${p.tagihan.bulan}/${p.tagihan.tahun}`,
      p.jumlah,
      p.metode,
      p.status,
    ]);
  }
  rows.push([""]);

  rows.push(["PENGANGKUTAN"]);
  rows.push(["Tanggal", "Pelanggan", "Petugas", "TPA", "Volume (m3)", "Berat (kg)", "Status"]);
  for (const a of pengangkutan) {
    rows.push([
      a.tanggal.toISOString().split("T")[0],
      a.pelanggan.nama,
      a.petugas?.nama || "",
      a.tpa?.nama || "",
      a.volume || "",
      a.berat || "",
      a.status,
    ]);
  }
  rows.push([""]);

  rows.push(["TAGIHAN MENUNGAK"]);
  rows.push(["Pelanggan", "No. Telepon", "Periode", "Jumlah"]);
  for (const t of menunggak) {
    rows.push([
      t.pelanggan.nama,
      t.pelanggan.noTelepon,
      `${NAMA_BULAN[t.bulan - 1]} ${t.tahun}`,
      t.jumlah,
    ]);
  }

  const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\r\n");

  return new NextResponse("\uFEFF" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="tps-heru-laporan-${tahun}-${String(bulan).padStart(2, "0")}.csv"`,
    },
  });
}
