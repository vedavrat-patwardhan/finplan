"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MoneyInput } from "@/components/finance/money-input";
import { formatINR } from "@/lib/format";
import {
  calculateSIPFutureValue,
  calculateLumpsumFutureValue,
  generateSIPProjection,
} from "@/lib/finance/engine";
import dynamic from "next/dynamic";

const LineChart = dynamic(
  () => import("recharts").then((m) => m.LineChart),
  { ssr: false }
);
const Line = dynamic(() => import("recharts").then((m) => m.Line), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((m) => m.YAxis), { ssr: false });
const CartesianGrid = dynamic(
  () => import("recharts").then((m) => m.CartesianGrid),
  { ssr: false }
);
const ResponsiveContainer = dynamic(
  () => import("recharts").then((m) => m.ResponsiveContainer),
  { ssr: false }
);
const Legend = dynamic(() => import("recharts").then((m) => m.Legend), { ssr: false });

interface SIPCalculatorProps {
  defaults?: {
    monthlyInvestment?: number;
    expectedReturn?: number;
  };
}

export function SIPCalculator({ defaults }: SIPCalculatorProps) {
  const [monthly, setMonthly] = useState(defaults?.monthlyInvestment ?? 5000);
  const [rate, setRate] = useState(defaults?.expectedReturn ?? 12);
  const [years, setYears] = useState(10);
  const [stepUp, setStepUp] = useState(10);
  const [, startTransition] = useTransition();

  const result = useMemo(
    () => calculateSIPFutureValue(monthly, rate, years, stepUp),
    [monthly, rate, years, stepUp]
  );

  const projection = useMemo(
    () => generateSIPProjection(monthly, rate, years, stepUp),
    [monthly, rate, years, stepUp]
  );

  const lumpsum = useMemo(
    () => calculateLumpsumFutureValue(monthly * 12 * years, rate, years),
    [monthly, rate, years]
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label>Monthly SIP (₹)</Label>
          <MoneyInput
            value={monthly}
            onChange={(e) =>
              startTransition(() => setMonthly(Number(e.target.value)))
            }
            placeholder="e.g. 5000"
          />
        </div>
        <div className="space-y-2">
          <Label>Expected return (% p.a.)</Label>
          <Input
            type="number"
            value={rate}
            onChange={(e) =>
              startTransition(() => setRate(Number(e.target.value)))
            }
            placeholder="e.g. 12"
          />
        </div>
        <div className="space-y-2">
          <Label>Tenure (years)</Label>
          <Input
            type="number"
            value={years}
            onChange={(e) =>
              startTransition(() => setYears(Number(e.target.value)))
            }
            placeholder="e.g. 10"
          />
        </div>
        <div className="space-y-2">
          <Label>Annual step-up (%)</Label>
          <Input
            type="number"
            value={stepUp}
            onChange={(e) =>
              startTransition(() => setStepUp(Number(e.target.value)))
            }
            placeholder="e.g. 10"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-base">SIP future value</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-heading text-3xl font-semibold tabular-nums">
              {formatINR(result, { compact: true })}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              vs {formatINR(lumpsum, { compact: true })} if saved without compounding
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-base">Growth projection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={projection}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="year" />
                <YAxis tickFormatter={(v) => formatINR(v, { compact: true })} />
                <Legend />
                <Line type="monotone" dataKey="invested" stroke="var(--chart-3)" name="Invested" dot={false} />
                <Line type="monotone" dataKey="value" stroke="var(--chart-1)" name="Value" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
