import { createHash } from "crypto";
import { suggestCategory } from "@/lib/finance/statement-parsers/categorize";
import type { LedgerCategory, TransactionType } from "@/lib/finance/constants";

export interface ParsedFinanceMessage {
  kind: "transaction" | "bill" | "balance" | "unknown";
  type?: TransactionType;
  amount?: number;
  category?: LedgerCategory;
  merchant: string;
  description: string;
  accountLastFour: string;
  reference: string;
  availableBalance?: number;
  availableLimit?: number;
  foreignCurrency?: string;
  foreignAmount?: number;
  isEmi?: boolean;
  billTotalDue?: number;
  billMinimumDue?: number;
  billDueDate?: Date;
  confidence: number;
}

const MONEY = String.raw`(?:₹|INR|INR\.|Rs\.?|RS\.?)\s*([\d,]+(?:\.\d{1,2})?)`;
const CURRENCY_SPEND = /\b(?:spent|paid|charged|debited)\s+([A-Z]{3})\s*([\d,]+(?:\.\d{1,2})?)/i;
const DEBIT_WORDS = /\b(debited|spent|paid|sent|withdrawn|purchase|used|charged|dr\.?|transferred to)\b/i;
const CREDIT_WORDS = /\b(credited|received|deposited|refund(?:ed)?|cr\.?)\b/i;
const BILL_WORDS = /\b(total (?:amount )?due|minimum (?:amount )?due|payment due|bill due|statement amount)\b/i;

function numberFrom(value?: string): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value.replaceAll(",", ""));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function matchMoneyAfter(text: string, label: RegExp): number | undefined {
  const source = label.source;
  const after = text.match(new RegExp(`${source}[^₹\d]{0,24}${MONEY}`, "i"));
  if (after?.[1]) return numberFrom(after[1]);
  const before = text.match(new RegExp(`${MONEY}[^.]{0,24}${source}`, "i"));
  return numberFrom(before?.[1]);
}

function parseDate(text: string): Date | undefined {
  const monthNames: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };
  const labelled = text.match(
    /(?:due(?:\s+date)?|pay(?:ment)?\s+by)\s*[:\-]?\s*(\d{1,2})[\s\-/]([A-Za-z]{3,9}|\d{1,2})[\s\-/](\d{2,4})/i
  );
  if (!labelled) return undefined;

  const day = Number(labelled[1]);
  const monthToken = labelled[2].toLowerCase().slice(0, 3);
  const month = monthToken in monthNames ? monthNames[monthToken] : Number(labelled[2]) - 1;
  const rawYear = Number(labelled[3]);
  const year = rawYear < 100 ? 2000 + rawYear : rawYear;
  const date = new Date(year, month, day, 12, 0, 0);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function extractLastFour(text: string): string {
  const patterns = [
    /(?:a\/c|acct|account|card)\s*(?:no\.?|ending)?\s*[:\-]?\s*(?:x+|\*+)?\s*(\d{4})\b/i,
    /(?:xx|XX|\*{2,}|x{2,})\s*(\d{4})\b/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1];
  }
  return "";
}

