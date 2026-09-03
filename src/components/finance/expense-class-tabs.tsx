"use client";

import Link from "next/link";
import { Info } from "lucide-react";
import { EXPENSE_CLASSES } from "@/lib/finance/constants";
import {
  EXPENSE_CLASS_META,
  formatExpenseClassLabel,
  normalizeExpenseClass,
} from "@/lib/finance/expense-classes";
import { cn } from "@/lib/utils";

const tabs = [
  { value: "all", label: "All", description: "Every planned expense budget" },
  ...EXPENSE_CLASSES.map((value) => ({
    value,
    label: EXPENSE_CLASS_META[value].label,
    description: EXPENSE_CLASS_META[value].description,
  })),
];

export function ExpenseClassTabs({ activeClass }: { activeClass: string }) {
  const resolvedClass = normalizeExpenseClass(activeClass) ?? activeClass;
  const activeMeta = tabs.find((tab) => tab.value === resolvedClass);

  return (
    <div className="space-y-2">
      <div className="inline-flex flex-wrap border border-border bg-background p-0.5">
        {tabs.map((tab) => (
          <Link
            key={tab.value}
            href={tab.value === "all" ? "/expenses" : `/expenses?class=${tab.value}`}
            title={tab.description}
            className={cn(
              "np-caps inline-flex h-8 cursor-pointer items-center gap-1.5 px-3 text-[11px] text-muted-foreground transition-colors hover:text-foreground",
              (tab.value === "all" ? activeClass === "all" : resolvedClass === tab.value)
                ? "bg-foreground text-background hover:text-background"
                : undefined
            )}
          >
            {tab.label}
            {tab.value !== "all" ? (
              <Info className="size-3.5 opacity-70" aria-hidden />
            ) : null}
          </Link>
        ))}
      </div>
      {activeMeta && activeMeta.value !== "all" ? (
        <p className="text-xs leading-relaxed text-muted-foreground">{activeMeta.description}</p>
      ) : null}
    </div>
  );
}
