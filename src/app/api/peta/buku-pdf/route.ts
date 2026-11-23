import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getSession } from "@/lib/auth";
import { tvTokenValid } from "@/lib/tv-token";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token") || searchParams.get("t") || request.headers.get("x-tv-token");
    const session = await getSession();

    if (!session && !tvTokenValid(token)) {
      return NextResponse.json({ error: "Akses ditolak: token peta tidak valid" }, { status: 401 });
    }

    const mode = searchParams.get("mode") || "1halaman";

    let fileName = "Peta_Sebaran_Seluruh_Pelanggan_UPSHERU_1Halaman.pdf";
    if (mode === "a3" || mode === "besar") {
      fileName = "Peta_Sebaran_Seluruh_Pelanggan_UPSHERU_A3_Besar.pdf";
    } else if (mode === "unpaid") {
      fileName = "Buku_Peta_Pelanggan_Tertunggak_UPSHERU.pdf";
    } else if (mode === "all" || mode === "buku") {
      fileName = "Buku_Peta_Navigasi_Semua_Pelanggan_UPSHERU.pdf";
    }

    const primaryPath = path.join("/data/data/com.termux/files/home/downloads", fileName);
    const fallbackPath = path.join("/data/data/com.termux/files/home", fileName);

    const targetPath = fs.existsSync(primaryPath) ? primaryPath : fs.existsSync(fallbackPath) ? fallbackPath : null;

    if (!targetPath) {
      return new NextResponse(
        JSON.stringify({
          error: "File peta belum dibuat. Silakan jalankan script generate.",
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const fileStat = fs.statSync(targetPath);
    const fileStream = fs.createReadStream(targetPath);

    return new NextResponse(fileStream as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Content-Length": String(fileStat.size),
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err: any) {
    console.error("Gagal mengunduh peta:", err);
    return new NextResponse(err.message || "Internal Server Error", { status: 500 });
  }
}
