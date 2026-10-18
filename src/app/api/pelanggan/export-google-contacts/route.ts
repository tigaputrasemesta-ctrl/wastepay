import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server-rbac";
import {
  generateGoogleContactsCsv,
  generateVCard,
  type PelangganForContact,
} from "@/lib/google-contacts";

/**
 * GET /api/pelanggan/export-google-contacts?format=csv|vcf&status=&kategori=&kelurahanId=
 * Ekspor data pelanggan dalam format standar Google Contacts (CSV atau vCard .vcf)
 */
export async function GET(request: Request) {
  const auth = await requireRole(request, "petugas"); // Minimal petugas/kasir/admin
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { searchParams } = new URL(request.url);
  const format = (searchParams.get("format") || "csv").toLowerCase();
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
          zona: true,
        },
      },
      paket: true,
    },
    orderBy: [{ kelurahanId: "asc" }, { nama: "asc" }],
  });

  const today = new Date().toISOString().split("T")[0];

  if (format === "vcf" || format === "vcard") {
    const vcfContent = generateVCard(
      pelangganList as unknown as PelangganForContact[],
      "Pelanggan WastePay"
    );

    return new NextResponse(vcfContent, {
      headers: {
        "Content-Type": "text/vcard; charset=utf-8",
        "Content-Disposition": `attachment; filename="google_contacts_wastepay_${today}.vcf"`,
      },
    });
  }

  // Default: Google Contacts CSV
  const csvContent = generateGoogleContactsCsv(
    pelangganList as unknown as PelangganForContact[],
    "Pelanggan WastePay"
  );

  return new NextResponse("\uFEFF" + csvContent, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="google_contacts_wastepay_${today}.csv"`,
    },
  });
}
