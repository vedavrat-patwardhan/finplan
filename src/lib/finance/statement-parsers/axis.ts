import type { PdfPage, PdfTextItem } from "./extract-text";
import { suggestCategory } from "./categorize";
import type { LedgerCategory } from "@/lib/finance/constants";
import type { ParsedStatement, ParsedTransaction } from "./types";

const FULL_DATE_RE = /^\d{2}\/\d{2}\/\d{4}$/;
const AMOUNT_WITH_TYPE_RE = /^([\d,]+\.\d{2})\s+(Dr|Cr)$/i;

function toNumber(s: string): number {
  return parseFloat(s.replace(/,/g, ""));
}

function fullDateToIso(s: string): string {
  const [dd, mm, yyyy] = s.split("/");
  return `${yyyy}-${mm}-${dd}`;
}

function detectPeriod(pages: PdfPage[]): { start?: string; end?: string } {
  for (const page of pages) {
    const text = page.items.map((i) => i.str).join(" ");
    // "12/05/2026 - 10/06/2026"
    const m = text.match(/(\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{2}\/\d{2}\/\d{4})/);
    if (m) return { start: fullDateToIso(m[1]), end: fullDateToIso(m[2]) };
  }
  return {};
}

function detectCardLast4(pages: PdfPage[]): string | undefined {
  for (const page of pages) {
    const text = page.items.map((i) => i.str).join(" ");
    // "0370987*****8928" or "370987*****8928"
    const m = text.match(/[\d*]+\*{4,}(\d{4})\b/);
    if (m) return m[1];
  }
  return undefined;
}

function detectBillSummary(pages: PdfPage[]): { totalAmountDue?: number; paymentDueDate?: string } {
  for (const page of pages) {
    const tadLabel = page.items.find((i) => /Total\s+Payment\s+Due/i.test(i.str.trim()));
    const dueDateLabel = page.items.find((i) => /Payment\s+Due\s+Date/i.test(i.str.trim()));
    if (!tadLabel || !dueDateLabel) continue;

    // TAD: just below the label (within ~20 y units), amount + Dr/Cr in one item
    const tadItem = page.items.find(
      (i) =>
        i.y < tadLabel.y &&
        tadLabel.y - i.y < 20 &&
        AMOUNT_WITH_TYPE_RE.test(i.str.trim())
    );

    // Due date: just below the label (within ~20 y units), DD/MM/YYYY
    const dueDateItem = page.items.find(
      (i) =>
        i.y < dueDateLabel.y &&
        dueDateLabel.y - i.y < 20 &&
        FULL_DATE_RE.test(i.str.trim())
    );

    if (tadItem && dueDateItem) {
      const m = tadItem.str.trim().match(AMOUNT_WITH_TYPE_RE)!;
      return {
        totalAmountDue: toNumber(m[1]),
        paymentDueDate: fullDateToIso(dueDateItem.str.trim()),
      };
    }
  }
  return {};
}

function categorizeAxis(
  description: string,
  merchantCategory: string,
  type: "debit" | "credit"
): LedgerCategory {
  if (type === "credit") {
    if (/PAYMENT\s+RECEIVED|BBPS|REFUND|REVERSAL/i.test(description)) return "Transfer";
    return "Miscellaneous";
  }
  const mc = merchantCategory.toLowerCase();
  if (/travel|airline|railway|transport/.test(mc)) return "Transport";
  if (/restaurant|dining|food/.test(mc)) return "Food";
  if (/retail|shopping|merchandise|store/.test(mc)) return "Shopping";
  if (/utilit/.test(mc)) return "Utilities";
  return suggestCategory(description, type);
}

function extractMerchant(description: string): string {
  // Strip trailing payment reference (e.g., " - BD016135BALAAAJ0WS8U")
  let text = description.replace(/\s*-\s*[A-Z0-9]{10,}\s*$/, "").trim();
  // Strip forex annotation (e.g., "( USD 15.27 )")
  text = text.replace(/\(\s*[A-Z]{3}\s+[\d.]+\s*\)/g, "").trim();
  // Take the part before any city suffix (e.g., "CLEARTRIP,MUMBAI" → "CLEARTRIP")
  return text.split(",")[0].trim() || description.slice(0, 40);
}

/**
 * Parse an Axis Bank credit card statement.
 *
 * Layout: DATE | TRANSACTION DETAILS | MERCHANT CATEGORY | AMOUNT (Rs.)
 * Amount carries an explicit "Dr"/"Cr" suffix in the same text item (e.g., "8,526.00 Dr").
 * Each transaction is a single line — no multi-line wrapping.
 */
export function parseAxisStatement(pages: PdfPage[]): ParsedStatement {
  const period = detectPeriod(pages);
  const transactions: ParsedTransaction[] = [];
  let skipped = 0;

  for (const page of pages) {
    const byY = new Map<number, PdfTextItem[]>();
    for (const it of page.items) {
      if (!it.str.trim()) continue;
      const key = Math.round(it.y);
      const bucket = byY.get(key);
      if (bucket) bucket.push(it);
      else byY.set(key, [it]);
    }

    // Header row has "DATE" at x < 70
    const headerY = page.items.find(
      (i) => /^DATE$/i.test(i.str.trim()) && i.x < 70
    )?.y;
    if (headerY == null) continue;

    // Stop at end-of-statement marker
    const endY = page.items.find((i) => /End\s+of\s+Statement/i.test(i.str))?.y;

    const lines = [...byY.entries()]
      .filter(([y]) => y < headerY && (endY == null || y > endY))
      .map(([y, items]) => ({ y, items: items.sort((a, b) => a.x - b.x) }))
      .sort((a, b) => b.y - a.y);

    for (const { items } of lines) {
      const dateItem = items.find((i) => i.x < 80 && FULL_DATE_RE.test(i.str.trim()));
      if (!dateItem) continue;

      // Amount + Dr/Cr as one text item, right-aligned
      const amountItem = [...items].reverse().find((i) =>
        AMOUNT_WITH_TYPE_RE.test(i.str.trim())
      );
      if (!amountItem) { skipped++; continue; }

      const m = amountItem.str.trim().match(AMOUNT_WITH_TYPE_RE)!;
      const amount = toNumber(m[1]);
      const type: "debit" | "credit" = /^cr$/i.test(m[2]) ? "credit" : "debit";

      // Description: x 85–340
      const description = items
        .filter((i) => i.x >= 85 && i.x < 340)
        .sort((a, b) => a.x - b.x)
        .map((i) => i.str.trim())
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      // Merchant category column: x 340–510
      const merchantCategory = items
        .filter((i) => i.x >= 340 && i.x < 510)
        .sort((a, b) => a.x - b.x)
        .map((i) => i.str.trim())
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      if (!description || amount === 0) { skipped++; continue; }

      transactions.push({
        date: fullDateToIso(dateItem.str.trim()),
        description,
        merchant: extractMerchant(description),
        amount,
        type,
        category: categorizeAxis(description, merchantCategory, type),
      });
    }
  }

  return {
    transactions,
    periodStart: period.start,
    periodEnd: period.end,
    accountNumberLast4: detectCardLast4(pages),
    skipped,
    ...detectBillSummary(pages),
  };
}
