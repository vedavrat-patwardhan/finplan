"use server";

import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { withTransaction, transactionErrorMessage } from "@/lib/db/transaction";
import {
  User,
  IncomeSource,
  Expense,
  Investment,
  InsurancePolicy,
  LifeGoal,
} from "@/lib/db/models";
import { requireSession, refreshSession } from "@/lib/auth/session";
import {
  profileSchema,
  incomeSchema,
  expenseSchema,
  investmentSchema,
  investmentUpdateSchema,
  insuranceSchema,
  goalSchema,
  onboardingSchema,
} from "@/lib/validations/finance";
import {
  DEFAULT_EXPENSE_TEMPLATES,
  DEFAULT_INVESTMENT_TEMPLATES,
  ONBOARDING_GOAL_OPTIONS,
} from "@/lib/finance/constants";
import { breakdownSalaryPackage } from "@/lib/finance/tax";
import { addMonths } from "@/lib/format";
import {
  resolveAbsoluteReturnPct,
  resolveLumpSumMode,
} from "@/lib/finance/investment-metrics";
import type { ActionResult } from "./auth";
import type { z } from "zod";

type InvestmentPayload = z.infer<typeof investmentSchema>;

function normalizeInvestmentPayload(data: InvestmentPayload) {
  const { currentValue: _currentValue, returnSource: _returnSource, ...rest } = data;

  if (rest.type === "lump_sum") {
    const lumpSumMode = resolveLumpSumMode({
      monthlyWithdrawalPct: rest.monthlyWithdrawalPct,
      absoluteReturnPct: rest.absoluteReturnPct,
      lumpSumMode: data.lumpSumMode,
    });

    if (lumpSumMode === "withdrawal") {
      return {
        ...rest,
        frequency: "one_time" as const,
        absoluteReturnPct: undefined,
        deductionDay: undefined,
        lastPaidDate: undefined,
      };
    }

    const absoluteReturnPct = resolveAbsoluteReturnPct({
      amount: rest.amount,
      frequency: "one_time",
      startDate: rest.startDate,
      absoluteReturnPct: rest.absoluteReturnPct,
      currentValue: data.currentValue,
      returnSource: data.returnSource,
    });

    return {
      ...rest,
      frequency: "one_time" as const,
      absoluteReturnPct,
      monthlyWithdrawalPct: undefined,
      deductionDay: undefined,
      lastPaidDate: undefined,
    };
  }

  const absoluteReturnPct = resolveAbsoluteReturnPct({
    amount: rest.amount,
    frequency: rest.frequency,
    startDate: rest.startDate,
    deductionDay: rest.deductionDay,
    lastPaidDate: rest.lastPaidDate,
    absoluteReturnPct: rest.absoluteReturnPct,
    currentValue: data.currentValue,
    returnSource: data.returnSource,
  });

  return {
    ...rest,
    absoluteReturnPct,
    monthlyWithdrawalPct: undefined,
  };
}

function revalidateFinance() {
  revalidatePath("/dashboard");
  revalidatePath("/income");
  revalidatePath("/expenses");
  revalidatePath("/investments");
  revalidatePath("/insurance");
  revalidatePath("/goals");
  revalidatePath("/cashflow");
  revalidatePath("/calculators");
}

function userObjectId(userId: string) {
  return new mongoose.Types.ObjectId(userId);
}

export async function updateProfileAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await requireSession();

  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    monthlyTakeHome: formData.get("monthlyTakeHome"),
    inflationRate: formData.get("inflationRate"),
    bonusSpreadMonthly: formData.get("bonusSpreadMonthly") === "on",
    retirementMultiplier: formData.get("retirementMultiplier"),
    useCompactNumbers: formData.get("useCompactNumbers") === "on",
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  try {
    await withTransaction(async (dbSession) => {
      await User.findByIdAndUpdate(session.userId, parsed.data, { session: dbSession });
    });
  } catch (error) {
    return { success: false, error: transactionErrorMessage(error) };
  }

  revalidateFinance();
  revalidatePath("/settings");
  return { success: true };
}

export async function createIncomeAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = incomeSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  try {
    await withTransaction(async (dbSession) => {
      await IncomeSource.create(
        [{ ...parsed.data, userId: userObjectId(session.userId) }],
        { session: dbSession }
      );
    });
  } catch (error) {
    return { success: false, error: transactionErrorMessage(error) };
  }

  revalidateFinance();
  return { success: true };
}

export async function deleteIncomeAction(id: string): Promise<ActionResult> {
  const session = await requireSession();

  try {
    await withTransaction(async (dbSession) => {
      await IncomeSource.deleteOne(
        { _id: id, userId: userObjectId(session.userId) },
        { session: dbSession }
      );
    });
  } catch (error) {
    return { success: false, error: transactionErrorMessage(error) };
  }

  revalidateFinance();
  return { success: true };
}

