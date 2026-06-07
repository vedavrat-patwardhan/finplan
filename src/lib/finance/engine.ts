import type { Frequency } from "./constants";

export interface CashflowItem {
  amount: number;
  frequency: Frequency;
  name?: string;
  date?: Date;
  type?: string;
}

export interface GoalInput {
  targetAmount: number;
  currentSaved: number;
  monthlyContribution: number;
  targetDate: Date;
  expectedReturnPct?: number;
  stepUpPct?: number;
}

export interface MonthlySnapshotInput {
  income: CashflowItem[];
  expenses: CashflowItem[];
  investments: CashflowItem[];
  insurance: CashflowItem[];
  bonusSpreadMonthly?: boolean;
}

export interface GoalFeasibility {
  monthsRemaining: number;
  gap: number;
  requiredMonthlySave: number;
  projectedAmount: number;
  status: "on_track" | "at_risk" | "unreachable";
}

export interface UpcomingObligation {
  name: string;
  amount: number;
  dueDate: Date;
  type: "insurance" | "expense" | "investment" | "income";
}

const FREQUENCY_DIVISORS: Record<Frequency, number> = {
  monthly: 1,
  quarterly: 3,
  half_yearly: 6,
  yearly: 12,
  one_time: 1,
};

export function toMonthlyEquivalent(
  amount: number,
  frequency: Frequency,
  options?: { type?: string; bonusSpreadMonthly?: boolean }
): number {
  if (frequency === "one_time") return 0;
  if (
    options?.type === "bonus" &&
    frequency === "yearly" &&
    !options.bonusSpreadMonthly
  ) {
    return 0;
  }
  return amount / FREQUENCY_DIVISORS[frequency];
}

export function sumMonthly(
  items: CashflowItem[],
  options?: { bonusSpreadMonthly?: boolean }
): number {
  return items.reduce(
    (sum, item) =>
      sum +
      toMonthlyEquivalent(item.amount, item.frequency, {
        type: item.type,
        bonusSpreadMonthly: options?.bonusSpreadMonthly,
      }),
    0
  );
}

export function calculateMonthlySnapshot(input: MonthlySnapshotInput) {
  const spreadOpts = { bonusSpreadMonthly: input.bonusSpreadMonthly };
  const grossIncome = sumMonthly(input.income, spreadOpts);
  const fixedExpenses = sumMonthly(input.expenses, spreadOpts);
  const investments = sumMonthly(input.investments, spreadOpts);
  const insurance = sumMonthly(input.insurance, spreadOpts);

  const totalOutflow = fixedExpenses + investments + insurance;
  const netSurplus = grossIncome - totalOutflow;
  const savingsRate = grossIncome > 0 ? (netSurplus / grossIncome) * 100 : 0;

  return {
    grossIncome,
    fixedExpenses,
    investments,
    insurance,
    totalOutflow,
    netSurplus,
    savingsRate,
  };
}

function projectGoalSavingsWithReturns(
  currentSaved: number,
  monthlyContribution: number,
  monthsRemaining: number,
  expectedReturnPct: number,
  stepUpPct: number
): number {
  let total = currentSaved;
  let monthly = monthlyContribution;
  const monthlyReturn = expectedReturnPct / 12 / 100;

  for (let month = 0; month < monthsRemaining; month++) {
    if (month > 0 && month % 12 === 0 && stepUpPct > 0) {
      monthly *= 1 + stepUpPct / 100;
    }
    total = total * (1 + monthlyReturn) + monthly;
  }

  return total;
}

