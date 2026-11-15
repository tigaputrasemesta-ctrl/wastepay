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
    const leads = await prisma.mitraRegistration.findMany({
      orderBy: { createdAt: "desc" },
      include: { tenant: { select: { namaMitra: true, slug: true } } },
    });
    return NextResponse.json({ success: true, leads }, { headers: corsHeaders });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to fetch leads" }, { status: 500, headers: corsHeaders });
  }
}

export async function POST(request: Request) {
  const corsHeaders = buildCorsHeaders(request);
  try {
    const session = await getSession();
    if (!session || (session.role !== "superadmin" && session.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    }

    const body = await request.json();
    const { namaLengkap, namaInstansi, jenisUsaha, noWhatsapp, email, kota, estimasiWarga, catatanAdmin, status } = body;

    const cleanPhone = String(noWhatsapp || "").replace(/\D/g, "").replace(/^0/, "62");

    const newLead = await prisma.mitraRegistration.create({
      data: {
        namaLengkap: String(namaLengkap || "PIC Mitra").trim(),
        namaInstansi: String(namaInstansi).trim(),
        jenisUsaha: String(jenisUsaha || "tps3r").trim(),
        noWhatsapp: cleanPhone || "628000000000",
        email: String(email || "mitra@o2whero.com").trim().toLowerCase(),
        kota: String(kota || "Kota Depok").trim(),
        estimasiWarga: Number(estimasiWarga) || 0,
        status: String(status || "menunggu_review").trim(),
        catatanAdmin: catatanAdmin ? String(catatanAdmin).trim() : null,
      },
    });

    return NextResponse.json({ success: true, lead: newLead }, { status: 201, headers: corsHeaders });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to create lead" }, { status: 500, headers: corsHeaders });
  }
}

export async function PATCH(request: Request) {
  const corsHeaders = buildCorsHeaders(request);
  try {
    const session = await getSession();
    if (!session || (session.role !== "superadmin" && session.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    }

    const body = await request.json();
    const { id, status, catatanAdmin } = body;

    const updated = await prisma.mitraRegistration.update({
      where: { id: Number(id) },
      data: {
        ...(status ? { status: String(status) } : {}),
        ...(catatanAdmin !== undefined ? { catatanAdmin: String(catatanAdmin) } : {}),
      },
    });

    return NextResponse.json({ success: true, lead: updated }, { headers: corsHeaders });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to update lead" }, { status: 500, headers: corsHeaders });
  }
}
