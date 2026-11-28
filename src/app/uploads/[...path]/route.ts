import { NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import path from "path";

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".json": "application/json",
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const pathSegments = resolvedParams?.path;

    if (!Array.isArray(pathSegments) || pathSegments.length === 0) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const baseUploadsDir = path.resolve(process.cwd(), "public", "uploads");
    const targetFilePath = path.resolve(baseUploadsDir, ...pathSegments);

    // Keamanan: Cegah directory traversal attack (path keluar dari public/uploads)
    if (!targetFilePath.startsWith(baseUploadsDir)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Periksa apakah file ada dan dapat dibaca
    try {
      const fileStat = await stat(targetFilePath);
      if (!fileStat.isFile()) {
        return new NextResponse("Not Found", { status: 404 });
      }
    } catch {
      return new NextResponse("Not Found", { status: 404 });
    }

    const ext = path.extname(targetFilePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    const fileBuffer = await readFile(targetFilePath);

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(fileBuffer.length),
        "Cache-Control": "public, max-age=31536000, immutable",
        "Accept-Ranges": "bytes",
      },
    });
  } catch (err) {
    console.error("[Uploads Route Error]", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function HEAD(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const getRes = await GET(request, { params });
  return new NextResponse(null, {
    status: getRes.status,
    headers: getRes.headers,
  });
}
