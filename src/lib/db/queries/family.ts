import { cache } from "react";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { FamilyGroup, FamilyMembership, User } from "@/lib/db/models";
import { getDashboardData, getInsurancePolicies, getInvestments } from "@/lib/db/queries/finance";
import { getLedgerSummary, getPaymentAccounts } from "@/lib/db/queries/ledger";
import { sumAvailableBalance } from "@/lib/finance/ledger";
import { toMonthlyEquivalent } from "@/lib/finance/engine";

export const getFamilyForUser = cache(async (userId: string) => {
  await connectDB();
  const ownMembership = await FamilyMembership.findOne({
    userId: new mongoose.Types.ObjectId(userId),
  }).lean();
  if (!ownMembership) return null;

  const [family, memberships] = await Promise.all([
    FamilyGroup.findById(ownMembership.familyId).lean(),
    FamilyMembership.find({ familyId: ownMembership.familyId }).sort({ createdAt: 1 }).lean(),
  ]);
  if (!family) return null;

  const people = await User.find({ _id: { $in: memberships.map((item) => item.userId) } })
    .select({ name: 1, username: 1 })
    .lean();
  const personById = new Map(people.map((person) => [person._id.toString(), person]));
  const isOwner = family.ownerUserId.toString() === userId;

  return {
    id: family._id.toString(),
    name: family.name,
    ownerUserId: family.ownerUserId.toString(),
    isOwner,
    inviteCode: isOwner ? family.inviteCode : undefined,
    members: memberships.map((membership) => {
      const person = personById.get(membership.userId.toString());
      return {
        userId: membership.userId.toString(),
        name: person?.name || person?.username || "Family member",
        username: person?.username ?? "",
        isOwner: membership.userId.equals(family.ownerUserId),
      };
    }),
  };
});

export async function getFamilyDashboardData(userId: string) {
  const family = await getFamilyForUser(userId);
  if (!family) return null;

  const memberData = await Promise.all(family.members.map(async (member) => {
    const [dashboard, accounts, investments, insurance, ledger] = await Promise.all([
      getDashboardData(member.userId),
      getPaymentAccounts(member.userId),
      getInvestments(member.userId),
      getInsurancePolicies(member.userId),
      getLedgerSummary(member.userId),
    ]);
    return { member, dashboard, accounts, investments, insurance, ledger };
  }));

  const accounts = memberData.flatMap(({ member, accounts: owned }) => owned.map((account) => ({
    owner: member.name,
    ownerUserId: member.userId,
    name: account.name,
    institution: account.institution,
    lastFour: account.lastFour,
    type: account.type,
    currentBalance: account.currentBalance,
    billTotalDue: account.billTotalDue,
  })));
  const goals = memberData.flatMap(({ member, dashboard }) => dashboard.goals.map((goal) => ({
    owner: member.name,
    title: goal.title,
    status: goal.status,
    targetAmount: goal.targetAmount,
    currentSaved: goal.currentSaved,
    targetDate: goal.targetDate?.toISOString(),
    monthlyNeeded: dashboard.goalObligations.find((item) => item.sourceId === goal.id)?.amount ?? 0,
  })));
  const investments = memberData.flatMap(({ member, investments: owned }) => owned.map((investment) => ({
    owner: member.name,
    name: investment.name,
    type: investment.type,
    monthlyAmount: toMonthlyEquivalent(investment.amount, investment.frequency),
    totalInvested: investment.metrics.totalInvested,
    trackedValue: investment.metrics.fundValue ?? investment.metrics.totalInvested,
  })));
  const insurance = memberData.flatMap(({ member, insurance: owned }) => owned.map((policy) => ({
    owner: member.name,
    name: policy.name,
    provider: policy.provider,
    coverage: policy.coverage,
    monthlyPremium: toMonthlyEquivalent(policy.premium, policy.frequency),
  })));
  const obligations = memberData.flatMap(({ member, dashboard }) => dashboard.obligations.map((obligation) => ({
    owner: member.name,
    name: obligation.name,
    amount: obligation.amount,
    dueDate: obligation.dueDate.toISOString(),
    type: obligation.type,
  }))).sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const memberSummaries = memberData.map(({ member, dashboard, accounts: owned, investments: ownedInvestments, ledger }) => ({
    userId: member.userId,
    name: member.name,
    availableBalance: sumAvailableBalance(owned),
    monthlyIncome: dashboard.snapshot.grossIncome,
    monthlyExpenses: dashboard.snapshot.fixedExpenses,
    monthlyInvestments: dashboard.snapshot.investments,
    monthlyInsurance: dashboard.snapshot.insurance,
    monthlyGoalSavings: dashboard.snapshot.goalSavings,
    monthlySurplus: dashboard.snapshot.netSurplus,
    spentThisMonth: ledger.totalDebits,
    trackedInvestments: ownedInvestments.reduce(
      (sum, investment) => sum + (investment.metrics.fundValue ?? investment.metrics.totalInvested), 0
    ),
    goalCount: dashboard.goals.filter((goal) => goal.status !== "completed").length,
  }));

  return {
    family,
    members: memberSummaries,
    accounts,
    goals,
    investments,
    insurance,
    obligations,
    totals: {
      availableBalance: memberSummaries.reduce((sum, member) => sum + member.availableBalance, 0),
      monthlyIncome: memberSummaries.reduce((sum, member) => sum + member.monthlyIncome, 0),
      monthlyExpenses: memberSummaries.reduce((sum, member) => sum + member.monthlyExpenses, 0),
      monthlyInvestments: memberSummaries.reduce((sum, member) => sum + member.monthlyInvestments, 0),
      monthlyInsurance: memberSummaries.reduce((sum, member) => sum + member.monthlyInsurance, 0),
      monthlyGoalSavings: memberSummaries.reduce((sum, member) => sum + member.monthlyGoalSavings, 0),
      monthlySurplus: memberSummaries.reduce((sum, member) => sum + member.monthlySurplus, 0),
      spentThisMonth: memberSummaries.reduce((sum, member) => sum + member.spentThisMonth, 0),
      trackedInvestments: memberSummaries.reduce((sum, member) => sum + member.trackedInvestments, 0),
      insuranceCoverage: insurance.reduce((sum, policy) => sum + policy.coverage, 0),
      goalTarget: goals.filter((goal) => goal.status !== "completed")
        .reduce((sum, goal) => sum + goal.targetAmount, 0),
      goalSaved: goals.filter((goal) => goal.status !== "completed")
        .reduce((sum, goal) => sum + goal.currentSaved, 0),
      creditCardOutstanding: accounts.filter((account) => account.type === "credit_card")
        .reduce((sum, account) => sum + account.currentBalance, 0),
      creditCardBillDue: accounts.filter((account) => account.type === "credit_card")
        .reduce((sum, account) => sum + account.billTotalDue, 0),
    },
  };
}
