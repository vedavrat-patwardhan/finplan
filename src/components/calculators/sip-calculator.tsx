"use client";

import { useMemo, useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MoneyInput } from "@/components/finance/money-input";
import { formatINR } from "@/lib/format";
import { SURPLUS_UTILIZATION_TIERS } from "@/lib/finance/constants";
import {
  buildSurplusBudgetTiers,
  calculateLumpsumFutureValue,
  calculateSIPFutureValue,
  generateSIPProjection,
} from "@/lib/finance/engine";
import {
  ReverseBudgetOptions,
  type ReverseBudgetOption,
} from "@/components/calculators/reverse-budget-options";
import dynamic from "next/dynamic";
import { ChartArea } from "@/components/ui/chart-area";

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
const Legend = dynamic(() => import("recharts").then((m) => m.Legend), { ssr: false });

interface SIPCalculatorProps {
  defaults?: {
    monthlyInvestment?: number;
    expectedReturn?: number;
    monthlySurplus?: number;
  };
}

export function SIPCalculator({ defaults }: SIPCalculatorProps) {
  const [monthly, setMonthly] = useState(defaults?.monthlyInvestment ?? 5000);
  const [rate, setRate] = useState(defaults?.expectedReturn ?? 12);
  const [years, setYears] = useState(10);
  const [stepUp, setStepUp] = useState(10);
  const [targetCorpus, setTargetCorpus] = useState(5000000);
  const [, startTransition] = useTransition();

  const monthlySurplus = defaults?.monthlySurplus ?? 0;

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

  const reverseOptions = useMemo((): ReverseBudgetOption[] => {
    if (monthlySurplus <= 0) return [];

    return buildSurplusBudgetTiers(
      monthlySurplus,
      SURPLUS_UTILIZATION_TIERS,
      (monthlyBudget) => {
        const achievableCorpus = calculateSIPFutureValue(
          monthlyBudget,
          rate,
          years,
          stepUp
        );
        return {
          achievableCorpus,
          shortfall:
            targetCorpus > 0 ? Math.max(0, targetCorpus - achievableCorpus) : 0,
        };
      }
    ).map((tier) => ({
      id: tier.id,
      label: tier.label,
      description: tier.description,
      utilizationPct: tier.utilizationPct,
      monthlyBudget: tier.monthlyBudget,
      metrics: [
        {
          label: "Projected corpus",
          value: tier.result.achievableCorpus,
          highlight: true,
          compact: true,
        },
        { label: "Monthly SIP", value: tier.monthlyBudget },
        ...(targetCorpus > 0
          ? [
              {
                label:
                  tier.result.shortfall === 0 ? "Target corpus" : "Shortfall vs target",
                value:
                  tier.result.shortfall === 0 ? targetCorpus : tier.result.shortfall,
                compact: true,
              },
            ]
          : [
              {
                label: "Total invested",
                value: tier.monthlyBudget * 12 * years,
                compact: true,
              },
            ]),
      ],
    }));
  }, [monthlySurplus, rate, years, stepUp, targetCorpus]);

  return (
    <Tabs defaultValue="forward" className="space-y-6">
      <TabsList>
        <TabsTrigger value="forward">Project growth</TabsTrigger>
        <TabsTrigger value="reverse">What can I invest?</TabsTrigger>
      </TabsList>

      <TabsContent value="forward" className="space-y-6">
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
            <ChartArea heightClass="h-72" initialDimension={{ width: 320, height: 288 }}>
              <LineChart data={projection}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="year" />
                <YAxis tickFormatter={(v) => formatINR(v, { compact: true })} />
                <Legend />
                <Line type="monotone" dataKey="invested" stroke="#e06b56" name="Invested" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="value" stroke="#2d9f8a" name="Value" dot={false} strokeWidth={2} />
              </LineChart>
            </ChartArea>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="reverse" className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          <div className="space-y-2">
            <Label>Target corpus (optional, ₹)</Label>
            <MoneyInput
              value={targetCorpus}
              onChange={(e) =>
                startTransition(() => setTargetCorpus(Number(e.target.value)))
              }
              placeholder="e.g. 5000000"
            />
          </div>
        </div>

        {monthlySurplus > 0 ? (
          <ReverseBudgetOptions
            monthlySurplus={monthlySurplus}
            options={reverseOptions}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Add income and expenses in your profile to see SIP budgets from your surplus.
          </p>
        )}
      </TabsContent>
    </Tabs>
  );
}
