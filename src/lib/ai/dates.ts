/**
 * IST (Asia/Kolkata, UTC+05:30) date helpers shared by the assistant's tools
 * and finance snapshot. All ledger dates are interpreted in IST, matching
 * `src/lib/db/queries/ledger.ts` (`getTransactions`, `getLedgerSummary`).
 */

export const ASSISTANT_TIMEZONE = "Asia/Kolkata";
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const YEAR_MONTH_RE = /^\d{4}-\d{2}$/;

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/** Formats a UTC instant as its IST calendar date, `YYYY-MM-DD`. */
export function formatDateIST(date: Date): string {
  const shifted = new Date(date.getTime() + IST_OFFSET_MS);
  return `${shifted.getUTCFullYear()}-${pad2(shifted.getUTCMonth() + 1)}-${pad2(shifted.getUTCDate())}`;
}

/** Today's calendar date in IST, `YYYY-MM-DD`. */
export function todayIST(): string {
  return formatDateIST(new Date());
}

/** The current calendar month in IST, `YYYY-MM`. */
export function currentMonthIST(): string {
  return todayIST().slice(0, 7);
}

/** `YYYY-MM-DD`, real calendar date (rejects `2026-02-30` etc). */
export function isValidISODateString(value: string): boolean {
  if (!ISO_DATE_RE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** `YYYY-MM`, real calendar month. */
export function isValidYearMonthString(value: string): boolean {
  if (!YEAR_MONTH_RE.test(value)) return false;
  const month = Number(value.slice(5, 7));
  return month >= 1 && month <= 12;
}

/** True when `to` is more than `maxYears` after `from` (both `YYYY-MM-DD`). */
export function dateRangeExceedsMaxYears(from: string, to: string, maxYears = 3): boolean {
  const start = new Date(`${from}T00:00:00Z`).getTime();
  const end = new Date(`${to}T00:00:00Z`).getTime();
  const maxMs = maxYears * 366 * 24 * 60 * 60 * 1000;
  return end - start > maxMs;
}

/**
 * UTC instant boundaries `[start, end)` for an inclusive IST date range.
 * Mirrors the boundary math in `getTransactions`/`getLedgerSummary`.
 */
export function istDateRangeToUTC(from: string, to: string): { start: Date; end: Date } {
  const start = new Date(`${from}T00:00:00+05:30`);
  const end = new Date(`${to}T00:00:00+05:30`);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

/** UTC instant boundaries `[start, end)` for an IST calendar month, `YYYY-MM`. */
export function istMonthToUTCRange(month: string): { start: Date; end: Date } {
  const [year, monthNum] = month.split("-").map(Number);
  const start = new Date(`${year}-${pad2(monthNum)}-01T00:00:00+05:30`);
  const nextMonth = new Date(Date.UTC(year, monthNum, 1));
  const endKey = `${nextMonth.getUTCFullYear()}-${pad2(nextMonth.getUTCMonth() + 1)}-01`;
  const end = new Date(`${endKey}T00:00:00+05:30`);
  return { start, end };
}

/** The last `n` calendar months in IST (oldest first), ending with the current month. */
export function lastNCalendarMonthsIST(n: number): string[] {
  const [year, month] = currentMonthIST().split("-").map(Number);
  const months: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(year, month - 1 - i, 1));
    months.push(`${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}`);
  }
  return months;
}

/** The previous calendar month in IST, `YYYY-MM` ("last month" relative to today). */
export function previousMonthIST(): string {
  const [year, month] = currentMonthIST().split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 2, 1));
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}`;
}
