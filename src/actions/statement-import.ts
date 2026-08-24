"use server";

import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { connectDB } from "@/lib/db/mongoose";
import { withTransaction, transactionErrorMessage } from "@/lib/db/transaction";
import { PaymentAccount, LedgerTransaction, SavedPassword } from "@/lib/db/models";
import { decryptSensitive } from "@/lib/crypto/sensitive";
import { transactionBalanceDelta } from "@/lib/finance/ledger";
import {
  parseStatementPdf,
  PdfPasswordError,
  type ParsedTransaction,
} from "@/lib/finance/statement-parsers";
import {
  LEDGER_CATEGORIES,
  STATEMENT_BANKS,
  TRANSACTION_TYPES,
  type PaymentAccountType,
  type StatementBank,
} from "@/lib/finance/constants";
import type { ActionResult } from "./auth";

const MAX_PDF_BYTES = 15 * 1024 * 1024;

export interface ExtractStatementResult extends ActionResult {
  transactions?: ParsedTransaction[];
  periodStart?: string;
  periodEnd?: string;
  accountNumberLast4?: string;
  /** Set when the failure was specifically a password problem, so the UI can prompt. */
  needsPassword?: "missing" | "incorrect";
  /** Credit card total amount due from statement summary, if detected. */
  totalAmountDue?: number;
  /** Credit card payment due date (ISO yyyy-mm-dd), if detected. */
  paymentDueDate?: string;
  /** Absolute closing balance reported by a bank-account statement. */
  closingBalance?: number;
}

function userObjectId(userId: string) {
  return new mongoose.Types.ObjectId(userId);
}

async function resolvePassword(
  userId: string,
  rawPassword: string,
  savedPasswordId: string
): Promise<string> {
  if (savedPasswordId) {
    await connectDB();
    const saved = await SavedPassword.findOne({
      _id: new mongoose.Types.ObjectId(savedPasswordId),
      userId: userObjectId(userId),
    }).lean();
    if (saved) return decryptSensitive(saved.encryptedValue);
  }
  return rawPassword;
}

export async function extractStatementAction(
  _prev: ExtractStatementResult,
  formData: FormData
): Promise<ExtractStatementResult> {
  const session = await requireSession();

  const bank = String(formData.get("bank") ?? "") as StatementBank;
  if (!STATEMENT_BANKS.includes(bank)) {
    return { success: false, error: "Unsupported bank" };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "Please choose a PDF file" };
  }
  if (file.size > MAX_PDF_BYTES) {
    return { success: false, error: "File must be under 15 MB" };
  }

  const password = await resolvePassword(
    session.userId,
    String(formData.get("password") ?? ""),
    String(formData.get("savedPasswordId") ?? "")
  );

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const parsed = await parseStatementPdf(bank, buffer, password);
    if (parsed.transactions.length === 0) {
      return {
        success: false,
        error:
          "No transactions found. The statement layout may differ from the supported format.",
      };
    }
    return {
      success: true,
      transactions: parsed.transactions,
      periodStart: parsed.periodStart,
      periodEnd: parsed.periodEnd,
      accountNumberLast4: parsed.accountNumberLast4,
      totalAmountDue: parsed.totalAmountDue,
      paymentDueDate: parsed.paymentDueDate,
      closingBalance: parsed.closingBalance,
    };
  } catch (err) {
    if (err instanceof PdfPasswordError) {
      return {
        success: false,
        needsPassword: err.kind,
        error:
          err.kind === "missing"
            ? "This PDF is password protected. Enter its password."
            : "Incorrect password. Please try again.",
      };
    }
    return { success: false, error: transactionErrorMessage(err) };
  }
}

interface ImportTxnInput {
  date: string;
  amount: number;
  type: string;
  category: string;
  merchant: string;
  description: string;
}

