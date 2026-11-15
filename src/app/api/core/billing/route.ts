import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { buildCorsHeaders } from "@/lib/server/wastepay-backend-core-services";

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(request),
  });
}

export async function GET(request: Request) {
  const corsHeaders = buildCorsHeaders(request);
  try {
    const ledgers = await prisma.tenantLedger.findMany({
      include: { tenant: { select: { namaMitra: true, slug: true, paketLangganan: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, ledgers }, { headers: corsHeaders });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to fetch billing ledgers" }, { status: 500, headers: corsHeaders });
  }
}

export async function POST(request: Request) {
  const corsHeaders = buildCorsHeaders(request);
  try {
    const session = await getSession();
    if (!session || session.role !== "superadmin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    }

    const body = await request.json();
    const { tenantId, nominalGross, keterangan, tipe } = body;

    if (!tenantId || !nominalGross) {
      return NextResponse.json({ error: "Tenant ID and nominal required" }, { status: 400, headers: corsHeaders });
    }

    const newLedger = await prisma.tenantLedger.create({
      data: {
        tenantId,
        tipe: tipe || "SAAS_INVOICE",
        nominalGross: Number(nominalGross),
        feeGateway: 0,
        feePlatform: Number(nominalGross),
        nominalNet: 0,
        saldoSetelah: 0,
        keterangan: keterangan || "Tagihan Paket Langganan SaaS",
      },
      include: { tenant: true },
    });

    return NextResponse.json({ success: true, ledger: newLedger }, { status: 201, headers: corsHeaders });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to create ledger invoice" }, { status: 500, headers: corsHeaders });
  }
}
