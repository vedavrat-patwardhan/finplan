import { cache } from "react";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import {
  User,
  IncomeSource,
  Expense,
  Investment,
  InsurancePolicy,
  LifeGoal,
} from "@/lib/db/models";
import {
  calculateGoalFeasibility,
  calculateMonthlySnapshot,
  getUpcomingObligations,
  type UpcomingObligation,
} from "@/lib/finance/engine";
import type { Frequency } from "@/lib/finance/constants";
import { PORTFOLIO_CHART_COLORS } from "@/lib/finance/constants";
import { toMonthlyEquivalent } from "@/lib/finance/engine";
import { calculateInvestmentMetrics } from "@/lib/finance/investment-metrics";

function toObjectId(userId: string) {
  return new mongoose.Types.ObjectId(userId);
}

export const getUserById = cache(async (userId: string) => {
  await connectDB();
  return User.findById(userId).lean();
});

export const getUserProfile = cache(async (userId: string) => {
  await connectDB();
  const user = await User.findById(userId).lean();
  if (!user) return null;
  return {
    id: user._id.toString(),
    email: user.email,
    username: user.username,
    name: user.name,
    monthlyTakeHome: user.monthlyTakeHome,
    annualInHandSalary: user.annualInHandSalary ?? 0,
    annualInHandBonus: user.annualInHandBonus ?? 0,
    taxRegime: (user.taxRegime ?? "new") as "new" | "old",
    currency: user.currency,
    inflationRate: user.inflationRate,
    bonusSpreadMonthly: user.bonusSpreadMonthly,
    retirementMultiplier: user.retirementMultiplier,
    onboardingCompleted: user.onboardingCompleted,
    useCompactNumbers: user.useCompactNumbers,
  };
});

export const getIncomeSources = cache(async (userId: string) => {
  await connectDB();
  const items = await IncomeSource.find({ userId: toObjectId(userId) })
    .sort({ createdAt: -1 })
    .lean();
  return items.map((item) => ({
    id: item._id.toString(),
    name: item.name,
    type: item.type,
    amount: item.amount,
    frequency: item.frequency as Frequency,
    isNetAmount: item.isNetAmount ?? true,
    grossAmount: item.grossAmount,
    estimatedTax: item.estimatedTax,
    startDate: item.startDate,
    endDate: item.endDate,
    notes: item.notes,
  }));
});

export const getExpenses = cache(async (userId: string) => {
  await connectDB();
  const items = await Expense.find({ userId: toObjectId(userId) })
    .sort({ expenseClass: 1, createdAt: -1 })
    .lean();
  return items.map((item) => ({
    id: item._id.toString(),
    name: item.name,
    category: item.category,
    expenseClass: item.expenseClass,
    amount: item.amount,
    frequency: item.frequency as Frequency,
    isEssential: item.isEssential,
    notes: item.notes,
  }));
});

export const getInvestments = cache(async (userId: string) => {
  await connectDB();
  const items = await Investment.find({ userId: toObjectId(userId) })
    .sort({ createdAt: -1 })
    .lean();
  return items.map((item) => {
    const startDate = item.startDate ?? item.createdAt ?? new Date();
    const absoluteReturnPct = item.absoluteReturnPct ?? undefined;
    const lastPaidDate = item.lastPaidDate ?? undefined;
    const monthlyWithdrawalPct = item.monthlyWithdrawalPct ?? undefined;
    const metrics = calculateInvestmentMetrics({
      amount: item.amount,
      frequency: item.frequency as Frequency,
      startDate: new Date(startDate),
      investmentType: item.type,
      deductionDay: item.deductionDay ?? undefined,
      lastPaidDate: lastPaidDate ? new Date(lastPaidDate) : undefined,
      absoluteReturnPct,
      monthlyWithdrawalPct,
    });

    return {
      id: item._id.toString(),
      name: item.name,
      type: item.type,
      amount: item.amount,
      frequency: item.frequency as Frequency,
      expectedReturnPct: item.expectedReturnPct,
      absoluteReturnPct,
      monthlyWithdrawalPct,
      startDate,
      deductionDay: item.deductionDay ?? undefined,
      lastPaidDate,
      notes: item.notes,
      metrics,
    };
  });
});