export async function createExpenseAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = expenseSchema.safeParse({
    ...Object.fromEntries(formData),
    isEssential: formData.get("isEssential") === "on" || formData.get("isEssential") === "true",
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  try {
    await withTransaction(async (dbSession) => {
      await Expense.create(
        [{ ...parsed.data, userId: userObjectId(session.userId) }],
        { session: dbSession }
      );
    });
  } catch (error) {
    return { success: false, error: transactionErrorMessage(error) };
  }

  revalidateFinance();
  return { success: true };
}

export async function deleteExpenseAction(id: string): Promise<ActionResult> {
  const session = await requireSession();

  try {
    await withTransaction(async (dbSession) => {
      await Expense.deleteOne(
        { _id: id, userId: userObjectId(session.userId) },
        { session: dbSession }
      );
    });
  } catch (error) {
    return { success: false, error: transactionErrorMessage(error) };
  }

  revalidateFinance();
  return { success: true };
}

export async function createInvestmentAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = investmentSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const payload = normalizeInvestmentPayload(parsed.data);

  try {
    await withTransaction(async (dbSession) => {
      await Investment.create(
        [{ ...payload, userId: userObjectId(session.userId) }],
        { session: dbSession }
      );
    });
  } catch (error) {
    return { success: false, error: transactionErrorMessage(error) };
  }

  revalidateFinance();
  return { success: true };
}

export async function updateInvestmentAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = investmentUpdateSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const { id, ...data } = parsed.data;
  const payload = normalizeInvestmentPayload(data);
  const updateDoc: Record<string, unknown> = { ...payload };
  const unsetDoc: Record<string, ""> = {};

  for (const key of [
    "deductionDay",
    "absoluteReturnPct",
    "lastPaidDate",
    "monthlyWithdrawalPct",
  ] as const) {
    if (payload[key] === undefined) {
      delete updateDoc[key];
      unsetDoc[key] = "";
    }
  }

  try {
    const updated = await withTransaction(async (dbSession) =>
      Investment.findOneAndUpdate(
        { _id: id, userId: userObjectId(session.userId) },
        {
          $set: updateDoc,
          ...(Object.keys(unsetDoc).length ? { $unset: unsetDoc } : {}),
        },
        { session: dbSession, new: true }
      )
    );

    if (!updated) {
      return { success: false, error: "Investment not found" };
    }
  } catch (error) {
    return { success: false, error: transactionErrorMessage(error) };
  }

  revalidateFinance();
  return { success: true };
}

export async function deleteInvestmentAction(id: string): Promise<ActionResult> {
  const session = await requireSession();

  try {
    await withTransaction(async (dbSession) => {
      await Investment.deleteOne(
        { _id: id, userId: userObjectId(session.userId) },
        { session: dbSession }
      );
    });
  } catch (error) {
    return { success: false, error: transactionErrorMessage(error) };
  }

  revalidateFinance();
  return { success: true };
}

export async function createInsuranceAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = insuranceSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  try {
    await withTransaction(async (dbSession) => {
      await InsurancePolicy.create(
        [{ ...parsed.data, userId: userObjectId(session.userId) }],
        { session: dbSession }
      );
    });
  } catch (error) {
    return { success: false, error: transactionErrorMessage(error) };
  }

  revalidateFinance();
  return { success: true };
}

export async function deleteInsuranceAction(id: string): Promise<ActionResult> {
  const session = await requireSession();

  try {
    await withTransaction(async (dbSession) => {
      await InsurancePolicy.deleteOne(
        { _id: id, userId: userObjectId(session.userId) },
        { session: dbSession }
      );
    });
  } catch (error) {
    return { success: false, error: transactionErrorMessage(error) };
  }

  revalidateFinance();
  return { success: true };
}

export async function createGoalAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = goalSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const { notes, ...data } = parsed.data;

  try {
    await withTransaction(async (dbSession) => {
      await LifeGoal.create(
        [
          {
            ...data,
            assumptions: { notes },
            userId: userObjectId(session.userId),
          },
        ],
        { session: dbSession }
      );
    });
  } catch (error) {
    return { success: false, error: transactionErrorMessage(error) };
  }

  revalidateFinance();
  return { success: true };
}

export async function deleteGoalAction(id: string): Promise<ActionResult> {
  const session = await requireSession();

  try {
    await withTransaction(async (dbSession) => {
      await LifeGoal.deleteOne(
        { _id: id, userId: userObjectId(session.userId) },
        { session: dbSession }
      );
    });
  } catch (error) {
    return { success: false, error: transactionErrorMessage(error) };
  }

  revalidateFinance();
  return { success: true };
}

