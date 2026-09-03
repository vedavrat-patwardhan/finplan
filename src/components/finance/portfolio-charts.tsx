"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartArea } from "@/components/ui/chart-area";
import { ColoredBarRectangle, ColoredPieSector } from "@/components/finance/chart-shapes";
import { formatINR } from "@/lib/format";
import { useChartPalette } from "@/lib/finance/use-chart-palette";

/** Fixed semantic slots for the cashflow-allocation slices — see chart-colors.ts. */
const ALLOCATION_COLOR_INDEX: Record<string, number> = {
  Investments: 0,
  Expenses: 2,
  Surplus: 3,
  Insurance: 4,
};

const axisTick = { fill: "var(--muted-foreground)", fontSize: 10 };

function ChartLegend({ items }: { items: Array<{ name: string; color: string }> }) {
  return (
    <ul className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1">
      {items.map((item) => (
        <li
          key={item.name}
          className="np-caps flex items-center gap-1.5 text-[10px] text-muted-foreground"
        >
          <span className="size-2 shrink-0" style={{ backgroundColor: item.color }} aria-hidden />
          {item.name}
        </li>
      ))}
    </ul>
  );
}

export interface PortfolioChartData {
  cashflowAllocation: Array<{ name: string; value: number; color: string; fill?: string }>;
  expenseByCategory: Array<{ name: string; value: number; color: string; fill?: string }>;
  incomeBreakdown: Array<{ name: string; value: number; color: string; fill?: string }>;
  goalProgress: Array<{
    name: string;
    saved: number;
    target: number;
    color: string;
    fill?: string;
    targetFill?: string;
  }>;
  snapshot: {
    grossIncome: number;
    netSurplus: number;
    savingsRate: number;
  };
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { color?: string } }>;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="border border-border bg-popover p-3">
      <p className="np-caps text-muted-foreground">{item.name}</p>
      <p className="mt-1 font-bold tabular-nums">{formatINR(item.value, { compact: true })}</p>
    </div>
  );
}

export function PortfolioCharts({ data }: { data: PortfolioChartData }) {
  const { colorAt } = useChartPalette();
  const hasExpenses = data.expenseByCategory.length > 0;
  const hasGoals = data.goalProgress.length > 0;

  // Colours are re-derived from the theme-aware palette on the client, so
  // light mode gets the 600-shade palette instead of whatever hex the server
  // query attached to each item.
  const cashflowAllocation = data.cashflowAllocation.map((item) => {
    const fill = colorAt(ALLOCATION_COLOR_INDEX[item.name] ?? 0);
    return { ...item, fill, color: fill };
  });
  const incomeBreakdown = data.incomeBreakdown.map((item, i) => {
    const fill = colorAt(i);
    return { ...item, fill, color: fill };
  });
  const expenseByCategory = data.expenseByCategory.map((item, i) => {
    const fill = colorAt(i);
    return { ...item, fill, color: fill };
  });
  const goalProgress = data.goalProgress.map((entry, i) => ({
    ...entry,
    fill: colorAt(i),
    targetFill: colorAt(i + 3),
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Monthly allocation</CardTitle>
          <CardDescription>Where your in-hand income goes each month</CardDescription>
        </CardHeader>
        <CardContent>
          {cashflowAllocation.length === 1 ? (
            <div className="flex h-64 flex-col items-center justify-center text-center">
              <p className="text-sm text-muted-foreground">{cashflowAllocation[0].name}</p>
              <p className="mt-1 text-3xl font-extrabold tabular-nums tracking-tight">
                {formatINR(cashflowAllocation[0].value, { compact: true })}
              </p>
              <p className="mt-2 max-w-xs text-xs text-muted-foreground">
                All in-hand income is currently unallocated — add expenses or investments to
                see the split.
              </p>
            </div>
          ) : (
            <>
              <ChartArea>
                <PieChart>
                  <Pie
                    data={cashflowAllocation}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={0}
                    stroke="var(--background)"
                    strokeWidth={2}
                    shape={ColoredPieSector}
                  />
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ChartArea>
              <ChartLegend
                items={cashflowAllocation.map((entry) => ({
                  name: entry.name,
                  color: entry.fill,
                }))}
              />
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Income sources</CardTitle>
          <CardDescription>In-hand amounts by source</CardDescription>
        </CardHeader>
        <CardContent>
          {incomeBreakdown.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No income added yet</p>
          ) : (
            <>
              <ChartArea>
                <BarChart data={incomeBreakdown} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                  <XAxis
                    type="number"
                    tickFormatter={(v) => formatINR(v, { compact: true })}
                    tick={axisTick}
                  />
                  <YAxis type="category" dataKey="name" width={100} tick={axisTick} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="value" radius={0} shape={ColoredBarRectangle} />
                </BarChart>
              </ChartArea>
              <ChartLegend
                items={incomeBreakdown.map((entry) => ({
                  name: entry.name,
                  color: entry.fill,
                }))}
              />
            </>
          )}
        </CardContent>
      </Card>

      {hasExpenses && (
        <Card>
          <CardHeader>
            <CardTitle>Expenses by category</CardTitle>
            <CardDescription>Planned budget breakdown — edit in Expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <>
              <ChartArea>
                <PieChart>
                  <Pie
                    data={expenseByCategory}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    paddingAngle={0}
                    stroke="var(--background)"
                    strokeWidth={2}
                    shape={ColoredPieSector}
                  />
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ChartArea>
              <ChartLegend
                items={expenseByCategory.map((entry) => ({
                  name: entry.name,
                  color: entry.fill,
                }))}
              />
            </>
          </CardContent>
        </Card>
      )}

      {hasGoals && (
        <Card>
          <CardHeader>
            <CardTitle>Goal funding progress</CardTitle>
            <CardDescription>Saved vs target for active goals</CardDescription>
          </CardHeader>
          <CardContent>
            <>
              <ChartArea>
                <BarChart data={goalProgress} margin={{ bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis
                    dataKey="name"
                    tick={{ ...axisTick }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tickFormatter={(v) => formatINR(v, { compact: true })} tick={axisTick} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="saved" name="Saved" radius={0} shape={ColoredBarRectangle} />
                  <Bar
                    dataKey="target"
                    name="Target"
                    radius={0}
                    shape={(props) => <ColoredBarRectangle {...props} fillKey="targetFill" />}
                  />
                </BarChart>
              </ChartArea>
              <ChartLegend
                items={[
                  { name: "Saved", color: colorAt(0) },
                  { name: "Target", color: colorAt(3) },
                ]}
              />
            </>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
