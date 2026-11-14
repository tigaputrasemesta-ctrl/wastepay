import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import {
  getKatalogProduk,
  saveKatalogProduk,
} from "@/lib/server/katalog-produk-service";
import {
  DEFAULT_PRODUK_LIST,
  ProdukSampah,
} from "@/lib/katalog-produk";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const list = await getKatalogProduk();
  return NextResponse.json({ success: true, data: list });
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    if (body.action === "reset") {
      await saveKatalogProduk(DEFAULT_PRODUK_LIST);
      await logAudit(
        "update",
        "Pengaturan:KATALOG_PRODUK_JSON",
        session.id,
        undefined,
        { action: "reset", totalItems: DEFAULT_PRODUK_LIST.length }
      ).catch(() => {});
      return NextResponse.json({ success: true, data: DEFAULT_PRODUK_LIST });
    }

    const produkList = body.produkList as ProdukSampah[];
    if (!Array.isArray(produkList)) {
      return NextResponse.json(
        { error: "Format data produk tidak valid (wajib array)" },
        { status: 400 }
      );
    }

    // Validasi singkat setiap produk
    for (const item of produkList) {
      if (!item.id || !item.nama || typeof item.harga !== "number") {
        return NextResponse.json(
          { error: `Produk '${item?.nama || "tanpa nama"}' tidak lengkap (ID, nama, harga wajib ada)` },
          { status: 400 }
        );
      }
    }

    const saved = await saveKatalogProduk(produkList);
    if (!saved) {
      return NextResponse.json({ error: "Gagal menyimpan ke database" }, { status: 500 });
    }

    await logAudit(
      "update",
      "Pengaturan:KATALOG_PRODUK_JSON",
      session.id,
      undefined,
      { totalItems: produkList.length }
    ).catch(() => {});

    return NextResponse.json({ success: true, data: produkList });
  } catch (err: unknown) {
    console.error("[api/admin/produk] Error saving products:", err);
    const message = err instanceof Error ? err.message : "Terjadi kesalahan internal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
