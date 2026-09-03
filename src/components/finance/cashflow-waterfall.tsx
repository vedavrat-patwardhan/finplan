"use client";

import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { ColoredBarRectangle } from "@/components/finance/chart-shapes";
import { formatINR } from "@/lib/format";
import { useChartPalette } from "@/lib/finance/use-chart-palette";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartArea } from "@/components/ui/chart-area";

interface CashflowWaterfallProps {
  grossIncome: number;
  fixedExpenses: number;
  investments: number;
  insurance: number;
  netSurplus: number;
}

/** Fixed semantic slots for the waterfall steps — see chart-colors.ts. */
const WATERFALL_COLOR_INDEX: Record<string, number> = {
  Income: 1,
  Expenses: 2,
  Investments: 0,
  Insurance: 4,
  Surplus: 3,
};

const axisTick = { fill: "var(--muted-foreground)", fontSize: 10 };

function WaterfallTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number }>;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="border border-border bg-popover p-3">
      <p className="np-caps text-muted-foreground">{item.name}</p>
      <p className="mt-1 font-bold tabular-nums">
        {formatINR(Math.abs(item.value), { compact: true })}
      </p>
    </div>
  );
}

export function CashflowWaterfall({
  grossIncome,
  fixedExpenses,
  investments,
  insurance,
  netSurplus,
}: CashflowWaterfallProps) {
  const { colorAt } = useChartPalette();
  const data = [
    { name: "Income", value: grossIncome },
    { name: "Expenses", value: -fixedExpenses },
    { name: "Investments", value: -investments },
    { name: "Insurance", value: -insurance },
    { name: "Surplus", value: netSurplus },
  ].map((entry) => ({
    ...entry,
    fill: colorAt(WATERFALL_COLOR_INDEX[entry.name]),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly cashflow</CardTitle>
        <CardDescription>
          How your income flows through commitments to what remains.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartArea>
          <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} />
            <YAxis
              tick={axisTick}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => formatINR(v, { compact: true })}
            />
            <Tooltip content={<WaterfallTooltip />} cursor={{ fill: "var(--accent)" }} />
            <Bar dataKey="value" radius={0} shape={ColoredBarRectangle} />
          </BarChart>
        </ChartArea>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {data.map((item) => (
            <div key={item.name} className="text-center sm:text-left">
              <p className="np-caps flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground sm:justify-start">
                <span className="size-2 shrink-0" style={{ backgroundColor: item.fill }} aria-hidden />
                {item.name}
              </p>
              <p className="text-sm font-bold tabular-nums">
                {formatINR(Math.abs(item.value), { compact: true })}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
