import { getSession } from "@/lib/auth/session";
import { getInsurancePolicies } from "@/lib/db/queries/finance";
import { formatINR, formatDate } from "@/lib/format";
import { toMonthlyEquivalent } from "@/lib/finance/engine";
import { createInsuranceAction, deleteInsuranceAction } from "@/actions/finance";
import { insuranceFormFields } from "@/lib/form-fields";
import {
  ResourceFormSheet,
  DeleteButton,
} from "@/components/finance/resource-form-sheet";
import { EmptyState } from "@/components/finance/empty-state";
import { ResourceBadge } from "@/components/finance/resource-row";
import { PageShell, PageHeader, MetaStat, PageSection } from "@/components/layout/page-chrome";
export default async function InsurancePage() {
  const session = await getSession();
  if (!session) return null;

  const items = await getInsurancePolicies(session.userId);
  const monthlyTotal = items.reduce(
    (sum, i) => sum + toMonthlyEquivalent(i.premium, i.frequency),
    0
  );

  return (
    <PageShell>
      <PageHeader
        title="Insurance"
        description="Premiums and coverage for term life, health, and other policies."
        meta={
          <MetaStat
            label="Premium equivalent"
            value={`${formatINR(monthlyTotal, { compact: true })}/mo`}
          />
        }
      >
        <ResourceFormSheet
          title="Add policy"
          description="Track premium, coverage amount, and renewal date so nothing slips through."
          triggerLabel="Add policy"
          fields={insuranceFormFields}
          action={createInsuranceAction}
        />
      </PageHeader>

      {items.length === 0 ? (
        <EmptyState
          title="No policies yet"
          description="Add term life, health, or motor insurance to include premiums in your cashflow picture."
        />
      ) : (
        <PageSection>
          <div className="grid gap-4 sm:grid-cols-2">
            {items.map((item) => (
              <article
                key={item.id}
                className="flex flex-col rounded-xl border border-border bg-card p-5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    {item.provider ? (
                      <p className="text-sm text-muted-foreground">{item.provider}</p>
                    ) : null}
                  </div>
                  <ResourceBadge>{item.type.replace("_", " ")}</ResourceBadge>
                </div>

                <div className="mt-4 grid flex-1 grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Premium</p>
                    <p className="font-medium tabular-nums">{formatINR(item.premium)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Coverage</p>
                    <p className="font-medium tabular-nums">
                      {formatINR(item.coverage, { compact: true })}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Frequency</p>
                    <p className="capitalize">{item.frequency.replace("_", " ")}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Renewal</p>
                    <p>{item.renewalDate ? formatDate(item.renewalDate) : "—"}</p>
                  </div>
                </div>

                <div className="mt-4 flex justify-end border-t border-border pt-3">
                  <DeleteButton
                    id={item.id}
                    action={deleteInsuranceAction}
                    itemName={item.name}
                    label="Remove policy"
                  />
                </div>
              </article>
            ))}
          </div>
        </PageSection>
      )}
    </PageShell>
  );
}
