/**
 * Buka browser Chromium (Playwright) untuk login Duitku.
 * Sesi disimpan di user-data-dir sehingga login tetap tersimpan untuk pemakaian berikutnya.
 * Jalankan: node scripts/duitku-browser.mjs
 */
import { pathToFileURL } from "url";
import path from "path";
import os from "os";
import fs from "fs";

// Resolve playwright (dari npx cache bila tidak ada di node_modules lokal),
// pilih versi yang browser chromium-nya sudah terpasang.
const localPw = path.resolve("node_modules/playwright/index.mjs");
const msPlaywrightDir = path.join(os.homedir(), "AppData/Local/ms-playwright");
let pw;
if (fs.existsSync(localPw)) {
  pw = await import(pathToFileURL(localPw).href);
} else {
  const npxDir = path.join(os.homedir(), "AppData/Local/npm-cache/_npx");
  const candidates = fs
    .readdirSync(npxDir)
    .map((d) => path.join(npxDir, d, "node_modules/playwright/index.mjs"))
    .filter(fs.existsSync)
    .sort((a, b) => {
      // versi yang browser chromium-nya ada di ms-playwright diutamakan
      const rev = (p) => {
        try {
          const bj = JSON.parse(
            fs.readFileSync(path.join(path.dirname(path.dirname(p)), "playwright-core/browsers.json"), "utf8")
          );
          return bj.browsers.find((x) => x.name === "chromium")?.revision;
        } catch { return null; }
      };
      const ra = rev(a), rb = rev(b);
      const ha = ra && fs.existsSync(path.join(msPlaywrightDir, `chromium-${ra}`));
      const hb = rb && fs.existsSync(path.join(msPlaywrightDir, `chromium-${rb}`));
      return (hb ? 1 : 0) - (ha ? 1 : 0);
    });
  if (!candidates.length) throw new Error("playwright tidak ditemukan — jalankan: npm i -g playwright");
  pw = await import(pathToFileURL(candidates[0]).href);
}
const { chromium } = pw;

const userDataDir = path.join(os.homedir(), ".duitku-browser");

const url = process.argv[2] || "https://dashboard.duitku.com/Account/Login";

const browser = await chromium.launchPersistentContext(userDataDir, {
  channel: "chrome", // pakai Google Chrome asli (fingerprint lebih bersih vs Chromium bawaan)
  headless: false,
  viewport: { width: 1440, height: 900 },
});

const page = browser.pages()[0] || (await browser.newPage());
await page.goto(url, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(3000);
console.log(`Browser terbuka: ${url}`);
console.log(`Judul halaman: ${await page.title()}`);
console.log(`URL akhir: ${page.url()}`);
console.log("Login di jendela browser, lalu tutup jendela saat selesai.");

browser.on("close", () => {
  console.log("Browser ditutup.");
  process.exit(0);
});
process.on("SIGINT", () => process.exit(0));
