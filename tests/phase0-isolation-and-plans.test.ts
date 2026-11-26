import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createSession } from "../src/lib/auth";
import { proxy } from "../src/proxy";
import { prisma } from "../src/lib/prisma";
import { buildTenantFilter } from "../src/lib/tenant/isolation";
import { getSaasPlanMonthlyPrice, SAAS_PLANS } from "../src/lib/saas-plans";

vi.mock("../src/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    tenantDomain: { findUnique: vi.fn() },
    tenant: { findFirst: vi.fn(), findUnique: vi.fn() },
  },
}));

const lookup = vi.mocked(prisma.user.findUnique);

function makeReq(path: string, host: string, token?: string, method = "GET") {
  return new NextRequest(`https://${host}${path}`, {
    method,
    headers: {
      host,
      origin: `https://${host}`,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  });
}

describe("Phase 0 core boundary, RBAC & plan pricing consistency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects tenant-only public routes accessed on o2whero.com back to /", async () => {
    for (const path of ["/bayar", "/daftar", "/tarif", "/pengaduan", "/unduh", "/marketplace", "/pickup"]) {
      const res = await proxy(makeReq(path, "o2whero.com"));
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe("https://o2whero.com/");
    }

    const coreLogin = await proxy(makeReq("/login", "o2whero.com"));
    expect(coreLogin.status).toBe(200);

    const coreSitemap = await proxy(makeReq("/sitemap.xml", "o2whero.com"));
    expect(coreSitemap.status).toBe(200);
    expect(await coreSitemap.text()).toContain("https://o2whero.com");

    const coreRobots = await proxy(makeReq("/robots.txt", "o2whero.com"));
    expect(coreRobots.status).toBe(200);
    expect(await coreRobots.text()).toContain("https://o2whero.com/sitemap.xml");
  });

  it("enforces superadmin (100) for PATCH /api/core/mitra/register & Core APIs", async () => {
    const adminUser = {
      id: 10,
      nama: "Tenant Admin",
      email: "admin@upsheru.test",
      role: "admin",
      tenantId: "tenant-pilot-upsheru",
      tokenVersion: 1,
      aktif: true,
    };
    const superUser = {
      id: 1,
      nama: "Super Admin",
      email: "root@o2whero.com",
      role: "superadmin",
      tenantId: "tenant-core-o2w",
      tokenVersion: 1,
      aktif: true,
    };

    const adminToken = await createSession(adminUser);
    const superToken = await createSession(superUser);

    lookup.mockResolvedValue(adminUser as never);
    expect((await proxy(makeReq("/api/core/tenants", "upsheru.com", adminToken))).status).toBe(403);
    expect((await proxy(makeReq("/api/core/control-tower", "upsheru.com", adminToken))).status).toBe(403);

    lookup.mockResolvedValue(superUser as never);
    expect((await proxy(makeReq("/api/core/mitra/register", "o2whero.com", superToken, "PATCH"))).status).not.toBe(403);
    expect((await proxy(makeReq("/api/pelanggan", "o2whero.com", superToken))).status).toBe(403);
    expect((await proxy(makeReq("/api/tagihan", "o2whero.com", superToken))).status).toBe(403);
  });

  it("builds strict tenant filters and pilot-only null fallback", () => {
    expect(buildTenantFilter("tenant-abc", false)).toEqual({ tenantId: "tenant-abc" });
    expect(buildTenantFilter("tenant-pilot-upsheru", true)).toEqual({
      OR: [{ tenantId: "tenant-pilot-upsheru" }, { tenantId: null }],
    });
  });

  it("keeps SaaS plan pricing consistent across modules", () => {
    expect(getSaasPlanMonthlyPrice("starter")).toBe(349000);
    expect(getSaasPlanMonthlyPrice("pro")).toBe(2000000);
    expect(getSaasPlanMonthlyPrice("enterprise")).toBe(4990000);
    expect(SAAS_PLANS.find((p) => p.id === "pro")?.priceMonthly).toBe(2000000);
  });
});
