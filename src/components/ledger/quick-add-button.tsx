"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLedger } from "@/components/ledger/ledger-provider";
import { cn } from "@/lib/utils";

export function QuickAddButton({ className }: { className?: string }) {
  const { openQuickAdd } = useLedger();

  return (
    <Button type="button" variant="brand" onClick={openQuickAdd} className={cn("gap-2", className)}>
      <Plus className="size-4" />
      Add transaction
    </Button>
  );
}

export function QuickAddNavButton() {
  const { openQuickAdd } = useLedger();

  return (
    <button
      type="button"
      onClick={openQuickAdd}
      className="flex flex-1 flex-col items-center justify-end gap-0.5 outline-none"
      aria-label="Add transaction"
    >
      <span className="np-plunk np-plunk-press np-edge-brand -mt-6 inline-flex size-12 items-center justify-center bg-brand text-brand-foreground">
        <Plus className="size-5 stroke-[2.5]" />
      </span>
    </button>
  );
}
