import Link from "next/link";
import { CalendarDays, Target } from "lucide-react";
import { formatDate, formatINR } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface GoalSavingObligationItem {
  sourceId: string;
  name: string;
  amount: number;
  targetAmount: number;
  currentSaved: number;
  targetDate?: string;
  status: "on_track" | "at_risk" | "unreachable";
}

const statusLabels = {
  on_track: "On track",
  at_risk: "Needs attention",
  unreachable: "Plan gap",
} as const;

export function GoalSavingObligations({
  obligations,
  compactNumbers,
}: {
  obligations: GoalSavingObligationItem[];
  compactNumbers?: boolean;
}) {
  if (obligations.length === 0) {
    return (
      <div className="border border-dashed border-border bg-card px-5 py-8 text-center">
        <Target className="mx-auto size-7 text-muted-foreground" aria-hidden />
        <p className="mt-3 text-sm font-semibold">No monthly goal savings yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Add an active goal with a target date to calculate the monthly amount.
        </p>
        <Button variant="link" render={<Link href="/goals" />} className="mt-2">
          Open goals →
        </Button>
      </div>
    );
  }

  const total = obligations.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {obligations.map((item, index) => {
          const progress =
            item.targetAmount > 0
              ? Math.min(100, Math.round((item.currentSaved / item.targetAmount) * 100))
              : 0;

          return (
            <article
              key={item.sourceId}
              className="np-plunk border border-border bg-card px-4 py-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="np-caps text-muted-foreground">Monthly goal #{index + 1}</p>
                  <h3 className="mt-1 truncate text-sm font-bold" title={item.name}>
                    {item.name}
                  </h3>
                </div>
                <Badge
                  variant={item.status === "on_track" ? "success" : "outline"}
                  className={cn(
                    "shrink-0",
                    item.status === "unreachable" && "border-destructive text-destructive"
                  )}
                >
                  {statusLabels[item.status]}
                </Badge>
              </div>

              <p className="mt-4 text-2xl font-extrabold tabular-nums tracking-tight">
                {formatINR(item.amount, { compact: compactNumbers })}
                <span className="ml-1 text-xs font-medium text-muted-foreground">/month</span>
              </p>

              <div className="mt-3 h-2 bg-muted" aria-label={`${progress}% funded`}>
                <div
                  className="h-full bg-brand transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>{progress}% funded</span>
                {item.targetDate ? (
                  <span className="flex items-center gap-1">
                    <CalendarDays className="size-3" aria-hidden />
                    {formatDate(new Date(item.targetDate))}
                  </span>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border border-border border-l-[3px] border-l-brand bg-card px-4 py-3">
        <div>
          <p className="np-caps text-muted-foreground">Total goal saving obligation</p>
          <p className="mt-1 font-bold tabular-nums">
            {formatINR(total, { compact: compactNumbers })}/month
          </p>
        </div>
        <Button variant="link" render={<Link href="/goals" />}>
          Review goal plans →
        </Button>
      </div>
    </div>
  );
}
