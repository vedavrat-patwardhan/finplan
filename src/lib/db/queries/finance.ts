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
  return items.map((item) => ({
    id: item._id.toString(),
    name: item.name,
    type: item.type,
    amount: item.amount,
    frequency: item.frequency as Frequency,
    expectedReturnPct: item.expectedReturnPct,
    startDate: item.startDate,
    notes: item.notes,
  }));
});

export const getInsurancePolicies = cache(async (userId: string) => {
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
    targetAmount: item.targetAmount,
    targetDate: item.targetDate,
    currentSaved: item.currentSaved,
    monthlyContribution: item.monthlyContribution,
    priority: item.priority,
    assumptions: item.assumptions,
  }));
});

export const getMonthlySnapshot = cache(async (userId: string) => {
  const [income, expenses, investments, insurance] = await Promise.all([
    getIncomeSources(userId),
    getExpenses(userId),
    getInvestments(userId),
    getInsurancePolicies(userId),
  ]);

  return calculateMonthlySnapshot({
    income: income.map((i) => ({ amount: i.amount, frequency: i.frequency })),
    expenses: expenses.map((e) => ({ amount: e.amount, frequency: e.frequency })),
    investments: investments.map((i) => ({ amount: i.amount, frequency: i.frequency })),
    insurance: insurance.map((i) => ({ amount: i.premium, frequency: i.frequency })),
  });
});

export const getGoalsWithFeasibility = cache(async (userId: string) => {
  const [goals, snapshot, profile] = await Promise.all([
    getLifeGoals(userId),
    getMonthlySnapshot(userId),
    getUserProfile(userId),
  ]);

  const inflationRate = profile?.inflationRate ?? 6;

  return goals.map((goal) => ({
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
  }));
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
        .filter((i) => i.frequency !== "monthly")
        .map((i) => ({
          name: i.name,
          amount: i.amount,
          frequency: i.frequency,
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
