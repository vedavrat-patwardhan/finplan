/**
 * NeoPop chart palettes.
 *
 * Recharts SVG fills need resolved hex (CSS vars can render as black inside
 * SVG in some browsers), so we keep two literal palettes — one per theme —
 * and a few small helpers on top. `chartColorAt` keeps returning the dark
 * palette for backwards compatibility with callers that can't react to theme
 * changes (e.g. server components, or code that ran before this revamp);
 * client chart components should prefer `useChartPalette()` instead.
 */
export const DARK_CHART_PALETTE = [
  "#E5FE40", // lime — investments
  "#3BFFAD", // green — income
  "#FF8744", // orange — expenses
  "#9772FF", // purple — surplus
  "#FF426F", // pink — insurance
  "#FFCB45", // yellow
  "#5CDDBE", // teal
  "#AA3FFF", // violet
] as const;

export const LIGHT_CHART_PALETTE = [
  "#A0B22D",
  "#29B379",
  "#B35F30",
  "#6A35FF",
  "#B32E4E",
  "#B38E30",
  "#1E8057",
  "#772CB3",
] as const;

/** Resolved hex palette for Recharts SVG fills (CSS vars often render as black in SVG). */
export const CHART_PALETTE = DARK_CHART_PALETTE;

export const PORTFOLIO_CHART_COLORS = CHART_PALETTE;

// Semantic mapping: Income → 1 (green), Expenses → 2 (orange),
// Investments → 0 (lime), Insurance → 4 (pink), Surplus → 3 (purple).
export const CASHFLOW_ALLOCATION_COLORS: Record<string, string> = {
  Surplus: CHART_PALETTE[3],
  Expenses: CHART_PALETTE[2],
  Investments: CHART_PALETTE[0],
  Insurance: CHART_PALETTE[4],
};

export const CASHFLOW_WATERFALL_COLORS: Record<string, string> = {
  Income: CHART_PALETTE[1],
  Expenses: CHART_PALETTE[2],
  Investments: CHART_PALETTE[0],
  Insurance: CHART_PALETTE[4],
  Surplus: CHART_PALETTE[3],
};

export function chartColorAt(index: number): string {
  return CHART_PALETTE[index % CHART_PALETTE.length];
}

/** Same lookup, resolved against a specific theme's palette (600 shades in light mode). */
export function chartColorAtFor(index: number, theme: "light" | "dark"): string {
  const palette = theme === "light" ? LIGHT_CHART_PALETTE : DARK_CHART_PALETTE;
  return palette[index % palette.length];
}

/** CSS variable reference for a chart colour slot — use for inline styles in server components. */
export function chartCssVar(index: number): string {
  return `var(--chart-${(index % 8) + 1})`;
}

/** Recharts 3 reads `fill` on each datum — mirror `color` for compatibility. */
export function withChartFill<T extends { color?: string; fill?: string }>(
  items: T[],
  picker?: (item: T, index: number) => string
): Array<T & { fill: string; color: string }> {
  return items.map((item, i) => {
    const fill = item.fill ?? item.color ?? picker?.(item, i) ?? chartColorAt(i);
    return { ...item, fill, color: fill };
  });
}
