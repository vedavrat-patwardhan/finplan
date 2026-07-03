#!/usr/bin/env node
/**
 * Debug script: extracts positioned text from a PDF and prints rows with coordinates.
 * Usage: node scripts/debug-pdf.mjs <path> [password] [maxPages]
 */

import { readFileSync } from "fs";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const [, , filePath, password, maxPagesArg] = process.argv;
if (!filePath) {
  console.error("Usage: node scripts/debug-pdf.mjs <path> [password] [maxPages]");
  process.exit(1);
}

const maxPages = maxPagesArg ? parseInt(maxPagesArg) : Infinity;
const buffer = readFileSync(filePath);
const data = new Uint8Array(buffer);

const doc = await getDocument({
  data,
  password: password || undefined,
  isEvalSupported: false,
  useSystemFonts: false,
}).promise;

console.log(`Pages: ${doc.numPages}`);

for (let p = 1; p <= Math.min(doc.numPages, maxPages); p++) {
  console.log(`\n====== PAGE ${p} ======`);
  const page = await doc.getPage(p);
  const content = await page.getTextContent();

  // Collect items
  const items = [];
  for (const raw of content.items) {
    if (!("str" in raw)) continue;
    const item = raw;
    const x = item.transform[4];
    const y = item.transform[5];
    items.push({ str: item.str, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, right: Math.round((x + item.width) * 10) / 10 });
  }

  // Group by rounded y, sort top→bottom
  const byY = new Map();
  for (const it of items) {
    const key = Math.round(it.y);
    if (!byY.has(key)) byY.set(key, []);
    byY.get(key).push(it);
  }

  const rows = [...byY.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([y, its]) => ({ y, items: its.sort((a, b) => a.x - b.x) }));

  for (const row of rows) {
    const text = row.items.map(i => `[x${i.x}→${i.right} "${i.str}"]`).join("  ");
    console.log(`y=${row.y}  ${text}`);
  }
}
