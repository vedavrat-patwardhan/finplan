import { getSession } from "@/lib/auth/session";
import { getMonthlySnapshot } from "@/lib/db/queries/finance";
import { TempPlannerCalculator } from "@/components/calculators/temp-planner-calculator";
import { PageShell, PageHeader } from "@/components/layout/page-chrome";

export default async function TempPlannerPage() {
  const session = await getSession();
  if (!session) return null;

  const snapshot = await getMonthlySnapshot(session.userId);

  return (
    <PageShell>
      <PageHeader
        title="Temp planner"
        description="Quick scratch-pad with custom formulas — nothing is stored in your plan."
      />

      <TempPlannerCalculator
        defaultValues={{
          a: snapshot.grossIncome,
          b: snapshot.fixedExpenses,
        }}
      />
    </PageShell>
  );
}
