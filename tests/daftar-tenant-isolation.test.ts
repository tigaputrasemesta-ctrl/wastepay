import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as daftarPost } from "../src/app/api/publik/daftar/route";
import { GET as cekNomorGet } from "../src/app/api/publik/cek-nomor/route";
import { GET as daftarOptionsGet } from "../src/app/api/publik/daftar-options/route";
import { GET as surveiListGet } from "../src/app/api/survei/route";
import { GET as surveiDetailGet, PUT as surveiDetailPut } from "../src/app/api/survei/[id]/route";
import { prisma } from "../src/lib/prisma";
import { getSession } from "../src/lib/auth";

vi.mock("../src/lib/auth", () => ({
  getSession: vi.fn(),
}));

vi.mock("../src/lib/scope", () => ({
  PETUGAS_SCOPE_ALL: true,
  getPetugasKelurahan: vi.fn(async () => null),
}));

vi.mock("../src/lib/prisma", () => ({
  prisma: {
    kelurahan: { findFirst: vi.fn(), findMany: vi.fn() },
    wilayah: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    zona: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn() },
    rute: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn() },
    paket: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn() },
    kategoriTarif: { findMany: vi.fn() },
    petugas: { findMany: vi.fn() },
    pelanggan: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("../src/lib/rate-limit", () => ({
  allowAttempt: vi.fn(async () => true),
  retryAfterSeconds: vi.fn(() => 60),
}));

vi.mock("../src/lib/audit", () => ({
  logAudit: vi.fn().mockResolvedValue(true),
}));

vi.mock("../src/lib/server/media-storage", () => ({
  persistBase64Image: vi.fn().mockResolvedValue("/uploads/pelanggan/test.jpg"),
}));

vi.mock("../src/lib/penugasan-jadwal", () => ({
  tetapkanJadwalDanPetugasPelanggan: vi.fn().mockResolvedValue(true),
}));

vi.mock("../src/lib/wa", () => ({
  adminPhone: vi.fn(() => "6281400782617"),
  kirimNotifikasi: vi.fn().mockResolvedValue(true),
  kirimReportPendaftaran: vi.fn().mockResolvedValue(true),
  templatePendaftaranAdmin: vi.fn(async () => ({ judul: "Baru", pesan: "Pesan" })),
  templatePendaftaranDiterima: vi.fn(async () => ({ judul: "Diterima", pesan: "Pesan" })),
  templatePendaftaranPelangganOlehPetugas: vi.fn(async () => ({ judul: "Petugas", pesan: "Pesan" })),
}));

describe("Public /api/publik/daftar multi-tenant assignment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.kelurahan.findFirst).mockResolvedValue({ id: 5 } as any);
    vi.mocked(prisma.wilayah.findFirst).mockResolvedValue({ id: 12 } as any);
    vi.mocked(prisma.pelanggan.create).mockResolvedValue({
      id: 101,
      nama: "Leni Murtadi",
      kodePelanggan: "6281386911325",
      noTelepon: "6281386911325",
      alamat: "Jl Niman RT 01 RW 02 No 10",
      kelurahanId: 5,
      tenantId: "tenant-pilot-upsheru",
    } as any);
  });

  it("assigns tenantId from resolved host (upsheru.com) when creating public registration", async () => {
    const req = new NextRequest("https://upsheru.com/api/publik/daftar", {
      method: "POST",
      headers: {
        host: "upsheru.com",
        "x-forwarded-host": "upsheru.com",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        nama: "Leni Murtadi",
        noTelepon: "081386911325",
        kategori: "level_1",
        kecamatan: "Cilodong",
        kelurahan: "Kalibaru",
        alamat: "Jl Niman RT 01 RW 02 No 10 Depok",
        latitude: -6.42,
        longitude: 106.83,
        fotoRumah: "/uploads/sample.jpg",
      }),
    });

    const res = await daftarPost(req);
    expect(res.status).toBe(200);
    const createCall = vi.mocked(prisma.pelanggan.create).mock.calls[0]?.[0];
    expect(createCall?.data?.tenantId).toBe("tenant-pilot-upsheru");
  });

  it("blocks public customer signup on core host o2whero.com", async () => {
    const req = new NextRequest("https://o2whero.com/api/publik/daftar", {
      method: "POST",
      headers: {
        host: "o2whero.com",
        "x-forwarded-host": "o2whero.com",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        nama: "Leni Murtadi",
        noTelepon: "081386911325",
      }),
    });

    const res = await daftarPost(req);
    expect(res.status).toBe(403);
    expect(prisma.pelanggan.create).not.toHaveBeenCalled();
  });

  it("checks phone availability within tenant scope and clarifies calon status", async () => {
    vi.mocked(prisma.pelanggan.findFirst).mockResolvedValue({
      id: 29,
      status: "calon",
    } as any);

    const req = new NextRequest("https://upsheru.com/api/publik/cek-nomor?telp=081386911325", {
      method: "GET",
      headers: {
        host: "upsheru.com",
        "x-forwarded-host": "upsheru.com",
      },
    });

    const res = await cekNomorGet(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.terdaftar).toBe(true);
    expect(data.pesan).toContain("Calon Warga");

    const callArgs = vi.mocked(prisma.pelanggan.findFirst).mock.calls[0]?.[0];
    expect(callArgs?.where?.deletedAt).toBeNull();
    expect(callArgs?.where?.OR).toEqual(
      expect.arrayContaining([
        { noTelepon: "6281386911325" },
        { noTelepon: "081386911325" },
      ])
    );
  });

  it("scopes daftar-options queries by tenant and preserves DB level_1 tarif", async () => {
    vi.mocked(prisma.kelurahan.findMany).mockResolvedValue([
      { nama: "Kalibaru", kecamatan: "Cilodong" },
    ] as any);
    vi.mocked(prisma.paket.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.kategoriTarif.findMany).mockResolvedValue([
      { kategori: "level_1", label: "Level 1", tarif: 40000, deskripsi: "Rumah Tangga" },
    ] as any);
    vi.mocked(prisma.zona.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.petugas.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.rute.findMany).mockResolvedValue([] as any);

    const req = new NextRequest("https://upsheru.com/api/publik/daftar-options", {
      method: "GET",
      headers: {
        host: "upsheru.com",
        "x-forwarded-host": "upsheru.com",
      },
    });

    const res = await daftarOptionsGet(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.kategoriTarif[0]?.tarif).toBe(40000);

    const coreReq = new NextRequest("https://o2whero.com/api/publik/daftar-options", {
      method: "GET",
      headers: {
        host: "o2whero.com",
        "x-forwarded-host": "o2whero.com",
      },
    });
    const coreRes = await daftarOptionsGet(coreReq);
    expect(coreRes.status).toBe(403);
  });

  it("enforces auth and tenant isolation on /api/survei and /api/survei/[id]", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const unauthReq = new NextRequest("https://upsheru.com/api/survei", {
      headers: { host: "upsheru.com" },
    });
    const unauthRes = await surveiListGet(unauthReq);
    expect(unauthRes.status).toBe(401);

    vi.mocked(getSession).mockResolvedValue({
      id: 7,
      username: "admin_ups",
      role: "admin",
      tenantId: "tenant-pilot-upsheru",
    } as any);
    vi.mocked(prisma.pelanggan.findMany).mockResolvedValue([] as any);

    const listReq = new NextRequest("https://upsheru.com/api/survei", {
      headers: { host: "upsheru.com", "x-forwarded-host": "upsheru.com" },
    });
    const listRes = await surveiListGet(listReq);
    expect(listRes.status).toBe(200);
    const listWhere = vi.mocked(prisma.pelanggan.findMany).mock.calls[0]?.[0]?.where;
    expect(listWhere?.status).toBe("calon");
    expect(listWhere?.deletedAt).toBeNull();

    vi.mocked(prisma.pelanggan.findUnique).mockResolvedValue({
      id: 500,
      tenantId: "tenant-other-mitra",
      kelurahanId: 5,
    } as any);

    const crossReq = new NextRequest("https://upsheru.com/api/survei/500", {
      headers: { host: "upsheru.com", "x-forwarded-host": "upsheru.com" },
    });
    const crossGetRes = await surveiDetailGet(crossReq, { params: Promise.resolve({ id: "500" }) });
    expect(crossGetRes.status).toBe(403);

    const crossPutRes = await surveiDetailPut(
      new NextRequest("https://upsheru.com/api/survei/500", {
        method: "PUT",
        headers: {
          host: "upsheru.com",
          "x-forwarded-host": "upsheru.com",
          "content-type": "application/json",
        },
        body: JSON.stringify({ patokanLokasi: "Dekat Pos" }),
      }),
      { params: Promise.resolve({ id: "500" }) }
    );
    expect(crossPutRes.status).toBe(403);
  });
});
