import type { PdfPage, PdfTextItem } from "./extract-text";
import { groupIntoRows } from "./extract-text";
import { suggestCategory } from "./categorize";
import type { ParsedStatement, ParsedTransaction } from "./types";

const AMOUNT_RE = /^[\d,]+\.\d{2}$/;
const ROW_DATE_RE = /^\d{2}\/\d{2}\/\d{2}$/; // DD/MM/YY (transaction rows)
const FULL_DATE_RE = /(\d{2})\/(\d{2})\/(\d{4})/; // DD/MM/YYYY (header period)

function toNumber(s: string): number {
  return parseFloat(s.replace(/,/g, ""));
}

/** DD/MM/YY → ISO yyyy-mm-dd (assumes 20YY). */
function rowDateToIso(s: string): string {
  const [dd, mm, yy] = s.split("/");
  return `20${yy}-${mm}-${dd}`;
}

/** Best-effort merchant from an HDFC narration. */
function extractMerchant(narration: string): string {
  // Drop long reference/UTR digit runs.
  let text = narration.replace(/\b\d{10,}\b/g, " ").replace(/\s+/g, " ").trim();

  const upi = text.match(/^UPI-([^-]+)/i);
  if (upi) return upi[1].trim();

  const imps = text.match(/^IMPS-[A-Za-z]*-?(.+)/i) || text.match(/^IMPS-(.+)/i);
  if (imps) {
    const rest = imps[1].replace(/^\d+-/, "").trim();
    return rest.split("-")[0].trim() || "IMPS Transfer";
  }

  const neft = text.match(/^(NEFT|RTGS)[-: ]+(.+)/i);
  if (neft) return neft[2].split("-")[0].trim();

  // Otherwise first few words.
  text = text.replace(/[:.].*$/, "").trim();
  return text.split(" ").slice(0, 4).join(" ") || narration.slice(0, 40);
}

function detectPeriod(pages: PdfPage[]): { start?: string; end?: string } {
  for (const page of pages) {
    const line = page.items.map((i) => i.str).join(" ");
    const m = line.match(/From\s*:?\s*(\d{2}\/\d{2}\/\d{4}).*?To\s*:?\s*(\d{2}\/\d{2}\/\d{4})/);
    if (m) {
      const s = m[1].match(FULL_DATE_RE)!;
      const e = m[2].match(FULL_DATE_RE)!;
      return { start: `${s[3]}-${s[2]}-${s[1]}`, end: `${e[3]}-${e[2]}-${e[1]}` };
    }
  }
  return {};
}

function detectAccountLast4(pages: PdfPage[]): string | undefined {
  for (const page of pages) {
    const line = page.items.map((i) => i.str).join(" ");
    const m = line.match(/Account No\s*:?\s*(\d{6,})/);
    if (m) return m[1].slice(-4);
  }
  return undefined;
}

/** Find the x-start of the "Deposit Amt." header column (separates withdrawal | deposit). */
function findDepositColumnStart(pages: PdfPage[]): number | null {
  for (const page of pages) {
    const hit = page.items.find((i) => /Deposit\s*Amt/i.test(i.str));
    if (hit) return hit.x;
  }
  return null;
}

/**
 * Parse an HDFC savings/current account statement.
 *
 * Layout: Date | Narration | Chq./Ref.No. | Value Dt | Withdrawal Amt. | Deposit Amt. | Closing Balance
 * Transaction rows begin with a DD/MM/YY date; each has the txn amount (in one of the
 * two amount columns) followed by the closing balance. Direction is classified by which
 * column the amount falls in, then validated against the running closing-balance delta.
 */
export function parseHdfcStatement(pages: PdfPage[]): ParsedStatement {
  const depStart = findDepositColumnStart(pages);
  const period = detectPeriod(pages);
  const transactions: ParsedTransaction[] = [];
  let skipped = 0;
  let prevClosing: number | null = null;

  for (const page of pages) {
    for (const row of groupIntoRows(page)) {
      const first = row.find((i) => i.str.trim());
      if (!first || !ROW_DATE_RE.test(first.str.trim())) continue;

      const amounts = row.filter((i: PdfTextItem) => AMOUNT_RE.test(i.str.trim()));
      if (amounts.length < 2) {
        // Date row without both amount + closing balance — not a normal txn line.
        skipped++;
        continue;
      }

      const closingItem = amounts[amounts.length - 1];
      const amountItem = amounts[amounts.length - 2];
      const closing = toNumber(closingItem.str);
      const amount = toNumber(amountItem.str);

      // Column-based classification, then balance-delta validation/correction.
      let type: "debit" | "credit" =
        depStart != null && amountItem.right < depStart + 5 ? "debit" : "credit";
      if (prevClosing != null) {
        const delta = Number((closing - prevClosing).toFixed(2));
        if (Math.abs(Math.abs(delta) - amount) < 0.01) {
          type = delta < 0 ? "debit" : "credit";
        }
      }

      const narration = row
        .filter(
          (i) =>
            i.str.trim() &&
            !AMOUNT_RE.test(i.str.trim()) &&
            !ROW_DATE_RE.test(i.str.trim())
        )
        .map((i) => i.str.trim())
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      transactions.push({
        date: rowDateToIso(first.str.trim()),
        description: narration,
        merchant: extractMerchant(narration),
        amount,
        type,
        category: suggestCategory(narration, type),
        balance: closing,
      });
      prevClosing = closing;
    }
  }

  return {
    transactions,
    periodStart: period.start,
    periodEnd: period.end,
    accountNumberLast4: detectAccountLast4(pages),
    // HDFC prints a running closing balance on every transaction row. The
    // final parsed row is the statement's closing balance and matches the
    // statement summary, even when the summary appears on a trailing page.
    closingBalance: transactions.at(-1)?.balance,
    skipped,
  };
}
