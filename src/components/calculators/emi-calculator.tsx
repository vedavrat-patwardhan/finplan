"use client";

import { useMemo, useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/finance/money-input";
import { formatINR } from "@/lib/format";
import { calculateEMI } from "@/lib/finance/engine";

interface EMICalculatorProps {
  defaults?: {
    monthlySurplus?: number;
  };
}

export function EMICalculator({ defaults }: EMICalculatorProps) {
  const [principal, setPrincipal] = useState(5000000);
  const [rate, setRate] = useState(8.5);
  const [tenure, setTenure] = useState(240);
  const [, startTransition] = useTransition();

  const emi = useMemo(
    () => calculateEMI(principal, rate, tenure),
    [principal, rate, tenure]
  );

  const totalPayment = emi * tenure;
  const totalInterest = totalPayment - principal;
  const affordable = defaults?.monthlySurplus
    ? emi <= defaults.monthlySurplus * 0.4
    : null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
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
            placeholder="e.g. 8.5"
          />
        </div>
        <div className="space-y-2">
          <Label>Tenure (months)</Label>
          <Input
            type="number"
            value={tenure}
            onChange={(e) =>
              startTransition(() => setTenure(Number(e.target.value)))
            }
            placeholder="e.g. 240"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-base">Monthly EMI</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-heading text-3xl font-semibold tabular-nums">
              {formatINR(emi)}
            </p>
            {affordable !== null ? (
              <p className={`mt-2 text-sm ${affordable ? "text-success" : "text-destructive"}`}>
                {affordable
                  ? "Within 40% of your surplus — likely affordable"
                  : "Exceeds 40% of surplus — consider lower loan or longer tenure"}
              </p>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-base">Total interest</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">
              {formatINR(totalInterest, { compact: true })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-base">Total payment</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">
              {formatINR(totalPayment, { compact: true })}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
