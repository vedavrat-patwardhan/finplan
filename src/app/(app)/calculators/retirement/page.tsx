import { getSession } from "@/lib/auth/session";
import { getCalculatorPrefill } from "@/lib/db/queries/finance";
import { RetirementCalculator } from "@/components/calculators/retirement-calculator";
import { PageShell, PageHeader } from "@/components/layout/page-chrome";

export default async function RetirementCalculatorPage() {
  const session = await getSession();
  if (!session) return null;

  const prefill = await getCalculatorPrefill(session.userId);

  return (
    <PageShell>
      <PageHeader
        title="Retirement & insurance"
        description="Corpus needed for retirement and term cover gap based on your profile."
        backHref="/calculators"
        backLabel="All calculators"
      />
      <RetirementCalculator
        defaults={{
          monthlyExpenses: prefill.monthlyExpenses,
          monthlyIncome: prefill.monthlyIncome,
          totalCoverage: prefill.totalCoverage,
          retirementMultiplier: prefill.retirementMultiplier,
        }}
      />
    </PageShell>
  );
}
