import { getSession } from "@/lib/auth/session";
import { getExpenses } from "@/lib/db/queries/finance";
import { formatINR } from "@/lib/format";
import { createExpenseAction } from "@/actions/finance";
import { expenseFormFields } from "@/lib/form-fields";
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
  const allItems = await getExpenses(session.userId);

  const items =
    normalizedClass === "all"
      ? allItems
      : allItems.filter(
          (e) => (normalizeExpenseClass(e.expenseClass) ?? e.expenseClass) === normalizedClass
        );

  const monthlyTotal = allItems.filter((item) => item.owner !== "spouse").reduce(
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
          fields={expenseFormFields}
          action={createExpenseAction}
        />
      </PageHeader>

      <ExpenseClassTabs activeClass={normalizedClass} />

      {allItems.some((item) => item.owner === "spouse") ? (
        <p className="border border-border border-l-[3px] border-l-warning bg-card px-5 py-3 text-sm text-muted-foreground">
          Legacy partner budgets are preserved below but excluded from your personal and family totals. Add them under that person&apos;s account instead.
        </p>
      ) : null}

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
          householdEnabled={false}
        />
      )}
    </PageShell>
  );
}
