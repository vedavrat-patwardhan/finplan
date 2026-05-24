import { getSession } from "@/lib/auth/session";
import { getCalculatorPrefill } from "@/lib/db/queries/finance";
import { SIPCalculator } from "@/components/calculators/sip-calculator";

export default async function SIPCalculatorPage() {
  const session = await getSession();
  if (!session) return null;

  const prefill = await getCalculatorPrefill(session.userId);

  return (
    <div className="page-container space-y-6 pb-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold">SIP Calculator</h1>
        <p className="mt-1 text-muted-foreground">
          Project future value with step-up SIP
        </p>
      </div>
      <SIPCalculator
        defaults={{
          monthlyInvestment: prefill.totalSIP || 10000,
          expectedReturn: 12,
        }}
      />
    </div>
  );
}
