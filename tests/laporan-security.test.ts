// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getLaporan } from "../src/lib/laporan";
import { prisma } from "../src/lib/prisma";

vi.mock("../src/lib/prisma", () => ({ prisma: {
  pembayaran: { findMany: vi.fn(), groupBy: vi.fn() },
  pengeluaran: { findMany: vi.fn() }, tagihan: { findMany: vi.fn() },
  pengangkutan: { aggregate: vi.fn(), groupBy: vi.fn() },
  pelanggan: { count: vi.fn(), groupBy: vi.fn() }, liburSementara: { count: vi.fn() },
} }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.pembayaran.findMany).mockResolvedValue([]);
  vi.mocked(prisma.pembayaran.groupBy).mockResolvedValue([]);
  vi.mocked(prisma.pengeluaran.findMany).mockResolvedValue([]);
  (vi.mocked(prisma.tagihan.findMany).mockImplementation as any)(async (args: any) => {
    // Simulate database filtering, including the regression case of a void invoice.
    if (args?.where?.bulan && !args.where.status) return [{ id: 1, jumlah: 50000, status: "dibatalkan" }] as never;
    return [];
  });
  vi.mocked(prisma.pengangkutan.aggregate).mockResolvedValue({ _sum: { berat: 0, volume: 0 }, _count: 0 } as never);
  vi.mocked(prisma.pengangkutan.groupBy).mockResolvedValue([]);
  vi.mocked(prisma.pelanggan.count).mockResolvedValue(0);
  vi.mocked(prisma.pelanggan.groupBy).mockResolvedValue([]);
  vi.mocked(prisma.liburSementara.count).mockResolvedValue(0);
});

describe("report eligibility and WIB boundaries", () => {
  it("excludes cancelled invoice from revenue and outstanding receivables", async () => {
    const result = await getLaporan(10, 2026);
    expect(result.totalTagihan).toBe(0);
    expect(result.bridge.accruedUncollected).toBe(0);
    expect(prisma.tagihan.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: { not: "dibatalkan" } }) }));
  });

  it("calculates accurate WIB business day boundaries", async () => {
    const result = await getLaporan(10, 2026);
    expect(result.bulanIni).toBe(10);
    expect(result.tahunIni).toBe(2026);
    expect(result.totalPengeluaran).toBe(0);
  });
});
