"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/finance/money-input";
import { updateProfileAction } from "@/actions/finance";
import type { ActionResult } from "@/actions/auth";
import { toast } from "sonner";
import { useEffect } from "react";

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

export function ProfileForm({ profile }: ProfileFormProps) {
  const [state, formAction, pending] = useActionState(updateProfileAction, initialState);

  useEffect(() => {
    if (state.success) toast.success("Settings saved");
    if (state.error) toast.error(state.error);
  }, [state.success, state.error]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={profile.name} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="monthlyTakeHome">Monthly take-home (₹)</Label>
        <MoneyInput
          id="monthlyTakeHome"
          name="monthlyTakeHome"
          defaultValue={profile.monthlyTakeHome}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="inflationRate">Default inflation rate (%)</Label>
        <Input
          id="inflationRate"
          name="inflationRate"
          type="number"
          step="0.1"
          defaultValue={profile.inflationRate}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="retirementMultiplier">Retirement multiplier</Label>
        <Input
          id="retirementMultiplier"
          name="retirementMultiplier"
          type="number"
          defaultValue={profile.retirementMultiplier}
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="bonusSpreadMonthly"
          name="bonusSpreadMonthly"
          defaultChecked={profile.bonusSpreadMonthly}
          className="size-4"
        />
        <Label htmlFor="bonusSpreadMonthly">Spread annual bonus across 12 months</Label>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="useCompactNumbers"
          name="useCompactNumbers"
          defaultChecked={profile.useCompactNumbers}
          className="size-4"
        />
        <Label htmlFor="useCompactNumbers">Use L/Cr compact number format</Label>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save settings"}
      </Button>
    </form>
  );
}
