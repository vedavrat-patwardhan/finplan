import { getSession } from "@/lib/auth/session";
import { getCalculatorPrefill } from "@/lib/db/queries/finance";
import { GoalPlannerCalculator } from "@/components/calculators/goal-planner-calculator";
import { PageShell, PageHeader } from "@/components/layout/page-chrome";

export default async function GoalPlannerPage() {
  const session = await getSession();
  if (!session) return null;

  const prefill = await getCalculatorPrefill(session.userId);

  return (
    <PageShell>
      <PageHeader
        title="Goal planner"
        description="Inflation-adjusted targets for marriage, home, and other milestones."
        backHref="/calculators"
        backLabel="All calculators"
      />
      <GoalPlannerCalculator
        defaults={{
          inflationRate: prefill.inflationRate,
          monthlySurplus: prefill.monthlySurplus,
        }}
      />
    </PageShell>
  );
}
