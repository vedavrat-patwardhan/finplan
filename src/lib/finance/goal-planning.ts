import type { GoalType } from "./constants";

export type GoalTargetMode = "manual" | "calculated";
export type GoalPriorityTier = 1 | 2 | 3;

export type GoalDetails = {
  propertyValue?: number | null;
  downPaymentPct?: number | null;
  stampDutyPct?: number | null;
  registrationPct?: number | null;
  includeClosingCosts?: boolean | null;
  monthlyExpenseAtRetirement?: number | null;
  corpusMultiplier?: number | null;
  retirementAge?: number | null;
  currentAge?: number | null;
  monthsOfExpenses?: number | null;
  monthlyExpenseBasis?: number | null;
  yearsUntilCourse?: number | null;
  courseDurationYears?: number | null;
  annualCostToday?: number | null;
  educationInflationPct?: number | null;
  onRoadPrice?: number | null;
  carDownPaymentPct?: number | null;
  exchangeValue?: number | null;
  estimatedBudget?: number | null;
  oneTimeSetupCost?: number | null;
  firstYearMonthlyCost?: number | null;
};

export interface GoalPlanningInput {
  goalType: GoalType;
  targetMode?: GoalTargetMode;
  targetAmount: number;
  targetDate: Date;
  currentSaved: number;
  monthlyContribution: number;
  inflationRate?: number;
  expectedReturnPct?: number;
  stepUpPct?: number;
  details?: GoalDetails | null;
}

export const GOAL_TYPE_DEFAULTS: Record<
  GoalType,
  {
    inflationRate: number;
    expectedReturnPct: number;
    stepUpPct: number;
    priorityTier: GoalPriorityTier;
    details: Partial<GoalDetails>;
  }
> = {
  emergency_fund: {
    inflationRate: 6,
    expectedReturnPct: 6,
    stepUpPct: 0,
    priorityTier: 1,
    details: { monthsOfExpenses: 6 },
  },
  retirement: {
    inflationRate: 7,
    expectedReturnPct: 12,
    stepUpPct: 10,
    priorityTier: 1,
    details: { corpusMultiplier: 25 },
  },
  house: {
    inflationRate: 8,
    expectedReturnPct: 10,
    stepUpPct: 10,
    priorityTier: 3,
    details: { downPaymentPct: 20, stampDutyPct: 6, registrationPct: 1, includeClosingCosts: true },
  },
  education: {
    inflationRate: 10,
    expectedReturnPct: 12,
    stepUpPct: 10,
    priorityTier: 2,
    details: { educationInflationPct: 10, courseDurationYears: 4, yearsUntilCourse: 12 },
  },
  car: {
    inflationRate: 5,
    expectedReturnPct: 8,
    stepUpPct: 5,
    priorityTier: 3,
    details: { carDownPaymentPct: 20, exchangeValue: 0 },
  },
  marriage: {
    inflationRate: 6,
    expectedReturnPct: 8,
    stepUpPct: 5,
    priorityTier: 3,
    details: {},
  },
  baby: {
    inflationRate: 8,
    expectedReturnPct: 10,
    stepUpPct: 5,
    priorityTier: 2,
    details: {},
  },
  custom: {
    inflationRate: 6,
    expectedReturnPct: 12,
    stepUpPct: 10,
    priorityTier: 2,
    details: {},
  },
};

function monthsUntil(date: Date, from = new Date()): number {
  return Math.max(
    1,
    Math.ceil((date.getTime() - from.getTime()) / (1000 * 60 * 60 * 24 * 30.44))
  );
}

function inflate(amount: number, annualRatePct: number, years: number): number {
  return amount * Math.pow(1 + annualRatePct / 100, years);
}

export function getGoalTypeDefaults(goalType: GoalType) {
  return GOAL_TYPE_DEFAULTS[goalType];
}

