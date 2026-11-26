import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

/** Titik transit (lapak) — tempat dump truck standby / pemindahan sampah terisolasi per-tenant. */
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
    }

    const rawHost = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
    const { resolveTenantByHost, buildTenantFilter } = await import("@/lib/tenant");
    const tenantCtx = resolveTenantByHost(rawHost);
    const tenantFilter = buildTenantFilter(tenantCtx.tenant.id, tenantCtx.isPilot);

    const transit = await prisma.titikTransit.findMany({
      where: tenantFilter,
      orderBy: { nama: "asc" },
    });
    return NextResponse.json(transit);
  } catch {
    return NextResponse.json({ error: "Gagal mengambil titik transit" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
    }

    const rawHost = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
    const { resolveTenantByHost } = await import("@/lib/tenant");
    const tenantCtx = resolveTenantByHost(rawHost);

    const body = await request.json();
    const { nama, alamat, latitude, longitude, catatan } = body;

    if (!nama) {
      return NextResponse.json({ error: "Nama titik transit harus diisi" }, { status: 400 });
    }
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ error: "Koordinat tidak valid" }, { status: 400 });
    }

    const titik = await prisma.titikTransit.create({
      data: {
        nama,
        alamat: alamat || null,
        latitude: lat,
        longitude: lng,
        catatan: catatan || null,
        tenantId: tenantCtx.tenant.id,
      },
    });
    await logAudit("create", "TitikTransit", titik.id, undefined, { nama: titik.nama });
    return NextResponse.json(titik, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Gagal menambah titik transit" }, { status: 500 });
  }
}
