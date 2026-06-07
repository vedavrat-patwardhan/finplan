import type { GoalInput as GoalSchemaInput } from "@/lib/validations/finance";
import type { GoalType } from "./constants";
import {
  getGoalTypeDefaults,
  resolveGoalTargetAmount,
  type GoalDetails,
  type GoalTargetMode,
} from "./goal-planning";

const DETAIL_KEYS = [
  "propertyValue",
  "downPaymentPct",
  "stampDutyPct",
  "registrationPct",
  "includeClosingCosts",
  "monthlyExpenseAtRetirement",
  "corpusMultiplier",
  "retirementAge",
  "currentAge",
  "monthsOfExpenses",
  "monthlyExpenseBasis",
  "yearsUntilCourse",
  "courseDurationYears",
  "annualCostToday",
  "educationInflationPct",
  "onRoadPrice",
  "carDownPaymentPct",
  "exchangeValue",
  "estimatedBudget",
  "oneTimeSetupCost",
  "firstYearMonthlyCost",
] as const;

function extractGoalDetails(data: GoalSchemaInput): GoalDetails {
  const details: GoalDetails = {};

  for (const key of DETAIL_KEYS) {
    const value = data[key as keyof GoalSchemaInput];
    if (value !== undefined && value !== null) {
      (details as Record<string, unknown>)[key] = value;
    }
  }

  return details;
}

function stripDetailKeys(data: GoalSchemaInput) {
  const rest = { ...data } as Record<string, unknown>;
  for (const key of DETAIL_KEYS) {
    delete rest[key];
  }
  return rest;
}

export function normalizeGoalPayload(data: GoalSchemaInput) {
  const { notes, ...raw } = data;
  const details = extractGoalDetails(raw);
  const defaults = getGoalTypeDefaults(raw.goalType as GoalType);
  const targetMode = (raw.targetMode ?? "manual") as GoalTargetMode;

  const inflationRate = raw.inflationRate ?? defaults.inflationRate;
  const expectedReturnPct = raw.expectedReturnPct ?? defaults.expectedReturnPct;
  const stepUpPct = raw.stepUpPct ?? defaults.stepUpPct;
  const priorityTier = raw.priorityTier ?? defaults.priorityTier;

  const targetAmount = resolveGoalTargetAmount({
    goalType: raw.goalType as GoalType,
    targetMode,
    targetAmount: raw.targetAmount,
    targetDate: raw.targetDate,
    currentSaved: raw.currentSaved,
    monthlyContribution: raw.monthlyContribution,
    inflationRate,
    expectedReturnPct,
    stepUpPct,
    details,
  });

  const base = stripDetailKeys(raw);

  return {
    title: base.title as string,
    goalType: base.goalType as GoalType,
    targetMode,
    targetAmount,
    targetDate: base.targetDate as Date,
    currentSaved: base.currentSaved as number,
    monthlyContribution: base.monthlyContribution as number,
    inflationRate,
    expectedReturnPct,
    stepUpPct,
    priorityTier,
    priority: priorityTier,
    details: Object.keys(details).length > 0 ? details : undefined,
    assumptions: { notes, inflationRate },
  };
}
