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
  const projectedFromContributions = goal.monthlyContribution * monthsRemaining;
  const projectedAmount = goal.currentSaved + projectedFromContributions;

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

export function getUpcomingObligations(
  items: Array<{
    name: string;
    amount: number;
    frequency: Frequency;
    renewalDate?: Date;
    type: UpcomingObligation["type"];
  }>,
  daysAhead = 90
): UpcomingObligation[] {
  const now = new Date();
  const cutoff = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  const obligations: UpcomingObligation[] = [];

  for (const item of items) {
    if (item.renewalDate && item.renewalDate >= now && item.renewalDate <= cutoff) {
      obligations.push({
        name: item.name,
        amount: item.amount,
        dueDate: item.renewalDate,
        type: item.type,
      });
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
