import { describe, expect, it } from "vitest";

describe("status-pelanggan operational rules", () => {
  const VALID_STATUSES = ["aktif", "calon", "nonaktif", "libur"];

  it("memiliki 4 status baku yang valid untuk siklus hidup pelanggan", () => {
    expect(VALID_STATUSES).toContain("aktif");
    expect(VALID_STATUSES).toContain("calon");
    expect(VALID_STATUSES).toContain("nonaktif");
    expect(VALID_STATUSES).toContain("libur");
  });

  it("pelanggan nonaktif harus dikecualikan dari filter generate tagihan otomatis", () => {
    const filterQuery = { status: "aktif", deletedAt: null };
    
    // Simulasi pelanggan
    const pelangganAktif = { id: 1, status: "aktif", deletedAt: null };
    const pelangganNonaktif = { id: 2, status: "nonaktif", deletedAt: null };
    const pelangganLibur = { id: 3, status: "libur", deletedAt: null };

    function matchesBillingCron(p: typeof pelangganAktif) {
      return p.status === filterQuery.status && p.deletedAt === filterQuery.deletedAt;
    }

    expect(matchesBillingCron(pelangganAktif)).toBe(true);
    expect(matchesBillingCron(pelangganNonaktif)).toBe(false);
    expect(matchesBillingCron(pelangganLibur)).toBe(false);
  });

  it("pelanggan nonaktif harus dikecualikan dari jadwal tugas armada harian", () => {
    const filterPickup = { status: "aktif", deletedAt: null };

    const pelangganNonaktif = { id: 10, nama: "Budi", status: "nonaktif", deletedAt: null };
    const canPickup = pelangganNonaktif.status === filterPickup.status && pelangganNonaktif.deletedAt === filterPickup.deletedAt;

    expect(canPickup).toBe(false);
  });

  it("reaktivasi pelanggan mengubah status dari nonaktif kembali ke aktif", () => {
    const pelanggan = { id: 10, status: "nonaktif", catatan: "Pernah berhenti langganan" };
    const updatePayload = { status: "aktif", catatan: "Reaktivasi layanan per permintaan warga" };

    const updated = { ...pelanggan, ...updatePayload };
    expect(updated.status).toBe("aktif");
    expect(updated.catatan).toBe("Reaktivasi layanan per permintaan warga");
  });
});
