"use client";

import { useActionState, useEffect, useState, startTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/finance/money-input";
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
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { createAccountAction, updateAccountAction } from "@/actions/ledger";
import { PAYMENT_ACCOUNT_TYPES, BANK_ACCOUNT_SUBTYPES } from "@/lib/finance/constants";
import type { PaymentAccountDTO } from "@/lib/db/queries/ledger";
import { isCardType } from "@/lib/finance/account-details";
import { Plus } from "lucide-react";

const typeLabels: Record<string, string> = {
  bank: "Bank account",
  debit_card: "Debit card",
  credit_card: "Credit card",
  cash: "Cash",
  wallet: "UPI / Wallet",
};

const typeHints: Record<string, string> = {
  bank: "Savings or current account for transfers and balance tracking",
  debit_card: "Debit card linked to your bank — for everyday spending",
  credit_card: "Credit card with limit and billing cycle",
  cash: "Physical cash on hand",
  wallet: "PhonePe, GPay, Paytm, or other UPI wallets",
};

interface AccountFormSheetProps {
  account?: PaymentAccountDTO;
  triggerLabel?: string;
  defaultType?: string;
}

export function AccountFormSheet({
  account,
  triggerLabel = "Add account",
  defaultType,
}: AccountFormSheetProps) {
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(account);
  const action = isEdit ? updateAccountAction : createAccountAction;
  const [state, formAction, pending] = useActionState(action, { success: false });
  const [type, setType] = useState(account?.type ?? defaultType ?? "bank");
  const [accountSubtype, setAccountSubtype] = useState(account?.accountSubtype ?? "savings");

  useEffect(() => {
    if (state.success) {
      setOpen(false);
      toast.success(isEdit ? "Account updated" : "Account added");
    }
    if (state.error) toast.error(state.error);
  }, [state.success, state.error, isEdit]);

  useEffect(() => {
    if (open) {
      setType(account?.type ?? defaultType ?? "bank");
      setAccountSubtype(account?.accountSubtype ?? "savings");
    }
  }, [open, account, defaultType]);

  const showBankFields = type === "bank";
  const showCardFields = isCardType(type as PaymentAccountDTO["type"]);
  const showWalletFields = type === "wallet";
  const isCredit = type === "credit_card";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant={isEdit ? "outline" : "default"} size="sm" />}>
        {!isEdit ? <Plus className="size-4" /> : null}
        {triggerLabel}
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="flex max-h-[92dvh] flex-col gap-0 rounded-t-2xl p-0"
      >
        <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-border md:hidden" />
        <SheetHeader className="shrink-0 border-b border-border px-5 py-4">
          <SheetTitle className="font-heading text-xl">
            {isEdit ? "Edit account" : "Add account"}
          </SheetTitle>
          <SheetDescription>{typeHints[type]}</SheetDescription>
        </SheetHeader>

        {open ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              startTransition(() => formAction(new FormData(e.currentTarget)));
            }}
            className="flex min-h-0 flex-1 flex-col"
          >
            {isEdit && account ? <input type="hidden" name="id" value={account.id} /> : null}
            <input type="hidden" name="type" value={type} />
            <input type="hidden" name="accountSubtype" value={accountSubtype} />

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
              <div className="space-y-2">
                <Label>What are you adding?</Label>
                <Select value={type} onValueChange={(v) => v && setType(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_ACCOUNT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {typeLabels[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="acc-name">
                  {showCardFields ? "Card label" : showWalletFields ? "Wallet name" : "Account name"}
                </Label>
                <Input
                  id="acc-name"
                  name="name"
                  defaultValue={account?.name}
                  placeholder={
                    showCardFields
                      ? "e.g. HDFC Regalia"
                      : showWalletFields
                        ? "e.g. PhonePe"
                        : "e.g. HDFC Savings"
                  }
                  required
                />
              </div>

              {!showWalletFields && type !== "cash" ? (
                <div className="space-y-2">
                  <Label htmlFor="acc-institution">
                    {showCardFields ? "Card issuer" : "Bank name"}
                  </Label>
                  <Input
                    id="acc-institution"
                    name="institution"
                    defaultValue={account?.institution}
                    placeholder="e.g. HDFC Bank"
                    required
                  />
                </div>
              ) : null}

              {showBankFields ? (
                <>
                  <div className="space-y-2">
                    <Label>Account type</Label>
                    <Select
                      value={accountSubtype}
                      onValueChange={(v) => v && setAccountSubtype(v as "savings" | "current")}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BANK_ACCOUNT_SUBTYPES.map((st) => (
                          <SelectItem key={st} value={st}>
                            {st === "savings" ? "Savings" : "Current"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="acc-holder">Account holder name</Label>
                    <Input
                      id="acc-holder"
                      name="holderName"
                      defaultValue={account?.holderName}
                      placeholder="Name as per bank records"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="acc-number">Account number</Label>
                    <Input
                      id="acc-number"
                      name="accountNumber"
                      inputMode="numeric"
                      placeholder={
                        isEdit && account?.hasAccountNumber
                          ? "Leave blank to keep existing number"
                          : "Full account number"
                      }
                      required={!isEdit}
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="acc-ifsc">IFSC code</Label>
                    <Input
                      id="acc-ifsc"
                      name="ifscCode"
                      defaultValue={account?.ifscCode}
                      placeholder="e.g. HDFC0001234"
                      required
                      className="font-mono uppercase"
                    />
                  </div>
                </>
              ) : null}

              {showCardFields ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="card-holder">Name on card</Label>
                    <Input
                      id="card-holder"
                      name="holderName"
                      defaultValue={account?.holderName}
                      placeholder="As printed on card"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="card-number">Card number</Label>
                    <Input
                      id="card-number"
                      name="cardNumber"
                      inputMode="numeric"
                      placeholder={
                        isEdit && account?.hasCardNumber
                          ? "Leave blank to keep existing number"
                          : "16-digit card number"
                      }
                      required={!isEdit}
                      className="font-mono tracking-wider"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="exp-month">Expiry month</Label>
                      <Input
                        id="exp-month"
                        name="expiryMonth"
                        type="number"
                        min={1}
                        max={12}
                        defaultValue={account?.expiryMonth ?? ""}
                        placeholder="MM"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="exp-year">Expiry year</Label>
                      <Input
                        id="exp-year"
                        name="expiryYear"
                        type="number"
                        min={2020}
                        max={2100}
                        defaultValue={account?.expiryYear ?? ""}
                        placeholder="YYYY"
                        required
                      />
                    </div>
                  </div>
                </>
              ) : null}

              {showWalletFields ? (
                <div className="space-y-2">
                  <Label htmlFor="upi-id">UPI ID</Label>
                  <Input
                    id="upi-id"
                    name="upiId"
                    defaultValue={account?.upiId}
                    placeholder="e.g. name@okhdfcbank"
                    required
                  />
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="acc-balance">
                  {isCredit
                    ? "Current outstanding (₹)"
                    : showCardFields
                      ? "Linked balance / limit used (₹)"
                      : "Current balance (₹)"}
                </Label>
                <MoneyInput
                  id="acc-balance"
                  name="openingBalance"
                  defaultValue={account?.currentBalance ?? 0}
                  placeholder="e.g. 25000"
                  required
                />
                {showCardFields && !isCredit ? (
                  <p className="text-xs text-muted-foreground">
                    Optional — debit cards usually share your bank balance
                  </p>
                ) : null}
              </div>

              {isCredit ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="acc-limit">Credit limit (₹)</Label>
                    <MoneyInput
                      id="acc-limit"
                      name="creditLimit"
                      defaultValue={account?.creditLimit ?? ""}
                      placeholder="e.g. 200000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="acc-billing">Statement day (1–31)</Label>
                    <Input
                      id="acc-billing"
                      name="billingDay"
                      type="number"
                      min={1}
                      max={31}
                      defaultValue={account?.billingDay ?? ""}
                      placeholder="e.g. 15"
                    />
                  </div>
                </>
              ) : null}

              {(showBankFields || showCardFields) && (
                <p className="rounded-lg bg-muted/50 px-3 py-2.5 text-xs text-muted-foreground">
                  Card and account numbers are encrypted in the database. Tap the eye icon on the
                  Cards or Bank sections to reveal and copy when needed.
                </p>
              )}

              <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border px-4 py-3">
                <input
                  type="checkbox"
                  name="isDefault"
                  defaultChecked={account?.isDefault}
                  className="size-4 accent-primary"
                />
                <span className="text-sm">Default for new transactions</span>
              </label>
            </div>

            <SheetFooter className="shrink-0 border-t border-border bg-muted/25 px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <Button type="submit" className="h-11 w-full" disabled={pending}>
                {pending ? "Saving..." : isEdit ? "Update account" : "Save account"}
              </Button>
            </SheetFooter>
          </form>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
