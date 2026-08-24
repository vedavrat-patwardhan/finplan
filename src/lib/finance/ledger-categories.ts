import mongoose from "mongoose";
import { LedgerCategoryModel } from "@/lib/db/models";
import { LEDGER_CATEGORIES } from "@/lib/finance/constants";

export function normalizeLedgerCategoryName(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLocaleUpperCase("en-IN");
}

export function isBuiltInLedgerCategory(value: string): boolean {
  const normalized = normalizeLedgerCategoryName(value);
  return LEDGER_CATEGORIES.some(
    (category) => normalizeLedgerCategoryName(category) === normalized
  );
}

export async function getAllowedLedgerCategoryNames(
  userId: mongoose.Types.ObjectId,
  dbSession?: mongoose.ClientSession
): Promise<string[]> {
  const query = LedgerCategoryModel.find({ userId }).select({ name: 1 });
  if (dbSession) query.session(dbSession);
  const custom = await query.lean();
  return [...LEDGER_CATEGORIES, ...custom.map((category) => category.name)];
}

export function resolveAllowedLedgerCategory(
  value: string,
  allowedCategories: string[]
): string | undefined {
  const normalized = normalizeLedgerCategoryName(value);
  return allowedCategories.find(
    (category) => normalizeLedgerCategoryName(category) === normalized
  );
}
