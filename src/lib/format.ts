export function formatINR(
  amount: number,
  options?: {
    compact?: boolean;
    maximumFractionDigits?: number;
    minimumFractionDigits?: number;
  }
): string {
  if (options?.compact && Math.abs(amount) >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  }
  if (options?.compact && Math.abs(amount) >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} L`;
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: options?.minimumFractionDigits ?? 0,
    maximumFractionDigits: options?.maximumFractionDigits ?? 2,
  }).format(amount);
}

export function formatPercent(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}

/**
 * Strip a raw user-typed amount down to a plain numeric string: digits, at
 * most one decimal point, and an optional leading minus (only when allowed).
 * Used so number inputs can show grouping separators while submitting a clean
 * value the backend can parse.
 */
export function sanitizeAmountInput(raw: string, allowNegative = false): string {
  if (!raw) return "";
  let s = raw.replace(/[^0-9.-]/g, "");
  const negative = allowNegative && s.startsWith("-");
  s = s.replace(/-/g, "");
  const firstDot = s.indexOf(".");
  if (firstDot !== -1) {
    s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, "");
  }
  return (negative ? "-" : "") + s;
}

/**
 * Add Indian thousands separators to the integer part of a sanitized numeric
 * string, preserving any in-progress decimal portion (e.g. "1234." → "1,234.").
 */
export function groupIndianDigits(raw: string): string {
  if (raw === "" || raw === "-" || raw === ".") return raw;
  const negative = raw.startsWith("-");
  const unsigned = negative ? raw.slice(1) : raw;
  const dotIndex = unsigned.indexOf(".");
  const intPart = dotIndex === -1 ? unsigned : unsigned.slice(0, dotIndex);
  const decimalPart = dotIndex === -1 ? "" : unsigned.slice(dotIndex + 1);
  const grouped =
    intPart === ""
      ? ""
      : new Intl.NumberFormat("en-IN").format(BigInt(intPart));
  const result = dotIndex === -1 ? grouped : `${grouped}.${decimalPart}`;
  return (negative ? "-" : "") + result;
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function parseDateInputValue(value: string | undefined | null): Date | undefined {
  if (!value) return undefined;

  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    const parsed = new Date(year, month - 1, day);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export function formatDateInputValue(date: Date | string | undefined | null): string {
  if (!date) return "";

  const d = typeof date === "string" ? parseDateInputValue(date) : date;
  if (!d || Number.isNaN(d.getTime())) return "";

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDeductionDay(day: number): string {
  const mod100 = day % 100;
  const suffix =
    mod100 >= 11 && mod100 <= 13
      ? "th"
      : day % 10 === 1
        ? "st"
        : day % 10 === 2
          ? "nd"
          : day % 10 === 3
            ? "rd"
            : "th";
  return `${day}${suffix} of each month`;
}

export function formatMonthYear(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
  }).format(date);
}

/** "term_life" → "Term Life", "half_yearly" → "Half Yearly" */
export function formatEnumLabel(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatFrequency(frequency: string): string {
  return formatEnumLabel(frequency);
}

/** "emergency_fund" → "Emergency fund", "emergency fund" → "Emergency fund" */
export function formatInvestmentType(type: string): string {
  const labels: Record<string, string> = {
    lump_sum: "Lump sum",
    mutual_fund: "Mutual fund",
    sip: "SIP",
    ppf: "PPF",
    nps: "NPS",
    fd: "FD",
  };
  return labels[type] ?? formatEnumLabel(type);
}

export function formatInsuranceType(type: string): string {
  return formatEnumLabel(type);
}

export function formatIncomeType(type: string): string {
  return formatEnumLabel(type);
}

export function formatLabel(value: string): string {
  const words = value.replace(/_/g, " ").trim().split(/\s+/);
  if (words.length === 0) return value;
  return (
    words[0]!.charAt(0).toUpperCase() +
    words[0]!.slice(1).toLowerCase() +
    (words.length > 1
      ? " " + words.slice(1).map((w) => w.toLowerCase()).join(" ")
      : "")
  );
}

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}
