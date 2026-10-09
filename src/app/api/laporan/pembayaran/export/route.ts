import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function csvEscape(value: string | number | null | undefined): string {
  let s = value == null ? "" : String(value);
  if (/^[=+\-@]/.test(s)) {
    s = "'" + s;
  }
  if (/[",\n;]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const now = new Date();
  
  const paramBulan = searchParams.get("bulan");
  const filterBulan = paramBulan && paramBulan !== "all" 
    ? parseInt(paramBulan) 
    : (paramBulan === "all" ? null : now.getMonth() + 1);
    
  const tahun = parseInt(searchParams.get("tahun") || String(now.getFullYear())) || now.getFullYear();
  const filterStatus = searchParams.get("status") || "all";

  const whereClause: any = {
    tahun,
    deletedAt: null,
  };
  
  if (filterBulan !== null) {
    whereClause.bulan = filterBulan;
  }
  
  if (filterStatus !== "all") {
    if (filterStatus === "lunas") {
      whereClause.status = "lunas";
    } else if (filterStatus === "belum_bayar") {
      whereClause.status = { in: ["belum_bayar", "tunggakan"] };
    }
  }

  const tagihanList = await prisma.tagihan.findMany({
    where: whereClause,
    include: {
      pelanggan: {
        select: {
          kodePelanggan: true,
          nama: true,
          alamat: true,
          wilayah: {
            select: {
              zona: {
                select: { nama: true }
              }
            }
          }
        },
      },
      pembayaran: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: [
      { pelanggan: { kodePelanggan: "asc" } },
      { bulan: "asc" },
    ],
  });

  const NAMA_BULAN = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];

  const formatTanggalSingkat = (dateInput: Date | null | undefined) => {
    if (!dateInput) return "";
    const d = new Date(dateInput);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  };

  const labelMetode = (metode: string | undefined) => {
    if (!metode) return "";
    if (metode.startsWith("duitku")) return "Payment Gateway";
    const map: Record<string, string> = {
      tunai: "Tunai",
      transfer: "Transfer",
      ewallet: "E-Wallet",
      qris: "QRIS",
      virtual_account: "Virtual Account"
    };
    return map[metode] || metode;
  };

  const rows: (string | number | null)[][] = [];
  rows.push(["LAPORAN PEMBAYARAN PER PELANGGAN"]);
  rows.push([`Periode: ${filterBulan === null ? "Tahun " + tahun : NAMA_BULAN[filterBulan - 1] + " " + tahun}`]);
  rows.push([""]);
  rows.push([
    "No", 
    "No Pelanggan", 
    "Nama Pelanggan", 
    "Zona",
    "Alamat", 
    "Bulan Tagihan", 
    "Nominal Tagihan (Rp)", 
    "Nominal Denda (Rp)", 
    "Status", 
    "Tanggal Bayar", 
    "Jenis Pembayaran", 
    "Total Dibayar (Rp)"
  ]);

  tagihanList.forEach((t, idx) => {
    const lunas = t.status === "lunas";
    const p = t.pembayaran.length > 0 ? t.pembayaran[0] : null;
    const zonaNama = t.pelanggan.wilayah?.zona?.nama || "Tanpa Zona";
    
    rows.push([
      idx + 1,
      t.pelanggan.kodePelanggan,
      t.pelanggan.nama,
      zonaNama,
      t.pelanggan.alamat,
      `${NAMA_BULAN[t.bulan - 1]} ${t.tahun}`,
      t.jumlah,
      t.denda || 0,
      lunas ? "LUNAS" : (t.status === "tunggakan" ? "TUNGGAKAN" : "BELUM BAYAR"),
      lunas && p ? formatTanggalSingkat(p.createdAt) : "",
      lunas && p ? labelMetode(p.metode) : "",
      lunas && p ? p.jumlah : 0
    ]);
  });

  const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\r\n");

  // Output as CSV that can be directly opened in Excel nicely
  return new NextResponse("\uFEFF" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="laporan_pembayaran_pelanggan_${tahun}${filterBulan ? '_' + filterBulan : ''}.csv"`,
    },
  });
}
