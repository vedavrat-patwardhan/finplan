"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { KeyRound, Eye, EyeOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  createSavedPasswordAction,
  deleteSavedPasswordAction,
  revealSavedPasswordAction,
} from "@/actions/ledger";
import type { SavedPasswordDTO } from "@/lib/db/queries/ledger";

function SavedPasswordRow({
  item,
  onDeleted,
}: {
  item: SavedPasswordDTO;
  onDeleted: () => void;
}) {
  const [revealed, setRevealed] = useState<string | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleReveal() {
    if (revealed !== null) {
      setRevealed(null);
      return;
    }
    setRevealing(true);
    const result = await revealSavedPasswordAction(item.id);
    setRevealing(false);
    if (result.success && result.value !== undefined) {
      setRevealed(result.value);
    } else {
      toast.error(result.error ?? "Could not reveal password");
    }
  }

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteSavedPasswordAction(item.id);
    setDeleting(false);
    if (result.success) {
      toast.success("Password deleted");
      setConfirmOpen(false);
      onDeleted();
    } else {
      toast.error(result.error ?? "Delete failed");
    }
  }

  return (
    <div className="flex items-center gap-3 border border-border bg-card px-4 py-3">
      <KeyRound className="size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{item.title}</p>
        {revealed !== null ? (
          <p className="mt-0.5 break-all font-mono text-xs text-muted-foreground">{revealed}</p>
        ) : (
          <p className="mt-0.5 text-xs text-muted-foreground">••••••••</p>
        )}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={revealing}
        onClick={handleReveal}
        aria-label={revealed !== null ? "Hide password" : "Reveal password"}
      >
        {revealed !== null ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="text-muted-foreground hover:text-destructive"
        onClick={() => setConfirmOpen(true)}
        aria-label={`Delete ${item.title}`}
      >
        <Trash2 className="size-4" />
      </Button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete &quot;{item.title}&quot;?</DialogTitle>
            <DialogDescription>
              This saved password will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AddPasswordForm({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [pending, startSaving] = useTransition();

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startSaving(async () => {
      const result = await createSavedPasswordAction({ success: false }, fd);
      if (result.success) {
        toast.success("Password saved");
        setOpen(false);
        onAdded();
      } else {
        toast.error(result.error ?? "Could not save password");
      }
    });
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => setOpen(true)}
      >
        <KeyRound className="size-4" />
        Save a new password
      </Button>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-3 border border-border bg-muted/20 p-4">
      <p className="text-sm font-bold">Save new password</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="pwd-title">Label</Label>
          <Input
            id="pwd-title"
            name="title"
            placeholder="e.g. HDFC Debit password"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pwd-value">Password / PIN</Label>
          <Input
            id="pwd-value"
            name="value"
            placeholder="Enter the password"
            required
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving..." : "Save"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOpen(false)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function SavedPasswordManager({
  savedPasswords,
  onChanged,
}: {
  savedPasswords: SavedPasswordDTO[];
  onChanged: () => void;
}) {
  return (
    <section className="space-y-4 section-break">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center bg-muted">
          <KeyRound className="size-5" />
        </span>
        <div className="space-y-0.5">
          <h2 className="text-lg font-bold leading-tight">Saved passwords</h2>
          <p className="text-sm text-muted-foreground">
            Encrypted PDF passwords for statements and bills
          </p>
        </div>
      </div>

      <AddPasswordForm onAdded={onChanged} />

      {savedPasswords.length === 0 ? (
        <p className="border border-dashed border-border bg-muted/15 px-5 py-8 text-center text-sm text-muted-foreground">
          No saved passwords yet — save one while importing a statement, or add it here.
        </p>
      ) : (
        <div className="space-y-2">
          {savedPasswords.map((p) => (
            <SavedPasswordRow key={p.id} item={p} onDeleted={onChanged} />
          ))}
        </div>
      )}
    </section>
  );
}
