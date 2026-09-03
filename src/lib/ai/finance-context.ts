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
import { LEDGER_CATEGORIES, LEDGER_BUDGET_CATEGORIES } from "@/lib/finance/constants";
import {
  ASSISTANT_TIMEZONE,
  currentMonthIST,
  formatDateIST,
  lastNCalendarMonthsIST,
  todayIST,
} from "@/lib/ai/dates";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

interface MonthBucket {
  spent: number;
  received: number;
  transfers: number;
  byCategory: Map<string, number>;
}

export async function buildFinanceAssistantContext(userId: string) {
  await connectDB();
  const objectId = new mongoose.Types.ObjectId(userId);

  const recentMonthKeys = lastNCalendarMonthsIST(6);
  const [earliestMonthStart] = recentMonthKeys;
  const rangeStart = new Date(`${earliestMonthStart}-01T00:00:00+05:30`);

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
    monthlyRows,
    coverageRows,
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
    // One aggregation for the last 6 calendar months, grouped by month/category/type.
    LedgerTransaction.aggregate<{
      _id: { month: string; category: string; type: "debit" | "credit" };
      amount: number;
    }>([
      { $match: { userId: objectId, date: { $gte: rangeStart } } },
      {
        $group: {
          _id: {
            month: { $dateToString: { format: "%Y-%m", date: "$date", timezone: "+05:30" } },
            category: "$category",
            type: "$type",
          },
          amount: { $sum: "$amount" },
        },
      },
    ]),
    // One aggregation for all-time ledger coverage.
    LedgerTransaction.aggregate<{ _id: null; earliest: Date; latest: Date; count: number }>([
      { $match: { userId: objectId } },
      {
        $group: {
          _id: null,
          earliest: { $min: "$date" },
          latest: { $max: "$date" },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const monthBuckets = new Map<string, MonthBucket>();
  for (const row of monthlyRows) {
    const { month, category, type } = row._id;
    const bucket = monthBuckets.get(month) ?? { spent: 0, received: 0, transfers: 0, byCategory: new Map() };
    if (category === "Transfer") {
      bucket.transfers += row.amount;
    } else if (type === "debit") {
      bucket.spent += row.amount;
      bucket.byCategory.set(category, (bucket.byCategory.get(category) ?? 0) + row.amount);
    } else {
      bucket.received += row.amount;
    }
    monthBuckets.set(month, bucket);
  }

  const recentMonths = recentMonthKeys.map((month) => {
    const bucket = monthBuckets.get(month) ?? { spent: 0, received: 0, transfers: 0, byCategory: new Map() };
    return {
      month,
      spent: round2(bucket.spent),
      received: round2(bucket.received),
      transfers: round2(bucket.transfers),
      byCategory: [...bucket.byCategory.entries()]
        .map(([category, amount]) => ({ category, amount: round2(amount) }))
        .sort((a, b) => b.amount - a.amount),
    };
  });

  const coverage = coverageRows[0];

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
    today: todayIST(),
    timezone: ASSISTANT_TIMEZONE,
    currentMonth: currentMonthIST(),
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
    ledgerCoverage: {
      earliestTransaction: coverage ? formatDateIST(coverage.earliest) : null,
      latestTransaction: coverage ? formatDateIST(coverage.latest) : null,
      transactionCount: coverage?.count ?? 0,
    },
    recentMonths,
    categories: {
      all: LEDGER_CATEGORIES,
      budgetTracked: LEDGER_BUDGET_CATEGORIES,
      notes:
        "'Investment' debits are investment contributions (SIPs, lump sums), not spending. 'Income' credits are salary/other income, not expenses. 'Transfer' (movement between the user's own accounts) is excluded from spend/income totals everywhere in this snapshot and in the spending_summary/list_transactions tools unless include_transfers is requested.",
    },
  };
}

export type FinanceAssistantContext = Awaited<ReturnType<typeof buildFinanceAssistantContext>>;
