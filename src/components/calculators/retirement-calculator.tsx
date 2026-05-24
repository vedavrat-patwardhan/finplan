"use client";

import { useMemo, useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/finance/money-input";
import { formatINR } from "@/lib/format";
import {
  calculateRetirementCorpus,
  calculateInsuranceGap,
} from "@/lib/finance/engine";

interface RetirementCalculatorProps {
  defaults?: {
    monthlyExpenses?: number;
    monthlyIncome?: number;
    totalCoverage?: number;
    retirementMultiplier?: number;
  };
}

export function RetirementCalculator({ defaults }: RetirementCalculatorProps) {
  const [monthlyExpenses, setMonthlyExpenses] = useState(
    defaults?.monthlyExpenses ?? 50000
  );
  const [multiplier, setMultiplier] = useState(
    defaults?.retirementMultiplier ?? 25
  );
  const [yearsToRetire, setYearsToRetire] = useState(25);
  const [, startTransition] = useTransition();

  const annualExpenses = monthlyExpenses * 12;
  const corpus = useMemo(
    () => calculateRetirementCorpus(annualExpenses, multiplier),
    [annualExpenses, multiplier]
  );

  const insuranceGap = useMemo(
    () =>
      calculateInsuranceGap(
        (defaults?.monthlyIncome ?? monthlyExpenses * 1.5) * 12,
        defaults?.totalCoverage ?? 0
      ),
    [defaults?.monthlyIncome, defaults?.totalCoverage, monthlyExpenses]
  );

  const monthlySaveNeeded = yearsToRetire > 0 ? corpus / (yearsToRetire * 12) : corpus;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label>Monthly expenses at retirement (₹)</Label>
          <MoneyInput
            value={monthlyExpenses}
            onChange={(e) =>
              startTransition(() => setMonthlyExpenses(Number(e.target.value)))
            }
          />
        </div>
        <div className="space-y-2">
          <Label>Corpus multiplier</Label>
          <Input
            type="number"
            value={multiplier}
            onChange={(e) =>
              startTransition(() => setMultiplier(Number(e.target.value)))
            }
          />
        </div>
        <div className="space-y-2">
          <Label>Years to retirement</Label>
          <Input
            type="number"
            value={yearsToRetire}
            onChange={(e) =>
              startTransition(() => setYearsToRetire(Number(e.target.value)))
            }
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-base">Retirement corpus needed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-heading text-3xl font-semibold tabular-nums">
              {formatINR(corpus, { compact: true })}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {multiplier}× annual expenses rule · save{" "}
              {formatINR(monthlySaveNeeded, { compact: true })}/mo if starting now
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-base">Term insurance gap</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-heading text-3xl font-semibold tabular-nums">
              {formatINR(insuranceGap, { compact: true })}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Recommended cover minus existing coverage (12× income heuristic)
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