export const getInsurancePolicies = cache(async (userId: string) => {
  const { connection } = await import("next/server");
  await connection();
  await connectDB();
  const items = await InsurancePolicy.find({ userId: toObjectId(userId) })
    .sort({ renewalDate: 1 })
    .lean();
  return items.map((item) => ({
    id: item._id.toString(),
    name: item.name,
    provider: item.provider,
    type: item.type,
    premium: item.premium,
    frequency: item.frequency as Frequency,
    coverage: item.coverage,
    renewalDate: item.renewalDate,
    premiumStartDate: item.premiumStartDate,
    premiumEndDate: item.premiumEndDate,
    validTill: item.validTill,
    notes: item.notes,
  }));
});

export const getLifeGoals = cache(async (userId: string) => {
  await connectDB();
  const items = await LifeGoal.find({ userId: toObjectId(userId) })
    .sort({ targetDate: 1 })
    .lean();
  return items.map((item) => ({
    id: item._id.toString(),
    title: item.title,
    goalType: item.goalType,
    status: (item.status ?? "active") as "active" | "completed",
    targetAmount: item.targetAmount,
    targetDate: item.targetDate,
    currentSaved: item.currentSaved,
    monthlyContribution: item.monthlyContribution,
    priority: item.priority,
    assumptions: item.assumptions,
  }));
});

export const getMonthlySnapshot = cache(async (userId: string) => {
  const [income, expenses, investments, insurance, profile] = await Promise.all([
    getIncomeSources(userId),
    getExpenses(userId),
    getInvestments(userId),
    getInsurancePolicies(userId),
    getUserProfile(userId),
  ]);

  const bonusSpreadMonthly = profile?.bonusSpreadMonthly ?? false;

  return calculateMonthlySnapshot({
    income: income.map((i) => ({
      amount: i.amount,
      frequency: i.frequency,
      type: i.type,
    })),
    expenses: expenses.map((e) => ({ amount: e.amount, frequency: e.frequency })),
    investments: investments.map((i) => ({ amount: i.amount, frequency: i.frequency })),
    insurance: insurance.map((i) => ({ amount: i.premium, frequency: i.frequency })),
    bonusSpreadMonthly,
  });
});

export const getGoalsWithFeasibility = cache(async (userId: string) => {
  const [goals, snapshot, profile] = await Promise.all([
    getLifeGoals(userId),
    getMonthlySnapshot(userId),
    getUserProfile(userId),
  ]);

  const inflationRate = profile?.inflationRate ?? 6;

  return goals.map((goal) => {
    if (goal.status === "completed" || !goal.targetDate) {
      return {
        ...goal,
        feasibility: {
          monthsRemaining: 0,
          gap: 0,
          requiredMonthlySave: 0,
          projectedAmount: goal.currentSaved,
          status: "on_track" as const,
        },
      };
    }
    return {
      ...goal,
      feasibility: calculateGoalFeasibility(
        {
          targetAmount: goal.targetAmount,
          currentSaved: goal.currentSaved,
          monthlyContribution: goal.monthlyContribution,
          targetDate: new Date(goal.targetDate),
        },
        snapshot.netSurplus,
        inflationRate
      ),
    };
  });
});

export const getUpcomingObligationsForUser = cache(
  async (userId: string): Promise<UpcomingObligation[]> => {
    const [insurance, expenses, investments, income] = await Promise.all([
      getInsurancePolicies(userId),
      getExpenses(userId),
      getInvestments(userId),
      getIncomeSources(userId),
    ]);

    const items = [
      ...insurance.map((i) => ({
        name: i.name,
        amount: i.premium,
        frequency: i.frequency,
        renewalDate: i.renewalDate ? new Date(i.renewalDate) : undefined,
        type: "insurance" as const,
      })),
      ...expenses
        .filter((e) => e.frequency !== "monthly")
        .map((e) => ({
          name: e.name,
          amount: e.amount,
          frequency: e.frequency,
          type: "expense" as const,
        })),
      ...investments
        .filter((i) => i.frequency !== "monthly" || i.deductionDay != null)
        .map((i) => ({
          name: i.name,
          amount: i.amount,
          frequency: i.frequency,
          deductionDay: i.deductionDay,
          type: "investment" as const,
        })),
      ...income
        .filter((i) => i.type === "bonus")
        .map((i) => ({
          name: i.name,
          amount: i.amount,
          frequency: i.frequency,
          type: "income" as const,
        })),
    ];

    return getUpcomingObligations(items);
  }
);