export function calculateTargetFromDetails(
  goalType: GoalType,
  details: GoalDetails,
  targetDate: Date
): number {
  const months = monthsUntil(targetDate);
  const years = months / 12;
  const defaults = getGoalTypeDefaults(goalType).details;

  switch (goalType) {
    case "house": {
      const propertyValue = details.propertyValue ?? 0;
      const downPct = details.downPaymentPct ?? defaults.downPaymentPct ?? 20;
      const downPayment = propertyValue * (downPct / 100);
      if (!details.includeClosingCosts) return downPayment;

      const stampPct = details.stampDutyPct ?? defaults.stampDutyPct ?? 6;
      const regPct = details.registrationPct ?? defaults.registrationPct ?? 1;
      const closing = propertyValue * ((stampPct + regPct) / 100);
      return downPayment + closing;
    }

    case "retirement": {
      const monthlyExpense =
        details.monthlyExpenseAtRetirement ?? 0;
      const multiplier = details.corpusMultiplier ?? defaults.corpusMultiplier ?? 25;
      const inflation = GOAL_TYPE_DEFAULTS.retirement.inflationRate;
      const annualAtRetirement = inflate(monthlyExpense * 12, inflation, years);
      return annualAtRetirement * multiplier;
    }

    case "emergency_fund": {
      const months =
        details.monthsOfExpenses ?? defaults.monthsOfExpenses ?? 6;
      const basis = details.monthlyExpenseBasis ?? 0;
      return months * basis;
    }

    case "education": {
      const annualCost = details.annualCostToday ?? 0;
      const duration = details.courseDurationYears ?? defaults.courseDurationYears ?? 4;
      const yearsUntil = details.yearsUntilCourse ?? defaults.yearsUntilCourse ?? 12;
      const eduInflation =
        details.educationInflationPct ??
        defaults.educationInflationPct ??
        GOAL_TYPE_DEFAULTS.education.inflationRate;
      const totalToday = annualCost * duration;
      return inflate(totalToday, eduInflation, yearsUntil);
    }

    case "car": {
      const onRoad = details.onRoadPrice ?? 0;
      const exchange = details.exchangeValue ?? 0;
      const net = Math.max(0, onRoad - exchange);
      const downPct = details.carDownPaymentPct ?? defaults.carDownPaymentPct ?? 20;
      return net * (downPct / 100);
    }

    case "marriage": {
      const budget = details.estimatedBudget ?? 0;
      return inflate(budget, GOAL_TYPE_DEFAULTS.marriage.inflationRate, years);
    }

    case "baby": {
      const oneTime = details.oneTimeSetupCost ?? 0;
      const monthly = details.firstYearMonthlyCost ?? 0;
      const firstYear = monthly * 12;
      const inflatedOneTime = inflate(oneTime, GOAL_TYPE_DEFAULTS.baby.inflationRate, years);
      const inflatedRecurring = inflate(firstYear, GOAL_TYPE_DEFAULTS.baby.inflationRate, years);
      return inflatedOneTime + inflatedRecurring;
    }

    default:
      return 0;
  }
}

export function resolveGoalTargetAmount(input: GoalPlanningInput): number {
  if (input.targetMode !== "calculated" || !input.details) {
    return input.targetAmount;
  }

  const calculated = calculateTargetFromDetails(
    input.goalType,
    input.details,
    input.targetDate
  );

  return calculated > 0 ? calculated : input.targetAmount;
}

export function projectGoalSavings(
  currentSaved: number,
  monthlyContribution: number,
  monthsRemaining: number,
  expectedReturnPct = 0,
  stepUpPct = 0
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

export function describeGoalTarget(goal: {
  goalType: GoalType;
  targetMode?: GoalTargetMode;
  targetAmount: number;
  details?: GoalDetails | null;
}): string | null {
  if (goal.targetMode !== "calculated" || !goal.details) return null;
  const d = goal.details;

  switch (goal.goalType) {
    case "house":
      if (d.propertyValue) {
        return `${d.downPaymentPct ?? 20}% down on ${formatCompact(d.propertyValue)} property${
          d.includeClosingCosts ? " + registration & stamp duty" : ""
        }`;
      }
      break;
    case "retirement":
      if (d.monthlyExpenseAtRetirement) {
        return `${d.corpusMultiplier ?? 25}× annual expenses at retirement (₹${formatCompact(d.monthlyExpenseAtRetirement)}/mo today)`;
      }
      break;
    case "emergency_fund":
      if (d.monthsOfExpenses && d.monthlyExpenseBasis) {
        return `${d.monthsOfExpenses} months of expenses at ₹${formatCompact(d.monthlyExpenseBasis)}/mo`;
      }
      break;
    case "education":
      if (d.annualCostToday) {
        return `${d.courseDurationYears ?? 4}-year course at ₹${formatCompact(d.annualCostToday)}/yr today`;
      }
      break;
    case "car":
      if (d.onRoadPrice) {
        return `${d.carDownPaymentPct ?? 20}% down on ₹${formatCompact(d.onRoadPrice)} on-road price`;
      }
      break;
    case "marriage":
      if (d.estimatedBudget) {
        return `Wedding budget ₹${formatCompact(d.estimatedBudget)} today`;
      }
      break;
    case "baby":
      if (d.oneTimeSetupCost || d.firstYearMonthlyCost) {
        return `Setup + first-year recurring costs`;
      }
      break;
  }

  return null;
}

function formatCompact(amount: number): string {
  if (amount >= 10_000_000) return `${(amount / 10_000_000).toFixed(2)} Cr`;
  if (amount >= 100_000) return `${(amount / 100_000).toFixed(2)} L`;
  return amount.toLocaleString("en-IN");
}

export const PRIORITY_TIER_LABELS: Record<GoalPriorityTier, string> = {
  1: "Essential",
  2: "Important",
  3: "Aspirational",
};
