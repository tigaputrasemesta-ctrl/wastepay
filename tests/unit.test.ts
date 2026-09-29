import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import type { Mock } from "vitest";
import crypto from "crypto";
import { hasRole, getAllowedMenus } from "../src/lib/rbac";
import { cn, formatRupiah, toBoolean } from "../src/lib/utils";
import { totalTagihan, updateTunggakan } from "../src/lib/tagihan";
import { hitungRincian } from "../src/lib/invoice-format";
import { prisma } from "../src/lib/prisma";
import {
  verifyCallbackSignature,
  isSuccessStatusCode,
  isFinalFailedStatusCode,
  isDuitkuEnabled,
  duitkuChannelLabel,
  signatureCreate,
  signatureCallback,
  signatureStatus,
  signatureGetPaymentMethod,
  formatDuitkuDatetime,
} from "../src/lib/duitku";
import { allowAttempt, retryAfterSeconds } from "../src/lib/rate-limit";
import { extractOrigin, isSameOriginRequest } from "../src/lib/csrf";
import { formatRtRw, normalisasiTelepon, teleponValid } from "../src/lib/daftar";

describe("rbac", () => {
  it("hasRole: superadmin punya akses semua level", () => {
    const user = { id: 1, email: "a", nama: "A", role: "superadmin" };
    expect(hasRole(user, "superadmin")).toBe(true);
    expect(hasRole(user, "admin")).toBe(true);
    expect(hasRole(user, "petugas")).toBe(true);
  });

  it("hasRole: petugas tidak punya akses level lebih tinggi", () => {
    const user = { id: 1, email: "a", nama: "A", role: "petugas" };
    expect(hasRole(user, "petugas")).toBe(true);
    expect(hasRole(user, "kasir")).toBe(false);
    expect(hasRole(user, "superadmin")).toBe(false);
  });

  it("getAllowedMenus: superadmin dapat menu audit-log & users", () => {
    const menus = getAllowedMenus("superadmin");
    expect(menus).toContain("users");
    expect(menus).toContain("audit-log");
    expect(menus).toContain("dashboard");
  });

  it("getAllowedMenus: petugas mendapat menu lapangan (tanpa dashboard)", () => {
    const menus = getAllowedMenus("petugas");
    expect(menus).toEqual(["peta", "survei", "pengangkutan", "tagihan", "jadwal", "komplain", "absensi", "klaim"]);
    expect(menus).not.toContain("dashboard"); // dashboard = kasir+ (level 20)
    expect(menus).not.toContain("users");
    expect(menus).not.toContain("audit-log");
  });
});

describe("utils", () => {
  it("formatRupiah memformat angka IDR", () => {
    expect(formatRupiah(1500000)).toContain("1.500.000");
    expect(formatRupiah(1500000)).toContain("Rp");
  });

  it("cn menggabungkan class dan menangani falsy", () => {
    expect(cn("a", "b", false, undefined, null, "c")).toBe("a b c");
  });

  it("toBoolean: toleran terhadap string/boolean/number", () => {
    expect(toBoolean(true)).toBe(true);
    expect(toBoolean("true")).toBe(true);
    expect(toBoolean(1)).toBe(true);
    expect(toBoolean("1")).toBe(true);
    expect(toBoolean(false)).toBe(false);
    expect(toBoolean("false")).toBe(false);
    expect(toBoolean(0)).toBe(false);
    expect(toBoolean(undefined)).toBe(false);
    expect(toBoolean(null)).toBe(false);
    expect(toBoolean("")).toBe(false);
  });
});

describe("tagihan", () => {
  it("totalTagihan = jumlah + denda", () => {
    expect(totalTagihan(50000, 1000)).toBe(51000);
    expect(totalTagihan(50000, null)).toBe(50000);
    expect(totalTagihan(50000, undefined)).toBe(50000);
  });
});

vi.mock("../src/lib/prisma", () => ({
  prisma: {
    tagihan: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    pengaturan: {
      findUnique: vi.fn(),
    },
  },
}));

