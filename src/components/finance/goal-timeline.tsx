import Link from "next/link";
import { deleteGoalAction } from "@/actions/finance";
import { FeasibilityBadge } from "@/components/finance/feasibility-badge";
import {
  GoalFormSheet,
  type GoalListItem,
} from "@/components/finance/goal-form-sheet";
import { DeleteButton } from "@/components/finance/resource-form-sheet";
import { Button } from "@/components/ui/button";
import {
  describeGoalTarget,
  PRIORITY_TIER_LABELS,
  type GoalPriorityTier,
} from "@/lib/finance/goal-planning";
import { formatDate, formatEnumLabel, formatINR } from "@/lib/format";
import type { GoalFeasibility } from "@/lib/finance/engine";
import type { ActionResult } from "@/actions/auth";
import type { GoalType } from "@/lib/finance/constants";

export interface GoalTimelineItem extends GoalListItem {
  feasibility: GoalFeasibility;
  goalType: GoalType;
}

function feasibilityInsight(
  goal: GoalTimelineItem,
  monthlySurplus: number
): string {
  const { feasibility } = goal;

  if (goal.status === "completed") {
    return "You've reached this milestone.";
  }

  if (feasibility.status === "on_track") {
    return `Saving ${formatINR(feasibility.requiredMonthlySave, { compact: true })}/mo keeps you on pace${
      goal.targetDate ? ` for ${formatDate(goal.targetDate)}` : ""
    }.`;
  }

  if (feasibility.status === "at_risk") {
    return `You need ${formatINR(feasibility.requiredMonthlySave, { compact: true })}/mo but plan ${formatINR(goal.monthlyContribution, { compact: true })}/mo. Monthly surplus is ${formatINR(monthlySurplus, { compact: true })}/mo.`;
  }

  return `Inflation-adjusted gap of ${formatINR(feasibility.gap, { compact: true })} — at ${formatINR(monthlySurplus, { compact: true })}/mo surplus, extend the timeline or raise income.`;
}

export function GoalTimeline({
  goals,
  monthlySurplus = 0,
  defaultMonthlyExpenses,
  deleteAction = deleteGoalAction,
  compact = false,
}: {
  goals: GoalTimelineItem[];
  monthlySurplus?: number;
  defaultMonthlyExpenses?: number;
  deleteAction?: (id: string) => Promise<ActionResult>;
  /** Hide per-goal actions and planner link (e.g. dashboard preview) */
  compact?: boolean;
}) {
  if (goals.length === 0) {
    return null;
  }

  return (
    <ol className="relative space-y-6 border-l-2 border-border pl-6">
      {goals.map((goal, goalIndex) => {
        const accent = `var(--chart-${(goalIndex % 8) + 1})`;
        const progress =
          goal.targetAmount > 0
            ? Math.min(100, (goal.currentSaved / goal.targetAmount) * 100)
            : goal.status === "completed"
              ? 100
              : 0;
        const insight = feasibilityInsight(goal, monthlySurplus);
        const targetDescription = describeGoalTarget(goal);
        const tierLabel =
          goal.priorityTier != null
            ? PRIORITY_TIER_LABELS[goal.priorityTier as GoalPriorityTier]
            : null;

        return (
          <li key={goal.id} className="relative">
            <span
              className="absolute -left-[calc(1.5rem+6px)] top-5 size-3 border-2 border-background"
              style={{ backgroundColor: accent }}
              aria-hidden
            />

            <article
              className="border border-border bg-card p-5"
              style={{ borderLeftWidth: 3, borderLeftColor: accent }}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="np-caps text-muted-foreground">
                    {formatEnumLabel(goal.goalType)}
                  </p>
                  <h3 className="mt-1 text-[22px] font-extrabold tracking-tight">
                    {goal.title}
                  </h3>
                  {tierLabel ? (
                    <p className="mt-1 text-xs text-muted-foreground">{tierLabel}</p>
                  ) : null}
                  {targetDescription ? (
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {targetDescription}
                    </p>
                  ) : null}
                </div>
                <FeasibilityBadge status={goal.feasibility.status} />
              </div>

              {goal.status === "completed" ? (
                <p className="mt-4 text-sm text-muted-foreground">{insight}</p>
              ) : (
                <>
                  <div className="mt-5">
                    <p className="np-caps text-muted-foreground">
                      Monthly saving needed
                    </p>
                    <p className="mt-1 text-3xl font-extrabold tabular-nums tracking-tight">
                      {formatINR(goal.feasibility.requiredMonthlySave, {
                        compact: true,
                      })}
                      <span className="text-base font-semibold text-muted-foreground">
                        /mo
                      </span>
                    </p>
                    <p className="prose-width mt-2 text-sm leading-relaxed text-muted-foreground">
                      {insight}
                    </p>
                  </div>

                  <dl className="mt-5 grid gap-4 border-t border-border pt-5 sm:grid-cols-3">
                    <div>
                      <dt className="np-caps text-muted-foreground">Target</dt>
                      <dd className="mt-0.5 font-bold tabular-nums">
                        {formatINR(goal.targetAmount, { compact: true })}
                      </dd>
                    </div>
                    <div>
                      <dt className="np-caps text-muted-foreground">Target date</dt>
                      <dd className="mt-0.5 font-bold">
                        {goal.targetDate ? formatDate(goal.targetDate) : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="np-caps text-muted-foreground">Already saved</dt>
                      <dd className="mt-0.5 font-bold tabular-nums">
                        {formatINR(goal.currentSaved, { compact: true })}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-5">
                    <div
                      className="h-2 w-full overflow-hidden bg-muted"
                      role="progressbar"
                      aria-valuenow={progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuetext={`${progress.toFixed(0)}% funded`}
                    >
                      <div
                        className="h-full transition-[width] duration-300 ease-out"
                        style={{ width: `${progress}%`, backgroundColor: accent }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {progress.toFixed(0)}% funded ·{" "}
                      {goal.feasibility.monthsRemaining} months left
                    </p>
                  </div>
                </>
              )}

              {compact ? null : (
                <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
                  <Button
                    variant="link"
                    render={<Link href="/calculators/goal-planner" />}
                  >
                    Stress-test in Goal planner
                  </Button>
                  <div className="flex items-center gap-1">
                    <GoalFormSheet
                      goal={goal}
                      defaultMonthlyExpenses={defaultMonthlyExpenses}
                    />
                    <DeleteButton
                      id={goal.id}
                      action={deleteAction}
                      itemName={goal.title}
                      label="Remove goal"
                    />
                  </div>
                </div>
              )}
            </article>
          </li>
        );
      })}
    </ol>
  );
}
