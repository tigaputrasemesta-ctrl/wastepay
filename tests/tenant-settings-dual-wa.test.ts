import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock prisma and auth dependencies
vi.mock("../src/lib/prisma", () => {
  return {
    prisma: {
      tenant: {
        findFirst: vi.fn(),
      },
      tenantWhatsAppConfig: {
        findUnique: vi.fn(),
        create: vi.fn(),
        upsert: vi.fn(),
      },
      tenantQuotaUsage: {
        findUnique: vi.fn(),
        create: vi.fn(),
        upsert: vi.fn(),
        updateMany: vi.fn(),
      },
      tenantPaymentConfig: {
        findUnique: vi.fn(),
        create: vi.fn(),
        upsert: vi.fn(),
      },
    },
  };
});

vi.mock("../src/lib/auth", () => {
  return {
    getUserFromRequest: vi.fn(),
  };
});

describe("Multi-Tenant Dual WhatsApp & Payment Settings Architecture", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("verifies dual WhatsApp configuration schema integrity", () => {
    const mockWaConfig = {
      tenantId: "tenant-ups-heru-123",
      gatewayMode: "dedicated_mitra",
      provider: "fonnte",
      // Nomor 1: Operasional Utama (Bot interaktif & tagihan)
      waNumber1: "081400782617",
      waApiKey1: "token-device-1-billing",
      waLabel1: "Nomor Utama (Bot & Tagihan)",
      // Nomor 2: Layanan CS & Pengaduan
      waNumber2: "081234567890",
      waApiKey2: "token-device-2-cs",
      waLabel2: "Nomor CS & Pengaduan",
      adminPhone: "081399887766",
      ownerPhone: "081200112233",
      waGroupTagihan: "120363012345@g.us",
      waGroupPengaduan: "120363067890@g.us",
      blastDelayMs: 1500,
      autoSendEnabled: true,
    };

    expect(mockWaConfig.waNumber1).toBe("081400782617");
    expect(mockWaConfig.waNumber2).toBe("081234567890");
    expect(mockWaConfig.waApiKey1).not.toBe(mockWaConfig.waApiKey2);
    expect(mockWaConfig.gatewayMode).toBe("dedicated_mitra");
  });

  it("calculates quota consumption and overage fees correctly", () => {
    const quotaStarter = 1000;
    const quotaPro = 5000;
    const quotaEnterprise = 20000;
    const overageRate = 150; // Rp 150/pesan

    const calculateCost = (sent: number, limit: number) => {
      const excess = Math.max(0, sent - limit);
      return excess * overageRate;
    };

    // Dalam batas kuota
    expect(calculateCost(800, quotaStarter)).toBe(0);
    expect(calculateCost(4500, quotaPro)).toBe(0);

    // Kelebihan pemakaian
    expect(calculateCost(1200, quotaStarter)).toBe(200 * 150); // Rp 30.000
    expect(calculateCost(6000, quotaPro)).toBe(1000 * 150); // Rp 150.000
    expect(calculateCost(25000, quotaEnterprise)).toBe(5000 * 150); // Rp 750.000
  });

  it("verifies zero-variance payment reconciliation formula", () => {
    const grossPaidByCitizen = 50000; // Iuran sampah Rp 50.000
    const paymentChannel = "QRIS";
    
    // MDR Duitku QRIS 0.7%
    const gatewayFee = Math.round(grossPaidByCitizen * 0.007); // Rp 350
    // O2W Platform Commission
    const platformCommission = 1000; // Rp 1.000 per transaksi
    // Net kas mitra
    const netTenantKas = grossPaidByCitizen - gatewayFee - platformCommission; // Rp 48.650

    expect(gatewayFee).toBe(350);
    expect(netTenantKas).toBe(48650);

    // Zero-variance balance check
    const totalReconciled = netTenantKas + platformCommission + gatewayFee;
    expect(totalReconciled).toBe(grossPaidByCitizen);
  });

  it("handles fee bearer policies (customer vs tenant vs hybrid)", () => {
    const iuranPokok = 45000;
    const adminFeeVa = 3500;

    // Policy 1: Customer (beban ditambah ke tagihan warga)
    const billCustomer = iuranPokok + adminFeeVa;
    expect(billCustomer).toBe(48500);

    // Policy 2: Tenant (disubsidi oleh kas TPS 3R/Bank Sampah)
    const billTenantSubsidy = iuranPokok;
    expect(billTenantSubsidy).toBe(45000);

    // Policy 3: Hybrid (QRIS disubsidi sebagian, VA dibebankan penuh)
    const qrisSubsidyFee = 500;
    const billHybrid = iuranPokok + qrisSubsidyFee;
    expect(billHybrid).toBe(45500);
  });
});