export async function completeOnboardingAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await requireSession();

  const expenseTemplates = formData.getAll("expenseTemplates") as string[];
  const investmentTemplates = formData.getAll("investmentTemplates") as string[];
  const goalOptions = formData.getAll("goalOptions") as string[];
  const skipIncome = formData.get("skipIncome") === "true";

  const parsed = onboardingSchema.safeParse({
    name: formData.get("name"),
    annualInHandSalary: formData.get("annualInHandSalary"),
    annualInHandBonus: formData.get("annualInHandBonus"),
    taxRegime: formData.get("taxRegime") ?? "new",
    skipIncome,
    selectedExpenseTemplates: expenseTemplates,
    selectedInvestmentTemplates: investmentTemplates,
    selectedGoalOptions: goalOptions,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const {
    name,
    annualInHandSalary = 0,
    annualInHandBonus = 0,
    taxRegime,
    selectedExpenseTemplates,
    selectedInvestmentTemplates,
    selectedGoalOptions,
  } = parsed.data;
  const userId = userObjectId(session.userId);

  let monthlyTakeHome = 0;
  let packageBreakdown = null;

  if (!skipIncome && (annualInHandSalary > 0 || annualInHandBonus > 0)) {
    packageBreakdown = breakdownSalaryPackage({
      annualInHandSalary,
      annualInHandBonus,
      taxRegime,
    });
    monthlyTakeHome = packageBreakdown.monthlyInHandSalary;
  }

  try {
    await withTransaction(async (dbSession) => {
      await User.findByIdAndUpdate(
        session.userId,
        {
          name,
          monthlyTakeHome,
          annualInHandSalary,
          annualInHandBonus,
          taxRegime,
          onboardingCompleted: true,
        },
        { session: dbSession }
      );

      if (packageBreakdown) {
        if (annualInHandSalary > 0) {
          await IncomeSource.create(
            [
              {
                userId,
                name: "Monthly Salary (in-hand)",
                type: "salary",
                amount: packageBreakdown.monthlyInHandSalary,
                frequency: "monthly",
                isNetAmount: true,
                grossAmount: packageBreakdown.estimatedGrossSalary / 12,
                estimatedTax: packageBreakdown.estimatedSalaryTax / 12,
                notes: `Annual in-hand ₹${annualInHandSalary.toLocaleString("en-IN")} · FY 2025-26 ${taxRegime} regime`,
              },
            ],
            { session: dbSession }
          );
        }
        if (annualInHandBonus > 0) {
          await IncomeSource.create(
            [
              {
                userId,
                name: "Annual Bonus (in-hand)",
                type: "bonus",
                amount: annualInHandBonus,
                frequency: "yearly",
                isNetAmount: true,
                grossAmount: packageBreakdown.estimatedGrossBonus,
                estimatedTax: packageBreakdown.estimatedBonusTax,
                notes: "After TDS at payment · not spread monthly",
              },
            ],
            { session: dbSession }
          );
        }
      }

      for (const key of selectedExpenseTemplates) {
        const idx = parseInt(key, 10);
        const template = DEFAULT_EXPENSE_TEMPLATES[idx];
        if (template) {
          await Expense.create([{ userId, ...template }], { session: dbSession });
        }
      }

      for (const key of selectedInvestmentTemplates) {
        const idx = parseInt(key, 10);
        const template = DEFAULT_INVESTMENT_TEMPLATES[idx];
        if (template) {
          await Investment.create(
            [{ userId, ...template, startDate: new Date() }],
            { session: dbSession }
          );
        }
      }

      for (const optionId of selectedGoalOptions) {
        const option = ONBOARDING_GOAL_OPTIONS.find((o) => o.id === optionId);
        if (option) {
          await LifeGoal.create(
            [
              {
                userId,
                title: option.title,
                goalType: option.goalType,
                status: option.status,
                targetAmount: option.targetAmount,
                targetDate:
                  option.status === "completed"
                    ? new Date()
                    : addMonths(new Date(), option.monthsFromNow),
                currentSaved: option.status === "completed" ? option.targetAmount : 0,
                monthlyContribution: 0,
                priority: option.status === "completed" ? -1 : 0,
              },
            ],
            { session: dbSession }
          );
        }
      }
    });
  } catch (error) {
    return { success: false, error: transactionErrorMessage(error) };
  }

  revalidateFinance();
  await refreshSession({ onboardingCompleted: true });
  return { success: true };
}

export async function exportSummaryAction(): Promise<string> {
  const session = await requireSession();
  const { getDashboardData, getCashflowBreakdown } = await import(
    "@/lib/db/queries/finance"
  );

  const [dashboard, cashflow] = await Promise.all([
    getDashboardData(session.userId),
    getCashflowBreakdown(session.userId),
  ]);

  const rows = [
    ["Metric", "Value"],
    ["Gross Income (monthly)", dashboard.snapshot.grossIncome],
    ["Total Outflow (monthly)", dashboard.snapshot.totalOutflow],
    ["Net Surplus (monthly)", dashboard.snapshot.netSurplus],
    ["Savings Rate", `${dashboard.snapshot.savingsRate.toFixed(1)}%`],
    [],
    ["Goals", "Target", "Status"],
    ...dashboard.goals.map((g) => [
      g.title,
      g.targetAmount,
      g.feasibility.status,
    ]),
    [],
    ["Income Sources", "Amount", "Frequency"],
    ...cashflow.income.map((i) => [i.name, i.amount, i.frequency]),
    [],
    ["Expenses", "Amount", "Class"],
    ...cashflow.expenses.map((e) => [e.name, e.amount, e.expenseClass]),
  ];

  return rows.map((row) => row.join(",")).join("\n");
}
