import type { Frequency } from "./constants";
import { nextDeductionDate } from "./engine";

export interface InvestmentMetricsInput {
  amount: number;
  frequency: Frequency;
  startDate: Date;
  investmentType?: string;
  deductionDay?: number;
  lastPaidDate?: Date;
  absoluteReturnPct?: number;
  monthlyWithdrawalPct?: number;
  asOf?: Date;
}

export interface InvestmentMetrics {
  paymentCount: number;
  totalInvested: number;
  absoluteReturnPct?: number;
  fundValue?: number;
  gainAmount?: number;
  monthlyWithdrawalPct?: number;
  monthlyWithdrawalAmount?: number;
  isLumpSumWithdrawal: boolean;
  lastPaidOn: Date | null;
  nextPaymentOn: Date | null;
}

export function isLumpSumInvestment(type: string): boolean {
  return type === "lump_sum";
}

/** Recurring investments that have a scheduled next payment. */
export function hasUpcomingInvestmentPayment(item: {
  type: string;
  frequency: Frequency;
  metrics: Pick<InvestmentMetrics, "nextPaymentOn" | "isLumpSumWithdrawal">;
}): boolean {
  if (item.frequency === "one_time") {
    return false;
  }
  if (isLumpSumInvestment(item.type) && !item.metrics.isLumpSumWithdrawal) {
    return false;
  }
  return item.metrics.nextPaymentOn != null;
}

export type LumpSumMode = "growth" | "withdrawal";

export function resolveLumpSumMode(input: {
  monthlyWithdrawalPct?: number;
  absoluteReturnPct?: number;
  lumpSumMode?: LumpSumMode;
}): LumpSumMode {
  if (input.lumpSumMode) return input.lumpSumMode;
  if (input.monthlyWithdrawalPct != null) return "withdrawal";
  return "growth";
}

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function dateWithDay(year: number, month: number, day: number): Date {
  return startOfDay(new Date(year, month, Math.min(day, daysInMonth(year, month))));
}

function firstPaymentDate(start: Date, deductionDay?: number): Date {
  const anchor = startOfDay(start);
  if (deductionDay) {
    return startOfDay(nextDeductionDate(deductionDay, anchor));
  }
  return anchor;
}

function addPaymentPeriod(
  date: Date,
  frequency: Frequency,
  deductionDay?: number
): Date {
  const current = startOfDay(date);

  switch (frequency) {
    case "monthly": {
      const nextMonth = new Date(current.getFullYear(), current.getMonth() + 1, 1);
      if (deductionDay) {
        return dateWithDay(nextMonth.getFullYear(), nextMonth.getMonth(), deductionDay);
      }
      const day = Math.min(current.getDate(), daysInMonth(nextMonth.getFullYear(), nextMonth.getMonth()));
      return startOfDay(new Date(nextMonth.getFullYear(), nextMonth.getMonth(), day));
    }
    case "quarterly":
      return startOfDay(
        new Date(current.getFullYear(), current.getMonth() + 3, current.getDate())
      );
    case "half_yearly":
      return startOfDay(
        new Date(current.getFullYear(), current.getMonth() + 6, current.getDate())
      );
    case "yearly":
      return startOfDay(
        new Date(current.getFullYear() + 1, current.getMonth(), current.getDate())
      );
    default:
      return current;
  }
}

function countPaymentsUpTo(
  start: Date,
  end: Date,
  frequency: Frequency,
  deductionDay?: number
): number {
  if (frequency === "one_time") {
    return start <= end ? 1 : 0;
  }

  let count = 0;
  let cursor = firstPaymentDate(start, deductionDay);
  let guard = 0;

  while (cursor <= end && guard < 5000) {
    if (cursor >= start) count += 1;
    const next = addPaymentPeriod(cursor, frequency, deductionDay);
    if (next.getTime() <= cursor.getTime()) break;
    cursor = next;
    guard += 1;
  }

  return count;
}

