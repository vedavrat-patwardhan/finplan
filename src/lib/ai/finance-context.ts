import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { Asset, Liability, LedgerTransaction } from "@/lib/db/models";
import {
  getExpenses,
  getGoalsWithFeasibility,
  getIncomeSources,
  getInsurancePolicies,
  getInvestments,
  getMonthlySnapshot,
  getUpcomingObligationsForUser,
  getUserProfile,
} from "@/lib/db/queries/finance";
import { getPaymentAccounts } from "@/lib/db/queries/ledger";
import { sumAvailableBalance } from "@/lib/finance/ledger";
import { toMonthlyEquivalent } from "@/lib/finance/engine";

export async function buildFinanceAssistantContext(userId: string) {
  await connectDB();
  const objectId = new mongoose.Types.ObjectId(userId);
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6, 1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const [
    profile,
    snapshot,
    income,
    expenses,
    investments,
    insurance,
    goals,
    obligations,
    accounts,
    assets,
    liabilities,
    recentTransactions,
  ] = await Promise.all([
    getUserProfile(userId),
    getMonthlySnapshot(userId),
    getIncomeSources(userId),
    getExpenses(userId),
    getInvestments(userId),
    getInsurancePolicies(userId),
    getGoalsWithFeasibility(userId),
    getUpcomingObligationsForUser(userId),
    getPaymentAccounts(userId),
    Asset.find({ userId: objectId }).lean(),
    Liability.find({ userId: objectId }).lean(),
    LedgerTransaction.find({ userId: objectId, date: { $gte: sixMonthsAgo } })
      .sort({ date: -1 })
      .limit(1000)
      .lean(),
  ]);

  const monthlyActuals = new Map<string, { spent: number; received: number }>();
  const categoryActuals = new Map<string, number>();
  for (const item of recentTransactions) {
    const date = new Date(item.date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const current = monthlyActuals.get(key) ?? { spent: 0, received: 0 };
    if (item.category === "Transfer") continue;
    if (item.type === "debit") {
      current.spent += item.amount;
      categoryActuals.set(item.category, (categoryActuals.get(item.category) ?? 0) + item.amount);
    } else {
      current.received += item.amount;
    }
    monthlyActuals.set(key, current);
  }

  const essentialMonthly = expenses
    .filter((item) => item.isEssential)
    .reduce((sum, item) => sum + toMonthlyEquivalent(item.amount, item.frequency), 0);
  const creditCardDue = accounts
    .filter((item) => item.type === "credit_card")
    .reduce((sum, item) => sum + (item.currentBalance > 0 ? item.currentBalance : 0), 0);
  const investmentValue = investments.reduce(
    (sum, item) => sum + (item.metrics.fundValue ?? item.metrics.totalInvested),
    0
  );

  return {
    asOf: new Date().toISOString(),
    currency: profile?.currency ?? "INR",
    profile: {
      householdEnabled: profile?.householdEnabled ?? false,
      inflationRatePct: profile?.inflationRate ?? 6,
    },
    decisionMetrics: {
      liquidBalance: sumAvailableBalance(accounts),
      creditCardOutstanding: creditCardDue,
      essentialMonthly,
      suggestedThreeMonthCashFloor: essentialMonthly * 3,
      monthlySurplusAfterPlans: snapshot.netSurplus,
      monthlyCommittedInvestments: snapshot.investments,
      monthlyInsurance: snapshot.insurance,
      estimatedPortfolioValue: investmentValue,
    },
    monthlyPlan: snapshot,
    accounts: accounts.map((item) => ({
      name: item.name,
      type: item.type,
      currentBalance: item.currentBalance,
      creditLimit: item.creditLimit,
      billTotalDue: item.billTotalDue,
      billDueDate: item.billDueDate,
    })),
    income: income.map((item) => ({
      name: item.name,
      type: item.type,
      amount: item.amount,
      frequency: item.frequency,
    })),
    expenses: expenses.map((item) => ({
      name: item.name,
      category: item.category,
      class: item.expenseClass,
      amount: item.amount,
      frequency: item.frequency,
      essential: item.isEssential,
    })),
    investments: investments.map((item) => ({
      name: item.name,
      type: item.type,
      contribution: item.amount,
      frequency: item.frequency,
      totalInvested: item.metrics.totalInvested,
      estimatedValue: item.metrics.fundValue,
      nextDeduction: item.metrics.nextPaymentOn,
      expectedReturnPct: item.expectedReturnPct,
    })),
    insurance: insurance.map((item) => ({
      name: item.name,
      premium: item.premium,
      frequency: item.frequency,
      renewalDate: item.renewalDate,
    })),
    goals: goals.map((item) => ({
      title: item.title,
      targetAmount: item.targetAmount,
      targetDate: item.targetDate,
      currentlySaved: item.currentSaved,
      monthlyContribution: item.monthlyContribution,
      priorityTier: item.priorityTier,
      feasibility: item.feasibility,
    })),
    upcomingObligations: obligations.map((item) => ({
      name: item.name,
      amount: item.amount,
      dueDate: item.dueDate,
      type: item.type,
    })),
    assets: assets.map((item) => ({ name: item.name, type: item.type, value: item.value })),
    liabilities: liabilities.map((item) => ({
      name: item.name,
      type: item.type,
      outstanding: item.outstanding,
      emi: item.emi,
      interestRatePct: item.interestRate,
    })),
    recentActuals: {
      byMonth: [...monthlyActuals.entries()].map(([month, value]) => ({ month, ...value })),
      debitByCategoryLastSixMonths: [...categoryActuals.entries()]
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount),
      transactionCount: recentTransactions.length,
    },
  };
}
