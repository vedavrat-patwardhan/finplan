import type { LedgerCategory, TransactionType } from "@/lib/finance/constants";

export interface ParsedTransaction {
  /** ISO date (yyyy-mm-dd). */
  date: string;
  /** Full narration text from the statement. */
  description: string;
  /** Cleaned merchant/counterparty name, best-effort. */
  merchant: string;
  amount: number;
  type: TransactionType;
  /** Suggested category — user can override before importing. */
  category: LedgerCategory;
  /** Closing balance after this row, when the statement provides it. */
  balance?: number;
}

export interface ParsedStatement {
  transactions: ParsedTransaction[];
  /** Statement period, when detected. */
  periodStart?: string;
  periodEnd?: string;
  /** Detected account number / last 4, when present. */
  accountNumberLast4?: string;
  /** Rows the parser saw but could not confidently parse. */
  skipped: number;
  /** Credit card total amount due, extracted from the statement summary. */
  totalAmountDue?: number;
  /** Payment due date (ISO yyyy-mm-dd), extracted from the statement summary. */
  paymentDueDate?: string;
}
