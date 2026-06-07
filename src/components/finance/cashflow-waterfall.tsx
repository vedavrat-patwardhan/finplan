"use client";

import dynamic from "next/dynamic";
import { formatINR } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartArea } from "@/components/ui/chart-area";

const BarChart = dynamic(
  () => import("recharts").then((mod) => mod.BarChart),
  { ssr: false }
);
const Bar = dynamic(() => import("recharts").then((mod) => mod.Bar), {
  ssr: false,
});
const XAxis = dynamic(() => import("recharts").then((mod) => mod.XAxis), {
  ssr: false,
});
const YAxis = dynamic(() => import("recharts").then((mod) => mod.YAxis), {
  ssr: false,
});
const CartesianGrid = dynamic(
  () => import("recharts").then((mod) => mod.CartesianGrid),
  { ssr: false }
);
const Cell = dynamic(() => import("recharts").then((mod) => mod.Cell), {
  ssr: false,
});

interface CashflowWaterfallProps {
  grossIncome: number;
  fixedExpenses: number;
  investments: number;
  insurance: number;
  netSurplus: number;
}

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

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
  ];

  return (
    <Card>
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
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={entry.name}
                  fill={entry.value < 0 ? COLORS[2] : COLORS[index === 4 ? 4 : 0]}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartArea>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {data.map((item) => (
            <div key={item.name} className="text-center sm:text-left">
              <p className="text-xs text-muted-foreground">{item.name}</p>
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
