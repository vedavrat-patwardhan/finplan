"use server";

import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import {
  Expense,
  IncomeSource,
  InsurancePolicy,
  Investment,
  LedgerTransaction,
  ObligationEvent,
  OBLIGATION_SOURCE_TYPES,
  PaymentAccount,
} from "@/lib/db/models";
import { withTransaction, transactionErrorMessage } from "@/lib/db/transaction";
import { calculateInvestmentMetrics } from "@/lib/finance/investment-metrics";
import { type PaymentAccountType } from "@/lib/finance/constants";
import { transactionBalanceDelta } from "@/lib/finance/ledger";
import {
  getAllowedLedgerCategoryNames,
  resolveAllowedLedgerCategory,
} from "@/lib/finance/ledger-categories";
import type { ActionResult } from "@/actions/auth";

const obligationIdentitySchema = z.object({
  sourceType: z.enum(OBLIGATION_SOURCE_TYPES),
  sourceId: z.string().refine(mongoose.isValidObjectId, "Obligation not found"),
  dueDate: z.coerce.date(),
});

const paidObligationSchema = obligationIdentitySchema.extend({
  mode: z.enum(["link", "create"]),
  transactionId: z.string().optional(),
  accountId: z.string().optional(),
  transactionDate: z.coerce.date().optional(),
  category: z.string().trim().min(1).max(40),
});

type ObligationIdentity = z.infer<typeof obligationIdentitySchema>;

interface ResolvedObligation {
  name: string;
  amount: number;
  dueDate: Date;
}

class ObligationActionError extends Error {}

function oid(value: string) {
  return new mongoose.Types.ObjectId(value);
}

function dayKey(value: Date): string {
  return new Date(value).toISOString().slice(0, 10);
}

function addFrequency(date: Date, frequency: string): Date | undefined {
  const result = new Date(date);
  const months =
    frequency === "monthly"
      ? 1
      : frequency === "quarterly"
        ? 3
        : frequency === "half_yearly"
          ? 6
          : frequency === "yearly"
            ? 12
            : 0;
  if (!months) return undefined;

  const day = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDay));
  return result;
}

async function resolveObligation(
  userId: mongoose.Types.ObjectId,
  input: ObligationIdentity,
  dbSession: mongoose.ClientSession
): Promise<ResolvedObligation> {
  const sourceId = oid(input.sourceId);

  if (input.sourceType === "investment") {
    const item = await Investment.findOne({ _id: sourceId, userId }).session(dbSession).lean();
    if (!item) throw new ObligationActionError("Investment not found");
    const scheduledMetrics = calculateInvestmentMetrics({
      amount: item.amount,
      frequency: item.frequency,
      startDate: new Date(item.startDate ?? item.createdAt),
      investmentType: item.type,
      deductionDay: item.deductionDay ?? undefined,
      asOf: new Date(input.dueDate),
    });
    const matchingDate = [scheduledMetrics.nextPaymentOn, scheduledMetrics.lastPaidOn]
      .filter((date): date is Date => Boolean(date))
      .find((date) => dayKey(date) === dayKey(input.dueDate));
    if (!matchingDate) {
      throw new ObligationActionError("This investment payment is no longer pending");
    }
    return { name: item.name, amount: item.amount, dueDate: matchingDate };
  }

  if (input.sourceType === "insurance") {
    const item = await InsurancePolicy.findOne({ _id: sourceId, userId }).session(dbSession).lean();
    if (!item?.renewalDate || dayKey(item.renewalDate) !== dayKey(input.dueDate)) {
      throw new ObligationActionError("This insurance premium is no longer pending");
    }
    return { name: item.name, amount: item.premium, dueDate: new Date(item.renewalDate) };
  }

  if (input.sourceType === "credit_card_bill") {
    const item = await PaymentAccount.findOne({
      _id: sourceId,
      userId,
      type: "credit_card",
      isActive: true,
      billTotalDue: { $gt: 0 },
    })
      .session(dbSession)
      .lean();
    if (!item?.billDueDate || dayKey(item.billDueDate) !== dayKey(input.dueDate)) {
      throw new ObligationActionError("This credit-card bill is no longer pending");
    }
    return {
      name: `${item.name} bill`,
      amount: item.billTotalDue,
      dueDate: new Date(item.billDueDate),
    };
  }

  if (input.sourceType === "expense") {
    const item = await Expense.findOne({ _id: sourceId, userId }).session(dbSession).lean();
    if (!item) throw new ObligationActionError("Obligation not found");
    return { name: item.name, amount: item.amount, dueDate: input.dueDate };
  }

  const item = await IncomeSource.findOne({ _id: sourceId, userId }).session(dbSession).lean();
  if (!item) throw new ObligationActionError("Obligation not found");
  return { name: item.name, amount: item.amount, dueDate: input.dueDate };
}

async function ensureNotHandled(
  userId: mongoose.Types.ObjectId,
  input: ObligationIdentity,
  dueDate: Date,
  dbSession: mongoose.ClientSession
) {
  const existing = await ObligationEvent.findOne({
    userId,
    sourceType: input.sourceType,
    sourceId: oid(input.sourceId),
    dueDate,
  }).session(dbSession);
  if (existing) throw new ObligationActionError("This obligation was already handled");
}

function revalidateObligations() {
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  revalidatePath("/accounts");
  revalidatePath("/investments");
  revalidatePath("/insurance");
}

