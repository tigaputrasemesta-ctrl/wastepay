import { describe, expect, it, vi, beforeEach } from "vitest";
import { DELETE } from "@/app/api/core/tenants/[id]/route";
import * as authLib from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  registerDynamicTenant,
  getDynamicTenant,
  unregisterDynamicTenant,
} from "@/lib/tenant";

describe("Tenant Delete API Security & Invariants", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects non-superadmin attempts with 403 Forbidden", async () => {
    vi.spyOn(authLib, "getSession").mockResolvedValue({
      id: 2,
      role: "admin",
      username: "admin_tps",
      tenantId: "tenant-abc",
    } as any);

    const req = new Request("http://localhost:3000/api/core/tenants/tenant-123", {
      method: "DELETE",
    });

    const res = await DELETE(req, {
      params: Promise.resolve({ id: "tenant-123" }),
    });

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain("Hanya Super Admin");
  });

  it("protects UPS HERU pilot project and core hub from deletion (400 Bad Request)", async () => {
    vi.spyOn(authLib, "getSession").mockResolvedValue({
      id: 1,
      role: "superadmin",
      username: "superadmin",
      tenantId: null,
    } as any);

    vi.spyOn(prisma.tenant, "findFirst").mockResolvedValue({
      id: "tenant-upsheru",
      slug: "upsheru",
      namaMitra: "UPS HERU Kota Depok",
      customDomain: "upsheru.com",
      paketLangganan: "percontohan",
      _count: {
        pelanggan: 1253,
        petugas: 12,
        kendaraan: 4,
        tagihan: 5000,
        pembayaran: 4800,
      },
    } as any);

    const req = new Request("http://localhost:3000/api/core/tenants/upsheru", {
      method: "DELETE",
    });

    const res = await DELETE(req, {
      params: Promise.resolve({ id: "upsheru" }),
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Mitra Percontohan Nasional");
  });

  it("allows superadmin to delete a non-protected tenant", async () => {
    vi.spyOn(authLib, "getSession").mockResolvedValue({
      id: 1,
      role: "superadmin",
      username: "superadmin",
      tenantId: null,
    } as any);

    vi.spyOn(prisma.tenant, "findFirst").mockResolvedValue({
      id: "tenant-testing",
      slug: "tps-test-ujicoba",
      namaMitra: "TPS Uji Coba",
      customDomain: "ujicoba.com",
      paketLangganan: "basic",
      _count: {
        pelanggan: 10,
        petugas: 1,
        kendaraan: 1,
        tagihan: 10,
        pembayaran: 10,
      },
    } as any);

    const deleteSpy = vi.spyOn(prisma.tenant, "delete").mockResolvedValue({} as any);
    vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

    const req = new Request("http://localhost:3000/api/core/tenants/tenant-testing", {
      method: "DELETE",
    });

    const res = await DELETE(req, {
      params: Promise.resolve({ id: "tenant-testing" }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.message).toContain("berhasil dihapus");
    expect(deleteSpy).toHaveBeenCalledWith({
      where: { id: "tenant-testing" },
    });
  });

  it("unregisters dynamic tenant from in-memory cache upon deletion", () => {
    const dummyConfig = {
      id: "tenant-temp-123",
      slug: "temp-tenant",
      namaMitra: "Temporary Mitra",
      domains: ["temp.o2whero.com"],
      primaryDomain: "temp.o2whero.com",
      isPilot: false,
      isCore: false,
      tipe: "tps3r",
      status: "aktif",
      warnaTema: "#059669",
      features: {},
    };

    registerDynamicTenant(dummyConfig as any);
    expect(getDynamicTenant("temp.o2whero.com")).toBeDefined();

    unregisterDynamicTenant("temp-tenant");
    expect(getDynamicTenant("temp.o2whero.com")).toBeUndefined();
  });
});
