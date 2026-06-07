import { getSession } from "@/lib/auth/session";
import { getCalculatorPrefill } from "@/lib/db/queries/finance";
import { EMICalculator } from "@/components/calculators/emi-calculator";
import { PageShell, PageHeader } from "@/components/layout/page-chrome";

export default async function EMICalculatorPage() {
  const session = await getSession();
  if (!session) return null;

  const prefill = await getCalculatorPrefill(session.userId);

  return (
    <PageShell>
      <PageHeader
        title="EMI & home loan"
        description="Monthly EMI and total interest — checked against your current surplus."
        backHref="/calculators"
        backLabel="All calculators"
      />
      <EMICalculator defaults={{ monthlySurplus: prefill.monthlySurplus }} />
    </PageShell>
  );
}
