import { getSession } from "@/lib/auth/session";
import { getCashflowBreakdown } from "@/lib/db/queries/finance";
import { CashflowWaterfall } from "@/components/finance/cashflow-waterfall";

export default async function CashflowPage() {
  const session = await getSession();
  if (!session) return null;

  const { snapshot } = await getCashflowBreakdown(session.userId);

  return (
    <div className="page-container space-y-6 pb-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Cashflow</h1>
        <p className="mt-1 text-muted-foreground">
          How income flows through expenses, investments, and insurance to surplus
        </p>
      </div>

      <CashflowWaterfall
        grossIncome={snapshot.grossIncome}
        fixedExpenses={snapshot.fixedExpenses}
        investments={snapshot.investments}
        insurance={snapshot.insurance}
        netSurplus={snapshot.netSurplus}
      />
    </div>
  );
}
