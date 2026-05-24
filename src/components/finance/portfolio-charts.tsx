"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatINR } from "@/lib/format";
import { PORTFOLIO_CHART_COLORS } from "@/lib/finance/constants";

const PieChart = dynamic(() => import("recharts").then((m) => m.PieChart), { ssr: false });
const Pie = dynamic(() => import("recharts").then((m) => m.Pie), { ssr: false });
const Cell = dynamic(() => import("recharts").then((m) => m.Cell), { ssr: false });
const BarChart = dynamic(() => import("recharts").then((m) => m.BarChart), { ssr: false });
const Bar = dynamic(() => import("recharts").then((m) => m.Bar), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((m) => m.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then((m) => m.CartesianGrid), { ssr: false });
const ResponsiveContainer = dynamic(
  () => import("recharts").then((m) => m.ResponsiveContainer),
  { ssr: false }
);
const Tooltip = dynamic(() => import("recharts").then((m) => m.Tooltip), { ssr: false });

function ChartLegend({ items }: { items: Array<{ name: string; color: string }> }) {
  return (
    <ul className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1">
      {items.map((item) => (
        <li key={item.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: item.color }}
            aria-hidden
          />
          {item.name}
        </li>
      ))}
    </ul>
  );
}

export interface PortfolioChartData {
  cashflowAllocation: Array<{ name: string; value: number; color: string }>;
  expenseByCategory: Array<{ name: string; value: number; color: string }>;
  incomeBreakdown: Array<{ name: string; value: number; color: string }>;
  goalProgress: Array<{ name: string; saved: number; target: number; color: string }>;
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
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{item.name}</p>
      <p className="tabular-nums text-muted-foreground">
        {formatINR(item.value, { compact: true })}
      </p>
    </div>
  );
}

export function PortfolioCharts({ data }: { data: PortfolioChartData }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  const hasExpenses = data.expenseByCategory.length > 0;
  const hasGoals = data.goalProgress.length > 0;

  if (!ready) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-80 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Monthly allocation</CardTitle>
          <p className="text-sm text-muted-foreground">
            Where your in-hand income goes each month
          </p>
        </CardHeader>
        <CardContent>
          <div className="relative h-64">
            {data.cashflowAllocation.length === 1 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <p className="text-sm text-muted-foreground">
                  {data.cashflowAllocation[0].name}
                </p>
                <p className="font-heading mt-1 text-3xl font-semibold tabular-nums">
                  {formatINR(data.cashflowAllocation[0].value, { compact: true })}
                </p>
                <p className="mt-2 max-w-xs text-xs text-muted-foreground">
                  All in-hand income is currently unallocated — add expenses or investments to
                  see the split.
                </p>
              </div>
            ) : (
            <>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.cashflowAllocation}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {data.cashflowAllocation.map((entry, i) => (
                    <Cell key={entry.name} fill={entry.color || PORTFOLIO_CHART_COLORS[i % 8]} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <ChartLegend items={data.cashflowAllocation.map((entry, i) => ({
              name: entry.name,
              color: entry.color || PORTFOLIO_CHART_COLORS[i % 8],
            }))} />
            </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Income sources</CardTitle>
          <p className="text-sm text-muted-foreground">In-hand amounts by source</p>
        </CardHeader>
        <CardContent>
          {data.incomeBreakdown.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No income added yet</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.incomeBreakdown} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                  <XAxis
                    type="number"
                    tickFormatter={(v) => formatINR(v, { compact: true })}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {data.incomeBreakdown.map((entry, i) => (
                      <Cell key={entry.name} fill={entry.color || PORTFOLIO_CHART_COLORS[i % 8]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {hasExpenses && (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">Expenses by category</CardTitle>
            <p className="text-sm text-muted-foreground">Monthly equivalent breakdown</p>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.expenseByCategory}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    paddingAngle={1}
                  >
                    {data.expenseByCategory.map((entry, i) => (
                      <Cell key={entry.name} fill={entry.color || PORTFOLIO_CHART_COLORS[i % 8]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <ChartLegend items={data.expenseByCategory.map((entry, i) => ({
                name: entry.name,
                color: entry.color || PORTFOLIO_CHART_COLORS[i % 8],
              }))} />
            </div>
          </CardContent>
        </Card>
      )}

      {hasGoals && (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">Goal funding progress</CardTitle>
            <p className="text-sm text-muted-foreground">Saved vs target for active goals</p>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.goalProgress} margin={{ bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis tickFormatter={(v) => formatINR(v, { compact: true })} tick={{ fontSize: 11 }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="saved" name="Saved" fill="oklch(0.55 0.12 165)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="target" name="Target" fill="oklch(0.88 0.015 165)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <ChartLegend
                items={[
                  { name: "Saved", color: "oklch(0.55 0.12 165)" },
                  { name: "Target", color: "oklch(0.88 0.015 165)" },
                ]}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
