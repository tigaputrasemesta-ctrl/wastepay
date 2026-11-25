import { describe, expect, it, vi, beforeEach } from "vitest";

describe("Phase 9: UPS HERU Backfill Migration Logic", () => {
  const PILOT_TENANT_ID = "tenant-pilot-upsheru";
  const CORE_TENANT_ID = "tenant-core-o2w";

  it("identifies pilot tenant and preserves existing data counts", () => {
    const mockDb: {
      pelanggan: Array<{ id: number; nama: string; tenantId: string | null }>;
      user: Array<{ id: number; email: string; role: string; tenantId: string | null }>;
    } = {
      pelanggan: [
        { id: 1, nama: "Bpk. Heru", tenantId: null },
        { id: 2, nama: "Ibu Siti", tenantId: null },
        { id: 3, nama: "Tenant B User", tenantId: "tenant-b-uuid" },
      ],
      user: [
        { id: 1, email: "admin@upsheru.com", role: "admin", tenantId: null },
        { id: 2, email: "super@o2whero.com", role: "superadmin", tenantId: null },
      ],
    };

    const countBefore = {
      pelanggan: mockDb.pelanggan.length,
      user: mockDb.user.length,
    };

    // 1. Backfill null tenantId to pilot tenant
    for (const p of mockDb.pelanggan) {
      if (p.tenantId === null) {
        p.tenantId = PILOT_TENANT_ID;
      }
    }

    // 2. Backfill user: superadmin to core, others to pilot
    for (const u of mockDb.user) {
      if (u.tenantId === null) {
        u.tenantId = u.role === "superadmin" ? CORE_TENANT_ID : PILOT_TENANT_ID;
      }
    }

    // 3. Verify counts
    expect(mockDb.pelanggan.length).toBe(countBefore.pelanggan);
    expect(mockDb.user.length).toBe(countBefore.user);

    // 4. Verify no remaining nulls
    expect(mockDb.pelanggan.every((p) => p.tenantId !== null)).toBe(true);
    expect(mockDb.user.every((u) => u.tenantId !== null)).toBe(true);

    // 5. Verify correct assignments
    expect(mockDb.pelanggan[0].tenantId).toBe(PILOT_TENANT_ID);
    expect(mockDb.pelanggan[1].tenantId).toBe(PILOT_TENANT_ID);
    expect(mockDb.pelanggan[2].tenantId).toBe("tenant-b-uuid"); // Untouched
    expect(mockDb.user[0].tenantId).toBe(PILOT_TENANT_ID);
    expect(mockDb.user[1].tenantId).toBe(CORE_TENANT_ID);
  });
});
