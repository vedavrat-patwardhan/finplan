import { getSession } from "@/lib/auth/session";
import { getCalculatorPrefill } from "@/lib/db/queries/finance";
import { SIPCalculator } from "@/components/calculators/sip-calculator";
import { PageShell, PageHeader } from "@/components/layout/page-chrome";

export default async function SIPCalculatorPage() {
  const session = await getSession();
  if (!session) return null;

  const prefill = await getCalculatorPrefill(session.userId);

  return (
    <PageShell>
      <PageHeader
        title="SIP & lumpsum"
        description="Project future value with step-up SIP — pre-filled from your investments."
        backHref="/calculators"
        backLabel="All calculators"
      />
      <SIPCalculator
        defaults={{
          monthlyInvestment: prefill.totalSIP > 0 ? prefill.totalSIP : undefined,
          expectedReturn: 12,
        }}
      />
    </PageShell>
  );
}
