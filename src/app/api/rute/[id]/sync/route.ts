import { NextResponse } from "next/server";
import {
  sinkronkanPelangganRute,
  getPelangganRuteDetail,
  aturSettingHariPelanggan,
} from "@/lib/rute-sync";
import { ensureArmadaRuteSchema } from "@/lib/db-patch";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureArmadaRuteSchema();
    const id = parseInt((await params).id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "ID rute tidak valid" }, { status: 400 });
    }

    const detail = await getPelangganRuteDetail(id);
    return NextResponse.json(detail);
  } catch (err: unknown) {
    console.error("GET /api/rute/[id]/sync error:", err);
    const msg = err instanceof Error ? err.message : "Gagal mengambil daftar pelanggan rute";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureArmadaRuteSchema();
    const id = parseInt((await params).id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "ID rute tidak valid" }, { status: 400 });
    }

    const result = await sinkronkanPelangganRute(id);
    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("POST /api/rute/[id]/sync error:", err);
    const msg = err instanceof Error ? err.message : "Gagal menyinkronkan rute";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureArmadaRuteSchema();
    const id = parseInt((await params).id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "ID rute tidak valid" }, { status: 400 });
    }

    const body = await request.json();
    const rawHari = body.hariList || body.hari;
    const hariList = Array.isArray(rawHari)
      ? rawHari
      : typeof rawHari === "string"
      ? rawHari.split(",").map((s) => s.trim()).filter(Boolean)
      : null;
    const { pelangganId, jam } = body;

    if (!pelangganId || !Array.isArray(hariList)) {
      return NextResponse.json(
        { error: "pelangganId dan daftar hari (hari/hariList) wajib diisi" },
        { status: 400 }
      );
    }

    const result = await aturSettingHariPelanggan({
      ruteId: id,
      pelangganId: parseInt(String(pelangganId)),
      hariList,
      jam,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("PUT /api/rute/[id]/sync error:", err);
    const msg = err instanceof Error ? err.message : "Gagal memperbarui setting hari pelanggan";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
