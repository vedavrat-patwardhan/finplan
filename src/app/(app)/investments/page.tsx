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
import { ResourceList, ResourceRow, ResourceBadge } from "@/components/finance/resource-row";
import { PageShell, PageHeader, MetaStat } from "@/components/layout/page-chrome";

export default async function InvestmentsPage() {
  const session = await getSession();
  if (!session) return null;

  const items = await getInvestments(session.userId);
  const monthlyTotal = items.reduce(
    (sum, i) => sum + toMonthlyEquivalent(i.amount, i.frequency),
    0
  );

  return (
    <PageShell>
      <PageHeader
        title="Investments"
        description="SIPs, PPF, NPS, and other commitments that reduce your monthly surplus."
        meta={
          <MetaStat
            label="Committed"
            value={`${formatINR(monthlyTotal, { compact: true })}/mo`}
          />
        }
      >
        <ResourceFormSheet
          title="Add investment"
          description="Track recurring SIPs and contributions — they count toward your monthly outflow."
          triggerLabel="Add investment"
          fields={investmentFormFields}
          action={createInvestmentAction}
        />
      </PageHeader>

      {items.length === 0 ? (
        <EmptyState
          title="No investments tracked"
          description="Add your SIPs, PPF, or NPS contributions to see how they affect surplus and goals."
        />
      ) : (
        <ResourceList>
          {items.map((item) => (
            <ResourceRow
              key={item.id}
              title={item.name}
              badges={<ResourceBadge>{item.type.replace("_", " ")}</ResourceBadge>}
              subtitle={`${item.expectedReturnPct}% expected return`}
              amount={formatINR(item.amount)}
              amountSub={
                <span className="capitalize">
                  {item.frequency.replace("_", " ")} ·{" "}
                  {formatINR(toMonthlyEquivalent(item.amount, item.frequency), {
                    compact: true,
                  })}
                  /mo
                </span>
              }
              actions={
                <DeleteButton
                  id={item.id}
                  action={deleteInvestmentAction}
                  itemName={item.name}
                />
              }
            />
          ))}
        </ResourceList>
      )}
    </PageShell>
  );
}
