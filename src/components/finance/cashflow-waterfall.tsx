"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ColoredBarRectangle } from "@/components/finance/chart-shapes";
import { formatINR } from "@/lib/format";
import { CASHFLOW_WATERFALL_COLORS } from "@/lib/finance/chart-colors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartArea } from "@/components/ui/chart-area";

interface CashflowWaterfallProps {
  grossIncome: number;
  fixedExpenses: number;
  investments: number;
  insurance: number;
  netSurplus: number;
}

export function CashflowWaterfall({
  grossIncome,
  fixedExpenses,
  investments,
  insurance,
  netSurplus,
}: CashflowWaterfallProps) {
  const data = [
    { name: "Income", value: grossIncome },
    { name: "Expenses", value: -fixedExpenses },
    { name: "Investments", value: -investments },
    { name: "Insurance", value: -insurance },
    { name: "Surplus", value: netSurplus },
  ].map((entry) => ({
    ...entry,
    fill: CASHFLOW_WATERFALL_COLORS[entry.name],
  }));

  return (
    <Card className="overflow-hidden border-t-[3px] border-t-chart-7">
      <CardHeader>
        <CardTitle className="font-heading text-lg">Monthly cashflow</CardTitle>
        <p className="text-sm text-muted-foreground">
          How your income flows through commitments to what remains.
        </p>
      </CardHeader>
      <CardContent>
        <ChartArea>
          <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => formatINR(v, { compact: true })}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} shape={ColoredBarRectangle} />
          </BarChart>
        </ChartArea>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {data.map((item) => (
            <div key={item.name} className="text-center sm:text-left">
              <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground sm:justify-start">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: CASHFLOW_WATERFALL_COLORS[item.name] }}
                  aria-hidden
                />
                {item.name}
              </p>
              <p className="text-sm font-medium tabular-nums">
                {formatINR(Math.abs(item.value), { compact: true })}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
