"use client";

import { useState } from "react";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

/** Months of essential spend an emergency fund should cover. */
const EMERGENCY_MONTHS = 6;

interface CashBufferPanelProps {
  availableBalance: number;
  /** Sum of monthly essential expenses — the bare-minimum threshold. */
  monthlyEssential: number;
  compact?: boolean;
}

export function CashBufferPanel({
  availableBalance,
  monthlyEssential,
  compact,
}: CashBufferPanelProps) {
  const [includeEmergency, setIncludeEmergency] = useState(false);
  const fmt = (n: number) => formatINR(n, { compact });

  if (monthlyEssential <= 0) {
    return (
      <div className="border border-border border-l-[3px] border-l-brand bg-card px-5 py-4">
        <p className="text-sm text-muted-foreground">
          Mark expenses as essential to see the ideal amount to keep on hand.
        </p>
      </div>
    );
  }

  const bareMinimum = monthlyEssential;
  const emergencyFund = monthlyEssential * EMERGENCY_MONTHS;
  const idealAmount = bareMinimum + (includeEmergency ? emergencyFund : 0);
  const delta = availableBalance - idealAmount;
  const covered = delta >= 0;
  const coveredPct =
    idealAmount > 0
      ? Math.min(100, Math.max(0, Math.round((availableBalance / idealAmount) * 100)))
      : 100;

  return (
    <div className="space-y-4 border border-border border-l-[3px] border-l-brand bg-card px-5 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <div>
          <p className="np-caps text-muted-foreground">Ideal amount to keep available</p>
          <p className="text-3xl font-extrabold tabular-nums tracking-tight">{fmt(idealAmount)}</p>
        </div>
        <div className="text-right">
          <p className="np-caps text-muted-foreground">You have</p>
          <p className="font-bold tabular-nums">{fmt(availableBalance)}</p>
        </div>
      </div>

      <div className="h-2 w-full bg-muted">
        <div
          className={cn(
            "h-full transition-all",
            covered ? "bg-success" : coveredPct > 50 ? "bg-warning" : "bg-destructive"
          )}
          style={{ width: `${coveredPct}%` }}
        />
      </div>

      <p className="text-sm">
        {covered ? (
          <span className="text-success-text">
            {fmt(delta)} above your ideal buffer — you&apos;re covered.
          </span>
        ) : (
          <span className="text-destructive">
            {fmt(Math.abs(delta))} short of your ideal buffer.
          </span>
        )}
      </p>

      <div className="space-y-1.5 border-t border-border pt-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Bare minimum · 1 month of essentials</span>
          <span className="tabular-nums">{fmt(bareMinimum)}</span>
        </div>
        {includeEmergency ? (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              Emergency fund · {EMERGENCY_MONTHS} months of essentials
            </span>
            <span className="tabular-nums">{fmt(emergencyFund)}</span>
          </div>
        ) : null}
      </div>

      <label className="flex cursor-pointer items-center justify-between gap-3 border border-border bg-muted/20 px-4 py-3 transition-colors hover:bg-muted/40">
        <span className="text-sm leading-snug">
          Include an emergency fund ({EMERGENCY_MONTHS} months of essentials)
        </span>
        <Switch
          checked={includeEmergency}
          onCheckedChange={setIncludeEmergency}
          aria-label="Include an emergency fund"
        />
      </label>
    </div>
  );
}
