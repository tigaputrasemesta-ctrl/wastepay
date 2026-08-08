/**
 * Baca halaman Duitku via CDP (Chrome yang sedang berjalan, port 9222).
 * Dump judul/URL/teks halaman + nilai input untuk diekstrak manual oleh AI.
 * Jalankan: node scripts/duitku-read.mjs [url]
 */
import { pathToFileURL } from "url";
import path from "path";
import os from "os";
import fs from "fs";

const localPw = path.resolve("node_modules/playwright/index.mjs");
let pw;
if (fs.existsSync(localPw)) {
  pw = await import(pathToFileURL(localPw).href);
} else {
  const npxDir = path.join(os.homedir(), "AppData/Local/npm-cache/_npx");
  const candidates = fs
    .readdirSync(npxDir)
    .map((d) => path.join(npxDir, d, "node_modules/playwright/index.mjs"))
    .filter(fs.existsSync);
  pw = await import(pathToFileURL(candidates[0]).href);
}
const { chromium: c } = pw;

const url = process.argv[2] || "https://sandbox.duitku.com/merchant/Project";

let browser;
try {
  browser = await c.connectOverCDP("http://127.0.0.1:9222");
} catch (e) {
  console.log("GAGAL CONNECT:", e.message);
  process.exit(1);
}

const contexts = browser.contexts();
const pages = contexts.flatMap((ctx) => ctx.pages());
let page = pages.find((p) => p.url().includes("duitku")) || pages[0];

if (!page) {
  page = await browser.newPage();
}

try {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(5000);
  console.log("TITLE:", await page.title());
  console.log("URL:", page.url());
  console.log("---- TEKS HALAMAN (4000 char pertama) ----");
  const text = await page.evaluate(() => document.body ? document.body.innerText : "");
  console.log(text.slice(0, 4000));
} catch (e) {
  console.log("NAV ERR:", e.message);
  console.log("URL saat ini:", page.url());
  console.log("TITLE:", await page.title().catch(() => "?"));
}

await browser.close().catch(() => {});
