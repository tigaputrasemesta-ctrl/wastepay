import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const kategoriTarif = await prisma.kategoriTarif.findMany({
    orderBy: { kategori: "asc" },
  });
  return NextResponse.json(kategoriTarif);
}
