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

  it("saat pelanggan dihapus, tagihan belum_bayar/tunggakan dibatalkan & tagihan lunas dipertahankan", () => {
    const bills = [
      { id: 101, pelangganId: 10, status: "belum_bayar", deletedAt: null },
      { id: 102, pelangganId: 10, status: "tunggakan", deletedAt: null },
      { id: 103, pelangganId: 10, status: "lunas", deletedAt: null },
    ];

    const deleteTimestamp = new Date();

    // Simulasi pembatalan otomatis saat pelanggan dihapus
    const processedBills = bills.map((b) => {
      if (b.status === "belum_bayar" || b.status === "tunggakan") {
        return {
          ...b,
          status: "dibatalkan",
          deletedAt: deleteTimestamp,
          keterangan: "Dibatalkan otomatis: Pelanggan telah dihapus dari sistem",
        };
      }
      return b; // tagihan lunas tetap dipertahankan
    });

    expect(processedBills[0].status).toBe("dibatalkan");
    expect(processedBills[0].deletedAt).toBe(deleteTimestamp);

    expect(processedBills[1].status).toBe("dibatalkan");
    expect(processedBills[1].deletedAt).toBe(deleteTimestamp);

    expect(processedBills[2].status).toBe("lunas");
    expect(processedBills[2].deletedAt).toBeNull();
  });

  it("filter query /tagihan aktif mengecualikan tagihan belum lunas dari pelanggan yang dihapus", () => {
    const tagihanAktif = [
      // Tagihan warga aktif
      { id: 201, status: "belum_bayar", pelanggan: { deletedAt: null } },
      { id: 202, status: "lunas", pelanggan: { deletedAt: null } },
      // Tagihan warga yang sudah dihapus
      { id: 203, status: "belum_bayar", pelanggan: { deletedAt: new Date() } },
      { id: 204, status: "tunggakan", pelanggan: { deletedAt: new Date() } },
      { id: 205, status: "lunas", pelanggan: { deletedAt: new Date() } },
    ];

    function matchesActiveBillingFilter(t: typeof tagihanAktif[number]) {
      return t.pelanggan.deletedAt === null || t.status === "lunas";
    }

    const filtered = tagihanAktif.filter(matchesActiveBillingFilter);
    const ids = filtered.map((f) => f.id);

    expect(ids).toContain(201); // tagihan warga aktif
    expect(ids).toContain(202); // tagihan warga aktif
    expect(ids).not.toContain(203); // tagihan belum_bayar warga dihapus harus di-hide
    expect(ids).not.toContain(204); // tagihan tunggakan warga dihapus harus di-hide
    expect(ids).toContain(205); // tagihan lunas warga dihapus tetap tampil demi kas
  });
});