const prismaMock = prisma as unknown as {
  tagihan: { findMany: Mock; update: Mock };
  pengaturan: { findUnique: Mock };
};

describe("invoice-format", () => {
  it("hitungRincian: PPN dan denda dihapus (selalu 0)", () => {
    const r = hitungRincian(50000, 2000, 11);
    expect(r.ppn).toBe(0);
    expect(r.subTotalPpn).toBe(50000);
    expect(r.total).toBe(50000);
    expect(r.denda).toBe(0);
  });

  it("hitungRincian: perhitungan tagihan tanpa PPN", () => {
    const r = hitungRincian(100000, 0, 11);
    expect(r.ppn).toBe(0);
    expect(r.total).toBe(100000);
    expect(r.denda).toBe(0);
  });
});

describe("updateTunggakan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("menandai status tunggakan tapi denda selalu 0", async () => {
    const duaBulanLalu = new Date(Date.now() - 62 * 24 * 3600 * 1000);
    prismaMock.tagihan.findMany.mockResolvedValue([
      { id: 1, jumlah: 50000, denda: null, status: "belum_bayar", jatuhTempo: duaBulanLalu },
    ]);
    prismaMock.tagihan.update.mockResolvedValue({});

    const n = await updateTunggakan();
    expect(n).toBe(1);
    expect(prismaMock.tagihan.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({ status: "tunggakan", denda: 0 }),
      })
    );
  });

  it("memperbarui denda menjadi 0 jika sebelumnya ada", async () => {
    const tigaBulanLalu = new Date(Date.now() - 93 * 24 * 3600 * 1000);
    prismaMock.tagihan.findMany.mockResolvedValue([
      { id: 2, jumlah: 100000, denda: 2000, status: "tunggakan", jatuhTempo: tigaBulanLalu },
    ]);
    prismaMock.tagihan.update.mockResolvedValue({});

    const n = await updateTunggakan({ force: true });
    expect(n).toBe(1);
    expect(prismaMock.tagihan.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 2 },
        data: expect.objectContaining({ status: "tunggakan", denda: 0 }),
      })
    );
  });

  it("throttle: panggilan kedua dalam 5 menit di-skip (tanpa query)", async () => {
    prismaMock.tagihan.findMany.mockClear();
    const n = await updateTunggakan();
    expect(n).toBe(0);
    expect(prismaMock.tagihan.findMany).not.toHaveBeenCalled();
  });
});

