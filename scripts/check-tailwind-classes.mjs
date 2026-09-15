#!/usr/bin/env node
/**
 * Guard kelas Tailwind.
 *
 * Proyek ini memakai Tailwind v3. Nama kelas yang hanya ada di v4 akan
 * DIBUANG DIAM-DIAM oleh v3 — tidak ada error, tidak ada warning, CSS-nya
 * sekadar tidak pernah dibuat. Persis inilah yang dulu terjadi pada
 * `shadow-xs` / `shadow-2xs` / `backdrop-blur-xs` / `outline-hidden`
 * (66 pemakaian menghasilkan nol CSS).
 *
 * Jalankan: npm run check:classes
 * Exit 1 jika ada pelanggaran → bisa dipasang di CI.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");

/** v4-only  ->  padanan v3 */
const FORBIDDEN = {
  "shadow-2xs": "shadow-sm",
  "shadow-xs": "shadow-sm",
  "backdrop-blur-xs": "backdrop-blur-sm",
  "outline-hidden": "outline-none",
};

/** Kontras gagal: teks putih di atas permukaan emerald terang. */
const CONTRAST_RULES = [
  {
    // bg-emerald-500/600 yang dipasangkan text-white -> putih di bawah ambang WCAG AA 4.5:1
    re: /(?<![\w:/-])bg-emerald-(?:500|600)(?![\w/-])/g,
    onlyIf: (s) => /(?<![\w-])text-white(?![\w-])/.test(s),
    message: "putih di atas emerald-500/600 hanya 2.9-3.8:1 (butuh >=4.5:1) — pakai emerald-700",
  },
  {
    re: /(?<![\w:/-])text-emerald-600(?![\w-])/g,
    onlyIf: () => true,
    message: "emerald-600 sebagai teks hanya 3.8:1 di atas putih — pakai emerald-700",
  },
  {
    re: /(?<![\w:/-])text-amber-600(?![\w-])/g,
    onlyIf: () => true,
    message: "amber-600 sebagai teks hanya 3.1:1 di atas amber-50 — pakai amber-700",
  },
];

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (/\.(tsx?|jsx?)$/.test(full)) yield full;
  }
}

/** Ambil semua string literal — kelas Tailwind hanya hidup di dalam string. */
const LITERALS = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/g;

const problems = [];

for (const file of walk(SRC)) {
  const source = readFileSync(file, "utf8");
  const lines = source.split("\n");

  for (const literal of source.match(LITERALS) ?? []) {
    for (const [bad, fix] of Object.entries(FORBIDDEN)) {
      const re = new RegExp(`(?<![\\w.-])${bad.replace(/-/g, "\\-")}(?![\\w-])`, "g");
      if (re.test(literal)) {
        problems.push({ file, bad, fix, why: `kelas hanya ada di Tailwind v4 — v3 membuangnya tanpa error` });
      }
    }
    for (const rule of CONTRAST_RULES) {
      if (!rule.onlyIf(literal)) continue;
      const hits = literal.match(rule.re);
      if (hits) {
        for (const h of new Set(hits)) {
          problems.push({ file, bad: h, fix: null, why: rule.message });
        }
      }
    }
  }
  void lines;
}

if (problems.length === 0) {
  console.log("✓ check:classes — tidak ada kelas Tailwind v4 atau kontras gagal.");
  process.exit(0);
}

console.error(`✗ check:classes — ${problems.length} masalah\n`);
const byFile = new Map();
for (const p of problems) {
  const key = relative(ROOT, p.file);
  if (!byFile.has(key)) byFile.set(key, []);
  byFile.get(key).push(p);
}
for (const [file, list] of [...byFile].sort()) {
  console.error(`  ${file}`);
  for (const p of list) {
    console.error(`      ${p.bad}${p.fix ? `  ->  ${p.fix}` : ""}`);
    console.error(`         ${p.why}`);
  }
}
process.exit(1);
