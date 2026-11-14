import { describe, expect, it } from "vitest";
import { resolveTenantByHost } from "../src/lib/tenant/config";

describe("Tenant Domain Isolation & Misdirection Guard", () => {
  it("resolves o2whero.com and aliases as Core SaaS Hub", () => {
    const o2w = resolveTenantByHost("o2whero.com");
    expect(o2w.isCore).toBe(true);
    expect(o2w.isPilot).toBe(false);
    expect(o2w.isValid).toBe(true);
    expect(o2w.tenant.slug).toBe("o2w-core");

    const wwwO2w = resolveTenantByHost("www.o2whero.com");
    expect(wwwO2w.isCore).toBe(true);
    expect(wwwO2w.isValid).toBe(true);
  });

  it("resolves upsheru.com and aliases as Pilot Tenant Depok", () => {
    const pilot = resolveTenantByHost("upsheru.com");
    expect(pilot.isCore).toBe(false);
    expect(pilot.isPilot).toBe(true);
    expect(pilot.isValid).toBe(true);
    expect(pilot.tenant.slug).toBe("upsheru");

    const wwwPilot = resolveTenantByHost("www.upsheru.com");
    expect(wwwPilot.isPilot).toBe(true);
    expect(wwwPilot.isValid).toBe(true);
  });

  it("marks untrusted / unknown domains with isValid = false (triggers HTTP 421 Misdirected Request)", () => {
    const attacker = resolveTenantByHost("attacker.com");
    expect(attacker.isValid).toBe(false);
    expect(attacker.isCore).toBe(false);
    expect(attacker.isPilot).toBe(false);

    const spoof = resolveTenantByHost("fakeo2whero.com.attacker.com");
    expect(spoof.isValid).toBe(false);

    const phishing = resolveTenantByHost("phishing-upsheru.com");
    expect(phishing.isValid).toBe(false);
  });

  it("permits official domains with isValid = true", () => {
    expect(resolveTenantByHost("o2whero.com").isValid).toBe(true);
    expect(resolveTenantByHost("upsheru.com").isValid).toBe(true);
    expect(resolveTenantByHost("localhost:3000").isValid).toBe(true);
  });
});
