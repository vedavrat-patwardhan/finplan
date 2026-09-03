"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarRange, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

function shiftMonth(monthKey: string, delta: number) {
  const [year, month] = monthKey.split("-").map(Number);
  const d = new Date(year, month - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function displayRange(from: string, to: string) {
  const format = (value: string) =>
    new Date(`${value}T00:00:00+05:30`).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    });
  return `${format(from)} – ${format(to)}`;
}

export function MonthNav({
  month,
  accountId,
  dateFrom,
  dateTo,
}: {
  month: string;
  accountId?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const router = useRouter();
  const rangeActive = Boolean(dateFrom && dateTo);
  const [showRange, setShowRange] = useState(rangeActive);
  const [from, setFrom] = useState(dateFrom ?? "");
  const [to, setTo] = useState(dateTo ?? "");
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

  function applyRange() {
    if (!from || !to) {
      toast.error("Choose both a start and end date");
      return;
    }
    if (from > to) {
      toast.error("Start date must be before the end date");
      return;
    }
    const params = new URLSearchParams({ from, to });
    if (accountId) params.set("account", accountId);
    router.push(`/transactions?${params.toString()}`);
  }

  return (
    <div className="border border-border bg-card p-3">
      <div className="flex flex-wrap items-center gap-2">
        {rangeActive ? (
          <>
            <div className="min-w-0">
              <p className="np-caps text-muted-foreground">Custom range</p>
              <p className="truncate text-sm font-bold sm:text-base">
                {displayRange(dateFrom!, dateTo!)}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto gap-2"
              render={<Link href={`/transactions?${base}month=${currentMonth}`} />}
            >
              <RotateCcw className="size-4" />
              Monthly
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="outline"
              size="icon-sm"
              render={<Link href={`/transactions?${base}month=${prev}`} aria-label="Previous month" />}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <p className="flex h-10 items-center border border-border px-4 font-bold">{label}</p>
            {canGoForward ? (
              <Button
                variant="outline"
                size="icon-sm"
                render={<Link href={`/transactions?${base}month=${next}`} aria-label="Next month" />}
              >
                <ChevronRight className="size-4" />
              </Button>
            ) : (
              <Button variant="outline" size="icon-sm" disabled>
                <ChevronRight className="size-4" />
              </Button>
            )}
          </>
        )}
      </div>

      {!rangeActive ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-2 w-full gap-2 text-muted-foreground"
          onClick={() => setShowRange((value) => !value)}
        >
          <CalendarRange className="size-4" />
          {showRange ? "Hide custom range" : "Select custom date range"}
        </Button>
      ) : null}

      {showRange ? (
        <div className="mt-3 grid gap-3 border-t border-border pt-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="ledger-date-from">From</Label>
            <DatePicker
              id="ledger-date-from"
              value={from}
              onChange={setFrom}
              placeholder="Start date"
              toYear={new Date().getFullYear()}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ledger-date-to">To</Label>
            <DatePicker
              id="ledger-date-to"
              value={to}
              onChange={setTo}
              placeholder="End date"
              toYear={new Date().getFullYear()}
            />
          </div>
          <Button type="button" size="sm" onClick={applyRange}>
            Apply range
          </Button>
        </div>
      ) : null}
    </div>
  );
}