function schedulePayments(
  start: Date,
  frequency: Frequency,
  deductionDay: number | undefined,
  asOf: Date
): { paymentCount: number; lastPaidOn: Date | null; nextPaymentOn: Date | null } {
  if (frequency === "one_time") {
    const paid = start <= asOf;
    return {
      paymentCount: paid ? 1 : 0,
      lastPaidOn: paid ? start : null,
      nextPaymentOn: start > asOf ? start : null,
    };
  }

  if (start > asOf) {
    return {
      paymentCount: 0,
      lastPaidOn: null,
      nextPaymentOn: firstPaymentDate(start, deductionDay),
    };
  }

  let paymentCount = 0;
  let lastPaidOn: Date | null = null;
  let nextPaymentOn: Date | null = null;
  let cursor = firstPaymentDate(start, deductionDay);
  let guard = 0;

  while (guard < 5000) {
    if (cursor > asOf) {
      nextPaymentOn = cursor;
      break;
    }

    if (cursor >= start) {
      paymentCount += 1;
      lastPaidOn = cursor;
    }

    const next = addPaymentPeriod(cursor, frequency, deductionDay);
    if (next.getTime() <= cursor.getTime()) break;
    cursor = next;
    guard += 1;
  }

  return { paymentCount, lastPaidOn, nextPaymentOn };
}

export function calculateInvestmentMetrics(
  input: InvestmentMetricsInput
): InvestmentMetrics {
  const asOf = startOfDay(input.asOf ?? new Date());
  const start = startOfDay(input.startDate);

  if (isLumpSumInvestment(input.investmentType ?? "")) {
    const principal = input.amount;
    const started = start <= asOf;
    const mode = resolveLumpSumMode({
      monthlyWithdrawalPct: input.monthlyWithdrawalPct,
      absoluteReturnPct: input.absoluteReturnPct,
    });

    if (mode === "withdrawal") {
      const monthlyWithdrawalAmount =
        input.monthlyWithdrawalPct != null
          ? principal * (input.monthlyWithdrawalPct / 100)
          : undefined;
      const payoutSchedule = started
        ? schedulePayments(start, "monthly", undefined, asOf)
        : { lastPaidOn: null, nextPaymentOn: start > asOf ? start : null };

      return {
        paymentCount: started ? 1 : 0,
        totalInvested: started ? principal : 0,
        fundValue: started ? principal : undefined,
        monthlyWithdrawalPct: input.monthlyWithdrawalPct,
        monthlyWithdrawalAmount,
        isLumpSumWithdrawal: true,
        lastPaidOn: payoutSchedule.lastPaidOn,
        nextPaymentOn: payoutSchedule.nextPaymentOn,
      };
    }

    const totalInvested = started ? principal : 0;
    const absoluteReturnPct = input.absoluteReturnPct;
    const fundValue =
      absoluteReturnPct != null && started
        ? principal * (1 + absoluteReturnPct / 100)
        : undefined;
    const gainAmount = fundValue != null ? fundValue - totalInvested : undefined;

    return {
      paymentCount: started ? 1 : 0,
      totalInvested,
      absoluteReturnPct,
      fundValue,
      gainAmount,
      isLumpSumWithdrawal: false,
      lastPaidOn: null,
      nextPaymentOn: null,
    };
  }

  let { paymentCount, lastPaidOn, nextPaymentOn } = schedulePayments(
    start,
    input.frequency,
    input.deductionDay,
    asOf
  );

  if (input.lastPaidDate) {
    const override = startOfDay(input.lastPaidDate);
    if (override >= start && override <= asOf) {
      lastPaidOn = override;
      paymentCount = countPaymentsUpTo(start, override, input.frequency, input.deductionDay);
      if (input.frequency !== "one_time") {
        let next = addPaymentPeriod(override, input.frequency, input.deductionDay);
        while (next <= asOf) {
          next = addPaymentPeriod(next, input.frequency, input.deductionDay);
        }
        nextPaymentOn = next;
      } else {
        nextPaymentOn = null;
      }
    }
  }

  const totalInvested = paymentCount * input.amount;
  const absoluteReturnPct = input.absoluteReturnPct;
  const fundValue =
    absoluteReturnPct != null ? totalInvested * (1 + absoluteReturnPct / 100) : undefined;
  const gainAmount = fundValue != null ? fundValue - totalInvested : undefined;

  return {
    paymentCount,
    totalInvested,
    absoluteReturnPct,
    fundValue,
    gainAmount,
    isLumpSumWithdrawal: false,
    lastPaidOn,
    nextPaymentOn,
  };
}

