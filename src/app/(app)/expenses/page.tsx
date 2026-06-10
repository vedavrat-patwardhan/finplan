import { getSession } from "@/lib/auth/session";
import { getExpenses, getUserProfile } from "@/lib/db/queries/finance";
import { formatINR } from "@/lib/format";
import { createExpenseAction } from "@/actions/finance";
import { expenseFormFields } from "@/lib/form-fields";
import { expenseOwnerFormField } from "@/lib/finance/household";
import { ResourceFormSheet } from "@/components/finance/resource-form-sheet";
import { EmptyState } from "@/components/finance/empty-state";
import { ExpenseClassTabs } from "@/components/finance/expense-class-tabs";
import { ExpensesList } from "@/components/finance/expenses-list";
import { PageShell, PageHeader, MetaStat } from "@/components/layout/page-chrome";
import { toMonthlyEquivalent as calcMonthly } from "@/lib/finance/engine";
import { normalizeExpenseClass } from "@/lib/finance/expense-classes";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ class?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;

  const params = await searchParams;
  const activeClass = params.class ?? "all";
  const normalizedClass =
    activeClass === "all" ? "all" : normalizeExpenseClass(activeClass) ?? activeClass;
  const [allItems, profile] = await Promise.all([
    getExpenses(session.userId),
    getUserProfile(session.userId),
  ]);
  const householdEnabled = profile?.householdEnabled ?? false;
  const spouseName = profile?.spouseName ?? "";
  const expenseFields = householdEnabled
    ? [...expenseFormFields, expenseOwnerFormField(spouseName)]
    : expenseFormFields;

  const items =
    normalizedClass === "all"
      ? allItems
      : allItems.filter(
          (e) => (normalizeExpenseClass(e.expenseClass) ?? e.expenseClass) === normalizedClass
        );

  const monthlyTotal = allItems.reduce(
    (sum, e) => sum + calcMonthly(e.amount, e.frequency),
    0
  );

  return (
    <PageShell>
      <PageHeader
        title="Expense budgets"
        description="Planned monthly outflows — compare these to actual spending in your ledger."
        meta={
          <MetaStat
            label="Planned total"
            value={`${formatINR(monthlyTotal, { compact: true })}/mo`}
          />
        }
      >
        <ResourceFormSheet
          title="Add expense budget"
          description="Rent, EMIs, subscriptions, and discretionary spending you expect each month."
          triggerLabel="Add budget"
          fields={expenseFields}
          action={createExpenseAction}
        />
      </PageHeader>

      <ExpenseClassTabs activeClass={normalizedClass} />

      {items.length === 0 ? (
        <EmptyState
          title={
            activeClass === "all"
              ? "No expense budgets yet"
              : "Nothing in this category"
          }
          description="Add rent, utilities, subscriptions, and other recurring costs you plan for each month."
          actionLabel="View actual spending"
          actionHref="/transactions"
        />
      ) : (
        <ExpensesList
          items={items}
          householdEnabled={householdEnabled}
          spouseName={spouseName}
        />
      )}
    </PageShell>
  );
}
