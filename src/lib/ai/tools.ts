import type OpenAI from "openai";
import { z } from "zod";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { LedgerTransaction } from "@/lib/db/models";
import { getPaymentAccounts, getLedgerSummary, type PaymentAccountDTO } from "@/lib/db/queries/ledger";
import {
  getExpenses,
  getUpcomingObligationsForUser,
  getPastDueObligationsForUser,
} from "@/lib/db/queries/finance";
import { toMonthlyEquivalent } from "@/lib/finance/engine";
import { sumAvailableBalance } from "@/lib/finance/ledger";
import {
  formatDateIST,
  isValidISODateString,
  isValidYearMonthString,
  dateRangeExceedsMaxYears,
  istDateRangeToUTC,
  todayIST,
} from "@/lib/ai/dates";

type FunctionTool = OpenAI.Responses.FunctionTool;

function oid(userId: string) {
  return new mongoose.Types.ObjectId(userId);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Resolves a user-supplied account name or id to a stored account. */
function findAccount(accounts: PaymentAccountDTO[], input: string): PaymentAccountDTO | undefined {
  const trimmed = input.trim();
  const byId = accounts.find((a) => a.id === trimmed);
  if (byId) return byId;
  const lower = trimmed.toLowerCase();
  return (
    accounts.find((a) => a.name.toLowerCase() === lower) ??
    accounts.find((a) => a.name.toLowerCase().includes(lower))
  );
}

/** Common date-range validation shared by the range-based tools. */
function validateRange(from: string, to: string): string | null {
  if (!isValidISODateString(from)) return `"from" must be a valid YYYY-MM-DD date`;
  if (!isValidISODateString(to)) return `"to" must be a valid YYYY-MM-DD date`;
  if (from > to) return `"from" must not be after "to"`;
  if (dateRangeExceedsMaxYears(from, to)) return `Date range cannot exceed 3 years`;
  return null;
}

// ---------------------------------------------------------------------------
// 1. spending_summary
// ---------------------------------------------------------------------------

const GROUP_BY_VALUES = ["category", "month", "account", "merchant", "category_month"] as const;
type GroupBy = (typeof GROUP_BY_VALUES)[number];

const spendingSummarySchema = z.object({
  from: z.string(),
  to: z.string(),
  group_by: z.enum(GROUP_BY_VALUES).nullable().optional(),
  type: z.enum(["debit", "credit", "all"]).nullable().optional(),
  include_transfers: z.boolean().nullable().optional(),
  category: z.string().nullable().optional(),
  account: z.string().nullable().optional(),
});

interface SpendingGroupRow {
  key: string;
  month?: string;
  category?: string;
  debits: number;
  credits: number;
  count: number;
}

async function spendingSummary(userId: string, args: z.infer<typeof spendingSummarySchema>) {
  const rangeError = validateRange(args.from, args.to);
  if (rangeError) return { error: rangeError };

  await connectDB();
  const { start, end } = istDateRangeToUTC(args.from, args.to);
  const groupBy: GroupBy = args.group_by ?? "category";
  const includeTransfers = args.include_transfers ?? false;

  const match: Record<string, unknown> = { userId: oid(userId), date: { $gte: start, $lt: end } };
  if (args.type && args.type !== "all") match.type = args.type;
  if (args.category) {
    match.category = { $regex: `^${escapeRegExp(args.category)}$`, $options: "i" };
  }
  if (args.account) {
    const accounts = await getPaymentAccounts(userId);
    const account = findAccount(accounts, args.account);
    if (!account) {
      return {
        error: `No account matching "${args.account}". Known accounts: ${accounts.map((a) => a.name).join(", ") || "none"}`,
      };
    }
    match.accountId = oid(account.id);
  }

  const monthExpr = { $dateToString: { format: "%Y-%m", date: "$date", timezone: "+05:30" } };
  const debitSum = { $sum: { $cond: [{ $eq: ["$type", "debit"] }, "$amount", 0] } };
  const creditSum = { $sum: { $cond: [{ $eq: ["$type", "credit"] }, "$amount", 0] } };
  const preGroupStages: mongoose.PipelineStage.FacetPipelineStage[] = includeTransfers
    ? []
    : [{ $match: { category: { $ne: "Transfer" } } }];

  let groupId: Record<string, unknown> | string;
  let groupLimit = 60;
  switch (groupBy) {
    case "category":
      groupId = "$category";
      break;
    case "month":
      groupId = monthExpr;
      break;
    case "account":
      groupId = "$accountId";
      break;
    case "merchant":
      groupId = "$merchant";
      groupLimit = 40;
      break;
    case "category_month":
      groupId = { category: "$category", month: monthExpr };
      break;
  }

  const groupStages: mongoose.PipelineStage.FacetPipelineStage[] = [
    ...preGroupStages,
    { $group: { _id: groupId, debits: debitSum, credits: creditSum, count: { $sum: 1 } } },
    { $sort: { debits: -1 } },
    { $limit: groupLimit },
  ];

  const pipeline: mongoose.PipelineStage[] = [
    { $match: match },
    {
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              totalDebits: debitSum,
              totalCredits: creditSum,
              transferDebits: {
                $sum: {
                  $cond: [{ $and: [{ $eq: ["$type", "debit"] }, { $eq: ["$category", "Transfer"] }] }, "$amount", 0],
                },
              },
              transferCredits: {
                $sum: {
                  $cond: [{ $and: [{ $eq: ["$type", "credit"] }, { $eq: ["$category", "Transfer"] }] }, "$amount", 0],
                },
              },
              transactionCount: { $sum: 1 },
            },
          },
        ],
        groups: groupStages,
      },
    },
  ];

  const [result] = await LedgerTransaction.aggregate(pipeline);
  const totalsDoc = result?.totals?.[0] ?? {
    totalDebits: 0,
    totalCredits: 0,
    transferDebits: 0,
    transferCredits: 0,
    transactionCount: 0,
  };
  const debits = includeTransfers
    ? totalsDoc.totalDebits
    : totalsDoc.totalDebits - totalsDoc.transferDebits;
  const credits = includeTransfers
    ? totalsDoc.totalCredits
    : totalsDoc.totalCredits - totalsDoc.transferCredits;

  let accountNameById: Map<string, string> | undefined;
  if (groupBy === "account") {
    const accounts = await getPaymentAccounts(userId);
    accountNameById = new Map(accounts.map((a) => [a.id, a.name]));
  }

  const rawGroups: Array<{ _id: unknown; debits: number; credits: number; count: number }> =
    result?.groups ?? [];

  const groups: SpendingGroupRow[] = rawGroups.map((g) => {
    const debitsAmt = round2(g.debits);
    const creditsAmt = round2(g.credits);
    if (groupBy === "category") {
      const category = (g._id as string) || "Uncategorized";
      return { key: category, category, debits: debitsAmt, credits: creditsAmt, count: g.count };
    }
    if (groupBy === "month") {
      const month = g._id as string;
      return { key: month, month, debits: debitsAmt, credits: creditsAmt, count: g.count };
    }
    if (groupBy === "account") {
      const name = accountNameById?.get(String(g._id)) ?? "Unknown account";
      return { key: name, debits: debitsAmt, credits: creditsAmt, count: g.count };
    }
    if (groupBy === "merchant") {
      const merchant = (g._id as string) || "(no merchant)";
      return { key: merchant, debits: debitsAmt, credits: creditsAmt, count: g.count };
    }
    const composite = g._id as { category: string; month: string };
    return {
      key: `${composite.category} ${composite.month}`,
      category: composite.category,
      month: composite.month,
      debits: debitsAmt,
      credits: creditsAmt,
      count: g.count,
    };
  });

  return {
    from: args.from,
    to: args.to,
    totals: {
      debits: round2(debits),
      credits: round2(credits),
      net: round2(credits - debits),
      transactionCount: totalsDoc.transactionCount,
      transferDebits: round2(totalsDoc.transferDebits),
      transferCredits: round2(totalsDoc.transferCredits),
    },
    groups,
  };
}