export function absoluteReturnFromFundValue(
  totalInvested: number,
  fundValue: number
): number {
  if (totalInvested <= 0) return 0;
  return ((fundValue - totalInvested) / totalInvested) * 100;
}

export function fundValueFromAbsoluteReturn(
  totalInvested: number,
  absoluteReturnPct: number
): number {
  return totalInvested * (1 + absoluteReturnPct / 100);
}

export interface PortfolioReturnSummary {
  totalInvested: number;
  totalFundValue: number;
  gainAmount: number;
  absoluteReturnPct: number;
  /** Weighted average holding period in years across investments with data. */
  averageHoldingYears: number;
  /** Simple annualized return from absolute return and average holding period. */
  annualizedReturnPct: number | null;
  itemsWithReturns: number;
  totalItems: number;
}

export function calculatePortfolioReturns(
  items: Array<{
    metrics: Pick<InvestmentMetrics, "totalInvested" | "fundValue" | "absoluteReturnPct">;
    startDate: Date;
  }>,
  asOf = new Date()
): PortfolioReturnSummary {
  let totalInvested = 0;
  let totalFundValue = 0;
  let weightedYears = 0;
  let weightSum = 0;
  let itemsWithReturns = 0;

  for (const item of items) {
    const invested = item.metrics.totalInvested;
    const fundValue = item.metrics.fundValue ?? invested;
    totalInvested += invested;
    totalFundValue += fundValue;

    if (item.metrics.fundValue != null && invested > 0) {
      itemsWithReturns += 1;
      const yearsHeld = Math.max(
        0.25,
        (asOf.getTime() - new Date(item.startDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25)
      );
      weightedYears += yearsHeld * invested;
      weightSum += invested;
    }
  }

  const gainAmount = totalFundValue - totalInvested;
  const absoluteReturnPct =
    totalInvested > 0 ? (gainAmount / totalInvested) * 100 : 0;
  const averageHoldingYears = weightSum > 0 ? weightedYears / weightSum : 0;
  const annualizedReturnPct =
    averageHoldingYears > 0 && totalInvested > 0
      ? (Math.pow(totalFundValue / totalInvested, 1 / averageHoldingYears) - 1) * 100
      : null;

  return {
    totalInvested,
    totalFundValue,
    gainAmount,
    absoluteReturnPct,
    averageHoldingYears,
    annualizedReturnPct,
    itemsWithReturns,
    totalItems: items.length,
  };
}

export type ReturnInputSource = "absoluteReturnPct" | "currentValue";

export function resolveAbsoluteReturnPct(input: {
  amount: number;
  frequency: Frequency;
  startDate?: Date;
  deductionDay?: number;
  lastPaidDate?: Date;
  absoluteReturnPct?: number;
  currentValue?: number;
  returnSource?: ReturnInputSource;
}): number | undefined {
  const metrics = calculateInvestmentMetrics({
    amount: input.amount,
    frequency: input.frequency,
    startDate: input.startDate ?? new Date(),
    deductionDay: input.deductionDay,
    lastPaidDate: input.lastPaidDate,
    absoluteReturnPct: input.absoluteReturnPct,
  });

  const { totalInvested } = metrics;

  if (input.returnSource === "currentValue" && input.currentValue != null) {
    return totalInvested > 0
      ? absoluteReturnFromFundValue(totalInvested, input.currentValue)
      : undefined;
  }

  if (input.absoluteReturnPct != null) {
    return input.absoluteReturnPct;
  }

  if (input.currentValue != null && totalInvested > 0) {
    return absoluteReturnFromFundValue(totalInvested, input.currentValue);
  }

  return undefined;
}
