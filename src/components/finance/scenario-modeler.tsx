"use client";

import { useMemo, useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/finance/money-input";
import { formatINR } from "@/lib/format";
import { scenarioSurplusChange } from "@/lib/finance/engine";

interface ScenarioModelerProps {
  baseSurplus: number;
}

export function ScenarioModeler({ baseSurplus }: ScenarioModelerProps) {
  const [incomeDelta, setIncomeDelta] = useState(0);
  const [expenseDelta, setExpenseDelta] = useState(0);
  const [investmentDelta, setInvestmentDelta] = useState(0);
  const [, startTransition] = useTransition();

  const newSurplus = useMemo(
    () =>
      scenarioSurplusChange(baseSurplus, {
        incomeDelta,
        expenseDelta,
        investmentDelta,
      }),
    [baseSurplus, incomeDelta, expenseDelta, investmentDelta]
  );

  const delta = newSurplus - baseSurplus;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-lg">What-if scenario</CardTitle>
        <p className="text-sm text-muted-foreground">
          Adjust income, expenses, or investments to see impact on surplus
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Income change (₹/mo)</Label>
            <MoneyInput
              value={incomeDelta}
              onChange={(e) =>
                startTransition(() => setIncomeDelta(Number(e.target.value)))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Expense change (₹/mo)</Label>
            <MoneyInput
              value={expenseDelta}
              onChange={(e) =>
                startTransition(() => setExpenseDelta(Number(e.target.value)))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Investment change (₹/mo)</Label>
            <MoneyInput
              value={investmentDelta}
              onChange={(e) =>
                startTransition(() => setInvestmentDelta(Number(e.target.value)))
              }
            />
          </div>
        </div>

        <div className="rounded-lg bg-muted/50 px-4 py-4">
          <p className="text-sm text-muted-foreground">Projected monthly surplus</p>
          <p className="font-heading mt-1 text-2xl font-semibold tabular-nums">
            {formatINR(newSurplus, { compact: true })}
          </p>
          <p className={`mt-1 text-sm ${delta >= 0 ? "text-success" : "text-destructive"}`}>
            {delta >= 0 ? "+" : ""}
            {formatINR(delta, { compact: true })} vs current
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
