import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { buildCorsHeaders } from "@/lib/server/wastepay-backend-core-services";
import { KNOWN_TENANTS } from "@/lib/tenant/config";

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(request),
  });
}

/**
 * GET: Ambil daftar seluruh tenant aktif dan mitra percontohan
 */
export async function GET(request: Request) {
  const corsHeaders = buildCorsHeaders(request);

  try {
    // Ambil tenant dinamis dari DB jika ada
    let dbTenants: any[] = [];
    try {
      dbTenants = await prisma.tenant.findMany({
        include: {
          domains: true,
        },
        orderBy: { createdAt: "desc" },
      });
    } catch {
      // Jika tabel belum di-migrate, fallback ke KNOWN_TENANTS
    }

    // Gabungkan dengan Known Tenants (O2W Hero Core & UPS HERU Pilot)
    const combined = [
      ...KNOWN_TENANTS.map((t) => ({
        id: t.id,
        slug: t.slug,
        namaMitra: t.namaMitra,
        tipe: t.tipe,
        primaryDomain: t.primaryDomain,
        domains: t.domains,
        status: t.status,
        dbType: t.dbConfig.isDedicated ? "dedicated_db" : "central_db",
        isBuiltin: true,
      })),
      ...dbTenants.map((t) => ({
        id: t.id,
        slug: t.slug,
        namaMitra: t.namaMitra,
        tipe: t.tipePengelola,
        primaryDomain: t.customDomain || t.subdomain || `${t.slug}.o2whero.com`,
        domains: t.domains.map((d: any) => d.domain),
        status: t.status,
        dbType: t.dbConnectionString ? "dedicated_db" : "shared_db",
        isBuiltin: false,
      })),
    ];

    return NextResponse.json(
      {
        success: true,
        total: combined.length,
        tenants: combined,
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("[Core API] Error mengambil daftar tenant:", error);
    return NextResponse.json(
      { error: "Gagal mengambil daftar tenant." },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * POST: Tambah mitra tenant baru beserta database & domain mapping (Superadmin only)
 */
export async function POST(request: Request) {
  const corsHeaders = buildCorsHeaders(request);

  try {
    const session = await getSession();
    if (!session || session.role !== "superadmin") {
      return NextResponse.json(
        { error: "Akses ditolak: Hanya Superadmin yang berwenang menambah atau memprovisioning tenant." },
        { status: 403, headers: corsHeaders }
      );
    }

    const body = await request.json();
    const {
      slug,
      namaMitra,
      penanggungJawab,
      noTelepon,
      email,
      alamat,
      kota,
      tipePengelola,
      paketLangganan,
      dbConnectionString,
      customDomain,
    } = body;

    if (!slug || !namaMitra) {
      return NextResponse.json(
        { error: "Slug dan nama mitra wajib diisi." },
        { status: 400, headers: corsHeaders }
      );
    }

    const cleanSlug = String(slug).toLowerCase().trim().replace(/[^a-z0-9-]/g, "-");

    // Buat tenant baru di database
    const newTenant = await prisma.tenant.create({
      data: {
        slug: cleanSlug,
        namaMitra: String(namaMitra).trim(),
        penanggungJawab: penanggungJawab ? String(penanggungJawab).trim() : null,
        noTelepon: noTelepon ? String(noTelepon).trim() : null,
        email: email ? String(email).trim().toLowerCase() : null,
        alamat: alamat ? String(alamat).trim() : null,
        kota: kota ? String(kota).trim() : "Kota Depok",
        tipePengelola: tipePengelola || "tps3r",
        paketLangganan: paketLangganan || "basic",
        dbConnectionString: dbConnectionString ? String(dbConnectionString).trim() : null,
        customDomain: customDomain ? String(customDomain).toLowerCase().trim() : null,
        subdomain: `${cleanSlug}.o2whero.com`,
        status: "aktif",
        domains: customDomain
          ? {
              create: [
                { domain: String(customDomain).toLowerCase().trim(), isPrimary: true },
                { domain: `${cleanSlug}.o2whero.com`, isPrimary: false },
              ],
            }
          : {
              create: [{ domain: `${cleanSlug}.o2whero.com`, isPrimary: true }],
            },
      },
      include: {
        domains: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: `Mitra ${newTenant.namaMitra} berhasil didaftarkan dengan ID ${newTenant.id}!`,
        tenant: newTenant,
      },
      { status: 201, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("[Core API] Error membuat tenant baru:", error);
    return NextResponse.json(
      { error: "Gagal mendaftarkan tenant: " + (error?.message || "Kesalahan server") },
      { status: 500, headers: corsHeaders }
    );
  }
}
