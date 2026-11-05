import { beforeEach, describe, expect, it, vi } from "vitest";
import { PUT } from "../src/app/api/pembayaran/[id]/route";
import { getSession } from "../src/lib/auth";
import { prisma } from "../src/lib/prisma";

const tx = vi.hoisted(() => ({
  tagihan: { updateMany: vi.fn(), findUniqueOrThrow: vi.fn() },
  pembayaran: { updateMany: vi.fn(), findUniqueOrThrow: vi.fn() },
}));
vi.mock("../src/lib/auth", () => ({ getSession: vi.fn() }));
vi.mock("../src/lib/prisma", () => ({ prisma: {
  pembayaran: { findUnique: vi.fn() },
  $transaction: vi.fn(async (fn: (value: typeof tx) => unknown) => fn(tx)),
} }));
vi.mock("../src/lib/audit", () => ({ logAudit: vi.fn() }));
vi.mock("../src/lib/wa", () => ({ isWaEnabled: () => false }));

const invoke = () => PUT(new Request("https://test.invalid/api/pembayaran/2", {
  method: "PUT", body: JSON.stringify({ status: "terverifikasi" }),
}), { params: Promise.resolve({ id: "2" }) });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getSession).mockResolvedValue({ id: 1, nama: "Admin", role: "admin", email: "a@test.invalid" });
  vi.mocked(prisma.pembayaran.findUnique).mockResolvedValue({ id: 2, tagihanId: 10, jumlah: 50000, status: "pending", metode: "tunai" } as never);
  tx.tagihan.updateMany.mockResolvedValue({ count: 1 });
  tx.tagihan.findUniqueOrThrow.mockResolvedValue({ jumlah: 50000, denda: 0 });
  tx.pembayaran.updateMany.mockResolvedValue({ count: 1 });
  tx.pembayaran.findUniqueOrThrow.mockResolvedValue({ id: 2, status: "terverifikasi" });
});

describe("independent payment approval", () => {
  it("rejects unauthenticated request", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    expect((await invoke()).status).toBe(401);
    expect(prisma.pembayaran.findUnique).not.toHaveBeenCalled();
  });
  it.each(["petugas", "kasir"])("rejects approval by %s", async (role) => {
    vi.mocked(getSession).mockResolvedValue({ id: 1, nama: "Collector", role, email: "a@test.invalid" });
    expect((await invoke()).status).toBe(403);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it("claims unpaid invoice atomically before verifying payment", async () => {
    expect((await invoke()).status).toBe(200);
    expect(tx.tagihan.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: {
      id: 10, status: { in: ["belum_bayar", "tunggakan"] }, deletedAt: null,
    } }));
    expect(tx.pembayaran.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 2, status: "pending" }, data: expect.objectContaining({ verifiedById: 1 }),
    }));
  });
  it("rejects already-paid, cancelled or deleted invoice without verifying second payment", async () => {
    tx.tagihan.updateMany.mockResolvedValue({ count: 0 });
    expect((await invoke()).status).toBe(409);
    expect(tx.pembayaran.updateMany).not.toHaveBeenCalled();
  });
  it("rejects approval when another request already processed payment", async () => {
    tx.pembayaran.updateMany.mockResolvedValue({ count: 0 });
    expect((await invoke()).status).toBe(409);
  });
  it("rejects insufficient amount against current invoice", async () => {
    tx.tagihan.findUniqueOrThrow.mockResolvedValue({ jumlah: 75000, denda: 0 });
    expect((await invoke()).status).toBe(409);
    expect(tx.pembayaran.updateMany).not.toHaveBeenCalled();
  });
});