export async function skipObligationAction(formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = obligationIdentitySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };

  try {
    await withTransaction(async (dbSession) => {
      const userId = oid(session.userId);
      const obligation = await resolveObligation(userId, parsed.data, dbSession);
      await ensureNotHandled(userId, parsed.data, obligation.dueDate, dbSession);
      await ObligationEvent.create(
        [{
          userId,
          sourceType: parsed.data.sourceType,
          sourceId: oid(parsed.data.sourceId),
          dueDate: obligation.dueDate,
          status: "skipped",
          amount: obligation.amount,
        }],
        { session: dbSession }
      );

      if (parsed.data.sourceType === "insurance") {
        const policy = await InsurancePolicy.findOne({
          _id: oid(parsed.data.sourceId),
          userId,
        }).session(dbSession);
        if (!policy) throw new ObligationActionError("Insurance policy not found");
        const nextRenewal = addFrequency(obligation.dueDate, policy.frequency);
        if (nextRenewal) {
          await InsurancePolicy.updateOne(
            { _id: policy._id, userId },
            { $set: { renewalDate: nextRenewal } },
            { session: dbSession }
          );
        }
      }
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof ObligationActionError ? error.message : transactionErrorMessage(error),
    };
  }

  revalidateObligations();
  return { success: true };
}

export async function payObligationAction(
  formData: FormData
): Promise<ActionResult & { createdTransaction?: boolean }> {
  const session = await requireSession();
  const parsed = paidObligationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };

  let createdTransaction = false;
  try {
    await withTransaction(async (dbSession) => {
      const userId = oid(session.userId);
      const obligation = await resolveObligation(userId, parsed.data, dbSession);
      await ensureNotHandled(userId, parsed.data, obligation.dueDate, dbSession);
      const category = resolveAllowedLedgerCategory(
        parsed.data.category,
        await getAllowedLedgerCategoryNames(userId, dbSession)
      );
      if (!category) throw new ObligationActionError("Choose one of your ledger categories");
      const expectedType = parsed.data.sourceType === "income" ? "credit" : "debit";
      let transaction;

      if (parsed.data.mode === "link") {
        if (!parsed.data.transactionId || !mongoose.isValidObjectId(parsed.data.transactionId)) {
          throw new ObligationActionError("Select a ledger transaction");
        }
        transaction = await LedgerTransaction.findOne({
          _id: oid(parsed.data.transactionId),
          userId,
          type: expectedType,
        }).session(dbSession);
        if (!transaction) throw new ObligationActionError("Ledger transaction not found");

        const alreadyLinked = await ObligationEvent.findOne({
          userId,
          transactionId: transaction._id,
        }).session(dbSession);
        if (alreadyLinked) {
          throw new ObligationActionError("That ledger transaction is linked to another obligation");
        }
        transaction.category = category;
        await transaction.save({ session: dbSession });
      } else {
        if (!parsed.data.accountId || !mongoose.isValidObjectId(parsed.data.accountId)) {
          throw new ObligationActionError("Select a payment account");
        }
        const account = await PaymentAccount.findOne({
          _id: oid(parsed.data.accountId),
          userId,
          isActive: true,
          ...(parsed.data.sourceType === "credit_card_bill"
            ? { type: { $nin: ["credit_card", "debit_card"] } }
            : { type: { $ne: "debit_card" } }),
        }).session(dbSession);
        if (!account) throw new ObligationActionError("Payment account not found");

        const transactionDate = parsed.data.transactionDate ?? new Date();
        const [created] = await LedgerTransaction.create(
          [{
            userId,
            accountId: account._id,
            type: expectedType,
            amount: obligation.amount,
            category,
            merchant: obligation.name,
            description: `Payment for ${obligation.name}`,
            date: transactionDate,
            tags: ["obligation"],
            source: "manual",
          }],
          { session: dbSession }
        );
        transaction = created;
        createdTransaction = true;
        await PaymentAccount.findByIdAndUpdate(
          account._id,
          {
            $inc: {
              currentBalance: transactionBalanceDelta(
                account.type as PaymentAccountType,
                expectedType,
                obligation.amount
              ),
            },
          },
          { session: dbSession }
        );
      }

      await ObligationEvent.create(
        [{
          userId,
          sourceType: parsed.data.sourceType,
          sourceId: oid(parsed.data.sourceId),
          dueDate: obligation.dueDate,
          status: "paid",
          amount: transaction.amount,
          transactionId: transaction._id,
          paidAt: transaction.date,
        }],
        { session: dbSession }
      );

      if (parsed.data.sourceType === "investment") {
        await Investment.updateOne(
          { _id: oid(parsed.data.sourceId), userId },
          { $set: { lastPaidDate: obligation.dueDate } },
          { session: dbSession }
        );
      } else if (parsed.data.sourceType === "insurance") {
        const policy = await InsurancePolicy.findOne({
          _id: oid(parsed.data.sourceId),
          userId,
        }).session(dbSession);
        if (!policy) throw new ObligationActionError("Insurance policy not found");
        const nextRenewal = addFrequency(obligation.dueDate, policy.frequency);
        await InsurancePolicy.updateOne(
          { _id: policy._id, userId },
          {
            $set: {
              lastPremiumPaidDate: transaction.date,
              ...(nextRenewal ? { renewalDate: nextRenewal } : {}),
            },
            $inc: { totalPremiumPaid: transaction.amount },
          },
          { session: dbSession }
        );
      } else if (parsed.data.sourceType === "credit_card_bill") {
        await PaymentAccount.updateOne(
          { _id: oid(parsed.data.sourceId), userId },
          { $set: { billTotalDue: 0 }, $unset: { billDueDate: "" } },
          { session: dbSession }
        );
      }
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof ObligationActionError ? error.message : transactionErrorMessage(error),
    };
  }

  revalidateObligations();
  return { success: true, createdTransaction };
}
