/** Resolved hex palette for Recharts SVG fills (CSS vars often render as black in SVG). */
export const CHART_PALETTE = [
  "#2d9f8a", // teal — brand / investments
  "#e5a117", // amber — expenses
  "#e06b56", // coral — insurance
  "#5568d3", // indigo — surplus / savings
  "#9b5fd4", // violet
  "#3d94e0", // sky
  "#38a869", // emerald — income / positive
  "#f07c4a", // orange
] as const;

export const PORTFOLIO_CHART_COLORS = CHART_PALETTE;

export const CASHFLOW_ALLOCATION_COLORS: Record<string, string> = {
  Surplus: CHART_PALETTE[3],
  Expenses: CHART_PALETTE[1],
  Investments: CHART_PALETTE[0],
  Insurance: CHART_PALETTE[2],
};

export const CASHFLOW_WATERFALL_COLORS: Record<string, string> = {
  Income: CHART_PALETTE[6],
  Expenses: CHART_PALETTE[1],
  Investments: CHART_PALETTE[0],
  Insurance: CHART_PALETTE[2],
  Surplus: CHART_PALETTE[3],
};

export function chartColorAt(index: number): string {
  return CHART_PALETTE[index % CHART_PALETTE.length];
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
