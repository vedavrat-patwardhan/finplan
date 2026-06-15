export const HOUSEHOLD_OWNERS = ["self", "spouse", "joint"] as const;

export const EXPENSE_CLASSES = [
  "obligation",
  "routine",
  "discretionary",
  "adhoc",
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

/**
 * Goal types offered when creating a new goal. "marriage" is retained in
 * GOAL_TYPES for planning logic and existing records, but is no longer
 * selectable — most users are already married, so it's obsolete.
 */
export const SELECTABLE_GOAL_TYPES = GOAL_TYPES.filter(
  (type) => type !== "marriage"
) as Exclude<GoalType, "marriage">[];

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

export const LIFE_INSURANCE_TYPES = ["term_life", "ulip"] as const;

export function isLifeInsuranceType(type: InsuranceType): boolean {
  return (LIFE_INSURANCE_TYPES as readonly string[]).includes(type);
}
export type GoalType = (typeof GOAL_TYPES)[number];
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const PAYMENT_ACCOUNT_TYPES = [
  "bank",
  "debit_card",
  "credit_card",
  "cash",
  "wallet",
] as const;

export const BANK_ACCOUNT_SUBTYPES = ["savings", "current"] as const;
export const TRANSACTION_TYPES = ["debit", "credit"] as const;
export const LEDGER_CATEGORIES = [...EXPENSE_CATEGORIES, "Income", "Transfer"] as const;
export const DOCUMENT_TYPES = [
  "salary_slip",
  "credit_card_bill",
  "utility_bill",
  "receipt",
  "other",
] as const;
export const EXTRACTION_STATUSES = ["none", "pending", "ready"] as const;

export type PaymentAccountType = (typeof PAYMENT_ACCOUNT_TYPES)[number];
export type TransactionType = (typeof TRANSACTION_TYPES)[number];
export type LedgerCategory = (typeof LEDGER_CATEGORIES)[number];
export type DocumentType = (typeof DOCUMENT_TYPES)[number];
export type ExtractionStatus = (typeof EXTRACTION_STATUSES)[number];

export const QUICK_TRANSACTION_CATEGORIES = [
  "Food",
  "Entertainment",
  "Shopping",
  "Transport",
  "Healthcare",
  "Subscriptions",
  "Utilities",
  "Miscellaneous",
] as const;

export const DEFAULT_INFLATION_RATE = 6;
export const DEFAULT_RETIREMENT_MULTIPLIER = 25;
export const DEFAULT_INSURANCE_INCOME_MULTIPLIER = 12;

/** Surplus allocation tiers for reverse (affordability) calculators — ideal → tight. */
export const SURPLUS_UTILIZATION_TIERS = [
  {
    id: "ideal",
    label: "Ideal",
    description: "25% of surplus — comfortable headroom for other goals",
    utilizationPct: 25,
  },
  {
    id: "balanced",
    label: "Balanced",
    description: "35% of surplus — moderate stretch, still manageable",
    utilizationPct: 35,
  },
  {
    id: "tight",
    label: "Tight budget",
    description: "40% of surplus — maximum recommended allocation",
    utilizationPct: 40,
  },
] as const;

export type SurplusUtilizationTierId =
  (typeof SURPLUS_UTILIZATION_TIERS)[number]["id"];

export const DEFAULT_EXPENSE_TEMPLATES = [
  { name: "Rent / Home EMI", category: "Housing", expenseClass: "obligation", amount: 25000, frequency: "monthly", isEssential: true },
  { name: "Electricity & Water", category: "Utilities", expenseClass: "obligation", amount: 3000, frequency: "monthly", isEssential: true },
  { name: "Groceries", category: "Food", expenseClass: "routine", amount: 8000, frequency: "monthly", isEssential: true },
  { name: "Commute / Fuel", category: "Transport", expenseClass: "routine", amount: 4000, frequency: "monthly", isEssential: true },
  { name: "Mobile & Internet", category: "Subscriptions", expenseClass: "obligation", amount: 1500, frequency: "monthly", isEssential: true },
  { name: "Dining Out", category: "Entertainment", expenseClass: "discretionary", amount: 5000, frequency: "monthly", isEssential: false },
  { name: "Shopping", category: "Shopping", expenseClass: "discretionary", amount: 3000, frequency: "monthly", isEssential: false },
] as const;

export const DEFAULT_INVESTMENT_TEMPLATES = [
  { name: "Equity SIP", type: "sip", amount: 10000, frequency: "monthly", expectedReturnPct: 12 },
  { name: "PPF", type: "ppf", amount: 12500, frequency: "monthly", expectedReturnPct: 7.1 },
] as const;

export const DEFAULT_GOAL_TEMPLATES = [
  { title: "House Down Payment", goalType: "house", targetAmount: 3000000, monthsFromNow: 60 },
  { title: "Emergency Fund", goalType: "emergency_fund", targetAmount: 600000, monthsFromNow: 12 },
] as const;

export type GoalStatus = "active" | "completed";

export const ONBOARDING_GOAL_OPTIONS = [
  {
    id: "house",
    title: "Buy a house",
    description: "Down payment & home purchase",
    goalType: "house" as const,
    targetAmount: 3_000_000,
    monthsFromNow: 60,
    status: "active" as const,
  },
  {
    id: "baby",
    title: "Plan for a baby",
    description: "Childcare & one-time costs",
    goalType: "baby" as const,
    targetAmount: 500_000,
    monthsFromNow: 36,
    status: "active" as const,
  },
  {
    id: "emergency",
    title: "Emergency fund",
    description: "6 months of essential expenses",
    goalType: "emergency_fund" as const,
    targetAmount: 600_000,
    monthsFromNow: 12,
    status: "active" as const,
  },
  {
    id: "retirement",
    title: "Retirement corpus",
    description: "Long-term financial independence",
    goalType: "retirement" as const,
    targetAmount: 50_000_000,
    monthsFromNow: 360,
    status: "active" as const,
  },
  {
    id: "car",
    title: "Buy a car",
    description: "Vehicle purchase or upgrade",
    goalType: "car" as const,
    targetAmount: 800_000,
    monthsFromNow: 24,
    status: "active" as const,
  },
  {
    id: "education",
    title: "Higher education",
    description: "Self or family education fund",
    goalType: "education" as const,
    targetAmount: 1_000_000,
    monthsFromNow: 48,
    status: "active" as const,
  },
] as const;

export {
  CHART_PALETTE,
  PORTFOLIO_CHART_COLORS,
  CASHFLOW_ALLOCATION_COLORS,
  CASHFLOW_WATERFALL_COLORS,
  chartColorAt,
  withChartFill,
} from "./chart-colors";
