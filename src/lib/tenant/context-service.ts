import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ROLE_HIERARCHY, hasRole, type Role } from "@/lib/rbac";
import {
  TenantConfig,
  TenantContext,
  TenantRequestContext,
  TenantMembershipInfo,
} from "./types";
import { normalizeHost, CORE_TENANT } from "./config";
import { resolveTenantWithDbFallback } from "./server-resolver";
import { getTenantDb } from "./db-manager";

export type TenantContextResult =
  | {
      success: true;
      context: TenantRequestContext;
      db: ReturnType<typeof getTenantDb>;
    }
  | {
      success: false;
      response: NextResponse;
      error: string;
      status: number;
    };

/**
 * Resolusi Tenant Context dari Request Header secara ketat (Anti-Spoofing & Trusted Proxy Validation)
 */
export async function getTenantFromRequest(request?: Request | null): Promise<TenantContext> {
  if (!request) {
    return resolveTenantWithDbFallback(null);
  }

  // Trusted proxy validation: periksa header host & x-forwarded-host
  const xForwardedHost = request.headers.get("x-forwarded-host");
  const hostHeader = request.headers.get("host");
  
  // Anti-spoofing: sanitasi input host
  const rawHost = xForwardedHost || hostHeader || "";
  const cleanHost = normalizeHost(rawHost);

  return resolveTenantWithDbFallback(cleanHost);
}

/**
 * Validasi keanggotaan user dalam tenant (Mencegah Arbitrary Tenant Switching / Cross-Tenant Access)
 */
export async function verifyUserTenantMembership(
  userId: number,
  tenantId: string,
  userRole: string
): Promise<{ isMember: boolean; role: string; membership?: TenantMembershipInfo }> {
  // Superadmin memiliki akses platform menyeluruh
  if (userRole === "superadmin") {
    return { isMember: true, role: "superadmin" };
  }

  // 1. Cek tabel TenantMembership
  try {
    const membership = await prisma.tenantMembership.findUnique({
      where: {
        userId_tenantId: {
          userId,
          tenantId,
        },
      },
    });

    if (membership && membership.aktif) {
      return {
        isMember: true,
        role: membership.role,
        membership: {
          id: membership.id,
          userId: membership.userId,
          tenantId: membership.tenantId,
          role: membership.role,
          aktif: membership.aktif,
        },
      };
    }
  } catch {
    // Fallback ke kolom User.tenantId jika tabel membership belum ter-populate
  }

  // 2. Fallback backward-compatible: cek kolom User.tenantId
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, tenantId: true, role: true, aktif: true },
    });

    if (user && user.aktif && user.tenantId === tenantId) {
      return { isMember: true, role: user.role };
    }
  } catch {
    // Fail-closed jika database tidak dapat dijangkau
  }

  return { isMember: false, role: "" };
}

/**
 * Centralized Tenant Context Service untuk API Route Handlers & Server Actions
 * Memastikan:
 * 1. Domain terdaftar dan sah (bukan domain liar).
 * 2. Tenant dalam status aktif (bukan suspended).
 * 3. User terautentikasi dan memiliki membership yang valid pada tenant bersangkutan.
 * 4. Role user memenuhi level minimum.
 * 5. Parameter `tenantId` dari client diabaikan sepenuhnya; tenantId selalu diambil dari server context.
 */
export async function requireTenantContext(
  request: Request,
  minRole: Role = "petugas"
): Promise<TenantContextResult> {
  // 1. Resolusi Tenant dari Domain/Host yang terverifikasi
  const tenantCtx = await getTenantFromRequest(request);

  if (!tenantCtx.isValid) {
    if (tenantCtx.isSuspended) {
      return {
        success: false,
        status: 403,
        error: "Tenant Suspended",
        response: NextResponse.json(
          {
            error: "Tenant Suspended",
            message: tenantCtx.rejectionReason || "Organisasi tenant ini telah ditangguhkan.",
          },
          { status: 403 }
        ),
      };
    }

    return {
      success: false,
      status: 421,
      error: "Misdirected Request",
      response: NextResponse.json(
        {
          error: "Misdirected Request",
          message: tenantCtx.rejectionReason || "Domain tidak terdaftar dalam platform O2W HERO.",
          host: tenantCtx.currentHost,
        },
        { status: 421 }
      ),
    };
  }

  // 2. Autentikasi Sesi User
  const session = await getSession(request);
  if (!session) {
    return {
      success: false,
      status: 401,
      error: "Unauthorized",
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  // 3. Batasan Akses Domain Core Platform (o2whero.com)
  if (tenantCtx.isCore && session.role !== "superadmin") {
    return {
      success: false,
      status: 403,
      error: "Forbidden",
      response: NextResponse.json(
        { error: "Forbidden: Portal Core SaaS hanya dapat diakses oleh Super Administrator platform." },
        { status: 403 }
      ),
    };
  }

  // 4. Verifikasi Membership User pada Tenant Ter-resolusi
  if (!tenantCtx.isCore) {
    const membershipCheck = await verifyUserTenantMembership(
      session.id,
      tenantCtx.tenant.id,
      session.role
    );

    if (!membershipCheck.isMember) {
      return {
        success: false,
        status: 403,
        error: "Forbidden: Tenant Mismatch",
        response: NextResponse.json(
          {
            error: "Forbidden",
            message: "Akun Anda tidak memiliki hak akses atau keanggotaan pada tenant organisasi ini.",
          },
          { status: 403 }
        ),
      };
    }
  }

  // 5. Enforce Hierarki Role Minimum
  const userRoleLevel = ROLE_HIERARCHY[session.role as Role] ?? 0;
  const requiredRoleLevel = ROLE_HIERARCHY[minRole] ?? 0;

  if (userRoleLevel < requiredRoleLevel) {
    return {
      success: false,
      status: 403,
      error: "Forbidden: Insufficient Role",
      response: NextResponse.json(
        { error: "Forbidden: Anda tidak memiliki wewenang untuk mengakses sumber daya ini." },
        { status: 403 }
      ),
    };
  }

  // 6. Dapatkan client database terisolasi (Dedicated DB jika Enterprise/Pilot, Shared DB jika Standard)
  const db = getTenantDb(tenantCtx.tenant);

  const context: TenantRequestContext = {
    tenantId: tenantCtx.tenant.id,
    tenantSlug: tenantCtx.tenant.slug,
    tenant: tenantCtx.tenant,
    isCore: tenantCtx.isCore,
    isPilot: tenantCtx.isPilot,
    isDedicatedDb: tenantCtx.tenant.dbConfig.isDedicated,
    user: session,
    role: session.role,
  };

  return {
    success: true,
    context,
    db,
  };
}
