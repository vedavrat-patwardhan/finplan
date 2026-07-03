import { cache } from "react";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import {
  PaymentAccount,
  LedgerTransaction,
  Document,
  Expense,
  SavedPassword,
} from "@/lib/db/models";
import { toMonthlyEquivalent } from "@/lib/finance/engine";
import { sortPaymentAccounts } from "@/lib/finance/ledger";
import type { PaymentAccountType, TransactionType, LedgerCategory } from "@/lib/finance/constants";

function oid(userId: string) {
  return new mongoose.Types.ObjectId(userId);
}

export interface PaymentAccountDTO {
  id: string;
  type: PaymentAccountType;
  name: string;
  institution: string;
  holderName: string;
  lastFour: string;
  hasAccountNumber: boolean;
  hasCardNumber: boolean;
  hasCardCvv: boolean;
  ifscCode: string;
  crn: string;
  accountSubtype?: "savings" | "current";
  expiryMonth?: number;
  expiryYear?: number;
  upiId: string;
  openingBalance: number;
  currentBalance: number;
  currency: string;
  creditLimit?: number;
  billingDay?: number;
  monthlySpendTarget?: number;
  isDefault: boolean;
  isFavorite: boolean;
  isActive: boolean;
  notes: string;
}

export interface LedgerTransactionDTO {
  id: string;
  accountId: string;
  accountName: string;
  accountType: PaymentAccountType;
  accountInstitution: string;
  accountLastFour: string;
  type: TransactionType;
  amount: number;
  category: LedgerCategory;
  merchant: string;
  description: string;
  date: string;
  notes: string;
  documentId?: string;
}

export interface DocumentDTO {
  id: string;
  type: string;
  fileName: string;
  mimeType: string;
  size: number;
  periodStart?: string;
  periodEnd?: string;
  accountId?: string;
  manualData: Record<string, unknown>;
  extractionStatus: string;
  createdAt: string;
}

export interface LedgerSummary {
  month: string;
  totalDebits: number;
  totalCredits: number;
  transactionCount: number;
  budgetMonthly: number;
  byCategory: Array<{ category: string; amount: number }>;
}

export const getPaymentAccounts = cache(async (userId: string): Promise<PaymentAccountDTO[]> => {
  await connectDB();
  const items = await PaymentAccount.find({ userId: oid(userId), isActive: true })
    .sort({ isFavorite: -1, isDefault: -1, name: 1 })
    .lean();

  const mapped = items.map((a) => ({
    id: a._id.toString(),
    type: a.type as PaymentAccountType,
    name: a.name,
    institution: a.institution ?? "",
    holderName: a.holderName ?? "",
    lastFour: a.lastFour ?? "",
    hasAccountNumber: Boolean(a.accountNumber),
    hasCardNumber: Boolean(a.cardNumber),
    hasCardCvv: Boolean(a.cardCvv),
    ifscCode: a.ifscCode ?? "",
    crn: a.crn ?? "",
    accountSubtype: a.accountSubtype as "savings" | "current" | undefined,
    expiryMonth: a.expiryMonth ?? undefined,
    expiryYear: a.expiryYear ?? undefined,
    upiId: a.upiId ?? "",
    openingBalance: a.openingBalance,
    currentBalance: a.currentBalance,
    currency: a.currency ?? "INR",
    creditLimit: a.creditLimit ?? undefined,
    billingDay: a.billingDay ?? undefined,
    monthlySpendTarget: a.monthlySpendTarget ?? undefined,
    isDefault: a.isDefault ?? false,
    isFavorite: a.isFavorite ?? false,
    isActive: a.isActive ?? true,
    notes: a.notes ?? "",
  }));

  return sortPaymentAccounts(mapped);
});

export const getTransactions = cache(
  async (
    userId: string,
    options?: { month?: string; accountId?: string; limit?: number }
  ): Promise<LedgerTransactionDTO[]> => {
    await connectDB();

    const filter: Record<string, unknown> = { userId: oid(userId) };

    if (options?.month) {
      const [year, month] = options.month.split("-").map(Number);
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 1);
      filter.date = { $gte: start, $lt: end };
    }

    if (options?.accountId) {
      filter.accountId = new mongoose.Types.ObjectId(options.accountId);
    }

    const items = await LedgerTransaction.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .limit(options?.limit ?? 100)
      .lean();

    const accountIds = [...new Set(items.map((t) => t.accountId.toString()))];
    const accounts = await PaymentAccount.find({
      _id: { $in: accountIds.map((id) => new mongoose.Types.ObjectId(id)) },
    }).lean();
    const accountMap = new Map(accounts.map((a) => [a._id.toString(), a]));

    return items.map((t) => {
      const acc = accountMap.get(t.accountId.toString());
      return {
        id: t._id.toString(),
        accountId: t.accountId.toString(),
        accountName: acc?.name ?? "Unknown",
        accountType: (acc?.type ?? "bank") as PaymentAccountType,
        accountInstitution: acc?.institution ?? "",
        accountLastFour: acc?.lastFour ?? "",
        type: t.type as TransactionType,
        amount: t.amount,
        category: t.category as LedgerCategory,
        merchant: t.merchant ?? "",
        description: t.description ?? "",
        date: t.date.toISOString(),
        notes: t.notes ?? "",
        documentId: t.documentId?.toString(),
      };
    });
  }
);

