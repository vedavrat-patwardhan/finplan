#!/usr/bin/env node
/**
 * Validates BoB and Axis parsers against real PDFs.
 * Usage: node scripts/validate-parsers.mjs
 */

import { readFileSync } from "fs";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

async function extractPages(filePath, password) {
  const buffer = readFileSync(filePath);
  const data = new Uint8Array(buffer);
  const doc = await getDocument({ data, password, isEvalSupported: false, useSystemFonts: false }).promise;
  const pages = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const items = [];
    for (const raw of content.items) {
      if (!("str" in raw)) continue;
      const x = raw.transform[4], y = raw.transform[5];
      items.push({ str: raw.str, x, y, right: x + raw.width });
    }
    pages.push({ pageNumber: p, items });
  }
  return pages;
}

// ——— Inline parsers (mirrors the TS logic) ———

function toNum(s) { return parseFloat(s.replace(/,/g, "")); }
function isoDate(s) { const [dd,mm,yyyy] = s.split("/"); return `${yyyy}-${mm}-${dd}`; }

// BOB parser
function parseBob(pages) {
  const AMOUNT_RE = /^[\d,]+\.\d{2}$/;
  const PURE_INT = /^-?\d+$/;
  const DATE_RE = /^\d{2}\/\d{2}\/\d{4}$/;
  const txns = []; let skipped = 0;

  for (const page of pages) {
    const byY = new Map();
    for (const it of page.items) {
      if (!it.str.trim()) continue;
      const k = Math.round(it.y);
      if (!byY.has(k)) byY.set(k, []);
      byY.get(k).push(it);
    }
    let headerY = null;
    for (const [y, items] of byY) {
      const hasDate = items.some(i => /^Date$/i.test(i.str.trim()) && i.x < 50);
      const hasPart = items.some(i => /Particulars/i.test(i.str.trim()));
      if (hasDate && hasPart) { headerY = y; break; }
    }
    const lines = [...byY.entries()]
      .filter(([y]) => headerY == null || y < headerY)
      .map(([y, items]) => ({ y, items: items.sort((a,b) => a.x - b.x) }))
      .sort((a,b) => b.y - a.y);

    for (const { items } of lines) {
      const dateItem = items.find(i => i.x < 65 && DATE_RE.test(i.str.trim()));
      if (!dateItem) continue;
      const crdr = items.find(i => /^(CR|DR)$/i.test(i.str.trim()) && i.x >= 560);
      if (!crdr) { skipped++; continue; }
      const type = /^CR$/i.test(crdr.str.trim()) ? "credit" : "debit";
      const amts = items.filter(i => i.x >= 430 && i.x < 570 && AMOUNT_RE.test(i.str.trim())).sort((a,b)=>a.x-b.x);
      if (!amts.length) { skipped++; continue; }
      const amount = toNum(amts[amts.length-1].str.trim());
      const desc = items
        .filter(i => i.x>=110 && i.x<380 && !PURE_INT.test(i.str.trim()) && !/^(INR|USD|EUR|GBP|AED|SGD)$/i.test(i.str.trim()))
        .sort((a,b)=>a.x-b.x).map(i=>i.str.trim()).join(" ").replace(/\s+/g," ").trim();
      if (!desc || amount===0) { skipped++; continue; }
      txns.push({ date: isoDate(dateItem.str.trim()), description: desc, amount, type });
    }
  }
  return { transactions: txns, skipped };
}

