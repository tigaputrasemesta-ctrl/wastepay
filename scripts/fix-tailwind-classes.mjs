#!/usr/bin/env node
import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (/\.(tsx?|jsx?)$/.test(full)) yield full;
  }
}

const FORBIDDEN = {
  "shadow-2xs": "shadow-sm",
  "shadow-xs": "shadow-sm",
  "backdrop-blur-xs": "backdrop-blur-sm",
  "outline-hidden": "outline-none",
};

let totalChanges = 0;
let filesChanged = 0;

for (const file of walk(SRC)) {
  let content = readFileSync(file, "utf8");
  let modified = false;

  // 1. Forbidden Tailwind v4 classes
  for (const [bad, fix] of Object.entries(FORBIDDEN)) {
    const re = new RegExp(`(?<![\\w.-])${bad.replace(/-/g, "\\-")}(?![\\w-])`, "g");
    if (re.test(content)) {
      content = content.replace(re, fix);
      modified = true;
      totalChanges++;
    }
  }

  // 2. Teks kontras rendah: text-emerald-600 -> text-emerald-700, text-amber-600 -> text-amber-700
  const reEmText = /(?<![\w:/-])text-emerald-600(?![\w-])/g;
  if (reEmText.test(content)) {
    content = content.replace(reEmText, "text-emerald-700");
    modified = true;
    totalChanges++;
  }

  const reAmbText = /(?<![\w:/-])text-amber-600(?![\w-])/g;
  if (reAmbText.test(content)) {
    content = content.replace(reAmbText, "text-amber-700");
    modified = true;
    totalChanges++;
  }

  // 3. Permukaan emerald-500/600 di mana ada text-white di string literal yang sama
  // Parse string literals and fix only if text-white is present
  const LITERALS = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/g;
  content = content.replace(LITERALS, (match) => {
    if (/(?<![\w-])text-white(?![\w-])/.test(match)) {
      const replaced = match.replace(/(?<![\w:/-])bg-emerald-(?:500|600)(?![\w/-])/g, "bg-emerald-700");
      if (replaced !== match) {
        modified = true;
        totalChanges++;
        return replaced;
      }
    }
    return match;
  });

  if (modified) {
    writeFileSync(file, content, "utf8");
    filesChanged++;
  }
}

console.log(`Selesai! Diperbarui ${filesChanged} file dengan total ${totalChanges} perbaikan kelas.`);