// ---------------------------------------------------------------------------
// 2. list_transactions
// ---------------------------------------------------------------------------

const listTransactionsSchema = z.object({
  from: z.string(),
  to: z.string(),
  category: z.string().nullable().optional(),
  account: z.string().nullable().optional(),
  type: z.enum(["debit", "credit", "all"]).nullable().optional(),
  merchant_contains: z.string().nullable().optional(),
  min_amount: z.number().nullable().optional(),
  max_amount: z.number().nullable().optional(),
  limit: z.number().int().positive().nullable().optional(),
  sort: z.enum(["date_desc", "amount_desc"]).nullable().optional(),
});

async function listTransactions(userId: string, args: z.infer<typeof listTransactionsSchema>) {
  const rangeError = validateRange(args.from, args.to);
  if (rangeError) return { error: rangeError };

  await connectDB();
  const { start, end } = istDateRangeToUTC(args.from, args.to);
  const filter: Record<string, unknown> = { userId: oid(userId), date: { $gte: start, $lt: end } };

  if (args.type && args.type !== "all") filter.type = args.type;
  if (args.category) {
    filter.category = { $regex: `^${escapeRegExp(args.category)}$`, $options: "i" };
  }

  const accounts = await getPaymentAccounts(userId);
  if (args.account) {
    const account = findAccount(accounts, args.account);
    if (!account) {
      return {
        error: `No account matching "${args.account}". Known accounts: ${accounts.map((a) => a.name).join(", ") || "none"}`,
      };
    }
    filter.accountId = oid(account.id);
  }

  if (args.min_amount != null || args.max_amount != null) {
    const amountFilter: Record<string, number> = {};
    if (args.min_amount != null) amountFilter.$gte = args.min_amount;
    if (args.max_amount != null) amountFilter.$lte = args.max_amount;
    filter.amount = amountFilter;
  }

  if (args.merchant_contains) {
    const re = new RegExp(escapeRegExp(args.merchant_contains), "i");
    filter.$or = [{ merchant: re }, { description: re }];
  }

  const limit = Math.min(args.limit ?? 50, 200);
  const sortSpec: Record<string, 1 | -1> =
    args.sort === "amount_desc" ? { amount: -1 } : { date: -1, createdAt: -1 };

  const [totalCount, items] = await Promise.all([
    LedgerTransaction.countDocuments(filter),
    LedgerTransaction.find(filter).sort(sortSpec).limit(limit).lean(),
  ]);

  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  return {
    count: totalCount,
    truncated: totalCount > items.length,
    transactions: items.map((t) => ({
      date: formatDateIST(t.date),
      type: t.type,
      amount: t.amount,
      category: t.category,
      merchant: t.merchant || "",
      description: t.description || "",
      account: accountMap.get(t.accountId.toString())?.name ?? "Unknown",
    })),
  };
}

