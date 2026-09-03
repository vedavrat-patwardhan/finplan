"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Tags, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  deleteCategoryRuleAction,
  createCustomLedgerCategoryAction,
  deleteCustomLedgerCategoryAction,
  saveCategoryRuleAction,
} from "@/actions/category-rules";
import { Badge } from "@/components/ui/badge";
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
import type {
  CategoryRuleDTO,
  CustomLedgerCategoryDTO,
} from "@/lib/db/queries/ledger";

export function CategoryRulesSheet({
  rules,
  customCategories,
}: {
  rules: CategoryRuleDTO[];
  customCategories: CustomLedgerCategoryDTO[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("Miscellaneous");
  const [pending, setPending] = useState(false);
  const [addingCategory, setAddingCategory] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const categoryOptions = [
    ...LEDGER_CATEGORIES,
    ...customCategories.map((item) => item.name),
  ].map((item) => ({ value: item, label: item }));

  function handleAddCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setAddingCategory(true);
    startTransition(async () => {
      const result = await createCustomLedgerCategoryAction(
        { success: false },
        new FormData(form)
      );
      setAddingCategory(false);
      if (!result.success) {
        toast.error(result.error ?? "Could not add category");
        return;
      }
      form.reset();
      router.refresh();
      toast.success("Ledger category added");
    });
  }

  function handleDeleteCategory(id: string) {
    setDeletingId(id);
    startTransition(async () => {
      const result = await deleteCustomLedgerCategoryAction(id);
      setDeletingId("");
      if (!result.success) {
        toast.error(result.error ?? "Could not remove category");
        return;
      }
      router.refresh();
      toast.success("Ledger category removed");
    });
  }

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
        size="sm"
        className="gap-2"
        onClick={() => setOpen(true)}
      >
        <Tags className="size-4" />
        Categories & rules
        {rules.length + customCategories.length > 0 ? (
          <Badge variant="brand">{rules.length + customCategories.length}</Badge>
        ) : null}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="flex max-h-[92dvh] flex-col gap-0 p-0 sm:inset-y-0 sm:right-0 sm:left-auto sm:h-full sm:max-h-none sm:w-[28rem] sm:border-t-0 sm:border-l"
        >
          <div className="mx-auto mt-3 h-1 w-10 shrink-0 bg-border sm:hidden" />
          <SheetHeader className="border-b border-border px-5 py-4">
            <SheetTitle className="text-xl">Categories & rules</SheetTitle>
            <SheetDescription>
              Add your own ledger categories, then automate them with merchant keywords.
            </SheetDescription>
          </SheetHeader>

          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5">
            <section className="space-y-3">
              <div>
                <h3 className="text-sm font-bold">Your categories</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Custom categories appear anywhere you choose a ledger category.
                </p>
              </div>
              <form onSubmit={handleAddCategory} className="flex gap-2">
                <Input
                  name="name"
                  placeholder="e.g. Travel, Education"
                  minLength={2}
                  maxLength={40}
                  required
                />
                <Button
                  type="submit"
                  variant="default"
                  size="icon"
                  className="shrink-0"
                  aria-label="Add ledger category"
                  disabled={addingCategory}
                >
                  <Plus className="size-4" />
                </Button>
              </form>
              {customCategories.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {customCategories.map((item) => (
                    <Badge key={item.id} variant="secondary" className="h-auto gap-1.5 py-1 pr-1">
                      {item.name}
                      <button
                        type="button"
                        className="inline-flex size-4 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
                        aria-label={`Remove ${item.name} category`}
                        disabled={deletingId === item.id}
                        onClick={() => handleDeleteCategory(item.id)}
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                  No custom categories yet.
                </p>
              )}
            </section>

            <div className="h-px bg-border" />

            <form onSubmit={handleSave} className="border border-border bg-muted p-4">
              <div className="space-y-2">
                <Label htmlFor="category-keyword">Keyword</Label>
                <Input
                  id="category-keyword"
                  name="keyword"
                  placeholder="e.g. MEDI or PRUDEN"
                  minLength={2}
                  maxLength={80}
                  required
                  className="uppercase"
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
              <Button
                type="submit"
                variant="default"
                size="sm"
                className="mt-4 w-full"
                disabled={pending}
              >
                {pending ? "Applying to ledger…" : "Save and update ledger"}
              </Button>
            </form>

            <section>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold">Active rules</h3>
                <span className="text-xs text-muted-foreground">{rules.length} total</span>
              </div>
              {rules.length === 0 ? (
                <div className="border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                  Add your first rule. It will update matching existing entries and all future SMS or statement imports.
                </div>
              ) : (
                <div className="space-y-2">
                  {rules.map((rule) => (
                    <div
                      key={rule.id}
                      className="flex items-center justify-between gap-3 border border-border bg-card px-4 py-3"
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
                        size="icon-sm"
                        className="shrink-0 text-muted-foreground hover:text-destructive"
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

          <SheetFooter className="border-t border-border bg-muted px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <p className="text-xs leading-relaxed text-muted-foreground">
              Removing a rule stops future matching. Categories already applied to ledger entries remain unchanged.
            </p>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
