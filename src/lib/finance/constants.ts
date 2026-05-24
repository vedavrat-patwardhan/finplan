export const EXPENSE_CLASSES = [
  "fixed",
  "recurring",
  "optional",
  "variable",
] as const;

export const FREQUENCIES = [
  "monthly",
  "quarterly",
  "half_yearly",
  "yearly",
  "one_time",
] as const;

export const INCOME_TYPES = [
  "salary",
  "bonus",
  "freelance",
  "rental",
  "other",
] as const;

export const INVESTMENT_TYPES = [
  "sip",
  "lump_sum",
  "ppf",
  "nps",
  "fd",
  "mutual_fund",
  "stocks",
  "other",
] as const;

export const INSURANCE_TYPES = [
  "term_life",
  "health",
  "ulip",
  "motor",
  "home",
  "other",
] as const;

export const GOAL_TYPES = [
  "marriage",
  "baby",
  "house",
  "car",
  "education",
  "retirement",
  "emergency_fund",
  "custom",
] as const;

export const EXPENSE_CATEGORIES = [
  "Housing",
  "Utilities",
  "Food",
  "Transport",
  "Subscriptions",
  "Healthcare",
  "Entertainment",
  "Shopping",
  "EMI",
  "Family",
  "Miscellaneous",
] as const;

export type ExpenseClass = (typeof EXPENSE_CLASSES)[number];
export type Frequency = (typeof FREQUENCIES)[number];
export type IncomeType = (typeof INCOME_TYPES)[number];
export type InvestmentType = (typeof INVESTMENT_TYPES)[number];
export type InsuranceType = (typeof INSURANCE_TYPES)[number];
export type GoalType = (typeof GOAL_TYPES)[number];
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const DEFAULT_INFLATION_RATE = 6;
export const DEFAULT_RETIREMENT_MULTIPLIER = 25;
export const DEFAULT_INSURANCE_INCOME_MULTIPLIER = 12;

export const DEFAULT_EXPENSE_TEMPLATES = [
  { name: "Rent / Home EMI", category: "Housing", expenseClass: "fixed", amount: 25000, frequency: "monthly", isEssential: true },
  { name: "Electricity & Water", category: "Utilities", expenseClass: "fixed", amount: 3000, frequency: "monthly", isEssential: true },
  { name: "Groceries", category: "Food", expenseClass: "recurring", amount: 8000, frequency: "monthly", isEssential: true },
  { name: "Commute / Fuel", category: "Transport", expenseClass: "recurring", amount: 4000, frequency: "monthly", isEssential: true },
  { name: "Mobile & Internet", category: "Subscriptions", expenseClass: "fixed", amount: 1500, frequency: "monthly", isEssential: true },
  { name: "Dining Out", category: "Entertainment", expenseClass: "optional", amount: 5000, frequency: "monthly", isEssential: false },
  { name: "Shopping", category: "Shopping", expenseClass: "optional", amount: 3000, frequency: "monthly", isEssential: false },
] as const;

export const DEFAULT_INVESTMENT_TEMPLATES = [
  { name: "Equity SIP", type: "sip", amount: 10000, frequency: "monthly", expectedReturnPct: 12 },
  { name: "PPF", type: "ppf", amount: 12500, frequency: "monthly", expectedReturnPct: 7.1 },
] as const;

export const DEFAULT_GOAL_TEMPLATES = [
  { title: "Marriage", goalType: "marriage", targetAmount: 1500000, monthsFromNow: 24 },
  { title: "House Down Payment", goalType: "house", targetAmount: 3000000, monthsFromNow: 60 },
  { title: "Emergency Fund", goalType: "emergency_fund", targetAmount: 600000, monthsFromNow: 12 },
] as const;
