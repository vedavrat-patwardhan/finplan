"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Tags, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  deleteCategoryRuleAction,
  saveCategoryRuleAction,
} from "@/actions/category-rules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LabeledSelect } from "@/components/ui/labeled-select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { LEDGER_CATEGORIES } from "@/lib/finance/constants";
import type { CategoryRuleDTO } from "@/lib/db/queries/ledger";

const categoryOptions = LEDGER_CATEGORIES.map((category) => ({
  value: category,
  label: category,
}));

export function CategoryRulesSheet({ rules }: { rules: CategoryRuleDTO[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("Miscellaneous");
  const [pending, setPending] = useState(false);
  const [deletingId, setDeletingId] = useState("");

  function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("category", category);
    setPending(true);
    startTransition(async () => {
      const result = await saveCategoryRuleAction({ success: false }, formData);
      setPending(false);
      if (!result.success) {
        toast.error(result.error ?? "Could not save rule");
        return;
      }
      form.reset();
      router.refresh();
      toast.success(
        result.updatedTransactions
          ? `Rule saved · ${result.updatedTransactions} ledger entries updated`
          : "Rule saved"
      );
    });
  }

  function handleDelete(id: string) {
    setDeletingId(id);
    startTransition(async () => {
      const result = await deleteCategoryRuleAction(id);
      setDeletingId("");
      if (!result.success) {
        toast.error(result.error ?? "Could not remove rule");
        return;
      }
      router.refresh();
      toast.success("Rule removed. Existing ledger categories were kept.");
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="min-h-11 gap-2"
        onClick={() => setOpen(true)}
      >
        <Tags className="size-4" />
        Category rules
        {rules.length > 0 ? (
          <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
            {rules.length}
          </span>
        ) : null}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="flex max-h-[92dvh] flex-col gap-0 rounded-t-2xl p-0 sm:inset-y-0 sm:right-0 sm:left-auto sm:h-full sm:max-h-none sm:w-[28rem] sm:rounded-none sm:border-t-0 sm:border-l"
        >
          <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-border sm:hidden" />
          <SheetHeader className="border-b border-border px-5 py-4">
            <SheetTitle className="font-heading text-xl">Category rules</SheetTitle>
            <SheetDescription>
              Match words in a merchant or transaction description. Longer matching keywords win.
            </SheetDescription>
          </SheetHeader>

          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5">
            <form onSubmit={handleSave} className="rounded-xl border border-border bg-muted/20 p-4">
              <div className="space-y-2">
                <Label htmlFor="category-keyword">Keyword</Label>
                <Input
                  id="category-keyword"
                  name="keyword"
                  placeholder="e.g. MEDI or PRUDEN"
                  minLength={2}
                  maxLength={80}
                  required
                  className="h-11 uppercase"
                />
                <p className="text-xs text-muted-foreground">
                  Matching ignores upper/lower case and checks both merchant and description.
                </p>
              </div>
              <div className="mt-4 space-y-2">
                <Label htmlFor="category-rule-category">Assign category</Label>
                <LabeledSelect
                  id="category-rule-category"
                  value={category}
                  onValueChange={setCategory}
                  options={categoryOptions}
                />
              </div>
              <Button type="submit" className="mt-4 h-11 w-full" disabled={pending}>
                {pending ? "Applying to ledger…" : "Save and update ledger"}
              </Button>
            </form>

            <section>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-medium">Active rules</h3>
                <span className="text-xs text-muted-foreground">{rules.length} total</span>
              </div>
              {rules.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                  Add your first rule. It will update matching existing entries and all future SMS or statement imports.
                </div>
              ) : (
                <div className="space-y-2">
                  {rules.map((rule) => (
                    <div
                      key={rule.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-mono text-sm font-semibold uppercase">
                          {rule.keyword}
                        </p>
                        <p className="text-xs text-muted-foreground">→ {rule.category}</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-11 shrink-0 text-muted-foreground hover:text-destructive"
                        aria-label={`Remove ${rule.keyword} rule`}
                        disabled={deletingId === rule.id}
                        onClick={() => handleDelete(rule.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <SheetFooter className="border-t border-border bg-muted/20 px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <p className="text-xs leading-relaxed text-muted-foreground">
              Removing a rule stops future matching. Categories already applied to ledger entries remain unchanged.
            </p>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
