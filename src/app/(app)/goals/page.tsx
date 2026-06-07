import { getSession } from "@/lib/auth/session";
import { getGoalsWithFeasibility } from "@/lib/db/queries/finance";
import { createGoalAction, deleteGoalAction } from "@/actions/finance";
import { goalFormFields } from "@/lib/form-fields";
import { ResourceFormSheet, DeleteButton } from "@/components/finance/resource-form-sheet";
import { GoalTimeline } from "@/components/finance/goal-timeline";
import { EmptyState } from "@/components/finance/empty-state";
import { PageShell, PageHeader, PageSection } from "@/components/layout/page-chrome";
import { Badge } from "@/components/ui/badge";

export default async function GoalsPage() {
  const session = await getSession();
  if (!session) return null;

  const goals = await getGoalsWithFeasibility(session.userId);
  const activeGoals = goals.filter((g) => g.status !== "completed");
  const completedGoals = goals.filter((g) => g.status === "completed");

  return (
    <PageShell>
      <PageHeader
        title="Life goals"
        description="Marriage, house, retirement — set targets and see if your surplus can get you there."
      >
        <ResourceFormSheet
          title="Add life goal"
          description="Pick a milestone, set a target amount and date, and FinPlan checks feasibility against your surplus."
          triggerLabel="Add goal"
          fields={goalFormFields}
          action={createGoalAction}
        />
      </PageHeader>

      {goals.length === 0 ? (
        <EmptyState
          title="No goals yet"
          description="Add your first milestone — emergency fund, home down payment, or retirement corpus."
        />
      ) : (
        <>
          {completedGoals.length > 0 ? (
            <PageSection title="Achieved" description="Milestones you've already reached">
              <div className="flex flex-wrap gap-2">
                {completedGoals.map((g) => (
                  <div
                    key={g.id}
                    className="flex min-h-11 items-center gap-2 rounded-full border border-success/30 bg-success/10 px-4 py-2"
                  >
                    <Badge variant="secondary" className="bg-success/20 text-success">
                      Done
                    </Badge>
                    <span className="text-sm font-medium">{g.title}</span>
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
              description="Required monthly savings and time remaining for each milestone"
            >
              <GoalTimeline goals={activeGoals} deleteAction={deleteGoalAction} />
            </PageSection>
          ) : (
            <p className="text-sm text-muted-foreground">
              No active goals right now — add a new one or mark achievements from onboarding.
            </p>
          )}
        </>
      )}
    </PageShell>
  );
}
