import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "../src/app/api/pelanggan/route";
import { prisma } from "../src/lib/prisma";
import * as auth from "../src/lib/auth";

vi.mock("../src/lib/prisma", () => ({
  prisma: {
    pelanggan: {
      findMany: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
      create: vi.fn(),
    },
    wilayah: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    zona: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("../src/lib/db-patch", () => ({
  ensureKolektifSchema: vi.fn().mockResolvedValue(true),
  ensureArmadaRuteSchema: vi.fn().mockResolvedValue(true),
}));

vi.mock("../src/lib/audit", () => ({
  logAudit: vi.fn().mockResolvedValue(true),
}));

vi.mock("../src/lib/server/media-storage", () => ({
  persistBase64Image: vi.fn().mockResolvedValue("/uploads/test.jpg"),
}));

describe("Pelanggan Multi-Tenant Domain Scoping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.pelanggan.findMany).mockResolvedValue([
      { id: 1, nama: "Warga Test", noTelepon: "0812345678", tenantId: "tenant-pilot-upsheru", fotoRumah: null },
    ] as any);
    vi.mocked(prisma.pelanggan.count).mockResolvedValue(1);
    vi.mocked(prisma.pelanggan.groupBy).mockResolvedValue([
      { status: "aktif", _count: { id: 1 } },
    ] as any);
  });

  it("ensures superadmin viewing upsheru.com queries tenant-pilot-upsheru customers (not core)", async () => {
    vi.spyOn(auth, "getSession").mockResolvedValue({
      id: 1,
      email: "admin.herozerowaste@gmail.com",
      nama: "Super Admin",
      role: "superadmin",
      tenantId: "tenant-core-o2w",
    });

    const req = new NextRequest("https://upsheru.com/api/pelanggan", {
      headers: {
        host: "upsheru.com",
        "x-forwarded-host": "upsheru.com",
      },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);

    const callArgs = vi.mocked(prisma.pelanggan.findMany).mock.calls[0]?.[0];
    expect(callArgs?.where?.tenantId).toBe("tenant-pilot-upsheru");

    const countArgs = vi.mocked(prisma.pelanggan.groupBy).mock.calls[0]?.[0];
    expect(countArgs?.where?.tenantId).toBe("tenant-pilot-upsheru");
  });

  it("ensures UPS HERU tenant admin viewing upsheru.com queries tenant-pilot-upsheru customers", async () => {
    vi.spyOn(auth, "getSession").mockResolvedValue({
      id: 2,
      email: "admin@upsheru.com",
      nama: "Admin UPS Heru",
      role: "admin",
      tenantId: "tenant-pilot-upsheru",
    });

    const req = new NextRequest("https://upsheru.com/api/pelanggan", {
      headers: {
        host: "upsheru.com",
        "x-forwarded-host": "upsheru.com",
      },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);

    const callArgs = vi.mocked(prisma.pelanggan.findMany).mock.calls[0]?.[0];
    expect(callArgs?.where?.tenantId).toBe("tenant-pilot-upsheru");
  });

  it("blocks cross-tenant admin from accessing upsheru.com customers", async () => {
    vi.spyOn(auth, "getSession").mockResolvedValue({
      id: 3,
      email: "admin@other-tenant.com",
      nama: "Admin Other",
      role: "admin",
      tenantId: "tenant-other-tps3r",
    });

    const req = new NextRequest("https://upsheru.com/api/pelanggan", {
      headers: {
        host: "upsheru.com",
        "x-forwarded-host": "upsheru.com",
      },
    });

    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it("ensures superadmin creating customer on upsheru.com sets tenant-pilot-upsheru", async () => {
    vi.spyOn(auth, "getSession").mockResolvedValue({
      id: 1,
      email: "admin.herozerowaste@gmail.com",
      nama: "Super Admin",
      role: "superadmin",
      tenantId: "tenant-core-o2w",
    });

    vi.mocked(prisma.pelanggan.create).mockResolvedValue({
      id: 99,
      nama: "Warga Baru",
      noTelepon: "089999999",
      tenantId: "tenant-pilot-upsheru",
    } as any);

    const req = new NextRequest("https://upsheru.com/api/pelanggan", {
      method: "POST",
      headers: {
        host: "upsheru.com",
        "x-forwarded-host": "upsheru.com",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        nama: "Warga Baru",
        noTelepon: "089999999",
        alamat: "Jl. Merdeka No 1",
        kelurahanId: 1,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);

    const createArgs = vi.mocked(prisma.pelanggan.create).mock.calls[0]?.[0];
    expect(createArgs?.data?.tenantId).toBe("tenant-pilot-upsheru");
  });
});
