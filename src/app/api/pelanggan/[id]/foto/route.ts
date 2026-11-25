import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    const foto = pelanggan.fotoRumah;

    // Jika foto sudah berupa static file URL (/uploads/...) atau HTTP URL publik
    if (foto.startsWith("/") || foto.startsWith("http")) {
      return NextResponse.redirect(new URL(foto, request.url));
    }

    // fotoRumah looks like "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
    const match = foto.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);

    if (!match) {
      return new NextResponse("Invalid format", { status: 400 });
    }

    const mimeType = `image/${match[1]}`;
    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, "base64");

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch (err) {
    console.error("Error serving foto:", err);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