// AXIS parser
function parseAxis(pages) {
  const DATE_RE = /^\d{2}\/\d{2}\/\d{4}$/;
  const AMT_RE = /^([\d,]+\.\d{2})\s+(Dr|Cr)$/i;
  const txns = []; let skipped = 0;

  for (const page of pages) {
    const byY = new Map();
    for (const it of page.items) {
      if (!it.str.trim()) continue;
      const k = Math.round(it.y);
      if (!byY.has(k)) byY.set(k, []);
      byY.get(k).push(it);
    }
    const headerY = page.items.find(i => /^DATE$/i.test(i.str.trim()) && i.x < 70)?.y;
    if (headerY == null) continue;
    const endY = page.items.find(i => /End\s+of\s+Statement/i.test(i.str))?.y;
    const lines = [...byY.entries()]
      .filter(([y]) => y < headerY && (endY == null || y > endY))
      .map(([y, items]) => ({ y, items: items.sort((a,b)=>a.x-b.x) }))
      .sort((a,b)=>b.y-a.y);

    for (const { items } of lines) {
      const dateItem = items.find(i => i.x < 80 && DATE_RE.test(i.str.trim()));
      if (!dateItem) continue;
      const amtItem = [...items].reverse().find(i => AMT_RE.test(i.str.trim()));
      if (!amtItem) { skipped++; continue; }
      const m = amtItem.str.trim().match(AMT_RE);
      const amount = toNum(m[1]);
      const type = /^cr$/i.test(m[2]) ? "credit" : "debit";
      const desc = items.filter(i=>i.x>=85&&i.x<340).sort((a,b)=>a.x-b.x).map(i=>i.str.trim()).join(" ").replace(/\s+/g," ").trim();
      const mc = items.filter(i=>i.x>=340&&i.x<510).sort((a,b)=>a.x-b.x).map(i=>i.str.trim()).join(" ").replace(/\s+/g," ").trim();
      if (!desc || amount===0) { skipped++; continue; }
      txns.push({ date: isoDate(dateItem.str.trim()), description: desc, merchantCategory: mc, amount, type });
    }
  }
  return { transactions: txns, skipped };
}

// ——— Run ———

const BOB_PATH = "/Users/vedavrat/Downloads/7934060000278788_130626.pdf";
const AXIS_PATH = "/Users/vedavrat/Downloads/Credit Card Statement.pdf";
const PWD = "VEDA1010";

console.log("=== Bank of Baroda ===");
const bobPages = await extractPages(BOB_PATH, PWD);
const bob = parseBob(bobPages);
const bobDr = bob.transactions.filter(t=>t.type==="debit").reduce((s,t)=>s+t.amount,0);
const bobCr = bob.transactions.filter(t=>t.type==="credit").reduce((s,t)=>s+t.amount,0);
console.log(`Transactions: ${bob.transactions.length}  Skipped: ${bob.skipped}`);
bob.transactions.forEach(t => console.log(`  [${t.type.toUpperCase().padEnd(6)}] ${t.date}  ${t.amount.toFixed(2).padStart(10)}  ${t.description}`));
console.log(`DR total: ${bobDr.toFixed(2)}  CR total: ${bobCr.toFixed(2)}`);
console.log(`Net (DR-CR): ${(bobDr-bobCr).toFixed(2)}  (expect ~24949.80 — TAD 46841.93 - Opening 21892.13)`);

console.log("\n=== Axis Bank ===");
const axisPages = await extractPages(AXIS_PATH, PWD);
const axis = parseAxis(axisPages);
const axisDr = axis.transactions.filter(t=>t.type==="debit").reduce((s,t)=>s+t.amount,0);
const axisCr = axis.transactions.filter(t=>t.type==="credit").reduce((s,t)=>s+t.amount,0);
console.log(`Transactions: ${axis.transactions.length}  Skipped: ${axis.skipped}`);
axis.transactions.forEach(t => console.log(`  [${t.type.toUpperCase().padEnd(6)}] ${t.date}  ${t.amount.toFixed(2).padStart(10)}  ${t.description}  [${t.merchantCategory}]`));
console.log(`DR total: ${axisDr.toFixed(2)}  (expect 10578.22)`);
console.log(`CR total: ${axisCr.toFixed(2)}  (expect 14680.92)`);
console.log(`TAD check: prev_bal(6838.92) - payments(${axisCr.toFixed(2)}) + purchases+fees(${axisDr.toFixed(2)}) = ${(6838.92 - axisCr + axisDr).toFixed(2)}  (expect 2736.22)`);
