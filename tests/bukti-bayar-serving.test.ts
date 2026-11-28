import { describe, expect, it, vi, beforeEach, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { GET as buktiGet } from "../src/app/api/pembayaran/[id]/bukti/route";
import { formatMediaUrl } from "../src/lib/foto";
import { prisma } from "../src/lib/prisma";
import fs from "fs/promises";
import path from "path";

vi.mock("../src/lib/prisma", () => ({
  prisma: {
    pembayaran: {
      findUnique: vi.fn(),
    },
  },
}));

describe("Bukti Pembayaran Serving & Normalization", () => {
  const dummyUploadDir = path.join(process.cwd(), "public", "uploads", "test-pembayaran");
  const dummyFilePath = path.join(dummyUploadDir, "struk_test.jpg");
  const dummyContent = Buffer.from("fake-struk-transfer-content-999");

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

  describe("formatMediaUrl Utility", () => {
    it("returns empty string for null, undefined, or empty input", () => {
      expect(formatMediaUrl(null)).toBe("");
      expect(formatMediaUrl(undefined)).toBe("");
      expect(formatMediaUrl("")).toBe("");
      expect(formatMediaUrl("   ")).toBe("");
    });

    it("normalizes relative uploads path without leading slash", () => {
      expect(formatMediaUrl("uploads/pembayaran/struk.jpg")).toBe("/uploads/pembayaran/struk.jpg");
      expect(formatMediaUrl("/uploads/pembayaran/struk.jpg")).toBe("/uploads/pembayaran/struk.jpg");
    });

    it("prepends data URI prefix to raw JPEG base64 string starting with /9j/", () => {
      const rawJpegBase64 = "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgF...";
      const formatted = formatMediaUrl(rawJpegBase64);
      expect(formatted).toBe(`data:image/jpeg;base64,${rawJpegBase64}`);
    });

    it("leaves standard data URIs untouched", () => {
      const dataUri = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
      expect(formatMediaUrl(dataUri)).toBe(dataUri);
    });

    it("leaves external URLs untouched", () => {
      const url = "https://images.unsplash.com/photo-sample";
      expect(formatMediaUrl(url)).toBe(url);
    });

    it("leaves API endpoint paths untouched", () => {
      const apiPath = "/api/pembayaran/123/bukti";
      expect(formatMediaUrl(apiPath)).toBe(apiPath);
    });
  });

  describe("GET /api/pembayaran/[id]/bukti", () => {
    it("serves local disk upload directly if file exists", async () => {
      vi.mocked(prisma.pembayaran.findUnique).mockResolvedValueOnce({
        id: 50,
        buktiBayar: "/uploads/test-pembayaran/struk_test.jpg",
      } as any);

      const req = new NextRequest("https://upsheru.com/api/pembayaran/50/bukti");
      const res = await buktiGet(req, { params: Promise.resolve({ id: "50" }) });

      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("image/jpeg");
      expect(res.headers.get("cache-control")).toContain("public");
      const buffer = Buffer.from(await res.arrayBuffer());
      expect(buffer.toString()).toBe("fake-struk-transfer-content-999");
    });

    it("serves base64 data URI properly decoded as image bytes", async () => {
      const sampleText = "hello-payment-receipt";
      const base64Data = Buffer.from(sampleText).toString("base64");
      const dataUri = `data:image/png;base64,${base64Data}`;

      vi.mocked(prisma.pembayaran.findUnique).mockResolvedValueOnce({
        id: 51,
        buktiBayar: dataUri,
      } as any);

      const req = new NextRequest("https://upsheru.com/api/pembayaran/51/bukti");
      const res = await buktiGet(req, { params: Promise.resolve({ id: "51" }) });

      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("image/png");
      const buffer = Buffer.from(await res.arrayBuffer());
      expect(buffer.toString()).toBe(sampleText);
    });

    it("serves raw JPEG base64 starting with /9j/ properly decoded as image/jpeg", async () => {
      const rawJpegBase64 = "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/wAALCAABAAEBAREA/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/AH//2Q==";

      vi.mocked(prisma.pembayaran.findUnique).mockResolvedValueOnce({
        id: 52,
        buktiBayar: rawJpegBase64,
      } as any);

      const req = new NextRequest("https://upsheru.com/api/pembayaran/52/bukti");
      const res = await buktiGet(req, { params: Promise.resolve({ id: "52" }) });

      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("image/jpeg");
      const buffer = Buffer.from(await res.arrayBuffer());
      expect(buffer.length).toBeGreaterThan(0);
    });

    it("redirects to external HTTP URL", async () => {
      const externalUrl = "https://example.com/receipt-photo.jpg";
      vi.mocked(prisma.pembayaran.findUnique).mockResolvedValueOnce({
        id: 53,
        buktiBayar: externalUrl,
      } as any);

      const req = new NextRequest("https://upsheru.com/api/pembayaran/53/bukti");
      const res = await buktiGet(req, { params: Promise.resolve({ id: "53" }) });

      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe(externalUrl);
    });

    it("returns 404 if pembayaran record does not exist", async () => {
      vi.mocked(prisma.pembayaran.findUnique).mockResolvedValueOnce(null);

      const req = new NextRequest("https://upsheru.com/api/pembayaran/999/bukti");
      const res = await buktiGet(req, { params: Promise.resolve({ id: "999" }) });

      expect(res.status).toBe(404);
    });

    it("returns 404 if buktiBayar is null", async () => {
      vi.mocked(prisma.pembayaran.findUnique).mockResolvedValueOnce({
        id: 54,
        buktiBayar: null,
      } as any);

      const req = new NextRequest("https://upsheru.com/api/pembayaran/54/bukti");
      const res = await buktiGet(req, { params: Promise.resolve({ id: "54" }) });

      expect(res.status).toBe(404);
    });

    it("returns 404 for invalid non-numeric ID", async () => {
      const req = new NextRequest("https://upsheru.com/api/pembayaran/abc/bukti");
      const res = await buktiGet(req, { params: Promise.resolve({ id: "abc" }) });

      expect(res.status).toBe(404);
    });
  });
});
