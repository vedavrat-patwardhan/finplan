"use server";

import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { connectDB } from "@/lib/db/mongoose";
import { CategoryRule, LedgerTransaction } from "@/lib/db/models";
import { LEDGER_CATEGORIES, type LedgerCategory } from "@/lib/finance/constants";
import {
  applyCategoryRules,
  normalizeCategoryKeyword,
  transactionCategoryText,
} from "@/lib/finance/category-rules";
import type { ActionResult } from "@/actions/auth";

const categoryRuleSchema = z.object({
  keyword: z.string().trim().min(2, "Use at least 2 characters").max(80),
  category: z.enum(LEDGER_CATEGORIES),
});

function oid(value: string) {
  return new mongoose.Types.ObjectId(value);
}

function revalidateCategoryPages() {
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/documents");
  revalidatePath("/automations");
}

async function reclassifyLedger(userId: mongoose.Types.ObjectId): Promise<number> {
  const [rules, transactions] = await Promise.all([
    CategoryRule.find({ userId }).lean(),
    LedgerTransaction.find(
      { userId },
      { merchant: 1, description: 1, category: 1 }
    ).lean(),
  ]);

  const normalizedRules = rules.map((rule) => ({
    keyword: rule.normalizedKeyword || rule.keyword,
    category: rule.category as LedgerCategory,
  }));
  const changes = transactions.flatMap((transaction) => {
    const category = applyCategoryRules(
      transactionCategoryText(transaction),
      transaction.category as LedgerCategory,
      normalizedRules
    );
    return category === transaction.category
      ? []
      : [{
          updateOne: {
            filter: { _id: transaction._id, userId },
            update: { $set: { category } },
          },
        }];
  });

  if (changes.length > 0) await LedgerTransaction.bulkWrite(changes);
  return changes.length;
}

export async function saveCategoryRuleAction(
  _previous: ActionResult,
  formData: FormData
): Promise<ActionResult & { updatedTransactions?: number }> {
  const session = await requireSession();
  const parsed = categoryRuleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  await connectDB();
  const userId = oid(session.userId);
  const normalizedKeyword = normalizeCategoryKeyword(parsed.data.keyword);

  try {
    await CategoryRule.findOneAndUpdate(
      { userId, normalizedKeyword },
      {
        $set: {
          keyword: parsed.data.keyword.replace(/\s+/g, " ").trim(),
          normalizedKeyword,
          category: parsed.data.category,
        },
      },
      { upsert: true, new: true }
    );
    const updatedTransactions = await reclassifyLedger(userId);
    revalidateCategoryPages();
    return { success: true, updatedTransactions };
  } catch {
    return { success: false, error: "Could not save this category rule." };
  }
}

export async function deleteCategoryRuleAction(id: string): Promise<ActionResult> {
  const session = await requireSession();
  if (!mongoose.isValidObjectId(id)) {
    return { success: false, error: "Category rule not found" };
  }

  await connectDB();
  const result = await CategoryRule.deleteOne({
    _id: oid(id),
    userId: oid(session.userId),
  });
  if (result.deletedCount === 0) {
    return { success: false, error: "Category rule not found" };
  }

  revalidateCategoryPages();
  return { success: true };
}
