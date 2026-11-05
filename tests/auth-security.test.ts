import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignJWT } from "jose";
import { createSession, getSession, verifySessionToken } from "../src/lib/auth";
import { JWT_SECRET } from "../src/lib/secret";
import { prisma } from "../src/lib/prisma";

vi.mock("../src/lib/prisma", () => ({ prisma: { user: { findUnique: vi.fn() } } }));
vi.mock("next/headers", () => ({ cookies: vi.fn(), headers: vi.fn() }));
const user = { id: 12, email: "audit@example.invalid", nama: "Test", role: "admin", tokenVersion: 3, aktif: true };
const lookup = vi.mocked(prisma.user.findUnique);

beforeEach(() => { vi.resetAllMocks(); });

describe("session security", () => {
  it("uses current database role instead of stale token role", async () => {
    const token = await createSession({ ...user, role: "superadmin" });
    lookup.mockResolvedValue(user as never);
    expect(await verifySessionToken(token)).toEqual({ id: 12, email: user.email, nama: "Test", role: "admin" });
  });

  it.each(["missing", "disabled", "revoked", "db-error"])("rejects %s user", async (scenario) => {
    const token = await createSession(user);
    if (scenario === "db-error") lookup.mockRejectedValue(new Error("unavailable"));
    else lookup.mockResolvedValue((scenario === "missing" ? null : { ...user, aktif: scenario !== "disabled", tokenVersion: scenario === "revoked" ? 4 : 3 }) as never);
    const request = new Request("https://test.invalid", { headers: { authorization: `Bearer ${token}` } });
    expect(await getSession(request)).toBeNull();
  });

  it("rejects signed legacy token without revocation version before DB lookup", async () => {
    const token = await new SignJWT({ id: user.id, role: "admin" }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("1h").sign(JWT_SECRET);
    expect(await verifySessionToken(token)).toBeNull();
    expect(lookup).not.toHaveBeenCalled();
  });
});
