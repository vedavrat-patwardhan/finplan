import { formatINR, formatDate, formatLabel } from "@/lib/format";
import { FeasibilityBadge } from "@/components/finance/feasibility-badge";
import { Badge } from "@/components/ui/badge";
import type { GoalFeasibility } from "@/lib/finance/engine";

export interface GoalTimelineItem {
  id: string;
  title: string;
  goalType: string;
  status?: "active" | "completed";
  targetAmount: number;
  targetDate?: Date | string | null;
  currentSaved: number;
  feasibility: GoalFeasibility;
}

export function GoalTimeline({ goals }: { goals: GoalTimelineItem[] }) {
  if (goals.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 px-6 py-10 text-center">
        <p className="font-heading text-lg text-foreground">No goals yet</p>
        <p className="mt-2 text-sm text-muted-foreground prose-width mx-auto">
          Add milestones like marriage, a house, or an emergency fund to see your timeline here.
        </p>
      </div>
    );
  }

  return (
    <div className="relative space-y-0">
      <div className="absolute left-[11px] top-3 bottom-3 w-px bg-border md:left-1/2 md:-translate-x-px" />

      {goals.map((goal, index) => {
        const progress =
          goal.targetAmount > 0
            ? Math.min(100, (goal.currentSaved / goal.targetAmount) * 100)
            : goal.status === "completed"
              ? 100
              : 0;
        const alignRight = index % 2 === 1;

        return (
          <div
            key={goal.id}
            className={`relative grid gap-4 pb-8 md:grid-cols-2 md:gap-8 ${
              alignRight ? "md:[&>div:first-child]:order-2" : ""
            }`}
          >
            <div className="hidden md:block" />

            <div className="relative rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="absolute -left-[5px] top-6 size-3 rounded-full border-2 border-background bg-primary md:left-auto md:-translate-x-1/2 md:top-6 md:-ml-0 md:left-1/2" />

              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    {formatLabel(goal.goalType)}
                  </p>
                  <h3 className="font-heading mt-1 text-lg font-semibold">
                    {formatLabel(goal.title)}
                  </h3>
                </div>
                <FeasibilityBadge status={goal.feasibility.status} />
              </div>

              {goal.status === "completed" ? (
                <Badge className="mt-3 bg-success/15 text-success">Achieved</Badge>
              ) : (
                <>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Target</p>
                  <p className="text-sm font-medium tabular-nums">
                    {formatINR(goal.targetAmount, { compact: true })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">By</p>
                  <p className="text-sm font-medium">
                    {goal.targetDate ? formatDate(goal.targetDate) : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Need / month</p>
                  <p className="text-sm font-medium tabular-nums">
                    {formatINR(goal.feasibility.requiredMonthlySave, {
                      compact: true,
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Saved</p>
                  <p className="text-sm font-medium tabular-nums">
                    {formatINR(goal.currentSaved, { compact: true })}
                  </p>
                </div>
              </div>

              <div
                className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full bg-primary transition-[width] duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {progress.toFixed(0)}% funded · {goal.feasibility.monthsRemaining}{" "}
                months left
              </p>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
