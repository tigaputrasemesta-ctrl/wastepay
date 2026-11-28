import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readFile, stat } from "fs/promises";
import path from "path";

function parseImagePayload(foto: string): { buffer: Buffer; mimeType: string } | null {
  if (!foto) return null;
  const trimmed = foto.trim();

  // 1. Data URL (data:image/jpeg;base64,...)
  const dataUriMatch = trimmed.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,([A-Za-z0-9+/=]+)$/);
  if (dataUriMatch) {
    const rawExt = dataUriMatch[1].toLowerCase();
    const mimeType = rawExt === "jpg" ? "image/jpeg" : `image/${rawExt}`;
    try {
      const buffer = Buffer.from(dataUriMatch[2], "base64");
      return buffer.length > 0 ? { buffer, mimeType } : null;
    } catch {
      return null;
    }
  }

  // 2. Raw Base64 string (termasuk JPEG base64 yang diawali /9j/)
  const isJpegRaw = trimmed.startsWith("/9j/") || trimmed.startsWith("/9j+");
  const isPngRaw = trimmed.startsWith("iVBORw0KGgo");
  const isWebpRaw = trimmed.startsWith("UklGR");
  const isGifRaw = trimmed.startsWith("R0lGOD");

  if (
    isJpegRaw ||
    isPngRaw ||
    isWebpRaw ||
    isGifRaw ||
    (!trimmed.startsWith("/") && !trimmed.startsWith("http") && trimmed.length > 100)
  ) {
    let mimeType = "image/jpeg";
    if (isPngRaw) mimeType = "image/png";
    else if (isWebpRaw) mimeType = "image/webp";
    else if (isGifRaw) mimeType = "image/gif";

    try {
      const buffer = Buffer.from(trimmed, "base64");
      return buffer.length > 0 ? { buffer, mimeType } : null;
    } catch {
      return null;
    }
  }

  return null;
}

async function readDiskUpload(foto: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const cleanRel = foto.replace(/^\/?uploads\/?/, "");
  const baseUploadsDir = path.resolve(process.cwd(), "public", "uploads");
  const fullPath = path.resolve(baseUploadsDir, cleanRel);
  if (!fullPath.startsWith(baseUploadsDir)) return null;

  try {
    const fileStat = await stat(fullPath);
    if (!fileStat.isFile()) return null;
    const ext = path.extname(fullPath).toLowerCase();
    const mimeType =
      ext === ".png"
        ? "image/png"
        : ext === ".webp"
        ? "image/webp"
        : ext === ".svg"
        ? "image/svg+xml"
        : "image/jpeg";
    const buffer = await readFile(fullPath);
    return { buffer, mimeType };
  } catch {
    return null;
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt((await params).id);
    if (isNaN(id)) return new NextResponse("Not Found", { status: 404 });

    const pelanggan = await prisma.pelanggan.findUnique({
      where: { id },
      select: { fotoRumah: true },
    });

    if (!pelanggan || !pelanggan.fotoRumah) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const foto = pelanggan.fotoRumah.trim();

    // 1. External HTTP(S) URL
    if (foto.startsWith("http://") || foto.startsWith("https://")) {
      return NextResponse.redirect(foto, { status: 307 });
    }

    // 2. Berkas lokal di public/uploads
    if (foto.startsWith("/uploads/") || foto.startsWith("uploads/")) {
      const diskData = await readDiskUpload(foto);
      if (diskData) {
        return new NextResponse(new Uint8Array(diskData.buffer), {
          headers: {
            "Content-Type": diskData.mimeType,
            "Content-Length": String(diskData.buffer.length),
            "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
          },
        });
      }
      // Jika file fisik belum ada atau dipindahkan, fallback redirect ke route uploads
      const targetUrl = foto.startsWith("/") ? foto : `/${foto}`;
      return NextResponse.redirect(new URL(targetUrl, request.url), { status: 307 });
    }

    // 3. Base64 payload (data URI atau raw base64)
    const base64Data = parseImagePayload(foto);
    if (base64Data) {
      return new NextResponse(new Uint8Array(base64Data.buffer), {
        headers: {
          "Content-Type": base64Data.mimeType,
          "Content-Length": String(base64Data.buffer.length),
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        },
      });
    }

    return new NextResponse("Invalid format", { status: 400 });
  } catch (err) {
    console.error("Error serving foto:", err);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
