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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartArea } from "@/components/ui/chart-area";
import { ColoredBarRectangle, ColoredPieSector } from "@/components/finance/chart-shapes";
import { formatINR } from "@/lib/format";
import { chartColorAt, withChartFill } from "@/lib/finance/chart-colors";

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
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{item.name}</p>
      <p className="tabular-nums text-muted-foreground">
        {formatINR(item.value, { compact: true })}
      </p>
    </div>
  );
}

export function PortfolioCharts({ data }: { data: PortfolioChartData }) {
  const hasExpenses = data.expenseByCategory.length > 0;
  const hasGoals = data.goalProgress.length > 0;
  const cashflowAllocation = withChartFill(data.cashflowAllocation);
  const incomeBreakdown = withChartFill(data.incomeBreakdown);
  const expenseByCategory = withChartFill(data.expenseByCategory);
  const goalProgress = data.goalProgress.map((entry, i) => ({
    ...entry,
    fill: entry.fill ?? entry.color ?? chartColorAt(i),
    targetFill: entry.targetFill ?? chartColorAt(i + 3),
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="overflow-hidden border-t-[3px] border-t-chart-1">
        <CardHeader>
          <CardTitle className="font-heading text-lg">Monthly allocation</CardTitle>
          <p className="text-sm text-muted-foreground">
            Where your in-hand income goes each month
          </p>
        </CardHeader>
        <CardContent>
          {cashflowAllocation.length === 1 ? (
            <div className="flex h-64 flex-col items-center justify-center text-center">
              <p className="text-sm text-muted-foreground">
                {cashflowAllocation[0].name}
              </p>
              <p className="font-heading mt-1 text-3xl font-semibold tabular-nums">
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
                    paddingAngle={2}
                    stroke="#fff"
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

      <Card className="overflow-hidden border-t-[3px] border-t-chart-6">
        <CardHeader>
          <CardTitle className="font-heading text-lg">Income sources</CardTitle>
          <p className="text-sm text-muted-foreground">In-hand amounts by source</p>
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
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar
                    dataKey="value"
                    radius={[0, 4, 4, 0]}
                    shape={ColoredBarRectangle}
                  />
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
        <Card className="overflow-hidden border-t-[3px] border-t-chart-2">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Expenses by category</CardTitle>
            <p className="text-sm text-muted-foreground">Planned budget breakdown — edit in Expenses</p>
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
                    paddingAngle={1}
                    stroke="#fff"
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
        <Card className="overflow-hidden border-t-[3px] border-t-chart-4">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Goal funding progress</CardTitle>
            <p className="text-sm text-muted-foreground">Saved vs target for active goals</p>
          </CardHeader>
          <CardContent>
            <>
              <ChartArea>
                <BarChart data={goalProgress} margin={{ bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis tickFormatter={(v) => formatINR(v, { compact: true })} tick={{ fontSize: 11 }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar
                    dataKey="saved"
                    name="Saved"
                    radius={[4, 4, 0, 0]}
                    shape={ColoredBarRectangle}
                  />
                  <Bar
                    dataKey="target"
                    name="Target"
                    radius={[4, 4, 0, 0]}
                    shape={(props) => <ColoredBarRectangle {...props} fillKey="targetFill" />}
                  />
                </BarChart>
              </ChartArea>
              <ChartLegend
                items={[
                  { name: "Saved", color: chartColorAt(0) },
                  { name: "Target", color: chartColorAt(3) },
                ]}
              />
            </>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