export const getDocuments = cache(
  async (userId: string, type?: string): Promise<DocumentDTO[]> => {
    await connectDB();
    const filter: Record<string, unknown> = { userId: oid(userId) };
    if (type) filter.type = type;

    const items = await Document.find(filter).sort({ createdAt: -1 }).limit(50).lean();

    return items.map((d) => ({
      id: d._id.toString(),
      type: d.type,
      fileName: d.fileName,
      mimeType: d.mimeType,
      size: d.size,
      periodStart: d.periodStart?.toISOString(),
      periodEnd: d.periodEnd?.toISOString(),
      accountId: d.accountId?.toString(),
      manualData: (d.manualData as Record<string, unknown>) ?? {},
      extractionStatus: d.extractionStatus ?? "none",
      createdAt: d.createdAt.toISOString(),
    }));
  }
);

export async function getLedgerSummary(
  userId: string,
  month?: string
): Promise<LedgerSummary> {
  await connectDB();

  const now = new Date();
  const monthKey =
    month ??
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [year, monthNum] = monthKey.split("-").map(Number);
  const start = new Date(year, monthNum - 1, 1);
  const end = new Date(year, monthNum, 1);

  const [transactions, expenses] = await Promise.all([
    LedgerTransaction.find({
      userId: oid(userId),
      date: { $gte: start, $lt: end },
    }).lean(),
    Expense.find({ userId: oid(userId) }).lean(),
  ]);

  let totalDebits = 0;
  let totalCredits = 0;
  const categoryMap = new Map<string, number>();

  for (const t of transactions) {
    if (t.type === "debit") {
      totalDebits += t.amount;
      categoryMap.set(t.category, (categoryMap.get(t.category) ?? 0) + t.amount);
    } else {
      totalCredits += t.amount;
    }
  }

  const budgetMonthly = expenses.reduce(
    (sum, e) => sum + toMonthlyEquivalent(e.amount, e.frequency),
    0
  );

  return {
    month: monthKey,
    totalDebits,
    totalCredits,
    transactionCount: transactions.length,
    budgetMonthly,
    byCategory: [...categoryMap.entries()]
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount),
  };
}

/** Debit totals per card account for the current (or given) month. */
export async function getCardMonthlySpend(
  userId: string,
  month?: string
): Promise<Record<string, number>> {
  await connectDB();

  const now = new Date();
  const monthKey =
    month ??
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [year, monthNum] = monthKey.split("-").map(Number);
  const start = new Date(year, monthNum - 1, 1);
  const end = new Date(year, monthNum, 1);

  const [cards, transactions] = await Promise.all([
    PaymentAccount.find({
      userId: oid(userId),
      isActive: true,
      type: { $in: ["debit_card", "credit_card"] },
    }).lean(),
    LedgerTransaction.find({
      userId: oid(userId),
      type: "debit",
      date: { $gte: start, $lt: end },
    }).lean(),
  ]);

  const cardIds = new Set(cards.map((c) => c._id.toString()));
  const spend: Record<string, number> = {};

  for (const t of transactions) {
    const accountId = t.accountId.toString();
    if (!cardIds.has(accountId)) continue;
    spend[accountId] = (spend[accountId] ?? 0) + t.amount;
  }

  return spend;
}

export interface SavedPasswordDTO {
  id: string;
  title: string;
  createdAt: string;
}

export const getSavedPasswords = cache(async (userId: string): Promise<SavedPasswordDTO[]> => {
  await connectDB();
  const items = await SavedPassword.find({ userId: oid(userId) })
    .sort({ createdAt: -1 })
    .lean();
  return items.map((p) => ({
    id: p._id.toString(),
    title: p.title,
    createdAt: p.createdAt.toISOString(),
  }));
});
