import { NextResponse } from "next/server";
import { sinkronkanPelangganRute, sinkronkanSemuaRute } from "@/lib/rute-sync";
import { ensureArmadaRuteSchema } from "@/lib/db-patch";

export async function POST(request: Request) {
  try {
    await ensureArmadaRuteSchema();

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // body opsional
    }

    if (body.ruteId) {
      const ruteId = parseInt(String(body.ruteId));
      if (isNaN(ruteId)) {
        return NextResponse.json({ error: "ID rute tidak valid" }, { status: 400 });
      }
      const result = await sinkronkanPelangganRute(ruteId);
      return NextResponse.json(result);
    }

    // Jika tanpa ruteId spesifik, sinkronkan seluruh rute aktif
    const result = await sinkronkanSemuaRute();
    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("POST /api/rute/sync fatal error:", err);
    const msg = err instanceof Error ? err.message : "Gagal menyinkronkan rute pelanggan";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
