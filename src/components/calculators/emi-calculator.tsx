"use client";

import { useMemo, useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { plunkClass } from "@/components/ui/plunk";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MoneyInput } from "@/components/finance/money-input";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SURPLUS_UTILIZATION_TIERS } from "@/lib/finance/constants";
import {
  buildSurplusBudgetTiers,
  calculateEMI,
  calculateMaxLoanFromEMI,
} from "@/lib/finance/engine";
import {
  ReverseBudgetOptions,
  type ReverseBudgetOption,
} from "@/components/calculators/reverse-budget-options";

interface EMICalculatorProps {
  defaults?: {
    monthlySurplus?: number;
  };
}

export function EMICalculator({ defaults }: EMICalculatorProps) {
  const [principal, setPrincipal] = useState(5000000);
  const [rate, setRate] = useState(7.3);
  const [tenureYears, setTenureYears] = useState(20);
  const [, startTransition] = useTransition();

  const tenureMonths = tenureYears * 12;
  const monthlySurplus = defaults?.monthlySurplus ?? 0;

  const emi = useMemo(
    () => calculateEMI(principal, rate, tenureMonths),
    [principal, rate, tenureMonths]
  );

  const totalPayment = emi * tenureMonths;
  const totalInterest = totalPayment - principal;
  const affordable = monthlySurplus > 0 ? emi <= monthlySurplus * 0.4 : null;

  const reverseOptions = useMemo((): ReverseBudgetOption[] => {
    if (monthlySurplus <= 0) return [];

    return buildSurplusBudgetTiers(
      monthlySurplus,
      SURPLUS_UTILIZATION_TIERS,
      (monthlyBudget) => {
        const maxLoan = calculateMaxLoanFromEMI(monthlyBudget, rate, tenureMonths);
        const optionEmi = calculateEMI(maxLoan, rate, tenureMonths);
        const optionTotalPayment = optionEmi * tenureMonths;
        return {
          maxLoan,
          totalInterest: optionTotalPayment - maxLoan,
        };
      }
    ).map((tier) => ({
      id: tier.id,
      label: tier.label,
      description: tier.description,
      utilizationPct: tier.utilizationPct,
      monthlyBudget: tier.monthlyBudget,
      metrics: [
        { label: "Max loan amount", value: tier.result.maxLoan, highlight: true },
        { label: "Monthly EMI", value: tier.monthlyBudget },
        {
          label: "Total interest",
          value: tier.result.totalInterest,
          compact: true,
        },
      ],
    }));
  }, [monthlySurplus, rate, tenureMonths]);

  return (
    <Tabs defaultValue="forward" className="space-y-6">
      <TabsList>
        <TabsTrigger value="forward">Calculate EMI</TabsTrigger>
        <TabsTrigger value="reverse">What loan can I afford?</TabsTrigger>
      </TabsList>

      <TabsContent value="forward" className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <Card>
            <CardContent className="grid gap-4 pt-5 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Loan amount (₹)</Label>
                <MoneyInput
                  value={principal}
                  onChange={(e) =>
                    startTransition(() => setPrincipal(Number(e.target.value)))
                  }
                  placeholder="e.g. 5000000"
                />
              </div>
              <div className="space-y-2">
                <Label>Interest rate (% p.a.)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={rate}
                  onChange={(e) =>
                    startTransition(() => setRate(Number(e.target.value)))
                  }
                  placeholder="e.g. 7.3"
                />
              </div>
              <div className="space-y-2">
                <Label>Tenure (years)</Label>
                <Input
                  type="number"
                  value={tenureYears}
                  onChange={(e) =>
                    startTransition(() => setTenureYears(Number(e.target.value)))
                  }
                  placeholder="e.g. 20"
                />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className={cn(plunkClass({ edge: "brand" }), "bg-brand p-6 text-brand-foreground")}>
              <p className="np-caps text-brand-foreground/70">Monthly EMI</p>
              <p className="mt-1 text-3xl font-extrabold tracking-tight tabular-nums md:text-4xl">
                {formatINR(emi)}
              </p>
            </div>
            {affordable !== null ? (
              <p
                className={cn(
                  "text-xs font-semibold",
                  affordable ? "text-success-text" : "text-destructive"
                )}
              >
                {affordable
                  ? "Within 40% of your surplus — likely affordable"
                  : "Exceeds 40% of surplus — consider lower loan or longer tenure"}
              </p>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="border border-border bg-card p-5">
                <p className="np-caps text-muted-foreground">Total interest</p>
                <p className="mt-1 text-xl font-extrabold tabular-nums">
                  {formatINR(totalInterest, { compact: true })}
                </p>
              </div>
              <div className="border border-border bg-card p-5">
                <p className="np-caps text-muted-foreground">Total payment</p>
                <p className="mt-1 text-xl font-extrabold tabular-nums">
                  {formatINR(totalPayment, { compact: true })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="reverse" className="space-y-6">
        <Card>
          <CardContent className="grid gap-4 pt-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Interest rate (% p.a.)</Label>
              <Input
                type="number"
                step="0.1"
                value={rate}
                onChange={(e) =>
                  startTransition(() => setRate(Number(e.target.value)))
                }
                placeholder="e.g. 7.3"
              />
            </div>
            <div className="space-y-2">
              <Label>Tenure (years)</Label>
              <Input
                type="number"
                value={tenureYears}
                onChange={(e) =>
                  startTransition(() => setTenureYears(Number(e.target.value)))
                }
                placeholder="e.g. 20"
              />
            </div>
          </CardContent>
        </Card>

        {monthlySurplus > 0 ? (
          <ReverseBudgetOptions
            monthlySurplus={monthlySurplus}
            options={reverseOptions}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Add income and expenses in your profile to see loan budgets based on your surplus.
          </p>
        )}
      </TabsContent>
    </Tabs>
  );
}
