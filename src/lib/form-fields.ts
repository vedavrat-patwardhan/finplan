import {
  FREQUENCIES,
  INCOME_TYPES,
  EXPENSE_CLASSES,
  EXPENSE_CATEGORIES,
  INVESTMENT_TYPES,
  INSURANCE_TYPES,
  GOAL_TYPES,
} from "@/lib/finance/constants";

const label = (s: string) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export const incomeFormFields = [
  {
    name: "name",
    label: "Name",
    type: "text" as const,
    placeholder: "e.g. Monthly salary, Freelance",
  },
  {
    name: "type",
    label: "Type",
    type: "select" as const,
    options: INCOME_TYPES.map((v) => ({ value: v, label: label(v) })),
    defaultValue: "salary",
  },
  {
    name: "amount",
    label: "Amount (₹)",
    type: "number" as const,
    placeholder: "e.g. 100000",
  },
  {
    name: "frequency",
    label: "Frequency",
    type: "select" as const,
    options: FREQUENCIES.map((v) => ({ value: v, label: label(v) })),
    defaultValue: "monthly",
  },
  {
    name: "notes",
    label: "Notes",
    type: "text" as const,
    placeholder: "Optional context",
  },
];

export const expenseFormFields = [
  {
    name: "name",
    label: "Name",
    type: "text" as const,
    placeholder: "e.g. Rent, Netflix, Groceries",
  },
  {
    name: "category",
    label: "Category",
    type: "select" as const,
    options: EXPENSE_CATEGORIES.map((v) => ({ value: v, label: v })),
    defaultValue: "Miscellaneous",
  },
  {
    name: "expenseClass",
    label: "Class",
    type: "select" as const,
    options: EXPENSE_CLASSES.map((v) => ({ value: v, label: label(v) })),
    defaultValue: "fixed",
  },
  {
    name: "amount",
    label: "Amount (₹)",
    type: "number" as const,
    placeholder: "e.g. 25000",
  },
  {
    name: "frequency",
    label: "Frequency",
    type: "select" as const,
    options: FREQUENCIES.map((v) => ({ value: v, label: label(v) })),
    defaultValue: "monthly",
  },
  {
    name: "isEssential",
    label: "Essential expense",
    type: "checkbox" as const,
    defaultValue: "true",
  },
];

export const investmentFormFields = [
  {
    name: "name",
    label: "Name",
    type: "text" as const,
    placeholder: "e.g. Nifty 50 SIP, PPF",
  },
  {
    name: "type",
    label: "Type",
    type: "select" as const,
    options: INVESTMENT_TYPES.map((v) => ({ value: v, label: label(v) })),
    defaultValue: "sip",
  },
  {
    name: "amount",
    label: "Amount (₹)",
    type: "number" as const,
    placeholder: "e.g. 15000",
  },
  {
    name: "frequency",
    label: "Frequency",
    type: "select" as const,
    options: FREQUENCIES.map((v) => ({ value: v, label: label(v) })),
    defaultValue: "monthly",
  },
  {
    name: "expectedReturnPct",
    label: "Expected return (% p.a.)",
    type: "number" as const,
    defaultValue: "12",
    placeholder: "e.g. 12",
  },
];

export const insuranceFormFields = [
  {
    name: "name",
    label: "Policy name",
    type: "text" as const,
    placeholder: "e.g. Term life cover",
  },
  {
    name: "provider",
    label: "Provider",
    type: "text" as const,
    placeholder: "e.g. LIC, HDFC Life",
  },
  {
    name: "type",
    label: "Type",
    type: "select" as const,
    options: INSURANCE_TYPES.map((v) => ({ value: v, label: label(v) })),
    defaultValue: "term_life",
  },
  {
    name: "premium",
    label: "Premium (₹)",
    type: "number" as const,
    placeholder: "e.g. 12000",
  },
  {
    name: "frequency",
    label: "Frequency",
    type: "select" as const,
    options: FREQUENCIES.map((v) => ({ value: v, label: label(v) })),
    defaultValue: "yearly",
  },
  {
    name: "coverage",
    label: "Coverage (₹)",
    type: "number" as const,
    placeholder: "e.g. 10000000",
  },
  {
    name: "renewalDate",
    label: "Renewal date",
    type: "date" as const,
    placeholder: "YYYY-MM-DD",
  },
];

export const goalFormFields = [
  {
    name: "title",
    label: "Goal title",
    type: "text" as const,
    placeholder: "e.g. Emergency fund, House down payment",
  },
  {
    name: "goalType",
    label: "Type",
    type: "select" as const,
    options: GOAL_TYPES.map((v) => ({ value: v, label: label(v) })),
    defaultValue: "custom",
  },
  {
    name: "targetAmount",
    label: "Target amount (₹)",
    type: "number" as const,
    placeholder: "e.g. 600000",
  },
  {
    name: "targetDate",
    label: "Target date",
    type: "date" as const,
    placeholder: "YYYY-MM-DD",
  },
  {
    name: "currentSaved",
    label: "Already saved (₹)",
    type: "number" as const,
    defaultValue: "0",
    placeholder: "e.g. 0",
  },
  {
    name: "monthlyContribution",
    label: "Monthly contribution (₹)",
    type: "number" as const,
    defaultValue: "0",
    placeholder: "e.g. 10000",
  },
  {
    name: "notes",
    label: "Notes",
    type: "text" as const,
    placeholder: "Optional context",
  },
];
