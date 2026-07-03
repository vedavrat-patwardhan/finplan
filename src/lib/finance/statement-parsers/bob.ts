import type { PdfPage, PdfTextItem } from "./extract-text";
import { suggestCategory } from "./categorize";
import type { LedgerCategory } from "@/lib/finance/constants";
import type { ParsedStatement, ParsedTransaction } from "./types";

const FULL_DATE_RE = /^\d{2}\/\d{2}\/\d{4}$/;
const AMOUNT_RE = /^[\d,]+\.\d{2}$/;
const PURE_INT_RE = /^-?\d+$/;
const BILL_AMOUNT_RE = /^([\d,]+\.\d{2})(DR|CR)$/i;

const MONTH_MAP: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

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
    const m = text.match(
      /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[,.]?\s+(\d{4})\s+to\s+(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[,.]?\s+(\d{4})/i
    );
    if (m) {
      const dd1 = m[1].padStart(2, "0"), mo1 = MONTH_MAP[m[2].slice(0, 3).toLowerCase()], yr1 = m[3];
      const dd2 = m[4].padStart(2, "0"), mo2 = MONTH_MAP[m[5].slice(0, 3).toLowerCase()], yr2 = m[6];
      if (mo1 && mo2) return { start: `${yr1}-${mo1}-${dd1}`, end: `${yr2}-${mo2}-${dd2}` };
    }
  }
  return {};
}

function detectCardLast4(pages: PdfPage[]): string | undefined {
  for (const page of pages) {
    const text = page.items.map((i) => i.str).join(" ");
    const m = text.match(/Card\s+No\s*:\s*[\dX]*?(\d{4})\b/i);
    if (m) return m[1];
  }
  return undefined;
}

function detectBillSummary(pages: PdfPage[]): { totalAmountDue?: number; paymentDueDate?: string } {
  for (const page of pages) {
    // BoB layout: TAD label is at x>400 (right column), due date label at x<400 (left column)
    const tadLabel = page.items.find(
      (i) => /Total\s+Amount\s+Due/i.test(i.str.trim()) && i.x > 400
    );
    const dueDateLabel = page.items.find(
      (i) => /Payment\s+Due\s+Date/i.test(i.str.trim()) && i.x < 400
    );
    if (!tadLabel || !dueDateLabel) continue;

    // TAD value: below the label (within ~40 y units), combined "46,841.93DR" format
    const tadItem = page.items.find(
      (i) =>
        i.y < tadLabel.y &&
        tadLabel.y - i.y < 40 &&
        BILL_AMOUNT_RE.test(i.str.trim())
    );

    // Due date: below the label (within ~25 y units), DD/MM/YYYY
    const dueDateItem = page.items.find(
      (i) =>
        i.y < dueDateLabel.y &&
        dueDateLabel.y - i.y < 25 &&
        FULL_DATE_RE.test(i.str.trim())
    );

    if (tadItem && dueDateItem) {
      const m = tadItem.str.trim().match(BILL_AMOUNT_RE)!;
      return {
        totalAmountDue: toNumber(m[1]),
        paymentDueDate: fullDateToIso(dueDateItem.str.trim()),
      };
    }
  }
  return {};
}

function categorizeBob(description: string, type: "debit" | "credit"): LedgerCategory {
  if (type === "credit") {
    if (/BBPS|PAYMENT|REFUND|REVERSAL/i.test(description)) return "Transfer";
    return "Miscellaneous";
  }
  if (/CLEARTRIP|MAKEMYTRIP|YATRA|INDIGO|AIRINDIA/i.test(description)) return "Transport";
  return suggestCategory(description, type);
}

function extractMerchant(description: string): string {
  const words = description.trim().split(/\s+/);
  return words.slice(0, 4).join(" ");
}

/**
 * Parse a Bank of Baroda credit card statement.
 *
 * Layout: Date | Ref. No. | Particulars | (Reward Pts) | Source Amt. | Amount | CR/DR
 * Amount and CR/DR are separate text items. Source Amt. is the foreign-currency amount
 * (same as domestic for INR). The rightmost numeric at x≥430 is always the INR amount.
 */
export function parseBobStatement(pages: PdfPage[]): ParsedStatement {
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

    // English column header row has "Date" at x<50 and "Particulars" on the same y.
    let headerY: number | null = null;
    for (const [y, items] of byY) {
      const hasDate = items.some((i) => /^Date$/i.test(i.str.trim()) && i.x < 50);
      const hasParticulars = items.some((i) => /Particulars/i.test(i.str.trim()));
      if (hasDate && hasParticulars) { headerY = y; break; }
    }

    const lines = [...byY.entries()]
      .filter(([y]) => headerY == null || y < headerY)
      .map(([y, items]) => ({ y, items: items.sort((a, b) => a.x - b.x) }))
      .sort((a, b) => b.y - a.y);

    for (const { items } of lines) {
      const dateItem = items.find((i) => i.x < 65 && FULL_DATE_RE.test(i.str.trim()));
      if (!dateItem) continue;

      // Standalone CR or DR at x ≥ 560
      const crdrItem = items.find((i) => /^(CR|DR)$/i.test(i.str.trim()) && i.x >= 560);
      if (!crdrItem) { skipped++; continue; }
      const type: "debit" | "credit" = /^CR$/i.test(crdrItem.str.trim()) ? "credit" : "debit";

      // Rightmost numeric in amount columns (x 430–570) = domestic INR amount
      const amountItems = items
        .filter((i) => i.x >= 430 && i.x < 570 && AMOUNT_RE.test(i.str.trim()))
        .sort((a, b) => a.x - b.x);
      if (amountItems.length === 0) { skipped++; continue; }
      const amount = toNumber(amountItems[amountItems.length - 1].str.trim());

      // Particulars column: x 110–380, exclude pure integers (card suffix, reward pts) and currency codes
      const description = items
        .filter(
          (i) =>
            i.x >= 110 &&
            i.x < 380 &&
            !PURE_INT_RE.test(i.str.trim()) &&
            !/^(INR|USD|EUR|GBP|AED|SGD|JPY)$/i.test(i.str.trim())
        )
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
        category: categorizeBob(description, type),
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
