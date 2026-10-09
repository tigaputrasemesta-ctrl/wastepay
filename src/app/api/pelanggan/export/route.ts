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

const KATEGORI_LABEL: Record<string, string> = {
  level_1: "Level 1",
  level_2: "Level 2",
  level_3: "Level 3",
  level_4: "Level 4",
  level_5: "Level 5",
  level_6: "Level 6",
  level_7: "Level 7",
  level_8: "Level 8",
  level_9: "Level 9",
  level_10: "Level 10",
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  const status = searchParams.get("status");
  const kategori = searchParams.get("kategori");
  const kelurahanId = searchParams.get("kelurahanId");

  const whereClause: any = {
    deletedAt: null,
  };
  
  if (status) {
    whereClause.status = status;
  }
  if (kategori) {
    whereClause.kategori = kategori;
  }
  if (kelurahanId && !isNaN(parseInt(kelurahanId))) {
    whereClause.kelurahanId = parseInt(kelurahanId);
  }

  const pelangganList = await prisma.pelanggan.findMany({
    where: whereClause,
    include: {
      kelurahan: true,
      wilayah: {
        include: {
          zona: true
        }
      },
      paket: true
    },
    orderBy: [
      { kelurahanId: "asc" },
      { nama: "asc" },
    ],
  });

  const kategoriTarifList = await prisma.kategoriTarif.findMany({
    select: { kategori: true, tarif: true }
  });
  
  let tarifMap: Record<string, number> = {};
  if (Array.isArray(kategoriTarifList)) {
    kategoriTarifList.forEach((k: any) => {
      if (k.kategori && typeof k.tarif === 'number') {
        tarifMap[k.kategori] = k.tarif;
      }
    });
  }

  const rows: (string | number | null)[][] = [];
  rows.push(["DAFTAR REKAPITULASI PELANGGAN"]);
  rows.push([""]);
  rows.push([
    "No", 
    "Kode Pelanggan", 
    "Nama Pelanggan", 
    "Penanggung Jawab",
    "No Telepon", 
    "Alamat", 
    "RT/RW",
    "Patokan",
    "Kelurahan", 
    "Zona Area", 
    "Kategori", 
    "Nominal Tarif (Rp)",
    "Status", 
    "Tanggal Daftar",
    "Latitude",
    "Longitude"
  ]);

  pelangganList.forEach((p, idx) => {
    let nominal = 0;
    if (p.customTarif) {
      nominal = p.customTarif;
    } else if (p.paket) {
      nominal = p.paket.harga || 0;
    } else {
      nominal = tarifMap[p.kategori] || 0;
    }

    const d = new Date(p.createdAt);
    const tglDaftar = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;

    rows.push([
      idx + 1,
      p.kodePelanggan,
      p.nama,
      p.penanggungjawab && p.penanggungjawab !== p.nama ? p.penanggungjawab : "",
      p.noTelepon,
      p.alamat,
      p.rtRw,
      p.patokanLokasi,
      p.kelurahan?.nama || "",
      p.wilayah?.zona?.nama || p.wilayah?.nama || "",
      KATEGORI_LABEL[p.kategori] || p.kategori,
      nominal,
      p.status.toUpperCase(),
      tglDaftar,
      p.latitude || "",
      p.longitude || ""
    ]);
  });

  const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\r\n");

  const today = new Date().toISOString().split("T")[0];
  
  return new NextResponse("\uFEFF" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="data_pelanggan_${today}.csv"`,
    },
  });
}