// ---------------------------------------------------------------------------
// 3. budget_vs_actual
// ---------------------------------------------------------------------------

const budgetVsActualSchema = z.object({
  month: z.string(),
});

async function budgetVsActual(userId: string, args: z.infer<typeof budgetVsActualSchema>) {
  if (!isValidYearMonthString(args.month)) {
    return { error: `"month" must be a valid YYYY-MM month` };
  }

  await connectDB();
  const [expenses, summary] = await Promise.all([
    getExpenses(userId),
    getLedgerSummary(userId, args.month),
  ]);

  const plannedByCategory = new Map<string, number>();
  for (const expense of expenses) {
    const monthly = toMonthlyEquivalent(expense.amount, expense.frequency);
    plannedByCategory.set(expense.category, (plannedByCategory.get(expense.category) ?? 0) + monthly);
  }
  const actualByCategory = new Map(summary.byCategory.map((c) => [c.category, c.amount]));

  const categories = new Set<string>([...plannedByCategory.keys(), ...actualByCategory.keys()]);
  const categoryRows = [...categories]
    .map((category) => {
      const planned = round2(plannedByCategory.get(category) ?? 0);
      const actual = round2(actualByCategory.get(category) ?? 0);
      return { category, planned, actual, variance: round2(actual - planned) };
    })
    .sort((a, b) => b.actual - a.actual);

  const totalPlanned = round2([...plannedByCategory.values()].reduce((sum, v) => sum + v, 0));
  const totalActual = round2(summary.totalDebits);

  return {
    month: args.month,
    plannedItems: expenses.map((e) => ({
      name: e.name,
      category: e.category,
      expenseClass: e.expenseClass,
      monthlyEquivalent: round2(toMonthlyEquivalent(e.amount, e.frequency)),
    })),
    categories: categoryRows,
    totals: { planned: totalPlanned, actual: totalActual, variance: round2(totalActual - totalPlanned) },
    budgetMonthly: round2(summary.budgetMonthly),
    budgetDebits: round2(summary.budgetDebits),
  };
}

