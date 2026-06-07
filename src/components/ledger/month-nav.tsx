"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

function shiftMonth(monthKey: string, delta: number) {
  const [year, month] = monthKey.split("-").map(Number);
  const d = new Date(year, month - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function MonthNav({ month, accountId }: { month: string; accountId?: string }) {
  const base = accountId ? `account=${accountId}&` : "";
  const prev = shiftMonth(month, -1);
  const next = shiftMonth(month, 1);
  const label = new Date(`${month}-01`).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const canGoForward = month < currentMonth;

  return (
    <div className="flex items-center justify-between gap-2">
      <Button
        variant="outline"
        size="icon"
        className="size-9"
        render={<Link href={`/transactions?${base}month=${prev}`} aria-label="Previous month" />}
      >
        <ChevronLeft className="size-4" />
      </Button>
      <p className="font-heading text-base font-medium">{label}</p>
      {canGoForward ? (
        <Button
          variant="outline"
          size="icon"
          className="size-9"
          render={<Link href={`/transactions?${base}month=${next}`} aria-label="Next month" />}
        >
          <ChevronRight className="size-4" />
        </Button>
      ) : (
        <Button variant="outline" size="icon" className="size-9" disabled>
          <ChevronRight className="size-4" />
        </Button>
      )}
    </div>
  );
}
