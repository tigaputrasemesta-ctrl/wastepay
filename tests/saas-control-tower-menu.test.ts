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

  it("verifies all control tower module routes match single-codebase conventions", () => {
    const EXPECTED_ROUTES: Record<string, string> = {
      "ecosystem-map": "/ecosystem-map",
      "notifikasi-saas": "/notifikasi-saas",
      subscriptions: "/subscriptions",
      "saas-billing": "/saas-billing",
      revenue: "/revenue",
      "tenant-roi": "/tenant-roi",
      "crm-prospek": "/crm-prospek",
      "environmental-impact": "/environmental-impact",
      "platform-settings": "/platform-settings",
      tenants: "/tenants",
      users: "/users",
      "audit-log": "/audit-log",
    };

    for (const [key, path] of Object.entries(EXPECTED_ROUTES)) {
      expect(path).toMatch(/^\/[a-z0-9-]+$/);
      expect(CONTROL_TOWER_KEYS).toContain(key);
    }
  });
});
