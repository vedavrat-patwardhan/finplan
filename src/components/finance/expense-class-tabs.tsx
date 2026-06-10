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
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab.value}
            href={tab.value === "all" ? "/expenses" : `/expenses?class=${tab.value}`}
            title={tab.description}
            className={cn(
              "inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full px-4 py-2 text-sm transition-colors",
              (tab.value === "all" ? activeClass === "all" : resolvedClass === tab.value)
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
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
