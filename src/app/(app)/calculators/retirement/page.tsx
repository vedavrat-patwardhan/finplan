import { getSession } from "@/lib/auth/session";
import { getCalculatorPrefill } from "@/lib/db/queries/finance";
import { RetirementCalculator } from "@/components/calculators/retirement-calculator";

export default async function RetirementCalculatorPage() {
  const session = await getSession();
  if (!session) return null;

  const prefill = await getCalculatorPrefill(session.userId);

  return (
    <div className="page-container space-y-6 pb-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Retirement & Insurance</h1>
        <p className="mt-1 text-muted-foreground">
          Corpus needed and term cover gap based on your profile
        </p>
      </div>
      <RetirementCalculator
        defaults={{
          monthlyExpenses: prefill.monthlyExpenses,
          monthlyIncome: prefill.monthlyIncome,
          totalCoverage: prefill.totalCoverage,
          retirementMultiplier: prefill.retirementMultiplier,
        }}
      />
    </div>
  );
}