/** Dedup key: day-level date + amount + type + description. */
function txnDedupKey(date: Date, amount: number, type: string, description: string): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}|${amount}|${type}|${description}`;
}

export async function importStatementTransactionsAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult & { imported?: number; duplicates?: number; balanceUpdated?: boolean }> {
  const session = await requireSession();

  const accountId = String(formData.get("accountId") ?? "");
  if (!accountId) return { success: false, error: "Select an account" };

  const billTotalDue = Number(formData.get("billTotalDue") ?? 0) || 0;
  const billDueDate = String(formData.get("billDueDate") ?? "");
  const rawClosingBalance = String(formData.get("statementClosingBalance") ?? "").trim();
  const statementClosingBalance = rawClosingBalance ? Number(rawClosingBalance) : undefined;
  if (statementClosingBalance !== undefined && !Number.isFinite(statementClosingBalance)) {
    return { success: false, error: "Invalid statement closing balance" };
  }

  let rows: ImportTxnInput[];
  try {
    rows = JSON.parse(String(formData.get("transactions") ?? "[]"));
  } catch {
    return { success: false, error: "Invalid transaction data" };
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    return { success: false, error: "No transactions selected" };
  }

  // Validate every row up front.
  const clean = rows.map((r) => ({
    date: new Date(r.date),
    amount: Number(r.amount),
    type: TRANSACTION_TYPES.includes(r.type as never) ? r.type : null,
    category: LEDGER_CATEGORIES.includes(r.category as never)
      ? r.category
      : "Miscellaneous",
    merchant: String(r.merchant ?? "").slice(0, 120),
    description: String(r.description ?? "").slice(0, 300),
  }));
  if (clean.some((r) => !r.type || !(r.amount >= 0) || isNaN(r.date.getTime()))) {
    return { success: false, error: "Some transactions are invalid" };
  }

  let imported = 0;
  let duplicates = 0;
  let balanceUpdated = false;

  try {
    await withTransaction(async (dbSession) => {
      const account = await PaymentAccount.findOne({
        _id: new mongoose.Types.ObjectId(accountId),
        userId: userObjectId(session.userId),
        isActive: true,
      }).session(dbSession);
      if (!account) throw new Error("Account not found");

      // Query existing transactions covering the batch's date window.
      const dateTimes = clean.map((r) => r.date.getTime());
      const windowStart = new Date(Math.min(...dateTimes));
      const windowEnd = new Date(Math.max(...dateTimes));
      windowStart.setUTCHours(0, 0, 0, 0);
      windowEnd.setUTCHours(23, 59, 59, 999);

      const existing = await LedgerTransaction.find(
        { accountId: account._id, date: { $gte: windowStart, $lte: windowEnd } },
        { date: 1, amount: 1, type: 1, description: 1 },
        { session: dbSession }
      ).lean();

      const existingKeys = new Set(
        existing.map((t) =>
          txnDedupKey(new Date(t.date as Date), t.amount, t.type, (t.description as string) ?? "")
        )
      );

      const fresh = clean.filter(
        (r) => !existingKeys.has(txnDedupKey(r.date, r.amount, r.type as string, r.description))
      );
      duplicates = clean.length - fresh.length;
      imported = fresh.length;

      if (fresh.length > 0) {
        await LedgerTransaction.insertMany(
          fresh.map((r) => ({
            userId: userObjectId(session.userId),
            accountId: account._id,
            type: r.type,
            amount: r.amount,
            category: r.category,
            merchant: r.merchant,
            description: r.description,
            date: r.date,
            source: "statement",
          })),
          { session: dbSession }
        );
      }

      if (account.type === "bank" && statementClosingBalance !== undefined) {
        await PaymentAccount.findByIdAndUpdate(
          account._id,
          { $set: { currentBalance: statementClosingBalance } },
          { session: dbSession }
        );
        balanceUpdated = true;
      } else if (fresh.length > 0) {
        const netDelta = fresh.reduce(
          (sum, r) =>
            sum +
            transactionBalanceDelta(
              account.type as PaymentAccountType,
              r.type as "debit" | "credit",
              r.amount,
              "apply"
            ),
          0
        );
        await PaymentAccount.findByIdAndUpdate(
          account._id,
          { $inc: { currentBalance: netDelta } },
          { session: dbSession }
        );
      }

      // Update credit card bill due if the statement provided that data
      if (account.type === "credit_card" && billTotalDue > 0 && billDueDate) {
        await PaymentAccount.findByIdAndUpdate(
          account._id,
          { billTotalDue, billDueDate: new Date(billDueDate) },
          { session: dbSession }
        );
      }
    });
  } catch (error) {
    return { success: false, error: transactionErrorMessage(error) };
  }

  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  revalidatePath("/accounts");
  revalidatePath("/documents");
  return { success: true, imported, duplicates, balanceUpdated };
}
