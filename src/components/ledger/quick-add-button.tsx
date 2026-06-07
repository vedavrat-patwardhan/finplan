"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLedger } from "@/components/ledger/ledger-provider";
import { cn } from "@/lib/utils";

export function QuickAddButton({ className }: { className?: string }) {
  const { openQuickAdd } = useLedger();

  return (
    <Button type="button" onClick={openQuickAdd} className={cn("gap-2", className)}>
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
      className="relative -mt-5 flex flex-1 cursor-pointer flex-col items-center gap-0.5 outline-none"
      aria-label="Add transaction"
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
        <Plus className="size-5" />
      </span>
      <span className="text-[10px] font-medium text-primary">Add</span>
    </button>
  );
}
