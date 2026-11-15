import { describe, expect, it } from "vitest";
import { getAllowedMenus } from "../src/lib/rbac";

describe("SaaS Control Tower Menu & Module RBAC", () => {
  const CONTROL_TOWER_KEYS = [
    "ecosystem-map",
    "notifikasi-saas",
    "subscriptions",
    "saas-billing",
    "revenue",
    "tenant-roi",
    "crm-prospek",
    "environmental-impact",
    "platform-settings",
    "tenants",
    "users",
    "audit-log",
  ];

  it("grants superadmin access to all SaaS Control Tower modules", () => {
    const superadminMenus = getAllowedMenus("superadmin");
    for (const key of CONTROL_TOWER_KEYS) {
      expect(superadminMenus).toContain(key);
    }
  });

  it("protects SaaS Control Tower modules from non-superadmin roles", () => {
    const adminMenus = getAllowedMenus("admin");
    const kasirMenus = getAllowedMenus("kasir");
    const petugasMenus = getAllowedMenus("petugas");

    for (const key of CONTROL_TOWER_KEYS) {
      expect(adminMenus).not.toContain(key);
      expect(kasirMenus).not.toContain(key);
      expect(petugasMenus).not.toContain(key);
    }
  });
});
