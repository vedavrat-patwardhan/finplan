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

/** "emergency_fund" → "Emergency fund", "emergency fund" → "Emergency fund" */
export function formatInvestmentType(type: string): string {
  const labels: Record<string, string> = {
    lump_sum: "Lump sum",
    mutual_fund: "Mutual fund",
  };
  return labels[type] ?? formatLabel(type);
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
