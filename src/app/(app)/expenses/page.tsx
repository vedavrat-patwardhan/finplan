import { getSession } from "@/lib/auth/session";
import { getExpenses } from "@/lib/db/queries/finance";
import { formatINR } from "@/lib/format";
import { createExpenseAction, deleteExpenseAction } from "@/actions/finance";
import { expenseFormFields } from "@/lib/form-fields";
import {
  ResourceFormSheet,
  DeleteButton,
} from "@/components/finance/resource-form-sheet";
import { EmptyState } from "@/components/finance/empty-state";
import { ExpenseClassTabs } from "@/components/finance/expense-class-tabs";
import { ResourceList, ResourceRow } from "@/components/finance/resource-row";
import { PageShell, PageHeader, MetaStat } from "@/components/layout/page-chrome";
import { toMonthlyEquivalent as calcMonthly } from "@/lib/finance/engine";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ class?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;

  const params = await searchParams;
  const activeClass = params.class ?? "all";
  const allItems = await getExpenses(session.userId);

  const items =
    activeClass === "all"
      ? allItems
      : allItems.filter((e) => e.expenseClass === activeClass);

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
          fields={expenseFormFields}
          action={createExpenseAction}
        />
      </PageHeader>

      <ExpenseClassTabs activeClass={activeClass} />

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
        <ResourceList>
          {items.map((item) => (
            <ResourceRow
              key={item.id}
              title={item.name}
              subtitle={
                <span>
                  {item.category} · {item.expenseClass} ·{" "}
                  {item.isEssential ? "Essential" : "Optional"}
                </span>
              }
              amount={formatINR(item.amount)}
              amountSub={
                <span className="capitalize">
                  {item.frequency.replace("_", " ")} ·{" "}
                  {formatINR(calcMonthly(item.amount, item.frequency), { compact: true })}/mo
                </span>
              }
              actions={
                <DeleteButton
                  id={item.id}
                  action={deleteExpenseAction}
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
