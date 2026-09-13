import { describe, it, expect } from "vitest";
import { extractCustomerCode } from "@/components/mobile/QrScannerModal";

describe("extractCustomerCode", () => {
  it("extracts clean code from plain string", () => {
    expect(extractCustomerCode("0101-0001")).toBe("0101-0001");
    expect(extractCustomerCode("UPS-123")).toBe("UPS-123");
  });

  it("extracts customer code from invoice URL", () => {
    const url = "https://o2whero.com/invoice-tagihan?invoice=INV/0101-0001/202609";
    expect(extractCustomerCode(url)).toBe("0101-0001");
  });

  it("extracts customer code from encoded invoice URL", () => {
    const url = "https://o2whero.com/invoice-tagihan?invoice=INV%2F0101-0002%2F202609";
    expect(extractCustomerCode(url)).toBe("0101-0002");
  });

  it("extracts customer code from query param p or kode", () => {
    expect(extractCustomerCode("https://o2whero.com/pelanggan?kode=0101-0003")).toBe("0101-0003");
    expect(extractCustomerCode("https://o2whero.com/bayar?p=0101-0004")).toBe("0101-0004");
  });

  it("extracts customer code from raw invoice string INV/{kode}/{period}", () => {
    expect(extractCustomerCode("INV/0101-0005/202609")).toBe("0101-0005");
  });

  it("handles whitespace or empty strings gracefully", () => {
    expect(extractCustomerCode("  0101-0006  ")).toBe("0101-0006");
    expect(extractCustomerCode("")).toBe("");
  });
});
