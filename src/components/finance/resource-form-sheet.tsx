"use client";

import { useActionState, useEffect, useRef, useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LabeledSelect } from "@/components/ui/labeled-select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { ActionResult } from "@/actions/auth";

interface FieldOption {
  name: string;
  label: string;
  type?: "text" | "number" | "date" | "select" | "checkbox";
  options?: { value: string; label: string }[];
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
}

interface ResourceFormSheetProps {
  title: string;
  description?: string;
  triggerLabel: string;
  fields: FieldOption[];
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  updateAction?: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  itemId?: string;
  defaultValues?: Record<string, string>;
}

export function ResourceFormSheet({
  title,
  description,
  triggerLabel,
  fields,
  action,
  updateAction,
  itemId,
  defaultValues,
}: ResourceFormSheetProps) {
  const router = useRouter();
  const isEdit = Boolean(itemId);
  const [open, setOpen] = useState(false);
  const wasPending = useRef(false);
  const submitAction = isEdit && updateAction ? updateAction : action;
  const [state, formAction, pending] = useActionState(submitAction, {
    success: false,
  });

  const resolvedFields = fields.map((field) => ({
    ...field,
    defaultValue: defaultValues?.[field.name] ?? field.defaultValue,
  }));

  useEffect(() => {
    if (wasPending.current && !pending) {
      if (state.success) {
        setOpen(false);
        router.refresh();
        toast.success(isEdit ? "Changes updated" : "Changes saved");
      } else if (state.error) {
        toast.error(state.error);
      }
    }
    wasPending.current = pending;
  }, [pending, state.success, state.error, isEdit, router]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant={isEdit ? "ghost" : "default"}
            size={isEdit ? "sm" : "default"}
            className={isEdit ? "min-h-11 px-2.5 text-muted-foreground md:px-3" : undefined}
            aria-label={isEdit ? triggerLabel : undefined}
          />
        }
      >
        {isEdit ? <Pencil className="size-4 shrink-0" /> : <Plus className="size-4 shrink-0" />}
        {isEdit ? (
          <span className="hidden md:inline">{triggerLabel}</span>
        ) : (
          triggerLabel
        )}
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="flex h-[92dvh] max-h-[92dvh] flex-col gap-0 rounded-t-2xl p-0 md:h-auto md:max-h-[88dvh]"
      >
        <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-border md:hidden" />
        <SheetHeader className="shrink-0 border-b border-border px-5 py-4 md:px-6 md:py-5">
          <SheetTitle className="font-heading text-xl">{title}</SheetTitle>
          {description ? (
            <SheetDescription className="text-sm leading-relaxed">
              {description}
            </SheetDescription>
          ) : null}
        </SheetHeader>

        {open ? (
          <form
            key={itemId ?? "new"}
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              startTransition(() => {
                formAction(fd);
              });
            }}
            className="flex min-h-0 flex-1 flex-col"
          >
            {itemId ? <input type="hidden" name="id" value={itemId} /> : null}

            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 md:px-6 md:py-6">
              {resolvedFields.map((field) => (
                <Field key={field.name} field={field} />
              ))}
            </div>

            <SheetFooter className="shrink-0 border-t border-border bg-muted/25 px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:px-6">
              <Button type="submit" className="h-11 w-full" disabled={pending}>
                {pending ? "Saving..." : "Save changes"}
              </Button>
            </SheetFooter>
          </form>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function fieldPlaceholder(field: FieldOption): string | undefined {
  if (field.placeholder) return field.placeholder;
  if (field.type === "number") return `e.g. ${field.defaultValue ?? "0"}`;
  if (field.type === "date") return "YYYY-MM-DD";
  if (field.name === "notes") return "Optional context";
  return `Enter ${field.label.toLowerCase()}`;
}

function Field({ field }: { field: FieldOption }) {
  const isRequired =
    field.required !== false && field.type !== "checkbox" && field.name !== "notes";

  if (field.type === "select" && field.options) {
    return (
      <SelectField field={{ ...field, options: field.options }} required={isRequired} />
    );
  }

  if (field.type === "date") {
    return (
      <div className="space-y-2">
        <Label htmlFor={field.name}>
          {field.label}
          {!isRequired ? (
            <span className="ml-1.5 font-normal text-muted-foreground">(optional)</span>
          ) : null}
        </Label>
        <DatePicker
          id={field.name}
          name={field.name}
          defaultValue={field.defaultValue}
          placeholder={fieldPlaceholder(field)}
          required={isRequired}
        />
      </div>
    );
  }

  if (field.type === "checkbox") {
    return (
      <label
        htmlFor={field.name}
        className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-muted/20 px-4 py-3 transition-colors hover:bg-muted/40"
      >
        <input
          type="checkbox"
          id={field.name}
          name={field.name}
          defaultChecked={field.defaultValue === "true"}
          className="size-4 rounded border-border accent-primary"
        />
        <span className="text-sm leading-snug">{field.label}</span>
      </label>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={field.name}>
        {field.label}
        {!isRequired ? (
          <span className="ml-1.5 font-normal text-muted-foreground">(optional)</span>
        ) : null}
      </Label>
      <Input
        id={field.name}
        name={field.name}
        type={field.type ?? "text"}
        defaultValue={field.defaultValue}
        placeholder={fieldPlaceholder(field)}
        required={isRequired}
        className="w-full"
      />
    </div>
  );
}

function SelectField({
  field,
  required,
}: {
  field: FieldOption & { options: { value: string; label: string }[] };
  required: boolean;
}) {
  const [value, setValue] = useState(field.defaultValue ?? field.options[0]?.value ?? "");

  return (
    <div className="space-y-2">
      <Label htmlFor={field.name}>{field.label}</Label>
      <LabeledSelect
        id={field.name}
        value={value}
        onValueChange={setValue}
        options={field.options}
        placeholder={`Select ${field.label.toLowerCase()}`}
      />
      <input type="hidden" name={field.name} value={value} required={required} />
    </div>
  );
}

export function DeleteButton({
  id,
  action,
  label = "Delete",
  itemName,
}: {
  id: string;
  action: (id: string) => Promise<ActionResult>;
  label?: string;
  itemName?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    setPending(true);
    const result = await action(id);
    setPending(false);
    if (result.success) {
      toast.success("Deleted");
      setOpen(false);
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to delete");
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="min-h-11 px-2.5 text-muted-foreground hover:text-destructive md:px-3"
        aria-label={label}
        onClick={() => setOpen(true)}
      >
        <Trash2 className="size-4 shrink-0" />
        <span className="hidden md:inline">{label}</span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {itemName ?? "this item"}?</DialogTitle>
            <DialogDescription>
              This cannot be undone. Your dashboard and surplus calculations will update
              immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={pending}
            >
              {pending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
