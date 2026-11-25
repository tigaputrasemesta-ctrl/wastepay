import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { buildCorsHeaders } from "@/lib/server/wastepay-backend-core-services";
import { registerDynamicTenant, unregisterDynamicTenant, dbTenantToConfig } from "@/lib/tenant";

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(request),
  });
}

/**
 * GET /api/core/tenants/[id]
 * Ambil detail profil tenant, domain, branding, dan integrasi (Super Admin Only)
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const corsHeaders = buildCorsHeaders(request);
  const { id } = await params;

  try {
    const session = await getSession();
    if (!session || (session.role !== "superadmin" && session.tenantId !== id)) {
      return NextResponse.json(
        { error: "Forbidden: Hanya Super Admin atau Admin Tenant terkait yang dapat mengakses detail ini." },
        { status: 403, headers: corsHeaders }
      );
    }

    const tenant = await prisma.tenant.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      include: {
        domains: true,
        subscriptions: { orderBy: { createdAt: "desc" }, take: 1 },
        waConfig: true,
        paymentConfig: true,
        quotaUsage: true,
        _count: {
          select: {
            pelanggan: true,
            petugas: true,
            kendaraan: true,
            tagihan: true,
          },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: "Tenant tidak ditemukan." },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json({ success: true, tenant }, { headers: corsHeaders });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Gagal memuat data tenant: " + err.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * PATCH /api/core/tenants/[id]
 * Memperbarui status tenant (suspend / aktif), branding, kuota, paket, dan domain (Super Admin Only)
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const corsHeaders = buildCorsHeaders(request);
  const { id } = await params;

  try {
    const session = await getSession();
    if (!session || session.role !== "superadmin") {
      return NextResponse.json(
        { error: "Forbidden: Hanya Super Admin yang berwenang mengubah konfigurasi tenant." },
        { status: 403, headers: corsHeaders }
      );
    }

    const tenant = await prisma.tenant.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: "Tenant tidak ditemukan." },
        { status: 404, headers: corsHeaders }
      );
    }

    const body = await request.json();
    const {
      status, // "aktif" | "suspend" | "maintenance"
      namaMitra,
      penanggungJawab,
      noTelepon,
      email,
      alamat,
      kota,
      paketLangganan,
      customDomain,
      warnaTema,
      logoUrl,
      fiturAktif,
      verifyDomain,
    } = body;

    const updateData: Record<string, any> = {};
    if (status) updateData.status = status;
    if (namaMitra) updateData.namaMitra = String(namaMitra).trim();
    if (penanggungJawab !== undefined) updateData.penanggungJawab = penanggungJawab;
    if (noTelepon !== undefined) updateData.noTelepon = noTelepon;
    if (email !== undefined) updateData.email = email;
    if (alamat !== undefined) updateData.alamat = alamat;
    if (kota !== undefined) updateData.kota = kota;
    if (paketLangganan) updateData.paketLangganan = paketLangganan;
    if (warnaTema !== undefined) updateData.warnaTema = warnaTema;
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
    if (fiturAktif !== undefined) {
      updateData.fiturAktif = typeof fiturAktif === "object" ? JSON.stringify(fiturAktif) : fiturAktif;
    }

    if (customDomain !== undefined) {
      const cleanDomain = customDomain ? String(customDomain).toLowerCase().trim() : null;
      updateData.customDomain = cleanDomain;

      if (cleanDomain) {
        await prisma.tenantDomain.upsert({
          where: { domain: cleanDomain },
          update: {
            isVerified: verifyDomain === true,
            sslStatus: verifyDomain === true ? "active" : "pending",
          },
          create: {
            tenantId: tenant.id,
            domain: cleanDomain,
            isPrimary: true,
            isVerified: verifyDomain === true,
            sslStatus: verifyDomain === true ? "active" : "pending",
          },
        });
      }
    }

    const updated = await prisma.tenant.update({
      where: { id: tenant.id },
      data: updateData,
      include: { domains: true },
    });

    // Update in-memory registry instan
    registerDynamicTenant(dbTenantToConfig(updated));

    // Catat ke AuditLog
    await prisma.auditLog.create({
      data: {
        aksi: "update",
        entitas: "Tenant",
        entitasId: 0,
        dataBaru: JSON.stringify({
          tenantId: updated.id,
          slug: updated.slug,
          status: updated.status,
          updatedFields: Object.keys(updateData),
        }),
        userId: session.id,
        tenantId: updated.id,
      },
    }).catch(() => {});

    return NextResponse.json(
      {
        success: true,
        message: `Konfigurasi tenant ${updated.namaMitra} berhasil diperbarui.`,
        tenant: updated,
      },
      { headers: corsHeaders }
    );
  } catch (err: any) {
    console.error("[Tenant PATCH Error]", err);
    return NextResponse.json(
      { error: "Gagal memperbarui tenant: " + err.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * DELETE /api/core/tenants/[id]
 * Menghapus tenant dan seluruh data terkait secara aman (Super Admin Only).
 * Proteksi Invariant: Mitra Percontohan Nasional (UPS HERU) dan Core Hub tidak boleh dihapus.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const corsHeaders = buildCorsHeaders(request);
  const { id } = await params;

  try {
    const session = await getSession();
    if (!session || session.role !== "superadmin") {
      return NextResponse.json(
        { error: "Forbidden: Hanya Super Admin yang berwenang menghapus tenant." },
        { status: 403, headers: corsHeaders }
      );
    }

    const tenant = await prisma.tenant.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      include: {
        _count: {
          select: {
            pelanggan: true,
            petugas: true,
            kendaraan: true,
            tagihan: true,
            pembayaran: true,
          },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: "Tenant tidak ditemukan." },
        { status: 404, headers: corsHeaders }
      );
    }

    // Proteksi Absolut: Tenant Pilot Project & Core Hub
    const PROTECTED_SLUGS = ["upsheru", "ups-heru", "core", "o2whero", "o2w-core", "demo", "pilot-project"];
    const isProtectedSlug = PROTECTED_SLUGS.includes(tenant.slug.toLowerCase());
    const isProtectedDomain =
      (tenant.customDomain && (
        tenant.customDomain.toLowerCase().includes("upsheru.com") ||
        tenant.customDomain.toLowerCase().includes("o2whero.com")
      )) || false;
    const isProtectedName =
      tenant.namaMitra.toLowerCase().includes("ups heru") ||
      (tenant.paketLangganan === "percontohan" && tenant.slug.toLowerCase().includes("heru"));

    if (isProtectedSlug || isProtectedDomain || isProtectedName) {
      return NextResponse.json(
        {
          error: `Tenant '${tenant.namaMitra}' (${tenant.slug}) adalah Mitra Percontohan Nasional / Core Hub resmi yang dilindungi sistem dan tidak dapat dihapus.`,
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Catat ke AuditLog sebelum penghapusan
    await prisma.auditLog.create({
      data: {
        aksi: "delete",
        entitas: "Tenant",
        entitasId: 0,
        dataLama: JSON.stringify({
          tenantId: tenant.id,
          slug: tenant.slug,
          namaMitra: tenant.namaMitra,
          totalPelanggan: tenant._count.pelanggan,
          totalPetugas: tenant._count.petugas,
          totalTagihan: tenant._count.tagihan,
          customDomain: tenant.customDomain,
        }),
        userId: session.id,
      },
    }).catch(() => {});

    // Hapus tenant (relasi cascade pada database akan otomatis membersihkan tabel anak)
    await prisma.tenant.delete({
      where: { id: tenant.id },
    });

    // Evict dari in-memory tenant registry
    unregisterDynamicTenant(tenant.slug);

    return NextResponse.json(
      {
        success: true,
        message: `Tenant '${tenant.namaMitra}' (${tenant.slug}) beserta seluruh data operasionalnya berhasil dihapus.`,
      },
      { headers: corsHeaders }
    );
  } catch (err: any) {
    console.error("[Tenant DELETE Error]", err);
    return NextResponse.json(
      { error: "Gagal menghapus tenant: " + err.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
