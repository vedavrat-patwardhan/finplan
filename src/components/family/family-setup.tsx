"use client";

import { useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Copy, Link2, Users } from "lucide-react";
import { toast } from "sonner";
import {
  createFamilyAction,
  joinFamilyAction,
  leaveFamilyAction,
  removeFamilyMemberAction,
  rotateFamilyInviteAction,
} from "@/actions/family";
import type { ActionResult } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { getFamilyForUser } from "@/lib/db/queries/family";

type Family = NonNullable<Awaited<ReturnType<typeof getFamilyForUser>>>;
const initialState: ActionResult = { success: false };

export function FamilySetup({ family, inviteCode }: { family: Family | null; inviteCode?: string }) {
  const router = useRouter();
  const [createState, createAction, creating] = useActionState(createFamilyAction, initialState);
  const [joinState, joinAction, joining] = useActionState(joinFamilyAction, initialState);
  const lastCreate = useRef(createState);
  const lastJoin = useRef(joinState);

  useEffect(() => {
    if (createState === lastCreate.current) return;
    lastCreate.current = createState;
    if (createState.success) {
      toast.success("Family created. Your invite code is ready.");
      router.refresh();
    } else if (createState.error) toast.error(createState.error);
  }, [createState, router]);

  useEffect(() => {
    if (joinState === lastJoin.current) return;
    lastJoin.current = joinState;
    if (joinState.success) {
      toast.success("You joined the family. Your own finances remain in your account.");
      router.refresh();
    } else if (joinState.error) toast.error(joinState.error);
  }, [joinState, router]);

  async function copyInvite() {
    if (!family?.inviteCode) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/family?invite=${family.inviteCode}`);
      toast.success("Invite link copied");
    } catch {
      toast.error("Could not copy. Share the invite code shown below.");
    }
  }

  if (family) {
    return (
      <div className="space-y-6">
        <div className="border border-border bg-card p-5 sm:p-7">
          <div className="flex items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center border border-brand bg-brand/10 text-brand-text">
              <Users className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="np-caps text-muted-foreground">Your family</p>
              <h2 className="mt-1 text-2xl font-extrabold tracking-tight">{family.name}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Each member keeps a separate account and private ledger. Family mode combines balances, plans, goals, and investments on the dashboard.
              </p>
            </div>
          </div>
          <div className="mt-6 border-t border-border pt-5">
            <p className="np-caps text-muted-foreground">Members · {family.members.length} of 12</p>
            <div className="mt-3 divide-y divide-border border border-border">
              {family.members.map((member) => (
                <div key={member.userId} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="min-w-0 truncate font-semibold">{member.name}</span>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {member.isOwner ? "Owner" : `@${member.username}`}
                    </span>
                    {family.isOwner && !member.isOwner ? (
                      <form action={removeFamilyMemberAction} onSubmit={(event) => {
                        if (!window.confirm(`Remove ${member.name} from this family? They will lose access to family totals.`)) event.preventDefault();
                      }}>
                        <input type="hidden" name="userId" value={member.userId} />
                        <Button type="submit" variant="ghost" size="sm">Remove</Button>
                      </form>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <Button render={<Link href="/dashboard" />} variant="brand" className="mt-5 w-full sm:w-auto">
            Open dashboard
          </Button>
        </div>

        {family.isOwner && family.inviteCode ? (
          <div className="border border-border border-l-[3px] border-l-brand bg-card p-5 sm:p-7">
            <div className="flex items-center gap-2">
              <Link2 className="size-5 text-brand-text" />
              <h2 className="text-lg font-extrabold">Invite someone</h2>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Share the link with someone you trust. They sign in to their own FinPlan account and join using this private code. Anyone with the code can join and see family totals.
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <div className="flex-1 border border-border bg-muted px-4 py-3 font-mono text-sm tracking-widest">
                {family.inviteCode}
              </div>
              <Button type="button" onClick={copyInvite} variant="outline">
                <Copy className="size-4" /> Copy invite link
              </Button>
            </div>
            <form action={rotateFamilyInviteAction} className="mt-3" onSubmit={(event) => {
              if (!window.confirm("Reset the invite code? Existing invite links will stop working.")) event.preventDefault();
            }}>
              <Button type="submit" size="sm" variant="ghost">Reset invite code</Button>
            </form>
          </div>
        ) : null}
        {!family.isOwner ? (
          <form action={leaveFamilyAction} onSubmit={(event) => {
            if (!window.confirm("Leave this family? You will lose the shared view, but your own data stays intact.")) event.preventDefault();
          }}>
            <Button type="submit" variant="outline">Leave family</Button>
          </form>
        ) : null}
        {inviteCode ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Check className="size-4 text-success-text" /> You already belong to a family.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <form action={createAction} className="flex flex-col border border-border bg-card p-5 sm:p-7">
        <div className="flex size-11 items-center justify-center border border-brand bg-brand/10 text-brand-text">
          <Users className="size-5" />
        </div>
        <h2 className="mt-5 text-xl font-extrabold">Create a family</h2>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
          Start a shared view while keeping every person&apos;s transactions, accounts, and edits in their own login.
        </p>
        <Label htmlFor="family-name" className="mt-6">Family name</Label>
        <Input id="family-name" name="name" maxLength={80} minLength={2} required className="mt-2" placeholder="e.g. Patwardhan family" />
        <Button type="submit" variant="brand" disabled={creating} className="mt-4">
          {creating ? "Creating..." : "Create family"}
        </Button>
        {createState.error ? <p className="mt-2 text-xs text-destructive">{createState.error}</p> : null}
      </form>

      <form action={joinAction} className="flex flex-col border border-border bg-card p-5 sm:p-7">
        <div className="flex size-11 items-center justify-center border border-border bg-muted text-foreground">
          <Link2 className="size-5" />
        </div>
        <h2 className="mt-5 text-xl font-extrabold">Join a family</h2>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
          Enter the private family ID from an invite. Your personal finance data stays under your own account.
        </p>
        <Label htmlFor="invite-code" className="mt-6">Family invite ID</Label>
        <Input id="invite-code" name="inviteCode" defaultValue={inviteCode} minLength={16} maxLength={16} required className="mt-2 font-mono tracking-wider" placeholder="16-character code" />
        <Button type="submit" disabled={joining} className="mt-4">
          {joining ? "Joining..." : "Join family"}
        </Button>
        {joinState.error ? <p className="mt-2 text-xs text-destructive">{joinState.error}</p> : null}
      </form>
    </div>
  );
}
