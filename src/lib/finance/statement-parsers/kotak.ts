import type { PdfPage, PdfTextItem } from "./extract-text";
import { groupIntoRows } from "./extract-text";
import { suggestCategory } from "./categorize";
import type { ParsedStatement, ParsedTransaction } from "./types";

const ROW_DATE_RE = /^(\d{2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})$/i;
const AMOUNT_RE = /^[\d,]+\.\d{2}$/;
const MONTHS: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

interface PendingRow {
  date: string;
  descriptionParts: string[];
  referenceParts: string[];
  amount: number;
  type: "debit" | "credit";
  balance: number;
}

function toNumber(value: string): number {
  return Number(value.replaceAll(",", ""));
}

function dateToIso(value: string): string {
  const match = value.match(ROW_DATE_RE);
  if (!match) return "";
  return `${match[3]}-${MONTHS[match[2].toLowerCase()]}-${match[1]}`;
}

function compact(parts: string[]): string {
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function merchantFromNarration(narration: string): string {
  const segments = narration.split("/").map((part) => part.trim()).filter(Boolean);
  if (/^UPI\//i.test(narration) && segments[1]) return segments[1].slice(0, 80);
  if (/^(?:PCD|PCI)\//i.test(narration) && segments[2]) return segments[2].slice(0, 80);
  if (/^(?:NEFT|RTGS)/i.test(narration)) {
    return narration
      .replace(/^(?:NEFT|RTGS)\s+(?:IN|ICIN|ICICR)?[A-Z0-9]+\s*/i, "")
      .split(/\s{2,}|\//)[0]
      .trim()
      .slice(0, 80) || "Bank transfer";
  }
  if (/^NACH/i.test(narration)) return "NACH mandate";
  if (/^(?:Int\.Pd|Interest)/i.test(narration)) return "Account interest";
  return narration.split(/\s+/).slice(0, 5).join(" ").slice(0, 80);
}

function detectPeriod(pages: PdfPage[]): { start?: string; end?: string } {
  for (const page of pages) {
    const text = page.items.map((item) => item.str).join(" ");
    const match = text.match(
      /(\d{2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4})\s*-\s*(\d{2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4})/i
    );
    if (match) return { start: dateToIso(match[1]), end: dateToIso(match[2]) };
  }
  return {};
}

function detectAccountLast4(pages: PdfPage[]): string | undefined {
  for (const page of pages) {
    const text = page.items.map((item) => item.str).join(" ");
    const match = text.match(/Account\s+No\.\s*(\d{6,})/i);
    if (match) return match[1].slice(-4);
  }
  return undefined;
}

function detectSummaryBalances(pages: PdfPage[]): {
  openingBalance?: number;
  closingBalance?: number;
} {
  for (const page of pages) {
    for (const row of groupIntoRows(page)) {
      if (!row.some((item) => /Savings Account \(SA\)/i.test(item.str))) continue;
      const amounts = row
        .filter((item) => AMOUNT_RE.test(item.str.trim()))
        .sort((left, right) => left.x - right.x);
      if (amounts.length >= 2) {
        return {
          openingBalance: toNumber(amounts[0].str),
          closingBalance: toNumber(amounts.at(-1)!.str),
        };
      }
    }
  }
  return {};
}

function columnText(row: PdfTextItem[], start: number, end: number): string[] {
  return row
    .filter((item) => item.x >= start && item.x < end && item.str.trim())
    .sort((left, right) => left.x - right.x)
    .map((item) => item.str.trim());
}

/**
 * Parse Kotak Mahindra savings/current-account statements.
 *
 * Layout: # | Date | Description | Chq/Ref. No. | Withdrawal (Dr.) |
 * Deposit (Cr.) | Balance. Narration and reference cells may continue on the
 * following visual line, so rows are accumulated until the next numbered date.
 */
export function parseKotakStatement(pages: PdfPage[]): ParsedStatement {
  const transactions: ParsedTransaction[] = [];
  const period = detectPeriod(pages);
  const summary = detectSummaryBalances(pages);
  let skipped = 0;
  let pending: PendingRow | null = null;

  function flushPending() {
    if (!pending) return;
    const narration = compact(pending.descriptionParts);
    const reference = compact(pending.referenceParts);
    const description = compact([narration, reference ? `Ref: ${reference}` : ""]);
    transactions.push({
      date: pending.date,
      description,
      merchant: merchantFromNarration(narration),
      amount: pending.amount,
      type: pending.type,
      category: suggestCategory(narration, pending.type),
      balance: pending.balance,
    });
    pending = null;
  }

  for (const page of pages) {
    const pageText = page.items.map((item) => item.str).join(" ");
    if (!/Savings Account Transactions/i.test(pageText)) continue;

    for (const row of groupIntoRows(page)) {
      const dateItem = row.find(
        (item) => item.x >= 60 && item.x < 118 && ROW_DATE_RE.test(item.str.trim())
      );
      const sequenceItem = row.find(
        (item) => item.x < 60 && /^\d+$/.test(item.str.trim())
      );

      if (dateItem && sequenceItem) {
        flushPending();
        const debitItem = row.find(
          (item) => item.x >= 340 && item.x < 430 && AMOUNT_RE.test(item.str.trim())
        );
        const creditItem = row.find(
          (item) => item.x >= 430 && item.x < 500 && AMOUNT_RE.test(item.str.trim())
        );
        const balanceItem = row.find(
          (item) => item.x >= 500 && AMOUNT_RE.test(item.str.trim())
        );
        const amountItem = debitItem ?? creditItem;

        if (!amountItem || !balanceItem) {
          skipped += 1;
          continue;
        }

        pending = {
          date: dateToIso(dateItem.str.trim()),
          descriptionParts: columnText(row, 110, 274),
          referenceParts: columnText(row, 274, 340),
          amount: toNumber(amountItem.str),
          type: debitItem ? "debit" : "credit",
          balance: toNumber(balanceItem.str),
        };
        continue;
      }

      if (!pending) continue;
      const y = row[0]?.y ?? 0;
      if (y <= 80 || y >= 710) continue;
      pending.descriptionParts.push(...columnText(row, 110, 274));
      pending.referenceParts.push(...columnText(row, 274, 340));
    }
  }
  flushPending();

  return {
    transactions,
    periodStart: period.start,
    periodEnd: period.end,
    accountNumberLast4: detectAccountLast4(pages),
    openingBalance: summary.openingBalance,
    closingBalance: summary.closingBalance ?? transactions.at(-1)?.balance,
    skipped,
  };
}