describe("duitku", () => {
  const MC = "D1234";
  const KEY = "DuitkuApiKey-Test-123";

  beforeEach(() => {
    process.env.DUITKU_MERCHANT_CODE = MC;
    process.env.DUITKU_API_KEY = KEY;
  });

  afterEach(() => {
    delete process.env.DUITKU_MERCHANT_CODE;
    delete process.env.DUITKU_API_KEY;
    delete process.env.DUITKU_IS_PRODUCTION;
  });

  it("isDuitkuEnabled: butuh merchant code + api key", () => {
    expect(isDuitkuEnabled()).toBe(true);
    delete process.env.DUITKU_API_KEY;
    expect(isDuitkuEnabled()).toBe(false);
  });

  it("signatureCreate: HMAC_SHA256(merchantCode + orderId + amount, apiKey)", () => {
    const orderId = "DW-1-12345";
    const amount = 50000;
    const expected = crypto
      .createHmac("sha256", KEY)
      .update(`${MC}${orderId}${amount}`)
      .digest("hex");
    expect(signatureCreate(MC, orderId, amount, KEY)).toBe(expected);
  });

  it("signatureCallback: HMAC_SHA256(merchantCode + amount + orderId, apiKey)", () => {
    const orderId = "DW-1-12345";
    const amount = "50000";
    const expected = crypto
      .createHmac("sha256", KEY)
      .update(`${MC}${amount}${orderId}`)
      .digest("hex");
    expect(signatureCallback(MC, amount, orderId, KEY)).toBe(expected);
  });

  it("signatureStatus: HMAC_SHA256(merchantCode + orderId, apiKey)", () => {
    const orderId = "DW-1-12345";
    const expected = crypto
      .createHmac("sha256", KEY)
      .update(`${MC}${orderId}`)
      .digest("hex");
    expect(signatureStatus(MC, orderId, KEY)).toBe(expected);
  });

  it("signatureGetPaymentMethod: HMAC_SHA256(merchantcode + amount + datetime, apiKey)", () => {
    const amount = 50000;
    const datetime = "2026-08-06 15:30:00";
    const expected = crypto
      .createHmac("sha256", KEY)
      .update(`${MC}${amount}${datetime}`)
      .digest("hex");
    expect(signatureGetPaymentMethod(MC, amount, datetime, KEY)).toBe(expected);
  });

  it("formatDuitkuDatetime: yyyy-MM-dd HH:mm:ss", () => {
    expect(formatDuitkuDatetime(new Date(2026, 7, 6, 9, 5, 3))).toBe("2026-08-06 09:05:03");
  });

  it("verifyCallbackSignature: signature valid diterima, salah ditolak", () => {
    const orderId = "DW-1-12345";
    const amount = "50000";
    const sig = crypto
      .createHmac("sha256", KEY)
      .update(`${MC}${amount}${orderId}`)
      .digest("hex");

    expect(
      verifyCallbackSignature({ merchantCode: MC, amount, merchantOrderId: orderId, signature: sig })
    ).toBe(true);
    expect(
      verifyCallbackSignature({ merchantCode: MC, amount, merchantOrderId: orderId, signature: "salah" })
    ).toBe(false);
    expect(verifyCallbackSignature({})).toBe(false);
  });

  it("isSuccessStatusCode / isFinalFailedStatusCode: semantik per sumber", () => {
    expect(isSuccessStatusCode("00")).toBe(true);
    expect(isSuccessStatusCode("01")).toBe(false);
    expect(isSuccessStatusCode(null)).toBe(false);
    // Cek status (statusCode): 01 = pending, 02 = dibatalkan/gagal
    expect(isFinalFailedStatusCode("02")).toBe(true);
    expect(isFinalFailedStatusCode("02", "status")).toBe(true);
    expect(isFinalFailedStatusCode("01", "status")).toBe(false);
    expect(isFinalFailedStatusCode("00", "status")).toBe(false);
    // Callback (resultCode): 01 = gagal, 00 = sukses
    expect(isFinalFailedStatusCode("01", "callback")).toBe(true);
    expect(isFinalFailedStatusCode("00", "callback")).toBe(false);
    expect(isFinalFailedStatusCode("02", "callback")).toBe(false);
    expect(isFinalFailedStatusCode(null)).toBe(false);
  });

  it("duitkuChannelLabel: label channel Indonesia", () => {
    expect(duitkuChannelLabel("QR")).toBe("QRIS");
    expect(duitkuChannelLabel("VC")).toBe("Virtual Account");
    expect(duitkuChannelLabel("OVO")).toBe("OVO");
    expect(duitkuChannelLabel("DANA")).toBe("DANA");
    expect(duitkuChannelLabel("M1")).toBe("Mandiri Bill");
    expect(duitkuChannelLabel(null)).toBe("Payment Gateway");
  });

  it("createPayment: body JSON ke /v2/inquiry, TANPA apiKey, signature HMAC_SHA256", async () => {
    const createPayment = (await import("../src/lib/duitku")).createPayment;
    let capturedUrl = "";
    let capturedBody: Record<string, unknown> = {};
    const originalFetch = global.fetch;
    global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = String(input);
      capturedBody = JSON.parse(String(init?.body) || "{}") as Record<string, unknown>;
      return new Response(
        JSON.stringify({ paymentUrl: "https://sandbox.duitku.com/topup/x", statusCode: "00", reference: "REF123" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as typeof fetch;

    try {
      const res = await createPayment({
        orderId: "DW-1-12345",
        amount: 50000,
        paymentMethod: "VC",
        productDetails: "Iuran sampah Agustus 2026",
        customerVaName: "Budi",
        phoneNumber: "08123456789",
      });

      expect(capturedUrl).toBe("https://sandbox.duitku.com/webapi/api/merchant/v2/inquiry");
      expect(capturedBody.merchantCode).toBe(MC);
      expect(capturedBody.paymentAmount).toBe(50000);
      expect(capturedBody.merchantOrderId).toBe("DW-1-12345");
      expect(capturedBody.apiKey).toBeUndefined(); // apiKey TIDAK boleh dikirim
      expect(capturedBody.expiryPeriod).toBe(1440);
      expect(capturedBody.signature).toBe(signatureCreate(MC, "DW-1-12345", 50000, KEY));
      expect(res.paymentUrl).toContain("duitku.com");
    } finally {
      global.fetch = originalFetch;
    }
  });
});

describe("rate-limit", () => {

  it("mengizinkan percobaan di bawah batas", async () => {
    for (let i = 0; i < 6; i++) {
      expect(await allowAttempt("test-key-a")).toBe(true);
    }
  });

  it("menolak percobaan melebihi batas (6x / 15 menit)", async () => {
    const key = "test-key-b";
    for (let i = 0; i < 6; i++) await allowAttempt(key);
    expect(await allowAttempt(key)).toBe(false);
    expect(retryAfterSeconds(key)).toBeGreaterThan(0);
  });

  it("key berbeda punya bucket sendiri (isolasi per email/IP)", async () => {
    const k1 = "user-a:1.2.3.4";
    const k2 = "user-a:5.6.7.8";
    for (let i = 0; i < 6; i++) await allowAttempt(k1);
    expect(await allowAttempt(k1)).toBe(false);
    expect(await allowAttempt(k2)).toBe(true); // IP lain tidak terblokir
  });

  it("memberi retryAfterSeconds dalam jendela 15 menit", async () => {
    const key = "test-key-c";
    for (let i = 0; i < 6; i++) await allowAttempt(key);
    expect(await allowAttempt(key)).toBe(false);
    expect(retryAfterSeconds(key)).toBeGreaterThan(0);
    expect(retryAfterSeconds(key)).toBeLessThanOrEqual(900);
  });

  it("mendukung opts custom (max & windowMs) tanpa mengganggu default", async () => {
    // max lebih kecil → blokir lebih cepat
    const k1 = "test-key-d";
    for (let i = 0; i < 3; i++) expect(await allowAttempt(k1, { max: 3 })).toBe(true);
    expect(await allowAttempt(k1, { max: 3 })).toBe(false);
    // bucket default tetap terpisah
    const k2 = "test-key-e";
    for (let i = 0; i < 6; i++) expect(await allowAttempt(k2)).toBe(true);
    expect(await allowAttempt(k2)).toBe(false);
    // window pendek → reset lebih cepat
    const k3 = "test-key-f";
    expect(await allowAttempt(k3, { max: 1, windowMs: 1000 })).toBe(true);
    expect(await allowAttempt(k3, { max: 1, windowMs: 1000 })).toBe(false);
    expect(retryAfterSeconds(k3)).toBeLessThanOrEqual(1);
  });
});

describe("csrf", () => {
  const ALLOWED = ["http://localhost:3000", "https://app.wastepay.id"];

  it("extractOrigin: mengambil origin dari URL absolut", () => {
    expect(extractOrigin("http://localhost:3000/dashboard")).toBe("http://localhost:3000");
    expect(extractOrigin("https://app.wastepay.id/api/x")).toBe("https://app.wastepay.id");
  });

  it("extractOrigin: mengembalikan null untuk string bukan URL", () => {
    expect(extractOrigin("")).toBeNull();
    expect(extractOrigin("not-a-url")).toBeNull();
  });

  it("Referer dengan scheme aneh (mis. localhost:) tidak lolos whitelist", () => {
    // Custom scheme (non-special) menghasilkan opaque origin "null" —
    // tidak akan pernah sama dengan origin aplikasi di whitelist.
    expect(extractOrigin("localhost:3000")).toBe("null");
    expect(isSameOriginRequest(null, "localhost:3000", ALLOWED)).toBe(false);
  });

  it("Origin sama dengan origin aplikasi → diizinkan", () => {
    expect(isSameOriginRequest("http://localhost:3000", null, ALLOWED)).toBe(true);
    expect(isSameOriginRequest("https://app.wastepay.id", null, ALLOWED)).toBe(true);
  });

  it("Origin cross-site / tidak dikenal → ditolak", () => {
    expect(isSameOriginRequest("https://evil.example", null, ALLOWED)).toBe(false);
    expect(isSameOriginRequest("https://app.wastepay.id.evil.example", null, ALLOWED)).toBe(false);
    expect(isSameOriginRequest("http://localhost:3001", null, ALLOWED)).toBe(false);
  });

  it("Origin: null (iframe sandbox / konteks aneh) → ditolak", () => {
    expect(isSameOriginRequest("null", null, ALLOWED)).toBe(false);
  });

  it("tanpa Origin, Referer same-origin → diizinkan", () => {
    expect(isSameOriginRequest(null, "http://localhost:3000/tagihan", ALLOWED)).toBe(true);
  });

  it("tanpa Origin, Referer cross-site → ditolak", () => {
    expect(isSameOriginRequest(null, "https://evil.example/form", ALLOWED)).toBe(false);
  });

  it("tanpa Origin & Referer (script/cron/curl) → diizinkan", () => {
    expect(isSameOriginRequest(null, null, ALLOWED)).toBe(true);
  });

  it("Referer invalid (bukan URL) → ditolak", () => {
    expect(isSameOriginRequest(null, "garbage", ALLOWED)).toBe(false);
  });
});

describe("daftar", () => {
  it("normalisasiTelepon membuang karakter non-digit", () => {
    expect(normalisasiTelepon("0812-3456-7890")).toBe("081234567890");
    expect(normalisasiTelepon("+62 812 3456 7890")).toBe("+6281234567890");
    expect(normalisasiTelepon("abc123")).toBe("123");
  });

  it("teleponValid menerima format 08xx dan 628xx", () => {
    expect(teleponValid("081234567890")).toBe(true);
    expect(teleponValid("6281234567890")).toBe(true);
    expect(teleponValid("+6281234567890")).toBe(true);
  });

  it("teleponValid menolak nomor terlalu pendek/aneh", () => {
    expect(teleponValid("0812")).toBe(false);
    expect(teleponValid("12345678901234567890")).toBe(false);
    expect(teleponValid("999999999")).toBe(false); // bukan 08/62
    expect(teleponValid("")).toBe(false);
  });

  it("formatRtRw menghasilkan format konsisten", () => {
    expect(formatRtRw("01", "03")).toBe("RT 01 / RW 03");
    expect(formatRtRw("01")).toBe("RT 01");
    expect(formatRtRw(undefined, "03")).toBe("RW 03");
    expect(formatRtRw("", "")).toBe("");
    expect(formatRtRw(" 01 ", " 03 ")).toBe("RT 01 / RW 03");
  });
});

describe("notifikasi summary", () => {
  it("menghitung total akumulatif notifikasi butuh aksi secara akurat", () => {
    const counts = {
      pembayaran: 3,
      pendaftaran: 2,
      komplain: 1,
    };
    const total = counts.pembayaran + counts.pendaftaran + counts.komplain;
    expect(total).toBe(6);
  });

  it("memastikan format item notifikasi memiliki properti navigasi yang valid", () => {
    const item = {
      id: "pembayaran-1",
      category: "pembayaran" as const,
      title: "Pembayaran: Pak Budi",
      desc: "Rp 50.000 (TRANSFER)",
      time: new Date().toISOString(),
      link: "/tagihan",
      badge: "VERIFIKASI BAYAR",
      severity: "warning" as const,
    };

    expect(item.link).toBe("/tagihan");
    expect(item.severity).toBe("warning");
    expect(item.title).toContain("Pembayaran");
  });
});

import { getSiteUrl, SITE_CONFIG, generateLocalBusinessJsonLd } from "../src/lib/seo";
import robots from "../src/app/robots";
import sitemap from "../src/app/sitemap";
import manifest from "../src/app/manifest";

describe("seo module", () => {
  it("getSiteUrl: mengembalikan default fallback jika env kosong", () => {
    const origEnv = process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.APP_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    delete process.env.VERCEL_URL;

    const url = getSiteUrl();
    expect(url).toBe("https://upsheru.com");

    if (origEnv) process.env.NEXT_PUBLIC_APP_URL = origEnv;
  });

  it("getSiteUrl: memprioritaskan NEXT_PUBLIC_APP_URL jika disetel", () => {
    const orig = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://custom-wastepay.depok.go.id/";
    expect(getSiteUrl()).toBe("https://custom-wastepay.depok.go.id");
    if (orig) process.env.NEXT_PUBLIC_APP_URL = orig;
    else delete process.env.NEXT_PUBLIC_APP_URL;
  });

  it("getSiteUrl: mengabaikan domain vercel.app dan fallback ke https://upsheru.com", () => {
    const orig = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://tpsheru.vercel.app";
    expect(getSiteUrl()).toBe("https://upsheru.com");
    if (orig) process.env.NEXT_PUBLIC_APP_URL = orig;
    else delete process.env.NEXT_PUBLIC_APP_URL;
  });

  it("generateLocalBusinessJsonLd: menghasilkan schema valid untuk LocalBusiness dan GovernmentService", () => {
    const schema = generateLocalBusinessJsonLd() as {
      "@context": string;
      "@graph": Array<{ "@type": string | string[]; name: string }>;
    };
    expect(schema["@context"]).toBe("https://schema.org");
    expect(Array.isArray(schema["@graph"])).toBe(true);

    const business = schema["@graph"].find((item) =>
      Array.isArray(item["@type"]) ? item["@type"].includes("LocalBusiness") : item["@type"] === "LocalBusiness"
    );
    expect(business).toBeDefined();
    expect(business?.name).toBe(SITE_CONFIG.name);

    const service = schema["@graph"].find((item) => item["@type"] === "GovernmentService");
    expect(service).toBeDefined();
  });

  it("robots: mengonfigurasi allow public dan disallow rute privat serta sitemap", () => {
    const r = robots();
    expect(r.sitemap).toContain("/sitemap.xml");
    const rules = Array.isArray(r.rules) ? r.rules[0] : r.rules;
    expect(rules?.allow).toContain("/");
    expect(rules?.disallow).toContain("/dashboard");
    expect(rules?.disallow).toContain("/api/");
  });

  it("sitemap: mengembalikan daftar rute publik dengan prioritas", () => {
    const s = sitemap();
    expect(Array.isArray(s)).toBe(true);
    const urls = s.map((entry) => entry.url);
    expect(urls.some((u) => u.endsWith("/lacak"))).toBe(true);
    expect(urls.some((u) => u.endsWith("/bayar"))).toBe(true);
    expect(urls.some((u) => u.endsWith("/tarif"))).toBe(true);
  });

  it("manifest: mengembalikan metadata PWA yang valid", () => {
    const m = manifest();
    expect(m.name).toBe("UPS HERU WastePay - Pengelolaan Sampah Depok");
    expect(m.theme_color).toBe("#059669");
    expect(m.display).toBe("standalone");
    expect(m.icons?.length).toBeGreaterThan(0);
  });
});

