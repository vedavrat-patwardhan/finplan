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

export default async function GoalsPage() {
  const session = await getSession();
  if (!session) return null;

  const goals = await getGoalsWithFeasibility(session.userId);

  return (
    <div className="page-container space-y-6 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Life goals</h1>
          <p className="mt-1 text-muted-foreground">
            Marriage, home, baby, retirement — plan with feasibility tracking
          </p>
        </div>
        <ResourceFormSheet
          title="Add life goal"
          triggerLabel="Add goal"
          fields={goalFormFields}
          action={createGoalAction}
        />
      </div>

      {goals.length === 0 ? (
        <EmptyState
          title="No goals defined"
          description="Set target amounts and dates for your major life milestones."
          actionLabel="Add your first goal"
          actionHref="/goals"
        />
      ) : (
        <>
          <GoalTimeline goals={goals} />
          <div className="flex flex-wrap gap-2 border-t border-border pt-6">
            {goals.map((g) => (
              <DeleteButton key={g.id} id={g.id} action={deleteGoalAction} label={`Remove ${g.title}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
