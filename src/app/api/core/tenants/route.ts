import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, hashPassword } from "@/lib/auth";
import { buildCorsHeaders } from "@/lib/server/wastepay-backend-core-services";
import { KNOWN_TENANTS, registerDynamicTenant, dbTenantToConfig } from "@/lib/tenant";

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
    const session = await getSession();
    if (!session || (session.role !== "superadmin" && session.role !== "admin")) {
      return NextResponse.json(
        { error: "Unauthorized: Hanya admin atau superadmin yang dapat mengakses data tenant." },
        { status: 401, headers: corsHeaders }
      );
    }
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

    // Sinkronkan ke in-memory cache
    for (const t of dbTenants) {
      registerDynamicTenant(dbTenantToConfig(t));
    }

    // Gabungkan dengan Known Tenants (O2W Hero Core & UPS HERU Pilot) tanpa duplikasi slug
    const knownSlugs = new Set(KNOWN_TENANTS.map((t) => t.slug));
    const dynamicOnly = dbTenants.filter((t) => !knownSlugs.has(t.slug));

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
      ...dynamicOnly.map((t) => ({
        id: t.id,
        slug: t.slug,
        namaMitra: t.namaMitra,
        tipe: t.tipePengelola,
        primaryDomain: t.customDomain || t.subdomain || `${t.slug}.o2whero.com`,
        domains: Array.isArray(t.domains) ? t.domains.map((d: any) => d.domain) : [],
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

    // Daftarkan langsung ke in-memory cache agar resolusi domain aktif instan tanpa restart
    registerDynamicTenant(dbTenantToConfig(newTenant));

    // Otomatisasi Akun Admin Pertama Mitra (Onboarding Wizard)
    let initialAdminUser: any = null;
    const initialPassword = body.adminPassword || "Mitra123!";
    if (email && String(email).trim()) {
      const cleanEmail = String(email).trim().toLowerCase();
      const existingUser = await prisma.user.findUnique({ where: { email: cleanEmail } });
      if (!existingUser) {
        const hashedPassword = await hashPassword(initialPassword);
        initialAdminUser = await prisma.user.create({
          data: {
            email: cleanEmail,
            password: hashedPassword,
            nama: penanggungJawab ? String(penanggungJawab).trim() : `Admin ${namaMitra}`,
            role: "admin",
            noTelepon: noTelepon ? String(noTelepon).trim() : null,
            tenantId: newTenant.id,
          },
          select: {
            id: true,
            email: true,
            nama: true,
            role: true,
          },
        });
      }
    }

    // Inisialisasi Buku Kas & Saldo Awal di TenantLedger
    try {
      await prisma.tenantLedger.create({
        data: {
          tenantId: newTenant.id,
          tipe: "ADJUSTMENT",
          nominalGross: 0,
          feeGateway: 0,
          feePlatform: 0,
          nominalNet: 0,
          saldoSetelah: 0,
          keterangan: `Inisialisasi Buku Kas Mitra Baru Paket ${(paketLangganan || "Starter").toUpperCase()} - ${newTenant.namaMitra}`,
        },
      });
    } catch (ledgerErr) {
      console.warn("[Core API] Gagal mencatat ledger awal tenant:", ledgerErr);
    }

    // Audit Log Aktivitas Superadmin
    try {
      await prisma.auditLog.create({
        data: {
          aksi: "create",
          entitas: "Tenant",
          entitasId: initialAdminUser?.id || 0,
          dataBaru: JSON.stringify({
            tenantId: newTenant.id,
            slug: newTenant.slug,
            namaMitra: newTenant.namaMitra,
            adminEmail: initialAdminUser?.email || null,
          }),
          userId: session.id,
        },
      });
    } catch {
      // Abaikan jika audit log gagal
    }

    return NextResponse.json(
      {
        success: true,
        message: `Mitra ${newTenant.namaMitra} berhasil didaftarkan dan diaktifkan!`,
        tenant: newTenant,
        initialAdmin: initialAdminUser
          ? {
              email: initialAdminUser.email,
              tempPassword: initialPassword,
            }
          : null,
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