// ---------------------------------------------------------------------------
// 4. obligations
// ---------------------------------------------------------------------------

const obligationsSchema = z.object({
  days: z.number().int().positive().max(365).nullable().optional(),
  include_past_due: z.boolean().nullable().optional(),
});

async function obligations(userId: string, args: z.infer<typeof obligationsSchema>) {
  await connectDB();
  const days = args.days ?? 45;
  const includePastDue = args.include_past_due ?? true;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const horizon = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);

  const [upcoming, pastDue] = await Promise.all([
    getUpcomingObligationsForUser(userId),
    includePastDue ? getPastDueObligationsForUser(userId) : Promise.resolve([]),
  ]);

  const upcomingInRange = upcoming.filter((item) => item.dueDate <= horizon);

  return {
    asOf: todayIST(),
    horizonDays: days,
    obligations: [
      ...pastDue.map((item) => ({
        name: item.name,
        amount: round2(item.amount),
        dueDate: formatDateIST(item.dueDate),
        type: item.type,
        status: "past_due" as const,
      })),
      ...upcomingInRange.map((item) => ({
        name: item.name,
        amount: round2(item.amount),
        dueDate: formatDateIST(item.dueDate),
        type: item.type,
        status: "upcoming" as const,
      })),
    ],
  };
}

// ---------------------------------------------------------------------------
// 5. account_balances
// ---------------------------------------------------------------------------

async function accountBalances(userId: string) {
  await connectDB();
  const accounts = await getPaymentAccounts(userId);
  const liquidBalance = round2(sumAvailableBalance(accounts));
  const creditCardOutstanding = round2(
    accounts
      .filter((a) => a.type === "credit_card")
      .reduce((sum, a) => sum + (a.currentBalance > 0 ? a.currentBalance : 0), 0)
  );

  return {
    asOf: todayIST(),
    accounts: accounts.map((a) => ({
      name: a.name,
      type: a.type,
      institution: a.institution,
      lastFour: a.lastFour,
      currentBalance: round2(a.currentBalance),
      creditLimit: a.creditLimit != null ? round2(a.creditLimit) : undefined,
      availableCredit:
        a.type === "credit_card" && a.creditLimit != null
          ? round2(a.creditLimit - Math.max(a.currentBalance, 0))
          : undefined,
      billTotalDue: round2(a.billTotalDue),
      billDueDate: a.billDueDate ? formatDateIST(new Date(a.billDueDate)) : undefined,
    })),
    liquidBalance,
    creditCardOutstanding,
  };
}

// ---------------------------------------------------------------------------
// Tool schemas (OpenAI Responses function tools)
// ---------------------------------------------------------------------------

