import { getSession } from "@/lib/auth/session";
import { getIncomeSources } from "@/lib/db/queries/finance";
import { formatINR } from "@/lib/format";
import { createIncomeAction, deleteIncomeAction } from "@/actions/finance";
import { incomeFormFields } from "@/lib/form-fields";
import {
  ResourceFormSheet,
  DeleteButton,
} from "@/components/finance/resource-form-sheet";
import { EmptyState } from "@/components/finance/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function IncomePage() {
  const session = await getSession();
  if (!session) return null;

  const items = await getIncomeSources(session.userId);

  return (
    <div className="page-container space-y-6 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Income</h1>
          <p className="mt-1 text-muted-foreground">
            Salary, bonuses, and other inflows
          </p>
        </div>
        <ResourceFormSheet
          title="Add income source"
          triggerLabel="Add income"
          fields={incomeFormFields}
          action={createIncomeAction}
        />
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="No income sources"
          description="Add your salary and any bonuses to calculate your monthly surplus."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{item.type}</Badge>
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {formatINR(item.amount)}
                  </TableCell>
                  <TableCell className="capitalize">{item.frequency.replace("_", " ")}</TableCell>
                  <TableCell>
                    <DeleteButton id={item.id} action={deleteIncomeAction} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
