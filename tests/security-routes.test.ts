import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as webhook } from "../src/app/api/publik/wa-webhook/route";
import { GET as photo } from "../src/app/api/peta/foto-rumah/route";
import { getSession } from "../src/lib/auth";
import { prisma } from "../src/lib/prisma";
import { processIncomingWaMessage } from "../src/lib/server/wa-bot-service";
import { kirimWhatsApp } from "../src/lib/wa";

vi.mock("../src/lib/auth", () => ({ getSession: vi.fn() }));
vi.mock("../src/lib/prisma", () => ({ prisma: { pelanggan: { findUnique: vi.fn() } } }));
vi.mock("../src/lib/server/wa-bot-service", () => ({ processIncomingWaMessage: vi.fn() }));
vi.mock("../src/lib/wa", () => ({ kirimWhatsApp: vi.fn() }));
vi.mock("../src/lib/rate-limit", () => ({ allowAttempt: vi.fn(async () => true) }));

beforeEach(() => { vi.resetAllMocks(); vi.unstubAllEnvs(); });
const request = (secret?: string) => new Request("https://test.invalid/api/publik/wa-webhook", {
  method: "POST", headers: { "content-type": "application/json", ...(secret ? { "x-webhook-secret": secret } : {}) },
  body: JSON.stringify({ sender: "620000000000", message: "tagihan" }),
});

describe("WhatsApp webhook authentication", () => {
  it("fails closed when secret is not configured", async () => {
    vi.stubEnv("WA_WEBHOOK_SECRET", "");
    expect((await webhook(request())).status).toBe(503);
    expect(processIncomingWaMessage).not.toHaveBeenCalled();
  });
  it("rejects untrusted sender before bot/DB/provider calls", async () => {
    vi.stubEnv("WA_WEBHOOK_SECRET", "s".repeat(48));
    expect((await webhook(request("invalid"))).status).toBe(401);
    expect(processIncomingWaMessage).not.toHaveBeenCalled();
    expect(kirimWhatsApp).not.toHaveBeenCalled();
  });
  it("acknowledges trusted event without returning private reply or customer ID", async () => {
    vi.stubEnv("WA_WEBHOOK_SECRET", "s".repeat(48));
    vi.mocked(processIncomingWaMessage).mockResolvedValue({ reply: "PRIVATE BILL", intent: "TAGIHAN", pelangganId: 88 });
    vi.mocked(kirimWhatsApp).mockResolvedValue({ ok: true } as never);
    const response = await webhook(request("s".repeat(48)));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: true, sent: true });
  });
});

describe("private house photos", () => {
  it("requires session before querying customer data", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const response = await photo(new Request("https://test.invalid/api/peta/foto-rumah?id=1"));
    expect(response.status).toBe(401);
    expect(prisma.pelanggan.findUnique).not.toHaveBeenCalled();
  });
  it("returns 404 for soft-deleted customer", async () => {
    vi.mocked(getSession).mockResolvedValue({ id: 1, email: "a@test.invalid", nama: "Admin", role: "admin" });
    vi.mocked(prisma.pelanggan.findUnique).mockResolvedValue({ id: 1, deletedAt: new Date(), fotoRumah: "data:image/jpeg;base64,AA==" } as never);
    expect((await photo(new Request("https://test.invalid/api/peta/foto-rumah?id=1&format=json"))).status).toBe(404);
  });
  it("marks authorized photo response private and uncacheable", async () => {
    vi.mocked(getSession).mockResolvedValue({ id: 1, email: "a@test.invalid", nama: "Admin", role: "admin" });
    vi.mocked(prisma.pelanggan.findUnique).mockResolvedValue({ id: 1, nama: "Customer", deletedAt: null, fotoRumah: "data:image/jpeg;base64,AA==" } as never);
    const response = await photo(new Request("https://test.invalid/api/peta/foto-rumah?id=1&format=json"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
});
