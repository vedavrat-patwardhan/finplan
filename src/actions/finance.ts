"use server";

import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { connectDB } from "@/lib/db/mongoose";
import {
  User,
  IncomeSource,
  Expense,
  Investment,
  InsurancePolicy,
  LifeGoal,
} from "@/lib/db/models";
import { requireSession } from "@/lib/auth/session";
import {
  profileSchema,
  incomeSchema,
  expenseSchema,
  investmentSchema,
  insuranceSchema,
  goalSchema,
  onboardingSchema,
} from "@/lib/validations/finance";
import {
  DEFAULT_EXPENSE_TEMPLATES,
  DEFAULT_INVESTMENT_TEMPLATES,
  DEFAULT_GOAL_TEMPLATES,
} from "@/lib/finance/constants";
import { addMonths } from "@/lib/format";
import type { ActionResult } from "./auth";

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

  await connectDB();
  await User.findByIdAndUpdate(session.userId, parsed.data);
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

  await connectDB();
  await IncomeSource.create({ ...parsed.data, userId: userObjectId(session.userId) });
  revalidateFinance();
  return { success: true };
}

export async function deleteIncomeAction(id: string): Promise<ActionResult> {
  const session = await requireSession();
  await connectDB();
  await IncomeSource.deleteOne({ _id: id, userId: userObjectId(session.userId) });
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

  await connectDB();
  await Expense.create({ ...parsed.data, userId: userObjectId(session.userId) });
  revalidateFinance();
  return { success: true };
}

export async function deleteExpenseAction(id: string): Promise<ActionResult> {
  const session = await requireSession();
  await connectDB();
  await Expense.deleteOne({ _id: id, userId: userObjectId(session.userId) });
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

  await connectDB();
  await Investment.create({ ...parsed.data, userId: userObjectId(session.userId) });
  revalidateFinance();
  return { success: true };
}

export async function deleteInvestmentAction(id: string): Promise<ActionResult> {
  const session = await requireSession();
  await connectDB();
  await Investment.deleteOne({ _id: id, userId: userObjectId(session.userId) });
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

  await connectDB();
  await InsurancePolicy.create({ ...parsed.data, userId: userObjectId(session.userId) });
  revalidateFinance();
  return { success: true };
}

export async function deleteInsuranceAction(id: string): Promise<ActionResult> {
  const session = await requireSession();
  await connectDB();
  await InsurancePolicy.deleteOne({ _id: id, userId: userObjectId(session.userId) });
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

  await connectDB();
  await LifeGoal.create({
    ...data,
    assumptions: { notes },
    userId: userObjectId(session.userId),
  });
  revalidateFinance();
  return { success: true };
}

export async function deleteGoalAction(id: string): Promise<ActionResult> {
  const session = await requireSession();
  await connectDB();
  await LifeGoal.deleteOne({ _id: id, userId: userObjectId(session.userId) });
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
  const goalTemplates = formData.getAll("goalTemplates") as string[];

  const parsed = onboardingSchema.safeParse({
    name: formData.get("name"),
    monthlyTakeHome: formData.get("monthlyTakeHome"),
    salaryAmount: formData.get("salaryAmount"),
    selectedExpenseTemplates: expenseTemplates,
    selectedInvestmentTemplates: investmentTemplates,
    selectedGoalTemplates: goalTemplates,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const { name, monthlyTakeHome, salaryAmount, selectedExpenseTemplates, selectedInvestmentTemplates, selectedGoalTemplates } = parsed.data;
  const userId = userObjectId(session.userId);

  await connectDB();

  await User.findByIdAndUpdate(session.userId, {
    name,
    monthlyTakeHome,
    onboardingCompleted: true,
  });

  await IncomeSource.create({
    userId,
    name: "Primary Salary",
    type: "salary",
    amount: salaryAmount,
    frequency: "monthly",
  });

  for (const key of selectedExpenseTemplates) {
    const idx = parseInt(key, 10);
    const template = DEFAULT_EXPENSE_TEMPLATES[idx];
    if (template) {
      await Expense.create({ userId, ...template });
    }
  }

  for (const key of selectedInvestmentTemplates) {
    const idx = parseInt(key, 10);
    const template = DEFAULT_INVESTMENT_TEMPLATES[idx];
    if (template) {
      await Investment.create({ userId, ...template, startDate: new Date() });
    }
  }

  for (const key of selectedGoalTemplates) {
    const idx = parseInt(key, 10);
    const template = DEFAULT_GOAL_TEMPLATES[idx];
    if (template) {
      await LifeGoal.create({
        userId,
        title: template.title,
        goalType: template.goalType,
        targetAmount: template.targetAmount,
        targetDate: addMonths(new Date(), template.monthsFromNow),
        currentSaved: 0,
        monthlyContribution: 0,
        priority: idx,
      });
    }
  }

  revalidateFinance();
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
