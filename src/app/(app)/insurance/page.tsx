import { getSession } from "@/lib/auth/session";
import { getInsurancePolicies } from "@/lib/db/queries/finance";
import { formatINR, formatDate, formatInsuranceType, formatFrequency } from "@/lib/format";
import { toMonthlyEquivalent } from "@/lib/finance/engine";
import { isLifeInsuranceType } from "@/lib/finance/constants";
import { deleteInsuranceAction } from "@/actions/finance";
import {
  InsuranceFormSheet,
  type InsuranceListItem,
} from "@/components/finance/insurance-form-sheet";
import { DeleteButton } from "@/components/finance/resource-form-sheet";
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
  const totalPremiumPaid = items.reduce((sum, item) => sum + item.totalPremiumPaid, 0);

  return (
    <PageShell>
      <PageHeader
        title="Insurance"
        description="Premiums and coverage for term life, health, and other policies."
        meta={
          <>
            <MetaStat
              label="Premium equivalent"
              value={`${formatINR(monthlyTotal, { compact: true })}/mo`}
            />
            <MetaStat
              label="Premiums recorded paid"
              value={formatINR(totalPremiumPaid, { compact: true })}
            />
          </>
        }
      >
        <InsuranceFormSheet />
      </PageHeader>

      {items.length === 0 ? (
        <EmptyState
          title="No policies yet"
          description="Add term life, health, or motor insurance to include premiums in your cashflow picture."
        />
      ) : (
        <PageSection>
          <div className="grid gap-4 sm:grid-cols-2">
            {items.map((item) => {
              const isLife = isLifeInsuranceType(item.type);

              return (
                <article
                  key={item.id}
                  className="flex flex-col border border-border bg-card p-5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold leading-snug">{item.name}</p>
                      {item.provider ? (
                        <p className="text-sm text-muted-foreground">{item.provider}</p>
                      ) : null}
                    </div>
                    <ResourceBadge>{formatInsuranceType(item.type)}</ResourceBadge>
                  </div>

                  <dl className="mt-4 grid flex-1 grid-cols-2 gap-3">
                    <div>
                      <dt className="np-caps text-muted-foreground">Premium</dt>
                      <dd className="font-bold tabular-nums">{formatINR(item.premium)}</dd>
                    </div>
                    <div>
                      <dt className="np-caps text-muted-foreground">Coverage</dt>
                      <dd className="font-bold tabular-nums">
                        {formatINR(item.coverage, { compact: true })}
                      </dd>
                    </div>
                    <div>
                      <dt className="np-caps text-muted-foreground">Frequency</dt>
                      <dd className="text-sm font-medium">{formatFrequency(item.frequency)}</dd>
                    </div>
                    <div>
                      <dt className="np-caps text-muted-foreground">Premiums paid</dt>
                      <dd className="font-bold tabular-nums">
                        {formatINR(item.totalPremiumPaid)}
                      </dd>
                      {item.lastPremiumPaidDate ? (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Last {formatDate(item.lastPremiumPaidDate)}
                        </p>
                      ) : null}
                    </div>

                    {isLife ? (
                      <>
                        <div>
                          <dt className="np-caps text-muted-foreground">Started paying</dt>
                          <dd className="text-sm font-medium">
                            {item.premiumStartDate
                              ? formatDate(item.premiumStartDate)
                              : "—"}
                          </dd>
                        </div>
                        <div>
                          <dt className="np-caps text-muted-foreground">Paying until</dt>
                          <dd className="text-sm font-medium">
                            {item.premiumEndDate
                              ? formatDate(item.premiumEndDate)
                              : "—"}
                          </dd>
                        </div>
                        <div>
                          <dt className="np-caps text-muted-foreground">Valid until</dt>
                          <dd className="text-sm font-medium">
                            {item.validTill ? formatDate(item.validTill) : "—"}
                          </dd>
                        </div>
                      </>
                    ) : (
                      <div>
                        <dt className="np-caps text-muted-foreground">Renewal</dt>
                        <dd className="text-sm font-medium">
                          {item.renewalDate ? formatDate(item.renewalDate) : "—"}
                        </dd>
                      </div>
                    )}
                  </dl>

                  <div className="mt-4 flex items-center justify-end gap-1 border-t border-border pt-3">
                    <InsuranceFormSheet policy={item as InsuranceListItem} />
                    <DeleteButton
                      id={item.id}
                      action={deleteInsuranceAction}
                      itemName={item.name}
                      label="Remove policy"
                    />
                  </div>
                </article>
              );
            })}
          </div>
        </PageSection>
      )}
    </PageShell>
  );
}
