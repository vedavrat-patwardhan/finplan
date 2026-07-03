import type { PdfPage, PdfTextItem } from "./extract-text";
import { suggestCategory } from "./categorize";
import type { LedgerCategory } from "@/lib/finance/constants";
import type { ParsedStatement, ParsedTransaction } from "./types";

const FULL_DATE_RE = /^\d{2}\/\d{2}\/\d{4}$/; // DD/MM/YYYY
const AMOUNT_RE = /([\d,]+\.\d{2})\s*(Dr|Cr)\b/i;

// Data cells start a hair left of their header label (sub-pixel kerning), so each
// column boundary is pulled left by this tolerance before bucketing items.
const COL_TOL = 6;

interface Columns {
  tdStart: number;
  mcStart: number;
  amtStart: number;
}

function toNumber(s: string): number {
  return parseFloat(s.replace(/,/g, ""));
}

/** DD/MM/YYYY → ISO yyyy-mm-dd. */
function fullDateToIso(s: string): string {
  const [dd, mm, yyyy] = s.split("/");
  return `${yyyy}-${mm}-${dd}`;
}

/** Read the four column x-starts from the "Date | Transaction Details | Merchant Category | Amount" header. */
function findColumns(pages: PdfPage[]): Columns | null {
  for (const page of pages) {
    const td = page.items.find((i) => /Transaction Details/i.test(i.str));
    const mc = page.items.find((i) => /Merchant Category/i.test(i.str));
    const amt = page.items.find((i) => /Amount \(Rs/i.test(i.str));
    if (td && mc && amt) {
      return { tdStart: td.x, mcStart: mc.x, amtStart: amt.x };
    }
  }
  return null;
}

function detectPeriod(pages: PdfPage[]): { start?: string; end?: string } {
  for (const page of pages) {
    const line = page.items.map((i) => i.str).join(" ");
    const m = line.match(/(\d{2}\/\d{2}\/\d{4})\s*To\s*(\d{2}\/\d{2}\/\d{4})/i);
    if (m) return { start: fullDateToIso(m[1]), end: fullDateToIso(m[2]) };
  }
  return {};
}

function detectCardLast4(pages: PdfPage[]): string | undefined {
  for (const page of pages) {
    const line = page.items.map((i) => i.str).join(" ");
    const m = line.match(/Card Number\s+[X\d]*?(\d{4})\b/i);
    if (m) return m[1];
  }
  return undefined;
}

function detectBillSummary(pages: PdfPage[]): { totalAmountDue?: number; paymentDueDate?: string } {
  for (const page of pages) {
    const tadLabel = page.items.find((i) => /Total\s+Amount\s+Due:/i.test(i.str.trim()));
    const dueDateLabel = page.items.find((i) => /Payment\s+Due\s+Date:/i.test(i.str.trim()));
    if (!tadLabel || !dueDateLabel) continue;

    // TAD value: just below the label (y decreases downward in PDF coords), starts with "Rs. "
    const tadItem = page.items.find(
      (i) =>
        i.y < tadLabel.y &&
        tadLabel.y - i.y < 15 &&
        /^Rs\.\s*[\d,]+\.\d{2}$/.test(i.str.trim())
    );

    // Due date: on the SAME visual line as the label (|Δy| < 3), to the right of it
    const dueDateItem = page.items.find(
      (i) =>
        Math.abs(i.y - dueDateLabel.y) < 3 &&
        i.x > dueDateLabel.x &&
        FULL_DATE_RE.test(i.str.trim())
    );

    if (tadItem && dueDateItem) {
      const numStr = tadItem.str.trim().replace(/^Rs\.\s*/, "");
      return {
        totalAmountDue: toNumber(numStr),
        paymentDueDate: fullDateToIso(dueDateItem.str.trim()),
      };
    }
  }
  return {};
}

/** Best-effort merchant name from a Yes Bank credit-card narration. */
function extractMerchant(narration: string): string {
  // Everything before the reference number.
  let text = narration.split(/\s*-\s*Ref No:/i)[0].trim();
  // Strip UPI fuel-surcharge trailing numeric tags: "UPI Fuel Surcharge -123-456".
  text = text.replace(/\s*-\s*\d{4,}.*$/, "").trim();
  text = text.replace(/^UPI[_\s]+/i, "").replace(/\bIND\b\s*$/i, "").trim();
  text = text.replace(/\s+/g, " ");
  return text || narration.slice(0, 40);
}

/** Map Yes Bank's merchant-category column (and narration) to a ledger category. */
function categorize(
  narration: string,
  merchantCategory: string,
  type: "debit" | "credit"
): LedgerCategory {
  if (type === "credit") {
    return /payment\s+received/i.test(narration) ? "Transfer" : "Miscellaneous";
  }
  const mc = merchantCategory.toLowerCase();
  if (/service station|fuel|petroleum|petrol/.test(mc)) return "Transport";
  if (/transportation|airline|travel|railway/.test(mc)) return "Transport";
  if (/utilit/.test(mc)) return "Utilities";
  if (/restaurant|dining|food|hotel|eating/.test(mc)) return "Food";

  // Let narration keywords (JIO, AMAZON, etc.) win before falling back to the column.
  const keyword = suggestCategory(narration, type);
  if (keyword !== "Miscellaneous") return keyword;

  if (/retail outlet/.test(mc)) return "Shopping";
  return "Miscellaneous";
}

/**
 * Parse a Yes Bank credit-card statement.
 *
 * Layout: Date | Transaction Details | Merchant Category | Amount (Rs.), where the amount
 * carries an explicit Dr (purchase) / Cr (payment/refund) suffix. The Transaction Details
 * and Merchant Category cells wrap across the line(s) above and below the "anchor" line
 * that holds the date + amount; wrapped lines are assigned to their nearest anchor and the
 * cells reconstructed by x-column.
 */
export function parseYesStatement(pages: PdfPage[]): ParsedStatement {
  const columns = findColumns(pages);
  const period = detectPeriod(pages);
  const transactions: ParsedTransaction[] = [];
  let skipped = 0;

  if (!columns) return { transactions, skipped, ...period };
  const { tdStart, mcStart, amtStart } = columns;

  for (const page of pages) {
    // Group items into visual lines by rounded y.
    const byY = new Map<number, PdfTextItem[]>();
    for (const it of page.items) {
      if (!it.str.trim()) continue;
      const key = Math.round(it.y);
      const bucket = byY.get(key);
      if (bucket) bucket.push(it);
      else byY.set(key, [it]);
    }

    // Per-page transaction region: below the column header, above the footer / end marker.
    const headerY = page.items.find((i) => /Transaction Details/i.test(i.str))?.y;
    if (headerY == null) continue;
    const endY = page.items.find((i) => /End of the Statement/i.test(i.str))?.y;
    const yTop = headerY;
    const yBottom = endY ?? 60; // footer contact info lives below ~55

    const lines = [...byY.entries()]
      .filter(([y]) => y < yTop && y > yBottom)
      .map(([y, items]) => ({ y, items: items.sort((a, b) => a.x - b.x) }))
      .sort((a, b) => b.y - a.y);

    // Anchor = a line with a date (date column) and an amount+Dr/Cr (amount column).
    const anchors = lines.filter((l) => {
      const hasDate = l.items.some(
        (i) => i.x < tdStart - COL_TOL && FULL_DATE_RE.test(i.str.trim())
      );
      const amtText = l.items
        .filter((i) => i.x >= amtStart - COL_TOL)
        .map((i) => i.str)
        .join(" ");
      return hasDate && AMOUNT_RE.test(amtText);
    });
    if (anchors.length === 0) continue;

    // Assign each line to its nearest anchor (by y distance).
    const blocks = new Map<number, PdfTextItem[]>();
    for (const anchor of anchors) blocks.set(anchor.y, []);
    for (const line of lines) {
      let nearest = anchors[0].y;
      let best = Infinity;
      for (const a of anchors) {
        const d = Math.abs(a.y - line.y);
        if (d < best) {
          best = d;
          nearest = a.y;
        }
      }
      blocks.get(nearest)!.push(...line.items);
    }

    for (const anchor of anchors) {
      const items = blocks.get(anchor.y)!;
      const dateItem = items.find(
        (i) => i.x < tdStart - COL_TOL && FULL_DATE_RE.test(i.str.trim())
      );
      if (!dateItem) {
        skipped++;
        continue;
      }

      const collect = (lo: number, hi: number) =>
        items
          .filter((i) => i.x >= lo && i.x < hi)
          .sort((a, b) => b.y - a.y || a.x - b.x)
          .map((i) => i.str)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();

      const narration = collect(tdStart - COL_TOL, mcStart - COL_TOL);
      const merchantCategory = collect(mcStart - COL_TOL, amtStart - COL_TOL);
      const amountText = collect(amtStart - COL_TOL, Infinity);

      const m = amountText.match(AMOUNT_RE);
      if (!m) {
        skipped++;
        continue;
      }
      const amount = toNumber(m[1]);
      const type: "debit" | "credit" = /cr/i.test(m[2]) ? "credit" : "debit";

      transactions.push({
        date: fullDateToIso(dateItem.str.trim()),
        description: narration,
        merchant: extractMerchant(narration),
        amount,
        type,
        category: categorize(narration, merchantCategory, type),
      });
    }
  }

  // Statements list transactions top-to-bottom per page already in chronological order.
  return {
    transactions,
    periodStart: period.start,
    periodEnd: period.end,
    accountNumberLast4: detectCardLast4(pages),
    skipped,
    ...detectBillSummary(pages),
  };
}
