import { getSession } from "@/lib/auth/session";
import { getCashflowBreakdown } from "@/lib/db/queries/finance";
import { CashflowWaterfall } from "@/components/finance/cashflow-waterfall";
import { PageShell, PageHeader, MetaStat } from "@/components/layout/page-chrome";
import { formatINR } from "@/lib/format";

export default async function CashflowPage() {
  const session = await getSession();
  if (!session) return null;

  const { snapshot } = await getCashflowBreakdown(session.userId);

  return (
    <PageShell>
      <PageHeader
        title="Cashflow"
        description="How in-hand income flows through expenses, investments, and insurance to what's left."
        meta={
          <MetaStat
            label="Net surplus"
            value={formatINR(snapshot.netSurplus, { compact: true })}
          />
        }
      />

      <CashflowWaterfall
        grossIncome={snapshot.grossIncome}
        fixedExpenses={snapshot.fixedExpenses}
        investments={snapshot.investments}
        insurance={snapshot.insurance}
        netSurplus={snapshot.netSurplus}
      />
    </PageShell>
  );
}
