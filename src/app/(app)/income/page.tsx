import { getSession } from "@/lib/auth/session";
import { getIncomeSources, getUserProfile } from "@/lib/db/queries/finance";
import { formatINR } from "@/lib/format";
import { toMonthlyEquivalent } from "@/lib/finance/engine";
import { createIncomeAction, deleteIncomeAction } from "@/actions/finance";
import { incomeFormFields } from "@/lib/form-fields";
import {
  ResourceFormSheet,
  DeleteButton,
} from "@/components/finance/resource-form-sheet";
import { EmptyState } from "@/components/finance/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function IncomePage() {
  const session = await getSession();
  if (!session) return null;

  const [items, profile] = await Promise.all([
    getIncomeSources(session.userId),
    getUserProfile(session.userId),
  ]);

  const bonusSpreadMonthly = profile?.bonusSpreadMonthly ?? false;

  const monthlyInHand = items.reduce(
    (sum, i) =>
      sum +
      toMonthlyEquivalent(i.amount, i.frequency, {
        type: i.type,
        bonusSpreadMonthly,
      }),
    0
  );

  return (
    <div className="page-container space-y-6 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Income</h1>
          <p className="mt-1 text-muted-foreground">
            All amounts are in-hand (after TDS) · {formatINR(monthlyInHand, { compact: true })}/mo
            equivalent
          </p>
        </div>
        <ResourceFormSheet
          title="Add income source"
          description="Enter in-hand amounts after TDS. Salary, bonus, and side income all count toward your monthly picture."
          triggerLabel="Add income"
          fields={incomeFormFields}
          action={createIncomeAction}
        />
      </div>

      {profile && (profile.annualInHandSalary > 0 || profile.annualInHandBonus > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-base">Annual package summary</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm sm:grid-cols-3">
            <div>
              <p className="text-muted-foreground">In-hand salary</p>
              <p className="mt-0.5 font-medium tabular-nums">
                {formatINR(profile.annualInHandSalary, { compact: true })}/yr
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">In-hand bonus</p>
              <p className="mt-0.5 font-medium tabular-nums">
                {formatINR(profile.annualInHandBonus, { compact: true })}/yr
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Tax regime</p>
              <p className="mt-0.5 font-medium capitalize">
                {profile.taxRegime} (FY 2025-26)
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {items.length === 0 ? (
        <EmptyState
          title="No income sources"
          description="Add your in-hand salary and bonus to calculate your monthly surplus."
        />
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const monthlyEq = toMonthlyEquivalent(item.amount, item.frequency, {
              type: item.type,
              bonusSpreadMonthly,
            });

            return (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-5 py-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{item.name}</p>
                    <Badge variant="secondary" className="capitalize">
                      {item.type.replace("_", " ")}
                    </Badge>
                  </div>
                  {item.notes ? (
                    <p className="mt-1 text-sm text-muted-foreground">{item.notes}</p>
                  ) : null}
                  <p className="mt-1 text-sm capitalize text-muted-foreground">
                    {item.frequency.replace("_", " ")}
                    {item.type === "bonus" && !bonusSpreadMonthly ? " · paid separately" : null}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-medium tabular-nums">{formatINR(item.amount)}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {monthlyEq > 0
                        ? `${formatINR(monthlyEq, { compact: true })}/mo`
                        : "Not in monthly total"}
                    </p>
                    {item.estimatedTax ? (
                      <p className="text-xs text-muted-foreground tabular-nums">
                        Est. tax{" "}
                        {formatINR(
                          toMonthlyEquivalent(item.estimatedTax, item.frequency),
                          { compact: true }
                        )}
                        /mo
                      </p>
                    ) : null}
                  </div>
                  <DeleteButton
                    id={item.id}
                    action={deleteIncomeAction}
                    itemName={item.name}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
