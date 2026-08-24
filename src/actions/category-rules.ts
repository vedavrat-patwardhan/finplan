"use server";

import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { connectDB } from "@/lib/db/mongoose";
import { CategoryRule, LedgerCategoryModel, LedgerTransaction } from "@/lib/db/models";
import {
  applyCategoryRules,
  normalizeCategoryKeyword,
  transactionCategoryText,
} from "@/lib/finance/category-rules";
import {
  getAllowedLedgerCategoryNames,
  isBuiltInLedgerCategory,
  normalizeLedgerCategoryName,
  resolveAllowedLedgerCategory,
} from "@/lib/finance/ledger-categories";
import type { ActionResult } from "@/actions/auth";

const categoryRuleSchema = z.object({
  keyword: z.string().trim().min(2, "Use at least 2 characters").max(80),
  category: z.string().trim().min(1).max(40),
});

const customCategorySchema = z.object({
  name: z.string().trim().min(2, "Use at least 2 characters").max(40),
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
    category: rule.category,
  }));
  const changes = transactions.flatMap((transaction) => {
    const category = applyCategoryRules(
      transactionCategoryText(transaction),
      transaction.category,
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
  const allowedCategories = await getAllowedLedgerCategoryNames(userId);
  const category = resolveAllowedLedgerCategory(parsed.data.category, allowedCategories);
  if (!category) {
    return { success: false, error: "Choose one of your ledger categories" };
  }

  try {
    await CategoryRule.findOneAndUpdate(
      { userId, normalizedKeyword },
      {
        $set: {
          keyword: parsed.data.keyword.replace(/\s+/g, " ").trim(),
          normalizedKeyword,
          category,
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

export async function createCustomLedgerCategoryAction(
  _previous: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = customCategorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const name = parsed.data.name.replace(/\s+/g, " ").trim();
  if (isBuiltInLedgerCategory(name)) {
    return { success: false, error: "That category already exists" };
  }

  await connectDB();
  const userId = oid(session.userId);
  const categoryCount = await LedgerCategoryModel.countDocuments({ userId });
  if (categoryCount >= 30) {
    return { success: false, error: "You can add up to 30 custom categories" };
  }

  try {
    await LedgerCategoryModel.create({
      userId,
      name,
      normalizedName: normalizeLedgerCategoryName(name),
    });
  } catch (error) {
    if (error instanceof mongoose.mongo.MongoServerError && error.code === 11000) {
      return { success: false, error: "That category already exists" };
    }
    return { success: false, error: "Could not add this category" };
  }

  revalidateCategoryPages();
  return { success: true };
}

export async function deleteCustomLedgerCategoryAction(id: string): Promise<ActionResult> {
  const session = await requireSession();
  if (!mongoose.isValidObjectId(id)) {
    return { success: false, error: "Category not found" };
  }

  await connectDB();
  const userId = oid(session.userId);
  const category = await LedgerCategoryModel.findOne({ _id: oid(id), userId }).lean();
  if (!category) return { success: false, error: "Category not found" };

  const [transactionCount, ruleCount] = await Promise.all([
    LedgerTransaction.countDocuments({ userId, category: category.name }),
    CategoryRule.countDocuments({ userId, category: category.name }),
  ]);
  if (transactionCount > 0 || ruleCount > 0) {
    return {
      success: false,
      error: "This category is in use. Reassign its transactions and rules before removing it.",
    };
  }

  await LedgerCategoryModel.deleteOne({ _id: category._id, userId });
  revalidateCategoryPages();
  return { success: true };
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
