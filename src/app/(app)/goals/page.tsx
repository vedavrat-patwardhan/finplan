import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import {
  getGoalsWithFeasibility,
  getMonthlySnapshot,
} from "@/lib/db/queries/finance";
import { deleteGoalAction } from "@/actions/finance";
import { GoalFormSheet } from "@/components/finance/goal-form-sheet";
import { DeleteButton } from "@/components/finance/resource-form-sheet";
import { GoalTimeline } from "@/components/finance/goal-timeline";
import { EmptyState } from "@/components/finance/empty-state";
import {
  PageShell,
  PageHeader,
  PageSection,
  MetaStat,
  InsightPanel,
} from "@/components/layout/page-chrome";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/format";

export default async function GoalsPage() {
  const session = await getSession();
  if (!session) return null;

  const [goals, snapshot] = await Promise.all([
    getGoalsWithFeasibility(session.userId),
    getMonthlySnapshot(session.userId),
  ]);

  const activeGoals = goals.filter((g) => g.status !== "completed");
  const completedGoals = goals.filter((g) => g.status === "completed");
  const needsAttention = activeGoals.filter(
    (g) => g.feasibility.status !== "on_track"
  ).length;
  const totalRequiredMonthly = activeGoals.reduce(
    (sum, g) => sum + g.feasibility.requiredMonthlySave,
    0
  );

  return (
    <PageShell>
      <PageHeader
        title="Life goals"
        description="Marriage, house, retirement — set targets and see if your surplus can get you there."
        meta={
          <>
            <MetaStat
              label="Monthly surplus"
              value={`${formatINR(snapshot.netSurplus, { compact: true })}/mo`}
            />
            {activeGoals.length > 0 ? (
              <MetaStat
                label="Saving needed"
                value={`${formatINR(totalRequiredMonthly, { compact: true })}/mo`}
              />
            ) : null}
            {needsAttention > 0 ? (
              <MetaStat
                label="Needs attention"
                value={String(needsAttention)}
              />
            ) : null}
          </>
        }
      >
        <GoalFormSheet defaultMonthlyExpenses={snapshot.fixedExpenses} />
      </PageHeader>

      {needsAttention > 0 && activeGoals.length > 0 ? (
        <InsightPanel>
          {needsAttention === activeGoals.length ? (
            <>
              Active goals need more than your current{" "}
              <span className="font-medium tabular-nums text-foreground">
                {formatINR(snapshot.netSurplus, { compact: true })}/mo
              </span>{" "}
              surplus. Adjust targets, extend dates, or review income and expenses
              in{" "}
              <Link
                href="/cashflow"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Cashflow
              </Link>
              .
            </>
          ) : (
            <>
              {needsAttention} of {activeGoals.length} goals need a higher monthly
              save than your plan allows. Use the{" "}
              <Link
                href="/calculators/goal-planner"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Goal planner
              </Link>{" "}
              to stress-test dates and amounts.
            </>
          )}
        </InsightPanel>
      ) : null}

      {goals.length === 0 ? (
        <EmptyState
          title="No goals yet"
          description="Add your first milestone — emergency fund, home down payment, or retirement corpus."
          actionLabel="Try the goal planner"
          actionHref="/calculators/goal-planner"
        />
      ) : (
        <>
          {completedGoals.length > 0 ? (
            <PageSection title="Achieved" description="Milestones you've already reached">
              <div className="flex flex-wrap gap-2">
                {completedGoals.map((g) => (
                  <div
                    key={g.id}
                    className="flex items-center gap-2 border border-border bg-card px-4 py-2"
                  >
                    <Badge variant="success">Done</Badge>
                    <span className="text-sm font-semibold">{g.title}</span>
                    <DeleteButton
                      id={g.id}
                      action={deleteGoalAction}
                      label="Remove"
                      itemName={g.title}
                    />
                  </div>
                ))}
              </div>
            </PageSection>
          ) : null}

          {activeGoals.length > 0 ? (
            <PageSection
              title="Active goals"
              description="Monthly saving needed, progress, and feasibility against your surplus"
            >
              <GoalTimeline
                goals={activeGoals}
                monthlySurplus={snapshot.netSurplus}
                defaultMonthlyExpenses={snapshot.fixedExpenses}
                deleteAction={deleteGoalAction}
              />
            </PageSection>
          ) : (
            <p className="text-sm text-muted-foreground">
              No active goals right now — add a new one to see your timeline.
            </p>
          )}
        </>
      )}
    </PageShell>
  );
}
