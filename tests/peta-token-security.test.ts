import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { tvTokenValid, getDefaultMapToken } from "../src/lib/tv-token";
import { proxy } from "../src/proxy";

vi.mock("../src/lib/prisma", () => ({ prisma: { user: { findUnique: vi.fn() } } }));

describe("tvTokenValid & Map Token Access", () => {
  it("validates correct token", () => {
    const valid = getDefaultMapToken();
    expect(tvTokenValid(valid)).toBe(true);
    expect(tvTokenValid(`  ${valid}  `)).toBe(true);
  });

  it("rejects invalid or empty token", () => {
    expect(tvTokenValid("invalid-random-token-123")).toBe(false);
    expect(tvTokenValid("")).toBe(false);
    expect(tvTokenValid(null)).toBe(false);
    expect(tvTokenValid(undefined)).toBe(false);
  });

  it("proxy allows buku-pdf with valid token query without login session", async () => {
    const token = getDefaultMapToken();
    const req = new NextRequest(`https://test.invalid/api/peta/buku-pdf?mode=1halaman&t=${token}`, {
      method: "GET",
    });
    const res = await proxy(req);
    // Should pass proxy (not 401 Unauthorized)
    expect(res.status).not.toBe(401);
  });

  it("proxy blocks buku-pdf when token is missing and user not logged in", async () => {
    const req = new NextRequest("https://test.invalid/api/peta/buku-pdf?mode=1halaman", {
      method: "GET",
    });
    const res = await proxy(req);
    expect(res.status).toBe(401);
  });

  it("proxy blocks buku-pdf when token is invalid", async () => {
    const req = new NextRequest("https://test.invalid/api/peta/buku-pdf?mode=1halaman&t=wrong-token", {
      method: "GET",
    });
    const res = await proxy(req);
    expect(res.status).toBe(401);
  });
});
