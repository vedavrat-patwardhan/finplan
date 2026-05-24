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
import { Badge } from "@/components/ui/badge";

export default async function InsurancePage() {
  const session = await getSession();
  if (!session) return null;

  const items = await getInsurancePolicies(session.userId);
  const monthlyTotal = items.reduce(
    (sum, i) => sum + toMonthlyEquivalent(i.premium, i.frequency),
    0
  );

  return (
    <div className="page-container space-y-6 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Insurance</h1>
          <p className="mt-1 text-muted-foreground">
            Life, health, and other premiums ·{" "}
            {formatINR(monthlyTotal, { compact: true })}/mo equivalent
          </p>
        </div>
        <ResourceFormSheet
          title="Add policy"
          triggerLabel="Add policy"
          fields={insuranceFormFields}
          action={createInsuranceAction}
        />
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="No policies tracked"
          description="Add term life, health, ULIP, and other insurance premium payments."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-border bg-card p-5"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{item.name}</p>
                  {item.provider ? (
                    <p className="text-sm text-muted-foreground">{item.provider}</p>
                  ) : null}
                </div>
                <Badge variant="secondary">{item.type.replace("_", " ")}</Badge>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
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
                  <p>
                    {item.renewalDate ? formatDate(item.renewalDate) : "—"}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <DeleteButton id={item.id} action={deleteInsuranceAction} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
