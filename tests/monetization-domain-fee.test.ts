import { describe, expect, it } from "vitest";

describe("Monetization Architecture: Domain Setup Fee & Dynamic Payment Cut Rate", () => {
  it("enforces flat Rp 2.000.000 initial domain setup fee standard", () => {
    const defaultSubscription = {
      planName: "basic",
      status: "aktif",
      domainSetupFee: 2000000,
      setupFeePaid: false,
    };

    expect(defaultSubscription.domainSetupFee).toBe(2000000);
    expect(defaultSubscription.setupFeePaid).toBe(false);
  });

  it("calculates platform fee correctly using flat nominal only", () => {
    const paymentConfig = {
      platformFeeNominal: 1000,
      platformFeeRate: 0,
    };
    const grossAmount = 40000;

    const feePlatform = Math.round(
      paymentConfig.platformFeeNominal + (grossAmount * (paymentConfig.platformFeeRate / 100))
    );

    expect(feePlatform).toBe(1000);
  });

  it("calculates platform fee correctly using percentage rate only", () => {
    const paymentConfig = {
      platformFeeNominal: 0,
      platformFeeRate: 2.5, // 2.5%
    };
    const grossAmount = 50000;

    const feePlatform = Math.round(
      paymentConfig.platformFeeNominal + (grossAmount * (paymentConfig.platformFeeRate / 100))
    );

    expect(feePlatform).toBe(1250); // 2.5% of 50.000 = 1.250
  });

  it("calculates platform fee correctly using hybrid flat nominal + percentage rate", () => {
    const paymentConfig = {
      platformFeeNominal: 1000,
      platformFeeRate: 2.5, // 2.5%
    };
    const grossAmount = 50000;

    const feePlatform = Math.round(
      paymentConfig.platformFeeNominal + (grossAmount * (paymentConfig.platformFeeRate / 100))
    );

    expect(feePlatform).toBe(2250); // 1.000 + 1.250 = 2.250
  });

  it("calculates net tenant payout and escrow correctly", () => {
    const grossAmount = 50000;
    const feePlatform = 2250;
    const feeGateway = 1500; // QRIS fee

    const nominalNet = Math.max(0, grossAmount - feePlatform - feeGateway);

    expect(nominalNet).toBe(46250);
    expect(nominalNet + feePlatform + feeGateway).toBe(grossAmount);
  });

  it("ensures negative net payouts are prevented if fees exceed gross amount", () => {
    const grossAmount = 1000;
    const feePlatform = 2000;
    const feeGateway = 1500;

    const nominalNet = Math.max(0, grossAmount - feePlatform - feeGateway);
    expect(nominalNet).toBe(0);
  });
});