export function calculateGoalFeasibility(
  goal: GoalInput,
  monthlySurplus: number,
  inflationRate = 6
): GoalFeasibility {
  const now = new Date();
  const monthsRemaining = Math.max(
    1,
    Math.ceil(
      (goal.targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
    )
  );

  const yearsRemaining = monthsRemaining / 12;
  const inflationAdjustedTarget =
    goal.targetAmount * Math.pow(1 + inflationRate / 100, yearsRemaining);

  const gap = Math.max(0, inflationAdjustedTarget - goal.currentSaved);
  const projectedAmount = projectGoalSavingsWithReturns(
    goal.currentSaved,
    goal.monthlyContribution,
    monthsRemaining,
    goal.expectedReturnPct ?? 0,
    goal.stepUpPct ?? 0
  );

  const requiredMonthlySave = gap / monthsRemaining;

  let status: GoalFeasibility["status"] = "on_track";
  if (projectedAmount < inflationAdjustedTarget * 0.7) {
    status = "unreachable";
  } else if (
    projectedAmount < inflationAdjustedTarget ||
    requiredMonthlySave > monthlySurplus * 0.8
  ) {
    status = "at_risk";
  }

  return {
    monthsRemaining,
    gap,
    requiredMonthlySave,
    projectedAmount,
    status,
  };
}

export function calculateSIPFutureValue(
  monthlyInvestment: number,
  annualReturnPct: number,
  years: number,
  stepUpPct = 0
): number {
  const monthlyRate = annualReturnPct / 100 / 12;
  const months = years * 12;
  let fv = 0;
  let currentSIP = monthlyInvestment;

  for (let month = 1; month <= months; month++) {
    fv = (fv + currentSIP) * (1 + monthlyRate);
    if (month % 12 === 0 && stepUpPct > 0) {
      currentSIP *= 1 + stepUpPct / 100;
    }
  }

  return fv;
}

export function calculateLumpsumFutureValue(
  principal: number,
  annualReturnPct: number,
  years: number
): number {
  return principal * Math.pow(1 + annualReturnPct / 100, years);
}

export function calculateEMI(
  principal: number,
  annualRatePct: number,
  tenureMonths: number
): number {
  if (tenureMonths <= 0) return 0;
  const monthlyRate = annualRatePct / 100 / 12;
  if (monthlyRate === 0) return principal / tenureMonths;

  return (
    (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
    (Math.pow(1 + monthlyRate, tenureMonths) - 1)
  );
}

export function calculateMaxLoanFromEMI(
  emi: number,
  annualRatePct: number,
  tenureMonths: number
): number {
  if (emi <= 0 || tenureMonths <= 0) return 0;
  const monthlyRate = annualRatePct / 100 / 12;
  if (monthlyRate === 0) return emi * tenureMonths;

  const factor = Math.pow(1 + monthlyRate, tenureMonths);
  return (emi * (factor - 1)) / (monthlyRate * factor);
}

export function calculateRequiredSIP(
  targetFutureValue: number,
  annualReturnPct: number,
  years: number,
  stepUpPct = 0
): number {
  if (targetFutureValue <= 0 || years <= 0) return 0;

  let low = 0;
  let high = Math.max(targetFutureValue / (years * 12), 1);

  while (calculateSIPFutureValue(high, annualReturnPct, years, stepUpPct) < targetFutureValue) {
    high *= 2;
    if (high > targetFutureValue * 10) break;
  }

  for (let i = 0; i < 64; i++) {
    const mid = (low + high) / 2;
    const fv = calculateSIPFutureValue(mid, annualReturnPct, years, stepUpPct);
    if (fv < targetFutureValue) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return high;
}

export function calculateAchievableGoalTarget(
  monthlyBudget: number,
  monthsRemaining: number,
  inflationRate: number,
  alreadySaved: number
): { todayTarget: number; inflatedTarget: number } {
  if (monthsRemaining <= 0) {
    return { todayTarget: alreadySaved, inflatedTarget: alreadySaved };
  }

  const years = monthsRemaining / 12;
  const inflatedTarget = alreadySaved + monthlyBudget * monthsRemaining;
  const todayTarget = inflatedTarget / Math.pow(1 + inflationRate / 100, years);

  return { todayTarget, inflatedTarget };
}

export function calculateAffordableRetirementLifestyle(
  monthlySaveBudget: number,
  yearsToRetire: number,
  multiplier: number,
  annualReturnPct = 0
): { corpus: number; monthlyExpenses: number } {
  const months = Math.max(1, yearsToRetire * 12);
  const corpus =
    annualReturnPct > 0
      ? calculateSIPFutureValue(monthlySaveBudget, annualReturnPct, yearsToRetire)
      : monthlySaveBudget * months;
  const monthlyExpenses = corpus / multiplier / 12;

  return { corpus, monthlyExpenses };
}

export function buildSurplusBudgetTiers<T>(
  monthlySurplus: number,
  tiers: ReadonlyArray<{
    id: string;
    label: string;
    description: string;
    utilizationPct: number;
  }>,
  compute: (monthlyBudget: number) => T
): Array<{
  id: string;
  label: string;
  description: string;
  utilizationPct: number;
  monthlyBudget: number;
  result: T;
}> {
  return tiers.map((tier) => {
    const monthlyBudget = Math.max(0, (monthlySurplus * tier.utilizationPct) / 100);
    return {
      ...tier,
      monthlyBudget,
      result: compute(monthlyBudget),
    };
  });
}

export function calculateRetirementCorpus(
  annualExpenses: number,
  multiplier = 25
): number {
  return annualExpenses * multiplier;
}

export function calculateInsuranceGap(
  annualIncome: number,
  existingCoverage: number,
  multiplier = 12
): number {
  return Math.max(0, annualIncome * multiplier - existingCoverage);
}

export function inflationAdjust(
  futureAmount: number,
  years: number,
  inflationRate = 6
): number {
  return futureAmount / Math.pow(1 + inflationRate / 100, years);
}

export function monthsUntil(date: Date): number {
  const now = new Date();
  return Math.max(
    0,
    Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30.44))
  );
}

export function nextDeductionDate(dayOfMonth: number, from = new Date()): Date {
  const clampedDay = Math.min(Math.max(dayOfMonth, 1), 31);
  const candidate = new Date(from.getFullYear(), from.getMonth(), clampedDay);
  candidate.setHours(0, 0, 0, 0);

  const today = new Date(from);
  today.setHours(0, 0, 0, 0);

  if (candidate >= today) {
    return candidate;
  }

  const nextMonth = new Date(from.getFullYear(), from.getMonth() + 1, 1);
  const daysInNextMonth = new Date(
    nextMonth.getFullYear(),
    nextMonth.getMonth() + 1,
    0
  ).getDate();
  return new Date(
    nextMonth.getFullYear(),
    nextMonth.getMonth(),
    Math.min(clampedDay, daysInNextMonth)
  );
}

export function getUpcomingObligations(
  items: Array<{
    name: string;
    amount: number;
    frequency: Frequency;
    renewalDate?: Date;
    dueDate?: Date;
    deductionDay?: number;
    type: UpcomingObligation["type"];
  }>,
  daysAhead = 90
): UpcomingObligation[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const cutoff = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  const obligations: UpcomingObligation[] = [];

  for (const item of items) {
    if (item.dueDate) {
      const dueDate = new Date(item.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      if (dueDate >= now && dueDate <= cutoff) {
        obligations.push({
          name: item.name,
          amount: item.amount,
          dueDate,
          type: item.type,
        });
      }
      continue;
    }

    if (item.renewalDate) {
      const dueDate = new Date(item.renewalDate);
      dueDate.setHours(0, 0, 0, 0);
      if (dueDate >= now && dueDate <= cutoff) {
        obligations.push({
          name: item.name,
          amount: item.amount,
          dueDate,
          type: item.type,
        });
      }
      continue;
    }

    if (item.deductionDay && item.frequency === "monthly") {
      const dueDate = nextDeductionDate(item.deductionDay, now);
      if (dueDate <= cutoff) {
        obligations.push({
          name: item.name,
          amount: item.amount,
          dueDate,
          type: item.type,
        });
      }
    }
  }

  return obligations.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
}

export function scenarioSurplusChange(
  baseSurplus: number,
  changes: { incomeDelta?: number; expenseDelta?: number; investmentDelta?: number }
): number {
  return (
    baseSurplus +
    (changes.incomeDelta ?? 0) -
    (changes.expenseDelta ?? 0) -
    (changes.investmentDelta ?? 0)
  );
}

export function generateSIPProjection(
  monthlyInvestment: number,
  annualReturnPct: number,
  years: number,
  stepUpPct = 0
): Array<{ year: number; invested: number; value: number }> {
  const monthlyRate = annualReturnPct / 100 / 12;
  const projection: Array<{ year: number; invested: number; value: number }> = [];
  let fv = 0;
  let totalInvested = 0;
  let currentSIP = monthlyInvestment;

  for (let year = 1; year <= years; year++) {
    for (let month = 1; month <= 12; month++) {
      fv = (fv + currentSIP) * (1 + monthlyRate);
      totalInvested += currentSIP;
    }
    projection.push({ year, invested: totalInvested, value: fv });
    if (stepUpPct > 0) {
      currentSIP *= 1 + stepUpPct / 100;
    }
  }

  return projection;
}

export function generateEMIAmortization(
  principal: number,
  annualRatePct: number,
  tenureMonths: number
): Array<{ month: number; emi: number; principal: number; interest: number; balance: number }> {
  const emi = calculateEMI(principal, annualRatePct, tenureMonths);
  const monthlyRate = annualRatePct / 100 / 12;
  let balance = principal;
  const schedule = [];

  for (let month = 1; month <= tenureMonths; month++) {
    const interest = balance * monthlyRate;
    const principalPaid = emi - interest;
    balance = Math.max(0, balance - principalPaid);
    schedule.push({
      month,
      emi,
      principal: principalPaid,
      interest,
      balance,
    });
  }

  return schedule;
}
