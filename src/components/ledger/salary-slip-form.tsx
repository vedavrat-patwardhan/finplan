"use client";

import { useActionState, useEffect, startTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/finance/money-input";
import { applySalarySlipDataAction } from "@/actions/ledger";

export function SalarySlipForm({
  documentId,
  onSuccess,
}: {
  documentId: string;
  onSuccess?: () => void;
}) {
  const now = new Date();
  const [state, formAction, pending] = useActionState(applySalarySlipDataAction, {
    success: false,
  });

  useEffect(() => {
    if (state.success) {
      toast.success("Income profile updated from salary slip");
      onSuccess?.();
    }
    if (state.error) toast.error(state.error);
  }, [state.success, state.error, onSuccess]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => formAction(fd));
      }}
      className="space-y-4 border border-border bg-muted/20 p-5"
    >
      <p className="text-base font-bold">Salary slip details</p>
      <input type="hidden" name="documentId" value={documentId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="pay-month">Pay month</Label>
          <Input
            id="pay-month"
            name="payPeriodMonth"
            type="number"
            min={1}
            max={12}
            defaultValue={now.getMonth() + 1}
            placeholder="e.g. 4"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pay-year">Pay year</Label>
          <Input
            id="pay-year"
            name="payPeriodYear"
            type="number"
            defaultValue={now.getFullYear()}
            placeholder="e.g. 2026"
            required
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="gross">Gross salary (₹)</Label>
          <MoneyInput id="gross" name="grossSalary" placeholder="e.g. 150000" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tds">TDS deducted (₹)</Label>
          <MoneyInput id="tds" name="tdsDeducted" placeholder="e.g. 12000" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pt">Professional tax (₹)</Label>
          <MoneyInput id="pt" name="professionalTax" placeholder="e.g. 200" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pf">PF / ESI (₹)</Label>
          <MoneyInput id="pf" name="pfEsi" placeholder="e.g. 1800" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="net">Net in-hand (₹)</Label>
          <MoneyInput id="net" name="netInHand" placeholder="e.g. 120000" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bonus">Bonus in-hand (₹, optional)</Label>
          <MoneyInput id="bonus" name="bonus" placeholder="e.g. 0" />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Tax regime</Label>
        <div className="flex gap-2">
          {(["new", "old"] as const).map((regime) => (
            <label
              key={regime}
              className="flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 border border-border px-3 text-sm capitalize"
            >
              <input
                type="radio"
                name="taxRegime"
                value={regime}
                defaultChecked={regime === "new"}
                className="accent-brand"
              />
              {regime} regime
            </label>
          ))}
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Applying..." : "Apply to income profile"}
      </Button>
    </form>
  );
}
