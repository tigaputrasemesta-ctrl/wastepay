import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * On-demand endpoint untuk fotoRumah pelanggan pada Peta & Bottom Sheet.
 * Mendukung pemanggilan gambar langsung (<img src="/api/peta/foto-rumah?id=..." />)
 * maupun panggilan JSON asinkron (fetch dengan Accept: application/json).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get("id");
    if (!idParam) {
      return NextResponse.json({ error: "Parameter ID wajib diisi" }, { status: 400 });
    }

    const id = parseInt(idParam, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }

    const pelanggan = await prisma.pelanggan.findUnique({
      where: { id },
      select: { id: true, fotoRumah: true, nama: true },
    });

    if (!pelanggan || !pelanggan.fotoRumah) {
      const wantsJson = request.headers.get("accept")?.includes("application/json") || searchParams.get("format") === "json";
      if (wantsJson) {
        return NextResponse.json({ success: false, foto: null, message: "Foto rumah tidak ditemukan" }, { status: 404 });
      }
      return new NextResponse("Not Found", { status: 404 });
    }

    const foto = pelanggan.fotoRumah;
    const wantsJson = request.headers.get("accept")?.includes("application/json") || searchParams.get("format") === "json";

    if (wantsJson) {
      return NextResponse.json({
        success: true,
        id: pelanggan.id,
        nama: pelanggan.nama,
        foto: foto.startsWith("http") ? foto : `/api/peta/foto-rumah?id=${pelanggan.id}`,
        raw: foto.startsWith("data:") ? foto : undefined,
      });
    }

    // Jika foto adalah URL publik Supabase Storage / CDN eksternal
    if (foto.startsWith("http://") || foto.startsWith("https://")) {
      return NextResponse.redirect(foto, { status: 307 });
    }

    // Jika foto berupa Base64 Data URL (data:image/jpeg;base64,...)
    const match = foto.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
    if (match) {
      const mimeType = `image/${match[1]}`;
      const base64Data = match[2];
      const buffer = Buffer.from(base64Data, "base64");

      return new NextResponse(buffer, {
        headers: {
          "Content-Type": mimeType,
          "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800",
        },
      });
    }

    return new NextResponse("Format foto tidak didukung", { status: 400 });
  } catch (error) {
    console.error("[API Foto Rumah Peta Error]:", error);
    return NextResponse.json({ error: "Terjadi kesalahan internal" }, { status: 500 });
  }
}
