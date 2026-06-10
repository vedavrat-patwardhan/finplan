import { EXPENSE_CLASSES } from "@/lib/finance/constants";

export const LEGACY_EXPENSE_CLASS_MAP = {
  fixed: "obligation",
  recurring: "routine",
  optional: "discretionary",
  variable: "adhoc",
} as const;

export const EXPENSE_CLASS_META: Record<
  (typeof EXPENSE_CLASSES)[number],
  { label: string; description: string }
> = {
  obligation: {
    label: "Obligations",
    description: "Must-pay bills with a steady amount — rent, EMIs, utilities, subscriptions.",
  },
  routine: {
    label: "Routine",
    description: "Regular living costs that repeat often — groceries, commute, household supplies.",
  },
  discretionary: {
    label: "Discretionary",
    description: "Flexible lifestyle spending you can trim — dining out, shopping, entertainment.",
  },
  adhoc: {
    label: "Ad-hoc",
    description: "One-off or unpredictable costs — repairs, gifts, occasional large purchases.",
  },
};

export function formatExpenseClassLabel(value: string): string {
  const meta = EXPENSE_CLASS_META[value as keyof typeof EXPENSE_CLASS_META];
  return meta?.label ?? value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function normalizeExpenseClass(value: string): (typeof EXPENSE_CLASSES)[number] | null {
  if ((EXPENSE_CLASSES as readonly string[]).includes(value)) {
    return value as (typeof EXPENSE_CLASSES)[number];
  }
  const mapped = LEGACY_EXPENSE_CLASS_MAP[value as keyof typeof LEGACY_EXPENSE_CLASS_MAP];
  return mapped ?? null;
}
