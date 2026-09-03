import { getSession } from "@/lib/auth/session";
import { getIncomeSources, getUserProfile } from "@/lib/db/queries/finance";
import { formatINR, formatIncomeType, formatFrequency } from "@/lib/format";
import { toMonthlyEquivalent } from "@/lib/finance/engine";
import { createIncomeAction, deleteIncomeAction } from "@/actions/finance";
import { incomeFormFields } from "@/lib/form-fields";
import { incomeOwnerFormField, formatOwnerLabel } from "@/lib/finance/household";
import {
  ResourceFormSheet,
  DeleteButton,
} from "@/components/finance/resource-form-sheet";
import { EmptyState } from "@/components/finance/empty-state";
import { ResourceList, ResourceRow, ResourceBadge } from "@/components/finance/resource-row";
import {
  PageShell,
  PageHeader,
  MetaStat,
  PageSection,
} from "@/components/layout/page-chrome";

export default async function IncomePage() {
  const session = await getSession();
  if (!session) return null;

  const [items, profile] = await Promise.all([
    getIncomeSources(session.userId),
    getUserProfile(session.userId),
  ]);

  const bonusSpreadMonthly = profile?.bonusSpreadMonthly ?? false;
  const householdEnabled = profile?.householdEnabled ?? false;
  const spouseName = profile?.spouseName ?? "";
  const incomeFields = householdEnabled
    ? [...incomeFormFields, incomeOwnerFormField(spouseName)]
    : incomeFormFields;

  const monthlyInHand = items.reduce(
    (sum, i) =>
      sum +
      toMonthlyEquivalent(i.amount, i.frequency, {
        type: i.type,
        bonusSpreadMonthly,
      }),
    0
  );

  const monthlyByOwner = items.reduce(
    (acc, item) => {
      const monthly = toMonthlyEquivalent(item.amount, item.frequency, {
        type: item.type,
        bonusSpreadMonthly,
      });
      const owner = item.owner ?? "self";
      acc[owner] = (acc[owner] ?? 0) + monthly;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <PageShell>
      <PageHeader
        title="Income"
        description={
          householdEnabled
            ? "Household income in one place — tag each source as yours, your partner's, or shared."
            : "Plan with in-hand amounts — what actually lands in your account after TDS."
        }
        meta={<MetaStat label="Monthly equivalent" value={`${formatINR(monthlyInHand, { compact: true })}/mo`} />}
      >
        <ResourceFormSheet
          title="Add income source"
          description="Salary, bonus, freelance, or rental — use amounts after tax is deducted."
          triggerLabel="Add income"
          fields={incomeFields}
          action={createIncomeAction}
        />
      </PageHeader>

      {householdEnabled ? (
        <PageSection title="Household breakdown">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="border border-border bg-card px-5 py-4">
              <p className="np-caps text-muted-foreground">Your income</p>
              <p className="mt-1 font-extrabold tabular-nums">
                {formatINR(monthlyByOwner.self ?? 0, { compact: true })}/mo
              </p>
            </div>
            <div className="border border-border bg-card px-5 py-4">
              <p className="np-caps text-muted-foreground">
                {spouseName || "Partner"}&apos;s income
              </p>
              <p className="mt-1 font-extrabold tabular-nums">
                {formatINR(monthlyByOwner.spouse ?? 0, { compact: true })}/mo
              </p>
            </div>
            <div className="border border-border bg-card px-5 py-4">
              <p className="np-caps text-muted-foreground">Shared / household</p>
              <p className="mt-1 font-extrabold tabular-nums">
                {formatINR(monthlyByOwner.joint ?? 0, { compact: true })}/mo
              </p>
            </div>
          </div>
        </PageSection>
      ) : null}

      {profile && profile.monthlyTakeHome > 0 ? (
        <PageSection title="Profile summary">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="border border-border bg-card px-5 py-4">
              <p className="np-caps text-muted-foreground">Monthly in-hand salary</p>
              <p className="mt-1 font-extrabold tabular-nums">
                {formatINR(profile.monthlyTakeHome, { compact: true })}/mo
              </p>
              {profile.annualInHandSalary > 0 ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  ≈ {formatINR(profile.annualInHandSalary, { compact: true })}/yr
                </p>
              ) : null}
            </div>
            {profile.annualInHandBonus > 0 ? (
              <div className="border border-border bg-card px-5 py-4">
                <p className="np-caps text-muted-foreground">Annual bonus in-hand</p>
                <p className="mt-1 font-extrabold tabular-nums">
                  {formatINR(profile.annualInHandBonus, { compact: true })}/yr
                </p>
              </div>
            ) : null}
            <div className="border border-border bg-card px-5 py-4">
              <p className="np-caps text-muted-foreground">Tax regime</p>
              <p className="mt-1 font-bold capitalize">
                {profile.taxRegime} (FY 2025-26)
              </p>
            </div>
          </div>
        </PageSection>
      ) : null}

      {items.length === 0 ? (
        <EmptyState
          title="No income added yet"
          description="Start with your in-hand salary. FinPlan uses this to calculate monthly surplus and goal feasibility."
          actionLabel="Upload a salary slip"
          actionHref="/documents"
        />
      ) : (
        <ResourceList>
          {items.map((item) => {
            const monthlyEq = toMonthlyEquivalent(item.amount, item.frequency, {
              type: item.type,
              bonusSpreadMonthly,
            });

            return (
              <ResourceRow
                key={item.id}
                title={item.name}
                badges={
                  <>
                    <ResourceBadge>{formatIncomeType(item.type)}</ResourceBadge>
                    {householdEnabled ? (
                      <ResourceBadge>{formatOwnerLabel(item.owner, spouseName)}</ResourceBadge>
                    ) : null}
                  </>
                }
                subtitle={
                  <>
                    {item.notes ? <p>{item.notes}</p> : null}
                    <p>
                      {formatFrequency(item.frequency)}
                      {item.type === "bonus" && !bonusSpreadMonthly ? " · paid separately" : null}
                    </p>
                  </>
                }
                amount={formatINR(item.amount)}
                amountSub={
                  <>
                    {monthlyEq > 0
                      ? `${formatINR(monthlyEq, { compact: true })}/mo`
                      : "Not in monthly total"}
                    {item.estimatedTax ? (
                      <span className="block tabular-nums">
                        Est. tax{" "}
                        {formatINR(
                          toMonthlyEquivalent(item.estimatedTax, item.frequency),
                          { compact: true }
                        )}
                        /mo
                      </span>
                    ) : null}
                  </>
                }
                actions={
                  <DeleteButton
                    id={item.id}
                    action={deleteIncomeAction}
                    itemName={item.name}
                  />
                }
              />
            );
          })}
        </ResourceList>
      )}
    </PageShell>
  );
}
