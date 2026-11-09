import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createSession } from "../src/lib/auth";
import { proxy } from "../src/proxy";
import { prisma } from "../src/lib/prisma";

vi.mock("../src/lib/prisma", () => ({ prisma: { user: { findUnique: vi.fn() } } }));
const user = { id: 1, nama: "Test", email: "a@test.invalid", role: "petugas", tokenVersion: 1, aktif: true };
const lookup = vi.mocked(prisma.user.findUnique);
const request = (path: string, token?: string, method = "GET") => new NextRequest(`https://test.invalid${path}`, {
  method, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}) },
});
beforeEach(() => { vi.clearAllMocks(); lookup.mockResolvedValue(user as never); });

describe("proxy authorization boundaries", () => {
  it("protects photo endpoint instead of bypassing auth", async () => {
    expect((await proxy(request("/api/peta/foto-rumah?id=1"))).status).toBe(401);
  });
  it.each(["/laporan-cetak", "/laporan-pembayaran-cetak", "/pelanggan-cetak", "/absensi-cetak"])("blocks petugas from %s", async (path) => {
    const response = await proxy(request(path, await createSession(user)));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/peta?error=akses");
  });
  it("blocks collector payment approval", async () => {
    expect((await proxy(request("/api/pembayaran/2", await createSession(user), "PUT"))).status).toBe(403);
  });
  it("allows kasir to check gateway on tagihan", async () => {
    const kasirUser = { ...user, role: "kasir" };
    lookup.mockResolvedValue(kasirUser as never);
    // Not 403 (will proceed or fail in handler without real params)
    const res = await proxy(request("/api/tagihan/1/check-gateway", await createSession(kasirUser), "POST"));
    expect(res.status).not.toBe(403);
  });
  it("blocks petugas from checking gateway on tagihan", async () => {
    expect((await proxy(request("/api/tagihan/1/check-gateway", await createSession(user), "POST"))).status).toBe(403);
  });
  it.each(["missing", "db-error"])("fails closed for %s user lookup", async (scenario) => {
    const token = await createSession(user);
    if (scenario === "missing") lookup.mockResolvedValue(null);
    else lookup.mockRejectedValue(new Error("DB down"));
    expect((await proxy(request("/api/tagihan", token))).status).toBe(401);
  });
});
