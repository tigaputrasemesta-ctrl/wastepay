import { describe, expect, it } from "vitest";
import { resolveTenantByHost } from "../src/lib/tenant";

describe("O2WHERO Landing Page Business Ecosystem & Positioning", () => {
  it("resolves O2WHERO core portal context for o2whero.com and subdomains", () => {
    const coreHostCtx = resolveTenantByHost("o2whero.com");
    expect(coreHostCtx.isValid).toBe(true);
    expect(coreHostCtx.isCore).toBe(true);
    expect(coreHostCtx.tenant.slug).toBe("o2w-core");

    const pilotHostCtx = resolveTenantByHost("upsheru.com");
    expect(pilotHostCtx.isValid).toBe(true);
    expect(pilotHostCtx.isCore).toBe(false);
    expect(pilotHostCtx.tenant.slug).toBe("upsheru");
  });

  it("calculates partner business calculator financials accurately with collection rate", () => {
    const kalkulatorKk = 1000;
    const iuranPerKk = 30000;
    const collectionRate = 90; // 90%
    const estimasiSampahKg = 250; // kg/hari

    const grossTagihan = kalkulatorKk * iuranPerKk; // Rp 30.000.000
    const kasTerkumpul = Math.round(grossTagihan * (collectionRate / 100)); // Rp 27.000.000
    const wargaBayarCount = Math.round(kalkulatorKk * (collectionRate / 100)); // 900 KK
    const platformFee = wargaBayarCount * 1000; // Rp 900.000
    const biayaArmada = Math.round(kasTerkumpul * 0.32); // Rp 8.640.000
    const biayaAdminGaji = Math.round(kasTerkumpul * 0.28); // Rp 7.560.000

    const netOperatingMargin = Math.max(
      0,
      kasTerkumpul - platformFee - biayaArmada - biayaAdminGaji
    );

    // Daur Ulang & Reduksi Karbon
    const nilaiDaurUlangBulan = estimasiSampahKg * 30 * 2500; // Rp 18.750.000
    const reduksiCo2Kg = Math.round(estimasiSampahKg * 30 * 0.85); // 6.375 kg CO2e

    expect(grossTagihan).toBe(30000000);
    expect(kasTerkumpul).toBe(27000000);
    expect(platformFee).toBe(900000);
    expect(netOperatingMargin).toBe(9900000);
    expect(nilaiDaurUlangBulan).toBe(18750000);
    expect(reduksiCo2Kg).toBe(6375);
  });

  it("validates 6-step workflow order and stages", () => {
    const workflow = [
      "PESAN",
      "BAYAR",
      "DISPATCH",
      "JEMPUT",
      "VALIDASI",
      "SETTLEMENT",
    ];

    expect(workflow).toHaveLength(6);
    expect(workflow[0]).toBe("PESAN");
    expect(workflow[1]).toBe("BAYAR");
    expect(workflow[2]).toBe("DISPATCH");
    expect(workflow[3]).toBe("JEMPUT");
    expect(workflow[4]).toBe("VALIDASI");
    expect(workflow[5]).toBe("SETTLEMENT");
  });

  it("verifies dual service models distinction", () => {
    const recurringModel = {
      name: "Recurring Subscription",
      targets: ["Rumah Tangga Mandiri", "Klaster Perumahan", "Ruko Komersial"],
      billingType: "monthly_flat",
    };

    const onDemandModel = {
      name: "On-Demand Pickup",
      targets: ["Puing Renovasi", "Tebangan Pohon", "Bulky Waste", "Sampah Event"],
      billingType: "volume_vehicle_based",
    };

    expect(recurringModel.billingType).toBe("monthly_flat");
    expect(onDemandModel.billingType).toBe("volume_vehicle_based");
    expect(recurringModel.targets).not.toEqual(onDemandModel.targets);
  });
});
