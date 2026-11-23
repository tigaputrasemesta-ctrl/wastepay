import { NextResponse } from "next/server";
import { generateSinglePelangganMapPdfBuffer } from "@/lib/peta-single-pdf";
import { getSession } from "@/lib/auth";
import { tvTokenValid } from "@/lib/tv-token";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token") || searchParams.get("t") || request.headers.get("x-tv-token");
    const session = await getSession();

    if (!session && !tvTokenValid(token)) {
      return NextResponse.json({ error: "Akses ditolak: token peta tidak valid" }, { status: 401 });
    }

    const { id } = await params;
    const pelangganId = parseInt(id, 10);
    if (isNaN(pelangganId)) {
      return new NextResponse("ID Pelanggan tidak valid", { status: 400 });
    }

    const { buffer, kodePelanggan } = await generateSinglePelangganMapPdfBuffer(pelangganId);
    const filename = `Peta_Pelanggan_${kodePelanggan || pelangganId}.pdf`;

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "public, max-age=1800, stale-while-revalidate=86400",
      },
    });
  } catch (err: any) {
    console.error("Gagal generate single pelanggan peta PDF:", err);
    return new NextResponse(err.message || "Internal Server Error", { status: 500 });
  }
}
