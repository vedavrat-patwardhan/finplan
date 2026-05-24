"use client";

import { useActionState, useEffect, startTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/finance/money-input";
import { updateProfileAction } from "@/actions/finance";
import type { ActionResult } from "@/actions/auth";
import { toast } from "sonner";

const initialState: ActionResult = { success: false };

interface ProfileFormProps {
  profile: {
    name: string;
    monthlyTakeHome: number;
    inflationRate: number;
    bonusSpreadMonthly: boolean;
    retirementMultiplier: number;
    useCompactNumbers: boolean;
  };
}

function CheckboxField({
  id,
  name,
  label,
  description,
  defaultChecked,
}: {
  id: string;
  name: string;
  label: string;
  description?: string;
  defaultChecked?: boolean;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-muted/20 px-4 py-3 transition-colors hover:bg-muted/40"
    >
      <input
        type="checkbox"
        id={id}
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 size-4 shrink-0 rounded border-border accent-primary"
      />
      <span className="space-y-0.5">
        <span className="block text-sm font-medium">{label}</span>
        {description ? (
          <span className="block text-xs leading-relaxed text-muted-foreground">
            {description}
          </span>
        ) : null}
      </span>
    </label>
  );
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const [state, formAction, pending] = useActionState(updateProfileAction, initialState);

  useEffect(() => {
    if (state.success) toast.success("Settings saved");
    if (state.error) toast.error(state.error);
  }, [state.success, state.error]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(() => {
          formAction(new FormData(e.currentTarget));
        });
      }}
      className="space-y-5"
    >
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={profile.name} placeholder="Your full name" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="monthlyTakeHome">Monthly take-home (₹)</Label>
        <MoneyInput
          id="monthlyTakeHome"
          name="monthlyTakeHome"
          defaultValue={profile.monthlyTakeHome}
          placeholder="e.g. 100000"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="inflationRate">Default inflation rate (%)</Label>
          <Input
            id="inflationRate"
            name="inflationRate"
            type="number"
            step="0.1"
            defaultValue={profile.inflationRate}
            placeholder="e.g. 6"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="retirementMultiplier">Retirement multiplier</Label>
          <Input
            id="retirementMultiplier"
            name="retirementMultiplier"
            type="number"
            defaultValue={profile.retirementMultiplier}
            placeholder="e.g. 25"
          />
        </div>
      </div>
      <div className="space-y-3">
        <CheckboxField
          id="bonusSpreadMonthly"
          name="bonusSpreadMonthly"
          label="Spread annual bonus across 12 months"
          description="Include yearly bonus in your monthly income and surplus calculations."
          defaultChecked={profile.bonusSpreadMonthly}
        />
        <CheckboxField
          id="useCompactNumbers"
          name="useCompactNumbers"
          label="Use L/Cr compact number format"
          description="Show large amounts as ₹1.42 L or ₹5 Cr instead of full digits."
          defaultChecked={profile.useCompactNumbers}
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save settings"}
      </Button>
    </form>
  );
}
