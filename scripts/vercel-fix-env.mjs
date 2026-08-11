#!/usr/bin/env node
/**
 * Perbaikan environment & domain Vercel untuk project wastepay.
 *
 * Pemakaian:
 *   set VERCEL_TOKEN=<access token valid>   (Windows: $env:VERCEL_TOKEN=...)
 *   node scripts/vercel-fix-env.mjs
 *
 * Yang dilakukan:
 *   1. Verifikasi token (GET /v2/user).
 *   2. Tulis/patch DATABASE_URL & DIRECT_URL (production + preview + development)
 *      dengan koneksi Supabase yang SUDAH TERVERIFIKASI bekerja.
 *   3. Tambah domain alias otwherozerowaste.vercel.app ke project.
 *   4. Re-deploy deployment production terbaru.
 *
 * Token valid dibuat di: Vercel Dashboard → Account/Team Settings → Tokens → Create.
 * (Token diawali karakter alfanumerik acak; token "_69gA..." yang diberikan
 *  sebelumnya ditolak API — invalidToken.)
 */
import "dotenv/config";

const TOKEN = process.env.VERCEL_TOKEN?.trim();
if (!TOKEN) {
  console.error("ERROR: set VERCEL_TOKEN dulu");
  process.exit(1);
}
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD?.trim();
if (!DB_PASSWORD) {
  console.error("ERROR: set SUPABASE_DB_PASSWORD dulu (password database Supabase)");
  process.exit(1);
}

const PROJECT_ID = "prj_sCvulhFpYfuCiRiweWkEJnn6h45T";
const TEAM_ID = "team_4PfeW3LNRUhWz6orh4NmhhdD";
const API = "https://api.vercel.com";

// ── Koneksi Supabase (password dibaca dari env SUPABASE_DB_PASSWORD) ──
const DB_HOST_POOLER = "aws-0-ap-southeast-1.pooler.supabase.com";
const DB_USER = "postgres.melqztzdrcsiiimrwhky";
const DB_NAME = "postgres";

const DATABASE_URL_VAL =
  `postgres://${DB_USER}:${encodeURIComponent(DB_PASSWORD)}@${DB_HOST_POOLER}:6543/${DB_NAME}?pgbouncer=true`;
const DIRECT_URL_VAL =
  `postgres://${DB_USER}:${encodeURIComponent(DB_PASSWORD)}@${DB_HOST_POOLER}:5432/${DB_NAME}`;

async function api(path, opts = {}) {
  const url = `${API}${path}${path.includes("?") ? "&" : "?"}teamId=${TEAM_ID}`;
  const res = await fetch(url, {
    ...opts,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

// 1. Verifikasi token (token project-scoped seperti vcp_ tidak punya /v2/user)
const me = await api(`/v9/projects/${PROJECT_ID}`);
if (me.status !== 200) {
  console.error("TOKEN INVALID:", JSON.stringify(me.data).slice(0, 200));
  process.exit(1);
}
console.log("Token OK — project:", me.data.name || me.data.id);

// 2. List env yang ada (cari key lama utk di-update)
const envRes = await api(`/v9/projects/${PROJECT_ID}/env`);
const existing = new Map(
  (envRes.data?.envs || []).map((e) => [e.key, e])
);
console.log("Env existing:", [...existing.keys()].join(", ") || "(kosong)");

async function setEnv(key, value) {
  const old = existing.get(key);
  const targets = key === "DATABASE_URL" || key === "DIRECT_URL"
    ? ["production", "preview", "development"]
    : ["production"];
  if (old) {
    const up = await api(`/v10/projects/${PROJECT_ID}/env/${old.id}`, {
      method: "PATCH",
      body: JSON.stringify({ value, target: targets, type: "sensitive" }),
    });
    console.log(`PATCH ${key}:`, up.status, up.data?.key || JSON.stringify(up.data).slice(0, 120));
  } else {
    const cr = await api(`/v10/projects/${PROJECT_ID}/env`, {
      method: "POST",
      body: JSON.stringify({ key, value, target: targets, type: "sensitive" }),
    });
    console.log(`CREATE ${key}:`, cr.status, cr.data?.key || JSON.stringify(cr.data).slice(0, 120));
  }
}

await setEnv("DATABASE_URL", DATABASE_URL_VAL);
await setEnv("DIRECT_URL", DIRECT_URL_VAL);

// Juga pastikan key pendukung tersedia (skip bila sudah ada)
const needed = {
  DATABASE_SSL_REJECT_UNAUTHORIZED: "false",
  WA_API_KEY: process.env.WA_API_KEY,
  JWT_SECRET: process.env.JWT_SECRET,
  DUITKU_MERCHANT_CODE: process.env.DUITKU_MERCHANT_CODE,
  DUITKU_API_KEY: process.env.DUITKU_API_KEY,
  DUITKU_IS_PRODUCTION: process.env.DUITKU_IS_PRODUCTION,
  NEXT_PUBLIC_APP_URL: "https://otwherozerowaste.vercel.app",
  DATABASE_SSL_REJECT_UNAUTHORIZED: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED || "false",
  COMPANY_NAME: process.env.COMPANY_NAME,
  COMPANY_ADDRESS: process.env.COMPANY_ADDRESS,
  COMPANY_WHATSAPP: process.env.COMPANY_WHATSAPP,
  COMPANY_EMAIL: process.env.COMPANY_EMAIL,
  COMPANY_TAGLINE: process.env.COMPANY_TAGLINE,
  WA_API_KEY: process.env.WA_API_KEY,
  WA_API_URL: process.env.WA_API_URL,
  WA_AUTO_SEND: process.env.WA_AUTO_SEND || "false",
  ADMIN_PHONE: process.env.ADMIN_PHONE,
};
for (const [k, v] of Object.entries(needed)) {
  if (v !== undefined && v !== null && v !== "" && !existing.has(k)) {
    const cr = await api(`/v10/projects/${PROJECT_ID}/env`, {
      method: "POST",
      body: JSON.stringify({ key: k, value: String(v), target: ["production"], type: "encrypted" }),
    });
    console.log(`CREATE ${k}:`, cr.status);
  }
}

// 3. Tambah domain alias baru
const dom = await api(`/v10/projects/${PROJECT_ID}/domains`, {
  method: "POST",
  body: JSON.stringify({ name: "otwherozerowaste.vercel.app" }),
});
console.log("Domain add:", dom.status, JSON.stringify(dom.data).slice(0, 200));

// 4. Redeploy production terbaru
const depl = await api(`/v6/deployments?projectId=${PROJECT_ID}&limit=1&target=production`);
const latest = depl.data?.deployments?.[0];
if (latest?.uid) {
  const rd = await api(`/v10/deployments/${latest.uid}/redeploy`, {
    method: "POST",
    body: JSON.stringify({ target: "production" }),
  });
  console.log("Redeploy:", rd.status, rd.data?.url || JSON.stringify(rd.data).slice(0, 120));
} else {
  console.log("Tidak ada deployment production lama untuk redeploy — push ke git untuk deploy baru.");
}

console.log("\nSelesai. Verifikasi: https://otwherozerowaste.vercel.app/api/publik/tagihan?kode=KAL-HVM89K");