export const assistantTools: FunctionTool[] = [
  {
    type: "function",
    name: "spending_summary",
    description:
      "Aggregate ledger spending/income over a date range, grouped by category, month, account, merchant, or category+month. Use for 'how much did I spend on X', 'categorized expenses for <period>', 'top categories', 'compare months'. Transfers are excluded from totals unless include_transfers is true.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        from: { type: "string", description: "Start date, inclusive, YYYY-MM-DD (IST)." },
        to: { type: "string", description: "End date, inclusive, YYYY-MM-DD (IST)." },
        group_by: {
          type: ["string", "null"],
          enum: [...GROUP_BY_VALUES, null],
          description: "How to group results. Defaults to 'category' when null.",
        },
        type: {
          type: ["string", "null"],
          enum: ["debit", "credit", "all", null],
          description: "Restrict to debits, credits, or all. Defaults to 'all' when null.",
        },
        include_transfers: {
          type: ["boolean", "null"],
          description: "Include the 'Transfer' category in totals/groups. Defaults to false when null.",
        },
        category: { type: ["string", "null"], description: "Filter to one ledger category (case-insensitive)." },
        account: {
          type: ["string", "null"],
          description: "Filter to one account by name or id (case-insensitive, partial name allowed).",
        },
      },
      required: ["from", "to", "group_by", "type", "include_transfers", "category", "account"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "list_transactions",
    description:
      "List individual ledger transactions in a date range with optional filters. Use for 'show me my transactions at X', 'list purchases over ₹Y', or when the user wants line-item detail rather than totals.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        from: { type: "string", description: "Start date, inclusive, YYYY-MM-DD (IST)." },
        to: { type: "string", description: "End date, inclusive, YYYY-MM-DD (IST)." },
        category: { type: ["string", "null"], description: "Filter to one ledger category (case-insensitive)." },
        account: {
          type: ["string", "null"],
          description: "Filter to one account by name or id (case-insensitive, partial name allowed).",
        },
        type: {
          type: ["string", "null"],
          enum: ["debit", "credit", "all", null],
          description: "Restrict to debits, credits, or all. Defaults to 'all' when null.",
        },
        merchant_contains: {
          type: ["string", "null"],
          description: "Case-insensitive substring match against merchant or description.",
        },
        min_amount: { type: ["number", "null"], description: "Minimum transaction amount (INR)." },
        max_amount: { type: ["number", "null"], description: "Maximum transaction amount (INR)." },
        limit: {
          type: ["number", "null"],
          description: "Max rows to return, default 50, hard cap 200 (larger values are clamped).",
        },
        sort: {
          type: ["string", "null"],
          enum: ["date_desc", "amount_desc", null],
          description: "Sort order. Defaults to 'date_desc' when null.",
        },
      },
      required: [
        "from",
        "to",
        "category",
        "account",
        "type",
        "merchant_contains",
        "min_amount",
        "max_amount",
        "limit",
        "sort",
      ],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "budget_vs_actual",
    description:
      "Compare planned monthly budgets (from the user's expense plan) against actual ledger debits for one calendar month, per category. Use for 'am I over budget', 'how does my spending compare to my plan'.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        month: { type: "string", description: "Calendar month, YYYY-MM (IST)." },
      },
      required: ["month"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "obligations",
    description:
      "List upcoming and past-due obligations (insurance premiums, SIPs, non-monthly expenses, bonuses, credit card bills). Use for 'what's due soon', 'am I behind on anything'.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        days: {
          type: ["number", "null"],
          description:
            "How many days ahead to look for upcoming items, default 45, max 365. Note: the underlying data is only populated up to ~90 days out for bills/insurance/expenses and ~31 days out for investment SIPs, so larger values will not surface items beyond that.",
        },
        include_past_due: {
          type: ["boolean", "null"],
          description: "Include already-overdue items. Defaults to true when null.",
        },
      },
      required: ["days", "include_past_due"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "account_balances",
    description:
      "Current balances, credit limits and bill due amounts for all active payment accounts. Use for 'how much cash do I have', 'what's my credit card balance'.",
    strict: true,
    parameters: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    },
  },
];

const toolExecutors: Record<string, (userId: string, args: unknown) => Promise<unknown>> = {
  spending_summary: async (userId, args) => spendingSummary(userId, spendingSummarySchema.parse(args)),
  list_transactions: async (userId, args) => listTransactions(userId, listTransactionsSchema.parse(args)),
  budget_vs_actual: async (userId, args) => budgetVsActual(userId, budgetVsActualSchema.parse(args)),
  obligations: async (userId, args) => obligations(userId, obligationsSchema.parse(args)),
  account_balances: async (userId) => accountBalances(userId),
};

/**
 * Parses, validates and executes one assistant tool call. Never throws — any
 * failure (bad JSON, failed validation, a data-layer error) is reported back
 * to the model as `{ error }` so the agentic loop can recover or explain.
 */
export async function runAssistantTool(userId: string, name: string, rawArgs: string): Promise<unknown> {
  const executor = toolExecutors[name];
  if (!executor) {
    return { error: `Unknown tool "${name}"` };
  }

  let args: unknown = {};
  if (rawArgs && rawArgs.trim().length > 0) {
    try {
      args = JSON.parse(rawArgs);
    } catch {
      return { error: "Could not parse tool arguments as JSON" };
    }
  }

  try {
    return await executor(userId, args);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: `Invalid arguments: ${error.issues[0]?.message ?? "validation failed"}` };
    }
    console.error(`Assistant tool "${name}" failed`, error);
    return { error: "This tool failed to run. Try a narrower request." };
  }
}
