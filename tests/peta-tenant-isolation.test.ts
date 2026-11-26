import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { getDefaultMapToken } from "../src/lib/tv-token";

vi.mock("../src/lib/prisma", () => ({
  prisma: {
    lokasiPetugas: { findMany: vi.fn().mockResolvedValue([]) },
    lokasiKendaraan: { findMany: vi.fn().mockResolvedValue([]) },
    titikTransit: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: 99, ...data })) },
    komplain: { findMany: vi.fn().mockResolvedValue([]) },
    pelanggan: { findFirst: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
  },
}));

vi.mock("../src/lib/auth", () => ({
  getSession: vi.fn().mockResolvedValue({ id: 1, role: "admin", username: "admin", tenantId: "tenant-pilot-upsheru" }),
}));

vi.mock("../src/lib/audit", () => ({
  logAudit: vi.fn().mockResolvedValue(true),
}));

describe("Peta & Telemetry Tenant Isolation Guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("strictly scopes /api/publik/tv-peta to tenant-potonglink when accessed from potonglink.com", async () => {
    const { prisma } = await import("../src/lib/prisma");
    const { GET } = await import("../src/app/api/publik/tv-peta/route");

    const validToken = getDefaultMapToken();
    const req = new NextRequest(`https://potonglink.com/api/publik/tv-peta?t=${validToken}`, {
      headers: {
        host: "potonglink.com",
        "x-forwarded-host": "potonglink.com",
      },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);

    // Verify all prisma findMany calls in tv-peta are scoped strictly to tenant-potonglink
    expect(prisma.lokasiPetugas.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: "tenant-potonglink",
          petugas: expect.objectContaining({ tenantId: "tenant-potonglink", aktif: true }),
        }),
      })
    );

    expect(prisma.lokasiKendaraan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: "tenant-potonglink",
          kendaraan: expect.objectContaining({ tenantId: "tenant-potonglink", aktif: true }),
        }),
      })
    );

    expect(prisma.titikTransit.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: "tenant-potonglink",
        }),
      })
    );

    expect(prisma.komplain.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: "tenant-potonglink",
        }),
      })
    );
  });

  it("strictly scopes /api/transit GET and stamps tenantId on POST", async () => {
    const { prisma } = await import("../src/lib/prisma");
    const { GET, POST } = await import("../src/app/api/transit/route");

    const getReq = new NextRequest("https://potonglink.com/api/transit", {
      headers: { host: "potonglink.com" },
    });
    const getRes = await GET(getReq);
    expect(getRes.status).toBe(200);
    expect(prisma.titikTransit.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: "tenant-potonglink" }),
      })
    );

    const postReq = new NextRequest("https://potonglink.com/api/transit", {
      method: "POST",
      headers: { host: "potonglink.com", "Content-Type": "application/json" },
      body: JSON.stringify({
        nama: "Lapak PotongLink Utama",
        latitude: -6.2,
        longitude: 106.8,
      }),
    });
    const postRes = await POST(postReq);
    expect(postRes.status).toBe(201);
    expect(prisma.titikTransit.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          nama: "Lapak PotongLink Utama",
          tenantId: "tenant-potonglink",
        }),
      })
    );
  });

  it("blocks /api/pelanggan/[id]/peta-pdf when customer does not belong to active host tenant", async () => {
    const { prisma } = await import("../src/lib/prisma");
    const { GET } = await import("../src/app/api/pelanggan/[id]/peta-pdf/route");

    // Pelanggan not found in potonglink tenant (e.g. belongs to upsheru)
    (prisma.pelanggan.findFirst as any).mockResolvedValue(null);

    const validToken = getDefaultMapToken();
    const req = new NextRequest(`https://potonglink.com/api/pelanggan/123/peta-pdf?t=${validToken}`, {
      headers: { host: "potonglink.com" },
    });

    const res = await GET(req, { params: Promise.resolve({ id: "123" }) });
    expect(res.status).toBe(404);
  });
});
