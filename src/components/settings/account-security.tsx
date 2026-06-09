"use client";

import { useActionState, useEffect, useRef, useState, startTransition } from "react";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import { changePasswordAction } from "@/actions/auth";
import type { ActionResult } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const initialState: ActionResult = { success: false };

export function AccountSecurity({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(changePasswordAction, initialState);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending) {
      if (state.success) {
        toast.success("Password updated");
        setOpen(false);
      } else if (state.error) {
        toast.error(state.error);
      }
    }
    wasPending.current = pending;
  }, [pending, state.success, state.error]);

  return (
    <>
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <Label htmlFor="account-email">Email</Label>
            <Input
              id="account-email"
              type="email"
              value={email}
              readOnly
              className="bg-muted/30"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 gap-2"
            onClick={() => setOpen(true)}
          >
            <KeyRound className="size-4" />
            Edit password
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
            <DialogDescription>
              Enter your current password, then choose a new one with at least 8 characters.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              startTransition(() => {
                formAction(new FormData(e.currentTarget));
              });
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current password</Label>
              <PasswordInput
                id="currentPassword"
                name="currentPassword"
                autoComplete="current-password"
                required
              />
              {state.fieldErrors?.currentPassword ? (
                <p className="text-xs text-destructive">{state.fieldErrors.currentPassword}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New password</Label>
              <PasswordInput
                id="newPassword"
                name="newPassword"
                autoComplete="new-password"
                placeholder="At least 8 characters"
                required
              />
              {state.fieldErrors?.newPassword ? (
                <p className="text-xs text-destructive">{state.fieldErrors.newPassword}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <PasswordInput
                id="confirmPassword"
                name="confirmPassword"
                autoComplete="new-password"
                required
              />
              {state.fieldErrors?.confirmPassword ? (
                <p className="text-xs text-destructive">{state.fieldErrors.confirmPassword}</p>
              ) : null}
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving..." : "Update password"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
