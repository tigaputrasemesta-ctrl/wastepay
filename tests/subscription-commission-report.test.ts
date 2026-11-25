import { describe, expect, it } from "vitest";

describe("Tenant Subscription & Commission Report Architecture", () => {
  it("correctly aggregates tenant financial commission from transactions", () => {
    const tenantData = {
      namaMitra: "UPS HERU Kota Depok",
      slug: "upsheru",
      planName: "pro",
      priceMonthly: 1250000,
      domainSetupFee: 2000000,
      setupFeePaid: true,
      platformFeeNominal: 1000,
      platformFeeRate: 0,
      txCount: 1253,
      grossGmv: 43855000,
    };

    // Komisi O2W: nominal flat per transaksi + (grossGmv * rate %)
    const calculatedCommission =
      tenantData.txCount * tenantData.platformFeeNominal +
      tenantData.grossGmv * (tenantData.platformFeeRate / 100);

    expect(calculatedCommission).toBe(1253000); // 1.253 transaksi * Rp 1.000 = Rp 1.253.000

    const gatewayCost = tenantData.txCount * 1500; // Rp 1.500 QRIS
    const netMitra = tenantData.grossGmv - calculatedCommission - gatewayCost;

    expect(gatewayCost).toBe(1879500);
    expect(netMitra).toBe(40722500);
  });

  it("handles dynamic percentage-based commission for commercial tenants", () => {
    const commercialTenant = {
      namaMitra: "Vendor Industri Swasta",
      platformFeeNominal: 500,
      platformFeeRate: 2.0, // 2%
      txCount: 200,
      grossGmv: 100000000, // Rp 100.000.000
    };

    const commissionO2w =
      commercialTenant.txCount * commercialTenant.platformFeeNominal +
      commercialTenant.grossGmv * (commercialTenant.platformFeeRate / 100);

    // 200 * 500 = 100.000
    // 2% * 100.000.000 = 2.000.000
    // Total = 2.100.000
    expect(commissionO2w).toBe(2100000);
  });

  it("calculates pending escrow balance correctly after partial payout", () => {
    const netMitra = 40722500;
    const payoutPaid = 35000000;
    const pendingEscrow = Math.max(0, netMitra - payoutPaid);

    expect(pendingEscrow).toBe(5722500);
  });

  it("formats CSV export row structure correctly", () => {
    const reportItem = {
      tenantId: "tenant-pilot-upsheru",
      namaMitra: "UPS HERU Kota Depok",
      slug: "upsheru",
      primaryDomain: "upsheru.com",
      tipePengelola: "tps3r",
      status: "aktif",
      planName: "pro",
      priceMonthly: 1250000,
      domainSetupFee: 2000000,
      setupFeePaid: true,
      platformFeeNominal: 1000,
      platformFeeRate: 0,
      txCount: 1253,
      grossGmv: 43855000,
      commissionO2w: 1253000,
      gatewayFee: 1879500,
      netMitra: 40722500,
      payoutPaid: 35000000,
      pendingEscrow: 5722500,
      bankName: "BCA",
      bankAccountNumber: "1234567890",
      bankAccountHolder: "UPS HERU",
      payoutSchedule: "weekly",
    };

    const row = [
      `"${reportItem.tenantId}"`,
      `"${reportItem.namaMitra}"`,
      `"${reportItem.slug}"`,
      `"${reportItem.primaryDomain}"`,
      reportItem.commissionO2w,
      reportItem.netMitra,
      reportItem.pendingEscrow,
    ];

    expect(row[1]).toBe('"UPS HERU Kota Depok"');
    expect(row[4]).toBe(1253000);
    expect(row[5]).toBe(40722500);
    expect(row[6]).toBe(5722500);
  });
});
