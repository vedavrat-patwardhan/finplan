import { getSession } from "@/lib/auth/session";
import { getInvestments } from "@/lib/db/queries/finance";
import { formatINR } from "@/lib/format";
import { toMonthlyEquivalent } from "@/lib/finance/engine";
import { createInvestmentAction, deleteInvestmentAction } from "@/actions/finance";
import { investmentFormFields } from "@/lib/form-fields";
import {
  ResourceFormSheet,
  DeleteButton,
} from "@/components/finance/resource-form-sheet";
import { EmptyState } from "@/components/finance/empty-state";
import { Badge } from "@/components/ui/badge";

export default async function InvestmentsPage() {
  const session = await getSession();
  if (!session) return null;

  const items = await getInvestments(session.userId);
  const monthlyTotal = items.reduce(
    (sum, i) => sum + toMonthlyEquivalent(i.amount, i.frequency),
    0
  );

  return (
    <div className="page-container space-y-6 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Investments</h1>
          <p className="mt-1 text-muted-foreground">
            SIPs, PPF, NPS, and other plans ·{" "}
            {formatINR(monthlyTotal, { compact: true })}/mo committed
          </p>
        </div>
        <ResourceFormSheet
          title="Add investment"
          triggerLabel="Add investment"
          fields={investmentFormFields}
          action={createInvestmentAction}
        />
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="No investments yet"
          description="Track your SIPs, PPF, FDs, and other recurring investment commitments."
        />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-4"
            >
              <div>
                <p className="font-medium">{item.name}</p>
                <div className="mt-1 flex gap-2">
                  <Badge variant="secondary">{item.type}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {item.expectedReturnPct}% expected return
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="font-medium tabular-nums">{formatINR(item.amount)}</p>
                  <p className="text-xs capitalize text-muted-foreground">
                    {item.frequency.replace("_", " ")} ·{" "}
                    {formatINR(toMonthlyEquivalent(item.amount, item.frequency), {
                      compact: true,
                    })}
                    /mo
                  </p>
                </div>
                <DeleteButton id={item.id} action={deleteInvestmentAction} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
