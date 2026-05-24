import { z } from "zod";
import {
  EXPENSE_CLASSES,
  EXPENSE_CATEGORIES,
  FREQUENCIES,
  GOAL_TYPES,
  INCOME_TYPES,
  INSURANCE_TYPES,
  INVESTMENT_TYPES,
} from "@/lib/finance/constants";

export const loginSchema = z.object({
  identifier: z.preprocess(
    (val) => (val == null ? "" : val),
    z.string().min(1, "Email or username is required")
  ),
  password: z.preprocess(
    (val) => (val == null ? "" : val),
    z.string().min(1, "Password is required")
  ),
});

export const registerSchema = z.object({
  email: z.preprocess(
    (val) => (val == null ? "" : val),
    z.string().email("Enter a valid email")
  ),
  username: z.preprocess(
    (val) => (val == null ? "" : val),
    z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(30)
      .regex(/^[a-zA-Z0-9_]+$/, "Letters, numbers, and underscores only")
  ),
  password: z.preprocess(
    (val) => (val == null ? "" : val),
    z.string().min(8, "Password must be at least 8 characters")
  ),
  name: z.preprocess(
    (val) => (val == null ? "" : val),
    z.string().min(1, "Name is required").max(100)
  ),
});

export const profileSchema = z.object({
  name: z.string().min(1).max(100),
  monthlyTakeHome: z.coerce.number().min(0),
  inflationRate: z.coerce.number().min(0).max(30),
  bonusSpreadMonthly: z.boolean(),
  retirementMultiplier: z.coerce.number().min(10).max(50),
  useCompactNumbers: z.boolean(),
});

export const incomeSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(INCOME_TYPES),
  amount: z.coerce.number().min(0),
  frequency: z.enum(FREQUENCIES),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  notes: z.string().max(500).optional(),
});

export const expenseSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.enum(EXPENSE_CATEGORIES),
  expenseClass: z.enum(EXPENSE_CLASSES),
  amount: z.coerce.number().min(0),
  frequency: z.enum(FREQUENCIES),
  isEssential: z.boolean(),
  notes: z.string().max(500).optional(),
});

export const investmentSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(INVESTMENT_TYPES),
  amount: z.coerce.number().min(0),
  frequency: z.enum(FREQUENCIES),
  expectedReturnPct: z.coerce.number().min(0).max(100),
  startDate: z.coerce.date().optional(),
  notes: z.string().max(500).optional(),
});

export const insuranceSchema = z.object({
  name: z.string().min(1).max(100),
  provider: z.string().max(100).optional(),
  type: z.enum(INSURANCE_TYPES),
  premium: z.coerce.number().min(0),
  frequency: z.enum(FREQUENCIES),
  coverage: z.coerce.number().min(0).optional(),
  renewalDate: z.coerce.date().optional(),
  notes: z.string().max(500).optional(),
});

export const goalSchema = z.object({
  title: z.string().min(1).max(100),
  goalType: z.enum(GOAL_TYPES),
  targetAmount: z.coerce.number().min(0),
  targetDate: z.coerce.date(),
  currentSaved: z.coerce.number().min(0),
  monthlyContribution: z.coerce.number().min(0),
  priority: z.coerce.number().min(0).max(100).optional(),
  notes: z.string().max(500).optional(),
});

export const onboardingSchema = z.object({
  name: z.string().min(1),
  annualInHandSalary: z.coerce.number().min(0).optional(),
  annualInHandBonus: z.coerce.number().min(0).optional(),
  taxRegime: z.enum(["new", "old"]).default("new"),
  skipIncome: z.coerce.boolean().optional(),
  selectedExpenseTemplates: z.array(z.string()),
  selectedInvestmentTemplates: z.array(z.string()),
  selectedGoalOptions: z.array(z.string()),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type IncomeInput = z.infer<typeof incomeSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
export type InvestmentInput = z.infer<typeof investmentSchema>;
export type InsuranceInput = z.infer<typeof insuranceSchema>;
export type GoalInput = z.infer<typeof goalSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
