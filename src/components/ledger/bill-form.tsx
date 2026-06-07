"use client";

import { useActionState, useEffect, startTransition, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/finance/money-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveBillManualDataAction } from "@/actions/ledger";
import type { PaymentAccountDTO } from "@/lib/db/queries/ledger";

export function BillForm({
  documentId,
  accounts,
  onSuccess,
}: {
  documentId: string;
  accounts: PaymentAccountDTO[];
  onSuccess?: () => void;
}) {
  const [state, formAction, pending] = useActionState(saveBillManualDataAction, {
    success: false,
  });
  const cardAccounts = accounts.filter((a) => a.type === "credit_card");
  const [accountId, setAccountId] = useState("");

  useEffect(() => {
    if (state.success) {
      toast.success("Bill details saved");
      onSuccess?.();
    }
    if (state.error) toast.error(state.error);
  }, [state.success, state.error, onSuccess]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(() => formAction(new FormData(e.currentTarget)));
      }}
      className="space-y-4 rounded-xl border border-border bg-muted/20 p-5"
    >
      <p className="font-heading text-base font-semibold">Bill details</p>
      <input type="hidden" name="documentId" value={documentId} />

      {cardAccounts.length > 0 ? (
        <div className="space-y-2">
          <Label>Linked card (optional)</Label>
          <input type="hidden" name="accountId" value={accountId} />
          <Select value={accountId} onValueChange={(v) => v && setAccountId(v)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select credit card" />
            </SelectTrigger>
            <SelectContent>
              {cardAccounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                  {a.lastFour ? ` •••• ${a.lastFour}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="period-start">Period start</Label>
          <Input id="period-start" name="periodStart" type="date" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="period-end">Period end</Label>
          <Input id="period-end" name="periodEnd" type="date" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="total-due">Total due (₹)</Label>
          <MoneyInput id="total-due" name="totalDue" placeholder="e.g. 45000" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="min-due">Minimum due (₹)</Label>
          <MoneyInput id="min-due" name="minimumDue" placeholder="e.g. 5000" />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="due-date">Payment due date</Label>
          <Input id="due-date" name="dueDate" type="date" />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Saving..." : "Save bill details"}
      </Button>
    </form>
  );
}
