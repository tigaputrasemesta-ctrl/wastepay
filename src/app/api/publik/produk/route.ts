import { NextResponse } from "next/server";
import { getKatalogProduk } from "@/lib/katalog-produk";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const list = await getKatalogProduk();
    const activeOnly = list.filter((p) => p.aktif);
    return NextResponse.json(
      { success: true, data: activeOnly },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (err) {
    console.error("[api/publik/produk] Error fetching products:", err);
    return NextResponse.json(
      { success: false, error: "Gagal memuat katalog produk" },
      { status: 500 }
    );
  }
}