export const getDashboardData = cache(async (userId: string) => {
  const [profile, snapshot, goals, obligations] = await Promise.all([
    getUserProfile(userId),
    getMonthlySnapshot(userId),
    getGoalsWithFeasibility(userId),
    getUpcomingObligationsForUser(userId),
  ]);

  return { profile, snapshot, goals, obligations };
});

export const getCashflowBreakdown = cache(async (userId: string) => {
  const [income, expenses, investments, insurance, snapshot] =
    await Promise.all([
      getIncomeSources(userId),
      getExpenses(userId),
      getInvestments(userId),
      getInsurancePolicies(userId),
      getMonthlySnapshot(userId),
    ]);

  return {
    income,
    expenses,
    investments,
    insurance,
    snapshot,
  };
});

export const getCalculatorPrefill = cache(async (userId: string) => {
  const [profile, snapshot, investments, insurance, goals] = await Promise.all([
    getUserProfile(userId),
    getMonthlySnapshot(userId),
    getInvestments(userId),
    getInsurancePolicies(userId),
    getLifeGoals(userId),
  ]);

  const totalSIP = investments
    .filter((i) => i.frequency === "monthly")
    .reduce((sum, i) => sum + i.amount, 0);

  const totalCoverage = insurance.reduce((sum, i) => sum + i.coverage, 0);

  return {
    monthlyIncome: snapshot.grossIncome,
    monthlySurplus: snapshot.netSurplus,
    monthlyExpenses: snapshot.fixedExpenses + snapshot.insurance,
    totalSIP,
    totalCoverage,
    inflationRate: profile?.inflationRate ?? 6,
    retirementMultiplier: profile?.retirementMultiplier ?? 25,
    goals,
  };
});

export const getPortfolioChartData = cache(async (userId: string) => {
  const [income, expenses, investments, insurance, snapshot, goals, profile] =
    await Promise.all([
      getIncomeSources(userId),
      getExpenses(userId),
      getInvestments(userId),
      getInsurancePolicies(userId),
      getMonthlySnapshot(userId),
      getLifeGoals(userId),
      getUserProfile(userId),
    ]);

  const bonusSpreadMonthly = profile?.bonusSpreadMonthly ?? false;

  const surplus = Math.max(0, snapshot.netSurplus);

  const cashflowAllocation = [
    { name: "Expenses", value: snapshot.fixedExpenses, color: PORTFOLIO_CHART_COLORS[1] },
    { name: "Investments", value: snapshot.investments, color: PORTFOLIO_CHART_COLORS[2] },
    { name: "Insurance", value: snapshot.insurance, color: PORTFOLIO_CHART_COLORS[3] },
    { name: "Surplus", value: surplus, color: PORTFOLIO_CHART_COLORS[0] },
  ].filter((d) => d.value > 0);

  const categoryMap = new Map<string, number>();
  for (const expense of expenses) {
    const monthly = toMonthlyEquivalent(expense.amount, expense.frequency);
    categoryMap.set(expense.category, (categoryMap.get(expense.category) ?? 0) + monthly);
  }
  const expenseByCategory = Array.from(categoryMap.entries())
    .map(([name, value], i) => ({
      name,
      value,
      color: PORTFOLIO_CHART_COLORS[i % PORTFOLIO_CHART_COLORS.length],
    }))
    .sort((a, b) => b.value - a.value);

  const incomeBreakdown = income.map((item, i) => ({
    name: item.name,
    value: toMonthlyEquivalent(item.amount, item.frequency, {
      type: item.type,
      bonusSpreadMonthly,
    }),
    color: PORTFOLIO_CHART_COLORS[i % PORTFOLIO_CHART_COLORS.length],
  }));

  const goalProgress = goals
    .filter((g) => g.status !== "completed" && g.targetAmount > 0)
    .map((g, i) => ({
      name: g.title.length > 12 ? `${g.title.slice(0, 12)}…` : g.title,
      saved: g.currentSaved,
      target: g.targetAmount,
      color: PORTFOLIO_CHART_COLORS[i % PORTFOLIO_CHART_COLORS.length],
    }));

  return {
    cashflowAllocation,
    expenseByCategory,
    incomeBreakdown,
    goalProgress,
    snapshot: {
      grossIncome: snapshot.grossIncome,
      netSurplus: snapshot.netSurplus,
      savingsRate: snapshot.savingsRate,
    },
  };
});
