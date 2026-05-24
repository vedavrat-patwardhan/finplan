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
    <div className="page-container space-y-6 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Expenses</h1>
          <p className="mt-1 text-muted-foreground">
            Fixed, recurring, optional, and variable outflows ·{" "}
            {formatINR(monthlyTotal, { compact: true })}/mo total
          </p>
        </div>
        <ResourceFormSheet
          title="Add expense"
          triggerLabel="Add expense"
          fields={expenseFormFields}
          action={createExpenseAction}
        />
      </div>

      <ExpenseClassTabs activeClass={activeClass} />

      {items.length === 0 ? (
        <EmptyState
          title="No expenses in this category"
          description="Add rent, utilities, subscriptions, and discretionary spending."
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
                <p className="text-sm text-muted-foreground">
                  {item.category} · {item.expenseClass} ·{" "}
                  {item.isEssential ? "Essential" : "Optional"}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="font-medium tabular-nums">{formatINR(item.amount)}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {item.frequency.replace("_", " ")} ·{" "}
                    {formatINR(calcMonthly(item.amount, item.frequency), {
                      compact: true,
                    })}
                    /mo
                  </p>
                </div>
                <DeleteButton id={item.id} action={deleteExpenseAction} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
