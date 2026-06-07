"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

const tabs = [
  { value: "all", label: "All" },
  { value: "fixed", label: "Fixed" },
  { value: "recurring", label: "Recurring" },
  { value: "optional", label: "Optional" },
  { value: "variable", label: "Variable" },
];

export function ExpenseClassTabs({ activeClass }: { activeClass: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <Link
          key={tab.value}
          href={tab.value === "all" ? "/expenses" : `/expenses?class=${tab.value}`}
          className={cn(
            "inline-flex min-h-11 cursor-pointer items-center rounded-full px-4 py-2 text-sm transition-colors",
            activeClass === tab.value
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
