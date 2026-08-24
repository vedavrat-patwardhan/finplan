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
  PaymentAccount,
  ObligationEvent,
} from "@/lib/db/models";
import {
  calculateGoalFeasibility,
  calculateMonthlySnapshot,
  getUpcomingObligations,
  type UpcomingObligation,
} from "@/lib/finance/engine";
import { hasUpcomingInvestmentPayment } from "@/lib/finance/investment-metrics";
import type { Frequency } from "@/lib/finance/constants";
import {
  CASHFLOW_ALLOCATION_COLORS,
  PORTFOLIO_CHART_COLORS,
  chartColorAt,
  withChartFill,
} from "@/lib/finance/constants";
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
    householdEnabled: user.householdEnabled ?? false,
    spouseName: user.spouseName ?? "",
    spouseAnnualInHandSalary: user.spouseAnnualInHandSalary ?? 0,
    spouseAnnualInHandBonus: user.spouseAnnualInHandBonus ?? 0,
    spouseTaxRegime: (user.spouseTaxRegime ?? "new") as "new" | "old",
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
    owner: (item.owner ?? "self") as "self" | "spouse" | "joint",
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
    owner: (item.owner ?? "self") as "self" | "spouse" | "joint",
  }));
});

export const getInvestments = cache(async (userId: string) => {
  await connectDB();
  const userObjectId = toObjectId(userId);
  const [items, skippedPayments] = await Promise.all([
    Investment.find({ userId: userObjectId }).sort({ createdAt: -1 }).lean(),
    ObligationEvent.find({
      userId: userObjectId,
      sourceType: "investment",
      status: "skipped",
    })
      .select({ sourceId: 1, dueDate: 1 })
      .lean(),
  ]);
  const skippedByInvestment = new Map<string, Date[]>();
  for (const payment of skippedPayments) {
    const key = payment.sourceId.toString();
    skippedByInvestment.set(key, [
      ...(skippedByInvestment.get(key) ?? []),
      new Date(payment.dueDate),
    ]);
  }
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
      skippedPaymentDates: skippedByInvestment.get(item._id.toString()),
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
    lastPremiumPaidDate: item.lastPremiumPaidDate,
    totalPremiumPaid: item.totalPremiumPaid ?? 0,
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
    targetMode: (item.targetMode ?? "manual") as "manual" | "calculated",
    targetAmount: item.targetAmount,
    targetDate: item.targetDate,
    currentSaved: item.currentSaved,
    monthlyContribution: item.monthlyContribution,
    inflationRate: item.inflationRate,
    expectedReturnPct: item.expectedReturnPct,
    stepUpPct: item.stepUpPct,
    priorityTier: item.priorityTier,
    details: item.details,
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

    const inflationRate =
      goal.inflationRate ?? goal.assumptions?.inflationRate ?? profile?.inflationRate ?? 6;

    return {
      ...goal,
      feasibility: calculateGoalFeasibility(
        {
          targetAmount: goal.targetAmount,
          currentSaved: goal.currentSaved,
          monthlyContribution: goal.monthlyContribution,
          targetDate: new Date(goal.targetDate),
          expectedReturnPct: goal.expectedReturnPct ?? undefined,
          stepUpPct: goal.stepUpPct ?? undefined,
        },
        snapshot.netSurplus,
        inflationRate
      ),
    };
  });
});

