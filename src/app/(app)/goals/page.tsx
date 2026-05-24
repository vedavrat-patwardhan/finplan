import { getSession } from "@/lib/auth/session";
import { getGoalsWithFeasibility } from "@/lib/db/queries/finance";
import { createGoalAction, deleteGoalAction } from "@/actions/finance";
import { goalFormFields } from "@/lib/form-fields";
import {
  ResourceFormSheet,
  DeleteButton,
} from "@/components/finance/resource-form-sheet";
import { GoalTimeline } from "@/components/finance/goal-timeline";
import { EmptyState } from "@/components/finance/empty-state";
import { Badge } from "@/components/ui/badge";

export default async function GoalsPage() {
  const session = await getSession();
  if (!session) return null;

  const goals = await getGoalsWithFeasibility(session.userId);
  const activeGoals = goals.filter((g) => g.status !== "completed");
  const completedGoals = goals.filter((g) => g.status === "completed");

  return (
    <div className="page-container space-y-8 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Life goals</h1>
          <p className="mt-1 text-muted-foreground">
            Plan ahead or mark milestones you&apos;ve already achieved
          </p>
        </div>
        <ResourceFormSheet
          title="Add life goal"
          description="Set a target amount and date, or mark a milestone you've already achieved."
          triggerLabel="Add goal"
          fields={goalFormFields}
          action={createGoalAction}
        />
      </div>

      {goals.length === 0 ? (
        <EmptyState
          title="No goals defined"
          description="Set target amounts and dates for your major life milestones, or mark ones you've already achieved."
        />
      ) : (
        <>
          {completedGoals.length > 0 && (
            <section>
              <h2 className="font-heading mb-3 text-lg font-semibold">Achieved</h2>
              <div className="flex flex-wrap gap-2">
                {completedGoals.map((g) => (
                  <div
                    key={g.id}
                    className="flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-4 py-2"
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
            </section>
          )}

          {activeGoals.length > 0 ? (
            <section>
              <h2 className="font-heading mb-4 text-lg font-semibold">Active goals</h2>
              <GoalTimeline goals={activeGoals} />
              <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                {activeGoals.map((g) => (
                  <DeleteButton
                    key={g.id}
                    id={g.id}
                    action={deleteGoalAction}
                    label={`Remove ${g.title}`}
                    itemName={g.title}
                  />
                ))}
              </div>
            </section>
          ) : (
            <p className="text-sm text-muted-foreground">
              No active goals — add new ones or mark achievements from onboarding.
            </p>
          )}
        </>
      )}
    </div>
  );
}