function extractReference(text: string): string {
  return (
    text.match(/(?:UPI\s*(?:ref|txn)?(?:\s*no)?|UTR|ref(?:erence)?(?:\s*no)?)\s*[:#\-]?\s*([A-Z0-9]{8,})/i)?.[1] ??
    ""
  );
}

function cleanMerchant(value: string): string {
  return value
    .replace(/\s+for\s+(?:₹|INR\.?|Rs\.?|RS\.?)\s*[\d,]+(?:\.\d{1,2})?\b.*$/i, "")
    .replace(/\s+(?:on|via|using|UPI|ref|reference|txn|avl|available|balance)\b.*$/i, "")
    .replace(/[.,;:\-\s]+$/, "")
    .trim()
    .slice(0, 80);
}

function extractMerchant(text: string, type?: TransactionType): string {
  const patterns = type === "credit"
    ? [/\bfrom\s+([^.;]{2,100})/i]
    : [
        /\b\d{2}-\d{2}-\d{2,4}\s+\d{2}:\d{2}:\d{2}\s+IST\s+(.+?)\s+Avl\.?\s+Limit\b/i,
        /\bused\s+at\s+([^.;]{2,100})/i,
        new RegExp(`${MONEY}[^.]{0,50}\\bat\\s+([^.;]{2,100})`, "i"),
        /\bat\s+([^.;]{2,100})/i,
        /\bto\s+([^.;]{2,100})/i,
      ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    // MONEY has a capture group, so the merchant is the final capture.
    const value = match?.at(-1);
    if (value) return cleanMerchant(value);
  }
  return "";
}

function firstTransactionAmount(text: string, type?: TransactionType): number | undefined {
  const directional = type
    ? text.match(
        new RegExp(
          `${MONEY}[^.]{0,40}${type === "debit" ? DEBIT_WORDS.source : CREDIT_WORDS.source}|${type === "debit" ? DEBIT_WORDS.source : CREDIT_WORDS.source}[^₹\\d]{0,40}${MONEY}`,
          "i"
        )
      )
    : null;
  if (directional) {
    const candidate = directional.slice(1).find((value) => value && /^[\d,.]+$/.test(value));
    const amount = numberFrom(candidate);
    if (amount !== undefined) return amount;
  }
  return numberFrom(text.match(new RegExp(MONEY, "i"))?.[1]);
}

export function parseFinanceMessage(message: string): ParsedFinanceMessage {
  const text = message.replace(/\s+/g, " ").trim();
  const accountLastFour = extractLastFour(text);
  const reference = extractReference(text);
  const hasBill = BILL_WORDS.test(text);
  const hasDebit = DEBIT_WORDS.test(text);
  const hasCredit = CREDIT_WORDS.test(text);
  const declined = /\b(?:declined|failed|unsuccessful)\b/i.test(text);
  // Email notification previews may contain unrelated footer text such as
  // "received". A specific card-use alert is still a debit in that case.
  const isCardUse = /\bcard\b.{0,35}\bused\b.{0,65}\btransaction\b/i.test(text);
  const type: TransactionType | undefined = !declined && hasDebit && (!hasCredit || isCardUse)
    ? "debit"
    : !declined && hasCredit && !hasDebit ? "credit" : undefined;

  const billTotalDue = hasBill
    ? matchMoneyAfter(text, /(?:total (?:amount )?due|statement amount|bill (?:amount|due))/i)
    : undefined;
  const billMinimumDue = hasBill
    ? matchMoneyAfter(text, /minimum (?:amount )?due/i)
    : undefined;
  const billDueDate = hasBill ? parseDate(text) : undefined;
  const availableBalance = matchMoneyAfter(text, /(?:avl\.?|available|current)\s*bal(?:ance)?\.?/i);
  const availableLimit = matchMoneyAfter(text, /(?:avl\.?|available)\s+limit/i);
  const currencySpend = type === "debit" ? text.match(CURRENCY_SPEND) : null;
  const foreignSpend = currencySpend?.[1]?.toUpperCase() === "INR" ? null : currencySpend;
  const foreignCurrency = foreignSpend?.[1]?.toUpperCase();
  const foreignAmount = numberFrom(foreignSpend?.[2]);
  // An Axis foreign-currency alert also quotes the INR available credit limit.
  // That limit is not the transaction amount; wait for an INR posting or review.
  const amount = type && !foreignSpend ? firstTransactionAmount(text, type) : undefined;
  const merchant = extractMerchant(text, type);
  const category = type ? suggestCategory(`${merchant} ${text}`, type) : undefined;
  const isEmi = type === "debit" && /\b(?:EMI|instalments?|installments?)\b/i.test(text);

  let kind: ParsedFinanceMessage["kind"] = "unknown";
  if (hasBill && (billTotalDue !== undefined || billMinimumDue !== undefined)) kind = "bill";
  else if (type && (amount !== undefined || foreignAmount !== undefined)) kind = "transaction";
  else if (availableBalance !== undefined) kind = "balance";

  let confidence = 0.15;
  if (kind === "transaction") confidence = 0.62;
  if (kind === "bill") confidence = 0.65;
  if (accountLastFour) confidence += 0.18;
  if (reference) confidence += 0.1;
  if (merchant) confidence += 0.05;
  if (billDueDate) confidence += 0.1;

  return {
    kind,
    type,
    amount,
    category,
    merchant,
    description: text.slice(0, 500),
    accountLastFour,
    reference,
    availableBalance,
    availableLimit,
    foreignCurrency,
    foreignAmount,
    isEmi,
    billTotalDue,
    billMinimumDue,
    billDueDate,
    confidence: Math.min(0.99, confidence),
  };
}

export function financeMessageHash(userId: string, sender: string, message: string): string {
  return createHash("sha256")
    .update(`${userId}\u0000${sender.trim().toUpperCase()}\u0000${message.replace(/\s+/g, " ").trim()}`)
    .digest("hex");
}