export const getUpcomingObligationsForUser = cache(
  async (userId: string): Promise<UpcomingObligation[]> => {
    await connectDB();
    const [insurance, expenses, investments, income, creditCards] = await Promise.all([
      getInsurancePolicies(userId),
      getExpenses(userId),
      getInvestments(userId),
      getIncomeSources(userId),
      PaymentAccount.find(
        { userId: toObjectId(userId), type: "credit_card", isActive: true, billTotalDue: { $gt: 0 } },
        { name: 1, billTotalDue: 1, billDueDate: 1 }
      ).lean(),
    ]);

    const investmentItems = investments
      .filter((i) => hasUpcomingInvestmentPayment(i))
      .map((i) => ({
        sourceId: i.id,
        name: i.name,
        amount: i.amount,
        frequency: i.frequency,
        dueDate: new Date(i.metrics.nextPaymentOn!),
        type: "investment" as const,
      }));

    const otherItems = [
      ...insurance.map((i) => ({
        sourceId: i.id,
        name: i.name,
        amount: i.premium,
        frequency: i.frequency,
        renewalDate: i.renewalDate ? new Date(i.renewalDate) : undefined,
        type: "insurance" as const,
      })),
      ...expenses
        .filter((e) => e.frequency !== "monthly")
        .map((e) => ({
          sourceId: e.id,
          name: e.name,
          amount: e.amount,
          frequency: e.frequency,
          type: "expense" as const,
        })),
      ...income
        .filter((i) => i.type === "bonus")
        .map((i) => ({
          sourceId: i.id,
          name: i.name,
          amount: i.amount,
          frequency: i.frequency,
          type: "income" as const,
        })),
    ];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const creditCardBills: UpcomingObligation[] = creditCards
      .filter((a) => a.billDueDate && new Date(a.billDueDate as Date) >= today)
      .map((a) => ({
        sourceId: a._id.toString(),
        name: `${a.name} bill`,
        amount: (a.billTotalDue as number) ?? 0,
        dueDate: new Date(a.billDueDate as Date),
        type: "credit_card_bill" as const,
      }));

    const candidates = [
      ...creditCardBills,
      ...getUpcomingObligations(investmentItems, 31),
      ...getUpcomingObligations(otherItems, 90),
    ].sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    if (candidates.length === 0) return candidates;
    const candidateSourceIds = candidates.map((item) => new mongoose.Types.ObjectId(item.sourceId));
    const firstDue = candidates[0].dueDate.getTime() - 24 * 60 * 60 * 1000;
    const lastDue = candidates[candidates.length - 1].dueDate.getTime() + 24 * 60 * 60 * 1000;
    const handled = await ObligationEvent.find(
      {
        userId: toObjectId(userId),
        sourceId: { $in: candidateSourceIds },
        dueDate: { $gte: new Date(firstDue), $lte: new Date(lastDue) },
      },
      { sourceType: 1, sourceId: 1, dueDate: 1 }
    ).lean();
    const handledKeys = new Set(
      handled.map(
        (event) =>
          `${event.sourceType}|${event.sourceId.toString()}|${new Date(event.dueDate).toISOString().slice(0, 10)}`
      )
    );

    return candidates.filter(
      (item) =>
        !handledKeys.has(
          `${item.type}|${item.sourceId}|${item.dueDate.toISOString().slice(0, 10)}`
        )
    );
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
  const [income, expenses, snapshot, goals, profile] =
    await Promise.all([
      getIncomeSources(userId),
      getExpenses(userId),
      getMonthlySnapshot(userId),
      getLifeGoals(userId),
      getUserProfile(userId),
    ]);

  const bonusSpreadMonthly = profile?.bonusSpreadMonthly ?? false;

  const surplus = Math.max(0, snapshot.netSurplus);

  const cashflowAllocation = withChartFill(
    [
      {
        name: "Expenses",
        value: snapshot.fixedExpenses,
        color: CASHFLOW_ALLOCATION_COLORS.Expenses,
      },
      {
        name: "Investments",
        value: snapshot.investments,
        color: CASHFLOW_ALLOCATION_COLORS.Investments,
      },
      {
        name: "Insurance",
        value: snapshot.insurance,
        color: CASHFLOW_ALLOCATION_COLORS.Insurance,
      },
      { name: "Surplus", value: surplus, color: CASHFLOW_ALLOCATION_COLORS.Surplus },
    ].filter((d) => d.value > 0),
    (item) => item.color
  );

  const categoryMap = new Map<string, number>();
  for (const expense of expenses) {
    const monthly = toMonthlyEquivalent(expense.amount, expense.frequency);
    categoryMap.set(expense.category, (categoryMap.get(expense.category) ?? 0) + monthly);
  }
  const expenseByCategory = withChartFill(
    Array.from(categoryMap.entries())
      .map(([name, value], i) => ({
        name,
        value,
        color: PORTFOLIO_CHART_COLORS[i % PORTFOLIO_CHART_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value)
  );

  const incomeBreakdown = withChartFill(
    income.map((item, i) => ({
      name: item.name,
      value: toMonthlyEquivalent(item.amount, item.frequency, {
        type: item.type,
        bonusSpreadMonthly,
      }),
      color: PORTFOLIO_CHART_COLORS[i % PORTFOLIO_CHART_COLORS.length],
    }))
  );

  const goalProgress = goals
    .filter((g) => g.status !== "completed" && g.targetAmount > 0)
    .map((g, i) => {
      const fill = PORTFOLIO_CHART_COLORS[i % PORTFOLIO_CHART_COLORS.length];
      return {
        name: g.title.length > 12 ? `${g.title.slice(0, 12)}…` : g.title,
        saved: g.currentSaved,
        target: g.targetAmount,
        color: fill,
        fill,
        targetFill: chartColorAt(i + 3),
      };
    });

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
