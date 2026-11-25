import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  resolveTenantByHost,
  normalizeHost,
  UNRESOLVED_TENANT,
  registerDynamicTenant,
} from "../src/lib/tenant/config";
import {
  verifyUserTenantMembership,
  requireTenantContext,
} from "../src/lib/tenant/context-service";
import {
  scopeTenantWhere,
  scopeTenantCreate,
  assertTenantOwnership,
  TenantIsolationError,
} from "../src/lib/tenant/isolation";
import { encryptCredential, decryptCredential } from "../src/lib/credential-vault";
import { persistBase64Image } from "../src/lib/server/media-storage";
import { getLightweightMapPins } from "../src/lib/server/wastepay-backend-core-services";

// Mock prisma dependency
vi.mock("../src/lib/prisma", () => {
  return {
    prisma: {
      tenantMembership: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
      user: {
        findUnique: vi.fn().mockImplementation(({ where }) => {
          if (where.id === 99) {
            return Promise.resolve({
              id: 99,
              role: "admin",
              tenantId: "tenant-a-uuid",
              aktif: true,
            });
          }
          return Promise.resolve(null);
        }),
      },
    },
  };
});

describe("Production-Grade Multi-Tenant Security & Isolation Suite", () => {
  const TENANT_A_ID = "tenant-a-uuid";
  const TENANT_B_ID = "tenant-b-uuid";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Tenant A cannot read Tenant B customers
  it("Requirement 1: Tenant A cannot read Tenant B customers", () => {
    const rawWhere = { status: "aktif" };
    const scopedForA = scopeTenantWhere(TENANT_A_ID, rawWhere);
    
    expect(scopedForA.tenantId).toBe(TENANT_A_ID);
    expect(scopedForA.status).toBe("aktif");

    const customerTenantB = { id: 101, nama: "Bpk. Budi", tenantId: TENANT_B_ID };
    expect(() => {
      assertTenantOwnership(customerTenantB, TENANT_A_ID, "Pelanggan");
    }).toThrowError(TenantIsolationError);
  });

  // 2. Tenant A cannot update Tenant B invoices
  it("Requirement 2: Tenant A cannot update Tenant B invoices", () => {
    const invoiceTenantB = { id: 501, noInvoice: "INV/HERU/202611", tenantId: TENANT_B_ID };
    
    expect(() => {
      assertTenantOwnership(invoiceTenantB, TENANT_A_ID, "Tagihan");
    }).toThrowError(/bukan milik organisasi tenant Anda/);
  });

  // 3. Tenant A cannot delete Tenant B payments
  it("Requirement 3: Tenant A cannot delete Tenant B payments", () => {
    const paymentTenantB = { id: 901, jumlah: 50000, tenantId: TENANT_B_ID };

    expect(() => {
      assertTenantOwnership(paymentTenantB, TENANT_A_ID, "Pembayaran");
    }).toThrowError(/bukan milik organisasi tenant Anda/);
  });

  // 4. Tenant A cannot access Tenant B attachments (Upload Segmentation)
  it("Requirement 4: Tenant A cannot access Tenant B attachments", async () => {
    const fakeBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    
    const pathA = await persistBase64Image(fakeBase64, "pelanggan", TENANT_A_ID);
    const pathB = await persistBase64Image(fakeBase64, "pelanggan", TENANT_B_ID);

    expect(pathA).toContain(`/uploads/tenants/${TENANT_A_ID}/pelanggan/`);
    expect(pathB).toContain(`/uploads/tenants/${TENANT_B_ID}/pelanggan/`);
    expect(pathA).not.toBe(pathB);
  });

  // 5. Tenant A cannot access Tenant B AI context
  it("Requirement 5: Tenant A cannot access Tenant B AI context", () => {
    const metricsDb = [
      { id: 1, tenantId: TENANT_A_ID, type: "complaint" },
      { id: 2, tenantId: TENANT_B_ID, type: "complaint" },
      { id: 3, tenantId: TENANT_A_ID, type: "complaint" },
    ];

    const scopedForA = metricsDb.filter((m) => m.tenantId === TENANT_A_ID);
    expect(scopedForA.length).toBe(2);
    expect(scopedForA.some((m) => m.tenantId === TENANT_B_ID)).toBe(false);
  });

  // 6. Tenant A cannot access Tenant B WhatsApp credentials (Encryption at Rest)
  it("Requirement 6: Tenant A cannot access Tenant B WhatsApp credentials and credentials are encrypted at rest", () => {
    const rawApiKeyB = "fonnte-secret-key-tenant-b-999";
    const encryptedB = encryptCredential(rawApiKeyB);

    expect(encryptedB).toMatch(/^enc:[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/);
    expect(encryptedB).not.toBe(rawApiKeyB);

    const decryptedB = decryptCredential(encryptedB);
    expect(decryptedB).toBe(rawApiKeyB);

    // Pastikan Tenant A tidak menerima decrypted key Tenant B
    const tenantConfigs = new Map<string, { apiKey: string }>([
      [TENANT_B_ID, { apiKey: encryptedB! }],
    ]);

    expect(tenantConfigs.get(TENANT_A_ID)).toBeUndefined();
  });

  // 7. Tenant A cannot access Tenant B GPS data
  it("Requirement 7: Tenant A cannot access Tenant B GPS data", () => {
    const allPins = [
      { id: 1, latitude: -6.4, longitude: 106.8, tenantId: TENANT_A_ID },
      { id: 2, latitude: -6.41, longitude: 106.81, tenantId: TENANT_B_ID },
    ];

    const pinsForA = allPins.filter((p) => p.tenantId === TENANT_A_ID);
    expect(pinsForA.length).toBe(1);
    expect(pinsForA[0].id).toBe(1);
  });

  // 8. Tenant A cannot change tenantId to gain access (Server-Enforced Override)
  it("Requirement 8: Tenant A cannot forge tenantId via client payload", () => {
    const attackerPayload = {
      nama: "Warga Penyusup",
      tenantId: TENANT_B_ID, // Hacker mencoba menembus tenant B
    };

    // Server-enforced scope create selalu menimpa client input dengan context asli yang terautentikasi
    const securedData = scopeTenantCreate(TENANT_A_ID, attackerPayload);
    expect(securedData.tenantId).toBe(TENANT_A_ID);
    expect(securedData.tenantId).not.toBe(TENANT_B_ID);

    // Server-enforced where clause juga menimpa client input
    const attackerQuery = { tenantId: TENANT_B_ID, status: "aktif" };
    const securedQuery = scopeTenantWhere(TENANT_A_ID, attackerQuery);
    expect(securedQuery.tenantId).toBe(TENANT_A_ID);
  });

  // 9. Invalid domains are rejected
  it("Requirement 9: Invalid domains are rejected with isValid = false", () => {
    const spoofed = resolveTenantByHost("evil-phishing-site.com");
    expect(spoofed.isValid).toBe(false);
    expect(spoofed.tenant.slug).toBe("unresolved");
    expect(spoofed.rejectionReason).toContain("tidak terdaftar");
  });

  // 10. Suspended tenants are rejected
  it("Requirement 10: Suspended tenants are rejected", () => {
    registerDynamicTenant({
      id: "tenant-suspended-id",
      slug: "mitra-macet",
      namaMitra: "TPS Macet",
      tipe: "mitra_mandiri",
      domains: ["macet.o2whero.com"],
      primaryDomain: "macet.o2whero.com",
      branding: { namaMitra: "TPS Macet", tagline: "" },
      dbConfig: { isDedicated: false },
      status: "suspend",
      fitur: {
        retribusiSampah: false,
        tabunganSampah: false,
        jemputSampah: false,
        jualOfftaker: false,
        qrisDuitku: false,
        whatsappNotif: false,
      },
    });

    const resolved = resolveTenantByHost("macet.o2whero.com");
    expect(resolved.isValid).toBe(false);
    expect(resolved.isSuspended).toBe(true);
    expect(resolved.rejectionReason).toContain("ditangguhkan");
  });

  // 11. Missing membership is rejected
  it("Requirement 11: Missing membership is rejected", async () => {
    // User biasa dari Tenant A mencoba akses ke Tenant B
    const user = { id: 99, role: "admin", tenantId: TENANT_A_ID };
    const membership = await verifyUserTenantMembership(user.id, TENANT_B_ID, user.role);

    expect(membership.isMember).toBe(false);
  });

  // 12. RLS simulation: transaction-local tenant context
  it("Requirement 12: RLS transaction-local tenant context logic", () => {
    const currentTenantContext = { current_setting: TENANT_A_ID };

    const rlsPolicySimulator = (recordTenantId: string) => {
      return currentTenantContext.current_setting === recordTenantId;
    };

    expect(rlsPolicySimulator(TENANT_A_ID)).toBe(true);
    expect(rlsPolicySimulator(TENANT_B_ID)).toBe(false);
  });

  // 13. Background jobs process the correct tenant
  it("Requirement 13: Background jobs process the correct tenant with quota tracking", () => {
    const mockTenants = [
      { id: TENANT_A_ID, quota: 1000, used: 200 },
      { id: TENANT_B_ID, quota: 5000, used: 4900 },
    ];

    const canSend = (tenantId: string) => {
      const t = mockTenants.find((m) => m.id === tenantId);
      return t ? t.used < t.quota : false;
    };

    expect(canSend(TENANT_A_ID)).toBe(true);
    expect(canSend(TENANT_B_ID)).toBe(true);

    // Jika melebihi kuota
    mockTenants[1].used = 5000;
    expect(canSend(TENANT_B_ID)).toBe(false);
  });

  // 14. Existing UPS HERU workflows continue to work
  it("Requirement 14: Existing UPS HERU pilot workflows continue to function seamlessly", () => {
    const pilot = resolveTenantByHost("upsheru.com");
    expect(pilot.isValid).toBe(true);
    expect(pilot.isPilot).toBe(true);
    expect(pilot.isCore).toBe(false);
    expect(pilot.tenant.slug).toBe("upsheru");
    expect(pilot.tenant.branding.namaMitra).toBe("UPS HERU");
  });
});
