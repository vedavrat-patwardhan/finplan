import { getSession } from "@/lib/auth/session";
import { getCalculatorPrefill } from "@/lib/db/queries/finance";
import { GoalPlannerCalculator } from "@/components/calculators/goal-planner-calculator";

export default async function GoalPlannerPage() {
  const session = await getSession();
  if (!session) return null;

  const prefill = await getCalculatorPrefill(session.userId);

  return (
    <div className="page-container space-y-6 pb-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Goal Planner</h1>
        <p className="mt-1 text-muted-foreground">
          Inflation-adjusted targets for marriage, home, and more
        </p>
      </div>
      <GoalPlannerCalculator
        defaults={{
          inflationRate: prefill.inflationRate,
          monthlySurplus: prefill.monthlySurplus,
        }}
      />
    </div>
  );
}
