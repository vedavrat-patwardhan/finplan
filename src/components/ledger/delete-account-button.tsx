"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Trash2 } from "lucide-react";
import { deleteAccountAction } from "@/actions/ledger";

export function DeleteAccountButton({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    setPending(true);
    const result = await deleteAccountAction(id);
    setPending(false);
    if (result.success) {
      toast.success("Account deleted");
      setOpen(false);
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
        aria-label={`Delete ${name}`}
        onClick={() => setOpen(true)}
      >
        <Trash2 className="size-4 shrink-0" />
        <span className="hidden md:inline">Delete</span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {name}?</DialogTitle>
            <DialogDescription>
              Only accounts with no transactions can be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={pending}>
              {pending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
