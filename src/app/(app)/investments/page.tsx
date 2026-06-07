import { getSession } from "@/lib/auth/session";
import { getInvestments } from "@/lib/db/queries/finance";
import { formatINR } from "@/lib/format";
import { toMonthlyEquivalent } from "@/lib/finance/engine";
import { EmptyState } from "@/components/finance/empty-state";
import { InvestmentCard } from "@/components/finance/investment-card";
import { InvestmentFormSheet } from "@/components/finance/investment-form-sheet";
import { PageShell, PageHeader, MetaStat } from "@/components/layout/page-chrome";

export default async function InvestmentsPage() {
  const session = await getSession();
  if (!session) return null;

  const items = await getInvestments(session.userId);
  const monthlyTotal = items.reduce(
    (sum, i) => sum + toMonthlyEquivalent(i.amount, i.frequency),
    0
  );
  const totalInvested = items.reduce((sum, i) => sum + i.metrics.totalInvested, 0);
  const totalFundValue = items.reduce(
    (sum, i) => sum + (i.metrics.fundValue ?? i.metrics.totalInvested),
    0
  );

  return (
    <PageShell>
      <PageHeader
        title="Investments"
        description="SIPs, PPF, NPS, and other commitments that reduce your monthly surplus."
        meta={
          <>
            <MetaStat
              label="Committed"
              value={`${formatINR(monthlyTotal, { compact: true })}/mo`}
            />
            <MetaStat
              label="Total invested"
              value={formatINR(totalInvested, { compact: true })}
            />
            <MetaStat
              label="Portfolio value"
              value={formatINR(totalFundValue, { compact: true })}
            />
          </>
        }
      >
        <InvestmentFormSheet />
      </PageHeader>

      {items.length === 0 ? (
        <EmptyState
          title="No investments tracked"
          description="Add your SIPs with a start date and either absolute return or current value to see fund performance."
        />
      ) : (
        <div className="list-stack">
          {items.map((item) => (
            <InvestmentCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </PageShell>
  );
}
