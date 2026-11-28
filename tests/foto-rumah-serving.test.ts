import { describe, expect, it, vi, beforeEach, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { GET as uploadsGet, HEAD as uploadsHead } from "../src/app/uploads/[...path]/route";
import { GET as fotoGet } from "../src/app/api/pelanggan/[id]/foto/route";
import { GET as petaFotoGet } from "../src/app/api/peta/foto-rumah/route";
import { prisma } from "../src/lib/prisma";
import { getSession } from "../src/lib/auth";
import fs from "fs/promises";
import path from "path";

vi.mock("../src/lib/auth", () => ({
  getSession: vi.fn(),
}));

vi.mock("../src/lib/scope", () => ({
  PETUGAS_SCOPE_ALL: true,
  getPetugasKelurahan: vi.fn(async () => null),
}));

vi.mock("../src/lib/prisma", () => ({
  prisma: {
    pelanggan: {
      findUnique: vi.fn(),
    },
  },
}));

describe("Foto Rumah Serving & Uploads Dynamic Route", () => {
  const dummyUploadDir = path.join(process.cwd(), "public", "uploads", "test-fixtures");
  const dummyFilePath = path.join(dummyUploadDir, "house_test.jpg");
  const dummyContent = Buffer.from("fake-jpg-content-header-12345");

  beforeEach(async () => {
    vi.clearAllMocks();
    await fs.mkdir(dummyUploadDir, { recursive: true });
    await fs.writeFile(dummyFilePath, dummyContent);
  });

  afterAll(async () => {
    try {
      await fs.rm(dummyUploadDir, { recursive: true, force: true });
    } catch {}
  });

  describe("Uploads Route /uploads/[...path]", () => {
    it("serves static image from public/uploads with proper headers", async () => {
      const req = new NextRequest("https://upsheru.com/uploads/test-fixtures/house_test.jpg");
      const res = await uploadsGet(req, {
        params: Promise.resolve({ path: ["test-fixtures", "house_test.jpg"] }),
      });

      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("image/jpeg");
      expect(res.headers.get("cache-control")).toContain("immutable");
      const buffer = Buffer.from(await res.arrayBuffer());
      expect(buffer.toString()).toBe("fake-jpg-content-header-12345");
    });

    it("supports HEAD requests for checking file existence", async () => {
      const req = new NextRequest("https://upsheru.com/uploads/test-fixtures/house_test.jpg", {
        method: "HEAD",
      });
      const res = await uploadsHead(req, {
        params: Promise.resolve({ path: ["test-fixtures", "house_test.jpg"] }),
      });

      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("image/jpeg");
    });

    it("blocks directory traversal attempts with 403 Forbidden", async () => {
      const req = new NextRequest("https://upsheru.com/uploads/../../etc/passwd");
      const res = await uploadsGet(req, {
        params: Promise.resolve({ path: ["..", "..", "etc", "passwd"] }),
      });

      expect(res.status).toBe(403);
    });

    it("returns 404 for non-existent file", async () => {
      const req = new NextRequest("https://upsheru.com/uploads/test-fixtures/missing_photo.png");
      const res = await uploadsGet(req, {
        params: Promise.resolve({ path: ["test-fixtures", "missing_photo.png"] }),
      });

      expect(res.status).toBe(404);
    });
  });

  describe("Customer Photo Route /api/pelanggan/[id]/foto", () => {
    it("serves local disk upload directly if file exists", async () => {
      vi.mocked(prisma.pelanggan.findUnique).mockResolvedValueOnce({
        id: 99,
        fotoRumah: "/uploads/test-fixtures/house_test.jpg",
      } as any);

      const req = new NextRequest("https://upsheru.com/api/pelanggan/99/foto");
      const res = await fotoGet(req, { params: Promise.resolve({ id: "99" }) });

      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("image/jpeg");
      const buffer = Buffer.from(await res.arrayBuffer());
      expect(buffer.toString()).toBe("fake-jpg-content-header-12345");
    });

    it("handles data:image Base64 encoded photos", async () => {
      const sampleBase64 = Buffer.from("sample-image-bytes").toString("base64");
      vi.mocked(prisma.pelanggan.findUnique).mockResolvedValueOnce({
        id: 100,
        fotoRumah: `data:image/png;base64,${sampleBase64}`,
      } as any);

      const req = new NextRequest("https://upsheru.com/api/pelanggan/100/foto");
      const res = await fotoGet(req, { params: Promise.resolve({ id: "100" }) });

      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("image/png");
      const buffer = Buffer.from(await res.arrayBuffer());
      expect(buffer.toString()).toBe("sample-image-bytes");
    });

    it("handles raw Base64 without data:image prefix gracefully", async () => {
      // JPEG magic bytes /9j/
      const rawJpegBase64 = "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";
      vi.mocked(prisma.pelanggan.findUnique).mockResolvedValueOnce({
        id: 101,
        fotoRumah: rawJpegBase64,
      } as any);

      const req = new NextRequest("https://upsheru.com/api/pelanggan/101/foto");
      const res = await fotoGet(req, { params: Promise.resolve({ id: "101" }) });

      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("image/jpeg");
    });

    it("redirects external http/https image URLs", async () => {
      vi.mocked(prisma.pelanggan.findUnique).mockResolvedValueOnce({
        id: 102,
        fotoRumah: "https://images.unsplash.com/sample-house.jpg",
      } as any);

      const req = new NextRequest("https://upsheru.com/api/pelanggan/102/foto");
      const res = await fotoGet(req, { params: Promise.resolve({ id: "102" }) });

      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe("https://images.unsplash.com/sample-house.jpg");
    });

    it("returns 404 if customer has no photo", async () => {
      vi.mocked(prisma.pelanggan.findUnique).mockResolvedValueOnce({
        id: 103,
        fotoRumah: null,
      } as any);

      const req = new NextRequest("https://upsheru.com/api/pelanggan/103/foto");
      const res = await fotoGet(req, { params: Promise.resolve({ id: "103" }) });

      expect(res.status).toBe(404);
    });
  });

  describe("Map Bottom Sheet Photo Route /api/peta/foto-rumah", () => {
    it("returns JSON metadata with photo link when requested with Accept: application/json", async () => {
      vi.mocked(getSession).mockResolvedValueOnce({
        id: 1,
        role: "admin",
      } as any);

      vi.mocked(prisma.pelanggan.findUnique).mockResolvedValueOnce({
        id: 104,
        nama: "Bpk Ahmad",
        fotoRumah: "/uploads/test-fixtures/house_test.jpg",
        deletedAt: null,
      } as any);

      const req = new NextRequest("https://upsheru.com/api/peta/foto-rumah?id=104", {
        headers: { accept: "application/json" },
      });
      const res = await petaFotoGet(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.foto).toBe("/api/peta/foto-rumah?id=104");
    });

    it("serves direct image buffer from disk when requested directly by img tag", async () => {
      vi.mocked(getSession).mockResolvedValueOnce({
        id: 1,
        role: "admin",
      } as any);

      vi.mocked(prisma.pelanggan.findUnique).mockResolvedValueOnce({
        id: 105,
        nama: "Bpk Ahmad",
        fotoRumah: "/uploads/test-fixtures/house_test.jpg",
        deletedAt: null,
      } as any);

      const req = new NextRequest("https://upsheru.com/api/peta/foto-rumah?id=105");
      const res = await petaFotoGet(req);

      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("image/jpeg");
    });
  });
});
