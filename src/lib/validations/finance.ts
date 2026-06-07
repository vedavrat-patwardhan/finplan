import { z } from "zod";
import {
  EXPENSE_CLASSES,
  EXPENSE_CATEGORIES,
  FREQUENCIES,
  GOAL_TYPES,
  INCOME_TYPES,
  INSURANCE_TYPES,
  INVESTMENT_TYPES,
  PAYMENT_ACCOUNT_TYPES,
  BANK_ACCOUNT_SUBTYPES,
  TRANSACTION_TYPES,
  LEDGER_CATEGORIES,
  DOCUMENT_TYPES,
} from "@/lib/finance/constants";
import {
  accountNumberValidationMessage,
  cardNumberValidationMessage,
  ifscValidationMessage,
  crnValidationMessage,
  cvvValidationMessage,
  upiValidationMessage,
} from "@/lib/finance/account-details";

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

const paymentAccountBaseSchema = z.object({
  type: z.enum(PAYMENT_ACCOUNT_TYPES),
  name: z.string().min(1).max(100),
  institution: z.string().max(100).optional(),
  holderName: z.string().max(100).optional(),
  accountNumber: z.string().max(20).optional(),
  ifscCode: z.string().max(11).optional(),
  crn: z.string().max(12).optional(),
  accountSubtype: z.enum(BANK_ACCOUNT_SUBTYPES).optional(),
  cardNumber: z.string().max(19).optional(),
  cardCvv: z.string().max(4).optional(),
  expiryMonth: z.coerce.number().min(1).max(12).optional(),
  expiryYear: z.coerce.number().min(2020).max(2100).optional(),
  upiId: z.string().max(100).optional(),
  openingBalance: z.coerce.number(),
  creditLimit: z.coerce.number().min(0).optional(),
  billingDay: z.coerce.number().min(1).max(31).optional(),
  isDefault: z.coerce.boolean().optional(),
  notes: z.string().max(500).optional(),
});

function refinePaymentAccount(
  data: z.infer<typeof paymentAccountBaseSchema>,
  ctx: z.RefinementCtx,
  mode: "create" | "update"
) {
  if (data.type === "bank") {
    if (!data.institution?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Bank name is required",
        path: ["institution"],
      });
    }
    if (!data.holderName?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Account holder name is required",
        path: ["holderName"],
      });
    }
    const needsAccountNumber = mode === "create" || Boolean(data.accountNumber?.trim());
    if (needsAccountNumber) {
      const accountError = accountNumberValidationMessage(data.accountNumber ?? "");
      if (accountError) {
        ctx.addIssue({
          code: "custom",
          message: accountError,
          path: ["accountNumber"],
        });
      }
    }
    const ifscError = ifscValidationMessage(data.ifscCode ?? "");
    if (ifscError) {
      ctx.addIssue({
        code: "custom",
        message: ifscError,
        path: ["ifscCode"],
      });
    }
    const crnError = crnValidationMessage(data.crn ?? "");
    if (crnError) {
      ctx.addIssue({
        code: "custom",
        message: crnError,
        path: ["crn"],
      });
    }
  }

  if (data.type === "debit_card" || data.type === "credit_card") {
    if (!data.institution?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Card issuer is required",
        path: ["institution"],
      });
    }
    if (!data.holderName?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Name on card is required",
        path: ["holderName"],
      });
    }
    const needsCardNumber = mode === "create" || Boolean(data.cardNumber?.trim());
    if (needsCardNumber) {
      const cardError = cardNumberValidationMessage(data.cardNumber ?? "");
      if (cardError) {
        ctx.addIssue({
          code: "custom",
          message: cardError,
          path: ["cardNumber"],
        });
      }
    }
    if (!data.expiryMonth || !data.expiryYear) {
      ctx.addIssue({
        code: "custom",
        message: "Card expiry is required",
        path: ["expiryMonth"],
      });
    }
  }

  if (data.type === "credit_card") {
    const cvvError = cvvValidationMessage(data.cardCvv ?? "");
    if (cvvError) {
      ctx.addIssue({
        code: "custom",
        message: cvvError,
        path: ["cardCvv"],
      });
    }
  }

  if (data.type === "wallet") {
    const upiError = upiValidationMessage(data.upiId ?? "");
    if (upiError) {
      ctx.addIssue({
        code: "custom",
        message: upiError,
        path: ["upiId"],
      });
    }
  }
}

export const paymentAccountSchema = paymentAccountBaseSchema.superRefine((data, ctx) =>
  refinePaymentAccount(data, ctx, "create")
);

export const paymentAccountUpdateSchema = paymentAccountBaseSchema.superRefine((data, ctx) =>
  refinePaymentAccount(data, ctx, "update")
);

export const ledgerTransactionSchema = z.object({
  accountId: z.string().min(1),
  type: z.enum(TRANSACTION_TYPES),
  amount: z.coerce.number().positive(),
  category: z.enum(LEDGER_CATEGORIES),
  merchant: z.string().max(100).optional(),
  description: z.string().max(200).optional(),
  date: z.coerce.date(),
  notes: z.string().max(500).optional(),
  documentId: z.string().optional(),
});

export const documentSchema = z.object({
  type: z.enum(DOCUMENT_TYPES),
  s3Key: z.string().min(1),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1),
  size: z.coerce.number().min(0),
  periodStart: z.coerce.date().optional(),
  periodEnd: z.coerce.date().optional(),
  accountId: z.string().optional(),
  notes: z.string().max(500).optional(),
  manualData: z.record(z.string(), z.unknown()).optional(),
});

export const salarySlipManualSchema = z.object({
  documentId: z.string().min(1),
  payPeriodMonth: z.coerce.number().min(1).max(12),
  payPeriodYear: z.coerce.number().min(2000).max(2100),
  grossSalary: z.coerce.number().min(0),
  tdsDeducted: z.coerce.number().min(0),
  professionalTax: z.coerce.number().min(0).optional(),
  pfEsi: z.coerce.number().min(0).optional(),
  netInHand: z.coerce.number().min(0),
  bonus: z.coerce.number().min(0).optional(),
  taxRegime: z.enum(["new", "old"]).default("new"),
});

export const billManualSchema = z.object({
  documentId: z.string().min(1),
  accountId: z.string().optional(),
  periodStart: z.coerce.date().optional(),
  periodEnd: z.coerce.date().optional(),
  totalDue: z.coerce.number().min(0),
  minimumDue: z.coerce.number().min(0).optional(),
  dueDate: z.coerce.date().optional(),
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
export type PaymentAccountInput = z.infer<typeof paymentAccountSchema>;
export type LedgerTransactionInput = z.infer<typeof ledgerTransactionSchema>;
export type DocumentInput = z.infer<typeof documentSchema>;
export type SalarySlipManualInput = z.infer<typeof salarySlipManualSchema>;
export type BillManualInput = z.infer<typeof billManualSchema>;
