import { getSession } from "@/lib/auth/session";
import { getCalculatorPrefill } from "@/lib/db/queries/finance";
import { EMICalculator } from "@/components/calculators/emi-calculator";

export default async function EMICalculatorPage() {
  const session = await getSession();
  if (!session) return null;

  const prefill = await getCalculatorPrefill(session.userId);

  return (
    <div className="page-container space-y-6 pb-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold">EMI Calculator</h1>
        <p className="mt-1 text-muted-foreground">
          Home loan EMI with affordability against your surplus
        </p>
      </div>
      <EMICalculator defaults={{ monthlySurplus: prefill.monthlySurplus }} />
    </div>
  );
}
