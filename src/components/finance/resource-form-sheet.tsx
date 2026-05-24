"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Plus } from "lucide-react";
import type { ActionResult } from "@/actions/auth";

interface FieldOption {
  name: string;
  label: string;
  type?: "text" | "number" | "date" | "select" | "checkbox";
  options?: { value: string; label: string }[];
  defaultValue?: string;
}

interface ResourceFormSheetProps {
  title: string;
  triggerLabel: string;
  fields: FieldOption[];
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
}

export function ResourceFormSheet({
  title,
  triggerLabel,
  fields,
  action,
}: ResourceFormSheetProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(action, {
    success: false,
  });

  useEffect(() => {
    if (state.success) {
      setOpen(false);
      toast.success("Saved successfully");
    }
    if (state.error) {
      toast.error(state.error);
    }
  }, [state.success, state.error]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button />}>
        <Plus className="size-4" />
        {triggerLabel}
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-heading">{title}</SheetTitle>
        </SheetHeader>
        <form action={formAction} className="mt-6 space-y-4">
          {fields.map((field) => (
            <Field key={field.name} field={field} />
          ))}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Saving..." : "Save"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function Field({ field }: { field: FieldOption }) {
  if (field.type === "select" && field.options) {
    return (
      <div className="space-y-2">
        <Label htmlFor={field.name}>{field.label}</Label>
        <Select name={field.name} defaultValue={field.defaultValue}>
          <SelectTrigger id={field.name}>
            <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (field.type === "checkbox") {
    return (
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id={field.name}
          name={field.name}
          defaultChecked={field.defaultValue === "true"}
          className="size-4 rounded border-border"
        />
        <Label htmlFor={field.name}>{field.label}</Label>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={field.name}>{field.label}</Label>
      <Input
        id={field.name}
        name={field.name}
        type={field.type ?? "text"}
        defaultValue={field.defaultValue}
        required
      />
    </div>
  );
}

export function DeleteButton({
  id,
  action,
  label = "Delete",
}: {
  id: string;
  action: (id: string) => Promise<ActionResult>;
  label?: string;
}) {
  return (
    <form
      action={async () => {
        const result = await action(id);
        if (result.success) toast.success("Deleted");
        else toast.error(result.error ?? "Failed to delete");
      }}
    >
      <Button type="submit" variant="ghost" size="sm" className="text-destructive">
        {label}
      </Button>
    </form>
  );
}
