"use client";

import { useActionState, useEffect, useRef, useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
import {
  formatMaskedAccountFromLastFour,
  formatMaskedCardFromLastFour,
  isCardType,
  isKotakInstitution,
} from "@/lib/finance/account-details";
import { BankCombobox } from "@/components/finance/bank-combobox";
import { SensitiveField } from "@/components/ledger/sensitive-field";
import { Pencil, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const typeLabels: Record<string, string> = {
  bank: "Bank account",
  debit_card: "Debit card",
  credit_card: "Credit card",
  cash: "Cash",
  wallet: "UPI / Wallet",
};

const accountSubtypeLabels: Record<string, string> = {
  savings: "Savings",
  current: "Current",
};

const typeHints: Record<string, string> = {
  bank: "Savings or current account for transfers and balance tracking",
  debit_card: "Debit card linked to your bank — for everyday spending",
  credit_card: "Credit card with limit and billing cycle",
  cash: "Physical cash on hand",
  wallet: "PhonePe, GPay, Paytm, or other UPI wallets",
};

type FormValues = {
  name: string;
  holderName: string;
  accountNumber: string;
  cardNumber: string;
  ifscCode: string;
  upiId: string;
  openingBalance: string;
  creditLimit: string;
  billingDay: string;
  monthlySpendTarget: string;
  expiryMonth: string;
  expiryYear: string;
  cardCvv: string;
  crn: string;
  notes: string;
  isDefault: boolean;
  isFavorite: boolean;
};

function initialFormValues(account?: PaymentAccountDTO): FormValues {
  return {
    name: account?.name ?? "",
    holderName: account?.holderName ?? "",
    accountNumber: "",
    cardNumber: "",
    ifscCode: account?.ifscCode ?? "",
    upiId: account?.upiId ?? "",
    openingBalance: account != null ? String(account.currentBalance) : "0",
    creditLimit: account?.creditLimit != null ? String(account.creditLimit) : "",
    billingDay: account?.billingDay != null ? String(account.billingDay) : "",
    monthlySpendTarget:
      account?.monthlySpendTarget != null ? String(account.monthlySpendTarget) : "",
    expiryMonth: account?.expiryMonth != null ? String(account.expiryMonth) : "",
    expiryYear: account?.expiryYear != null ? String(account.expiryYear) : "",
    cardCvv: "",
    crn: account?.crn ?? "",
    notes: account?.notes ?? "",
    isDefault: account?.isDefault ?? false,
    isFavorite: account?.isFavorite ?? false,
  };
}

function StoredNumberBanner({
  label,
  masked,
  hint,
}: {
  label: string;
  masked: string;
  hint: string;
}) {
  return (
    <div className="border border-border bg-accent px-3 py-2.5" aria-label={`${label} saved on file`}>
      <div className="flex items-center justify-between gap-2">
        <p className="np-caps text-muted-foreground">{label}</p>
        <Badge variant="secondary">On file</Badge>
      </div>
      <p className="mt-1.5 font-mono text-base tracking-wide">{masked}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

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
  const wasPending = useRef(false);
  const [type, setType] = useState(account?.type ?? defaultType ?? "bank");
  const [accountSubtype, setAccountSubtype] = useState(account?.accountSubtype ?? "savings");
  const [institution, setInstitution] = useState(account?.institution ?? "");
  const [formValues, setFormValues] = useState<FormValues>(() => initialFormValues(account));
  const cardCvvRef = useRef(formValues.cardCvv);
  const router = useRouter();

  useEffect(() => {
    cardCvvRef.current = formValues.cardCvv;
  }, [formValues.cardCvv]);

  useEffect(() => {
    if (wasPending.current && !pending) {
      if (state.success) {
        setOpen(false);
        router.refresh();
        toast.success(isEdit ? "Account updated" : "Account added");
      } else if (state.error) {
        toast.error(state.error);
      }
    }
    wasPending.current = pending;
  }, [pending, state.success, state.error, isEdit, router]);

  useEffect(() => {
    if (open) {
      setType(account?.type ?? defaultType ?? "bank");
      setAccountSubtype(account?.accountSubtype ?? "savings");
      setInstitution(account?.institution ?? "");
      setFormValues(initialFormValues(account));
    }
  }, [open, account, defaultType]);

  const showBankFields = type === "bank";
  const showCardFields = isCardType(type as PaymentAccountDTO["type"]);
  const showLinkedDebitCardFields = showBankFields;
  const acceptsCardDetails = showCardFields || showLinkedDebitCardFields;
  const showWalletFields = type === "wallet";
  const isCredit = type === "credit_card";
  const hasFullAccountNumber = Boolean(account?.hasAccountNumber);
  const hasFullCardNumber = Boolean(account?.hasCardNumber);
  const hasStoredAccountNumber = hasFullAccountNumber || Boolean(account?.lastFour);
  const storedCardLastFour =
    account?.cardLastFour || (showCardFields ? account?.lastFour ?? "" : "");
  const hasStoredCardNumber = hasFullCardNumber || Boolean(storedCardLastFour);
  const hasStoredCardCvv = Boolean(account?.hasCardCvv);
  const isKotak = isKotakInstitution(institution);

  function patchForm(patch: Partial<FormValues>) {
    setFormValues((prev) => ({ ...prev, ...patch }));
  }

  function buildFormData(): FormData {
    const fd = new FormData();
    if (isEdit && account) fd.set("id", account.id);
    fd.set("type", type);
    fd.set("name", formValues.name.trim());
    fd.set("openingBalance", formValues.openingBalance);
    if (formValues.isDefault) fd.set("isDefault", "on");
    if (formValues.isFavorite) fd.set("isFavorite", "on");

    if (!showWalletFields && type !== "cash" && institution.trim()) {
      fd.set("institution", institution.trim());
    }

    if (showBankFields) {
      fd.set("accountSubtype", accountSubtype);
      fd.set("holderName", formValues.holderName.trim());
      fd.set("ifscCode", formValues.ifscCode.trim());
      fd.set("crn", formValues.crn.trim());
      const accountNumber = formValues.accountNumber.trim();
      if (accountNumber) fd.set("accountNumber", accountNumber);
      else if (!isEdit) fd.set("accountNumber", "");
    }

    if (showCardFields) {
      fd.set("holderName", formValues.holderName.trim());
    }

    if (acceptsCardDetails) {
      const cardNumber = formValues.cardNumber.trim();
      if (showCardFields || cardNumber || hasStoredCardNumber) {
        if (formValues.expiryMonth) fd.set("expiryMonth", formValues.expiryMonth);
        if (formValues.expiryYear) fd.set("expiryYear", formValues.expiryYear);
      }
      if (cardNumber) fd.set("cardNumber", cardNumber);
      else if (!isEdit && showCardFields) fd.set("cardNumber", "");
    }

    if (showWalletFields) {
      fd.set("upiId", formValues.upiId.trim());
    }

    if (isCredit) {
      if (formValues.creditLimit.trim()) fd.set("creditLimit", formValues.creditLimit);
      if (formValues.billingDay.trim()) fd.set("billingDay", formValues.billingDay);
      fd.set("cardCvv", cardCvvRef.current.replace(/\D/g, ""));
    }

    if (showCardFields && formValues.monthlySpendTarget.trim()) {
      fd.set("monthlySpendTarget", formValues.monthlySpendTarget);
    }

    fd.set("notes", formValues.notes.trim());

    return fd;
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = buildFormData();
    startTransition(() => formAction(fd));
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant={isEdit ? "outline" : "brand"}
            size="sm"
            className={isEdit ? "min-h-11 px-2.5 md:px-3" : undefined}
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
        className="flex h-[92dvh] max-h-[92dvh] flex-col gap-0 p-0 md:h-auto md:max-h-[92dvh]"
      >
        <div className="mx-auto mt-3 h-1 w-10 shrink-0 bg-border md:hidden" />
        <SheetHeader className="shrink-0 border-b border-border px-5 py-4">
          <SheetTitle>{isEdit ? "Edit account" : "Add account"}</SheetTitle>
          <SheetDescription className="min-h-11 text-sm leading-snug">
            {typeHints[type]}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-5">
              <div className="space-y-2">
                <Label>What are you adding?</Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {PAYMENT_ACCOUNT_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      aria-pressed={type === t}
                      className={cn(
                        "border border-input bg-card px-4 py-3 text-left text-sm font-semibold transition-colors",
                        type === t
                          ? "border-foreground border-l-[3px] border-l-brand bg-accent"
                          : "hover:bg-accent"
                      )}
                    >
                      {typeLabels[t]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`acc-name-${account?.id ?? "new"}`}>
                  {showCardFields ? "Card label" : showWalletFields ? "Wallet name" : "Account name"}
                </Label>
                <Input
                  id={`acc-name-${account?.id ?? "new"}`}
                  value={formValues.name}
                  onChange={(e) => patchForm({ name: e.target.value })}
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
                <BankCombobox
                  id="acc-institution"
                  label={showCardFields ? "Card issuer" : "Bank name"}
                  value={institution}
                  onChange={setInstitution}
                  placeholder="Search HDFC, SBI, ICICI..."
                  required
                />
              ) : null}

              {showBankFields ? (
                <>
                  <div className="space-y-2">
                    <Label>Account type</Label>
                    <Select
                      value={accountSubtype}
                      onValueChange={(v) => v && setAccountSubtype(v as "savings" | "current")}
                    >
                      <SelectTrigger className="w-full" aria-label="Bank account type">
                        <span className="flex-1 text-left">
                          {accountSubtypeLabels[accountSubtype]}
                        </span>
                        <SelectValue className="sr-only">
                          {accountSubtypeLabels[accountSubtype]}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent alignItemWithTrigger={false}>
                        {BANK_ACCOUNT_SUBTYPES.map((st) => (
                          <SelectItem key={st} value={st}>
                            {st === "savings" ? "Savings" : "Current"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`acc-holder-${account?.id ?? "new"}`}>Account holder name</Label>
                    <Input
                      id={`acc-holder-${account?.id ?? "new"}`}
                      value={formValues.holderName}
                      onChange={(e) => patchForm({ holderName: e.target.value })}
                      placeholder="Name as per bank records"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`acc-number-${account?.id ?? "new"}`}>Account number</Label>
                    {isEdit && hasFullAccountNumber && account ? (
                      <SensitiveField
                        accountId={account.id}
                        field="accountNumber"
                        label="Saved account number"
                        maskedDisplay={formatMaskedAccountFromLastFour(account.lastFour)}
                      />
                    ) : isEdit && hasStoredAccountNumber && account?.lastFour ? (
                      <StoredNumberBanner
                        label="Saved account number"
                        masked={formatMaskedAccountFromLastFour(account.lastFour)}
                        hint="Only the last 4 digits are on file. Enter the full number below to save it."
                      />
                    ) : null}
                    {isEdit && hasStoredAccountNumber ? (
                      <p className="text-xs text-muted-foreground">Replace account number (optional)</p>
                    ) : null}
                    <Input
                      id={`acc-number-${account?.id ?? "new"}`}
                      value={formValues.accountNumber}
                      onChange={(e) =>
                        patchForm({ accountNumber: e.target.value.replace(/\D/g, "") })
                      }
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={18}
                      placeholder={
                        isEdit && hasStoredAccountNumber
                          ? "Enter new number only if replacing"
                          : "9–18 digit account number"
                      }
                      required={!isEdit && !hasStoredAccountNumber}
                      className="font-mono"
                    />
                    {!isEdit || !hasStoredAccountNumber ? (
                      <p className="text-xs text-muted-foreground">
                        Digits only, 9 to 18 characters
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`acc-ifsc-${account?.id ?? "new"}`}>IFSC code</Label>
                    <Input
                      id={`acc-ifsc-${account?.id ?? "new"}`}
                      value={formValues.ifscCode}
                      onChange={(e) =>
                        patchForm({
                          ifscCode: e.target.value.toUpperCase().replace(/\s/g, ""),
                        })
                      }
                      placeholder="e.g. HDFC0001234"
                      required
                      maxLength={11}
                      autoComplete="off"
                      spellCheck={false}
                      className="font-mono uppercase"
                    />
                    <p className="text-xs text-muted-foreground">
                      11 characters: 4-letter bank code, 0, then branch code
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`acc-crn-${account?.id ?? "new"}`}>
                      CRN / Customer ID
                      <span className="ml-1 font-normal text-muted-foreground">(optional)</span>
                    </Label>
                    <Input
                      id={`acc-crn-${account?.id ?? "new"}`}
                      value={formValues.crn}
                      onChange={(e) =>
                        patchForm({ crn: e.target.value.replace(/\D/g, "") })
                      }
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={12}
                      placeholder={isKotak ? "6-digit Kotak CRN" : "e.g. customer reference number"}
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      {isKotak
                        ? "Kotak net banking uses a 6-digit CRN — different from your account number."
                        : "Some banks use a separate customer ID (e.g. Kotak CRN, CIF). Digits only, 4–12 characters."}
                    </p>
                  </div>
                </>
              ) : null}

              {acceptsCardDetails ? (
                <div
                  className={cn(
                    "space-y-4",
                    showLinkedDebitCardFields && "border border-border bg-muted/20 p-4"
                  )}
                >
                  {showLinkedDebitCardFields ? (
                    <div>
                      <p className="np-kicker np-caps text-xs text-subtle">Linked debit card</p>
                      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                        Optional. Store the card with this bank account without counting its balance twice.
                      </p>
                    </div>
                  ) : null}
                  {showCardFields ? (
                    <div className="space-y-2">
                      <Label htmlFor={`card-holder-${account?.id ?? "new"}`}>
                        Name on card
                      </Label>
                      <Input
                        id={`card-holder-${account?.id ?? "new"}`}
                        value={formValues.holderName}
                        onChange={(e) => patchForm({ holderName: e.target.value })}
                        placeholder="As printed on card"
                        required
                      />
                    </div>
                  ) : null}
                  <div className="space-y-2">
                    <Label htmlFor={`card-number-${account?.id ?? "new"}`}>
                      {showLinkedDebitCardFields ? "Debit card number" : "Card number"}
                      {showLinkedDebitCardFields ? (
                        <span className="ml-1 font-normal text-muted-foreground">(optional)</span>
                      ) : null}
                    </Label>
                    {isEdit && hasFullCardNumber && account ? (
                      <SensitiveField
                        accountId={account.id}
                        field="cardNumber"
                        label="Saved card number"
                        maskedDisplay={formatMaskedCardFromLastFour(storedCardLastFour)}
                      />
                    ) : isEdit && hasStoredCardNumber && storedCardLastFour ? (
                      <StoredNumberBanner
                        label="Saved card number"
                        masked={formatMaskedCardFromLastFour(storedCardLastFour)}
                        hint="Only the last 4 digits are on file. Enter the full number below to save it."
                      />
                    ) : null}
                    {isEdit && hasStoredCardNumber ? (
                      <p className="text-xs text-muted-foreground">Replace card number (optional)</p>
                    ) : null}
                    <Input
                      id={`card-number-${account?.id ?? "new"}`}
                      value={formValues.cardNumber}
                      onChange={(e) =>
                        patchForm({ cardNumber: e.target.value.replace(/\D/g, "") })
                      }
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={19}
                      placeholder={
                        isEdit && hasStoredCardNumber
                          ? "Enter new number only if replacing"
                          : "13–16 digit card number"
                      }
                      required={showCardFields && !isEdit && !hasStoredCardNumber}
                      className="font-mono tracking-wider"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor={`exp-month-${account?.id ?? "new"}`}>Expiry month</Label>
                      <Input
                        id={`exp-month-${account?.id ?? "new"}`}
                        type="number"
                        min={1}
                        max={12}
                        value={formValues.expiryMonth}
                        onChange={(e) => patchForm({ expiryMonth: e.target.value })}
                        placeholder="MM"
                        disabled={
                          showLinkedDebitCardFields &&
                          !formValues.cardNumber &&
                          !hasStoredCardNumber
                        }
                        required={showCardFields || Boolean(formValues.cardNumber)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`exp-year-${account?.id ?? "new"}`}>Expiry year</Label>
                      <Input
                        id={`exp-year-${account?.id ?? "new"}`}
                        type="number"
                        min={2020}
                        max={2100}
                        value={formValues.expiryYear}
                        onChange={(e) => patchForm({ expiryYear: e.target.value })}
                        placeholder="YYYY"
                        disabled={
                          showLinkedDebitCardFields &&
                          !formValues.cardNumber &&
                          !hasStoredCardNumber
                        }
                        required={showCardFields || Boolean(formValues.cardNumber)}
                      />
                    </div>
                  </div>
                  {isCredit ? (
                    <div className="space-y-2">
                      <Label htmlFor={`card-cvv-${account?.id ?? "new"}`}>
                        CVV
                        <span className="ml-1 font-normal text-muted-foreground">(optional)</span>
                      </Label>
                      {isEdit && hasStoredCardCvv && account ? (
                        <SensitiveField
                          accountId={account.id}
                          field="cardCvv"
                          label="Saved CVV"
                          maskedDisplay="•••"
                        />
                      ) : null}
                      {isEdit && hasStoredCardCvv ? (
                        <p className="text-xs text-muted-foreground">Replace CVV (optional)</p>
                      ) : null}
                      <PasswordInput
                        id={`card-cvv-${account?.id ?? "new"}`}
                        name="cardCvv"
                        value={formValues.cardCvv}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, "");
                          cardCvvRef.current = digits;
                          patchForm({ cardCvv: digits });
                        }}
                        inputMode="numeric"
                        autoComplete="off"
                        maxLength={4}
                        placeholder={
                          isEdit && hasStoredCardCvv
                            ? "Enter new CVV only if replacing"
                            : "3 or 4 digits on back of card"
                        }
                        className="font-mono tracking-widest"
                      />
                      <p className="text-xs text-muted-foreground">
                        Stored encrypted. Amex cards use 4 digits; Visa/Mastercard use 3.
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {showWalletFields ? (
                <div className="space-y-2">
                  <Label htmlFor={`upi-id-${account?.id ?? "new"}`}>UPI ID</Label>
                  <Input
                    id={`upi-id-${account?.id ?? "new"}`}
                    value={formValues.upiId}
                    onChange={(e) => patchForm({ upiId: e.target.value })}
                    placeholder="e.g. name@okhdfcbank"
                    autoComplete="off"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Format: yourname@bankhandle (e.g. ved@oksbi)
                  </p>
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor={`acc-balance-${account?.id ?? "new"}`}>
                  {isCredit
                    ? "Current outstanding (₹)"
                    : showCardFields
                      ? "Linked balance / limit used (₹)"
                      : "Current balance (₹)"}
                </Label>
                <MoneyInput
                  id={`acc-balance-${account?.id ?? "new"}`}
                  value={formValues.openingBalance}
                  onChange={(e) => patchForm({ openingBalance: e.target.value })}
                  placeholder={
                    isCredit
                      ? "e.g. 15000.50 owed"
                      : "e.g. 25000 or -5000.75"
                  }
                  allowNegative
                  required
                />
                <p className="text-xs text-muted-foreground">
                  {isCredit
                    ? "Positive = amount owed on the card. Negative = credit balance."
                    : showCardFields
                      ? "Use negative if the linked account is overdrawn."
                      : "Use negative for overdraft or lien holds."}
                </p>
              </div>

              {isCredit ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor={`acc-limit-${account?.id ?? "new"}`}>Credit limit (₹)</Label>
                    <MoneyInput
                      id={`acc-limit-${account?.id ?? "new"}`}
                      value={formValues.creditLimit}
                      onChange={(e) => patchForm({ creditLimit: e.target.value })}
                      placeholder="e.g. 200000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`acc-billing-${account?.id ?? "new"}`}>Statement day (1–31)</Label>
                    <Input
                      id={`acc-billing-${account?.id ?? "new"}`}
                      type="number"
                      min={1}
                      max={31}
                      value={formValues.billingDay}
                      onChange={(e) => patchForm({ billingDay: e.target.value })}
                      placeholder="e.g. 15"
                    />
                  </div>
                </>
              ) : null}

              {showCardFields ? (
                <div className="space-y-2">
                  <Label htmlFor={`acc-spend-target-${account?.id ?? "new"}`}>
                    Monthly spend target (₹)
                  </Label>
                  <MoneyInput
                    id={`acc-spend-target-${account?.id ?? "new"}`}
                    value={formValues.monthlySpendTarget}
                    onChange={(e) => patchForm({ monthlySpendTarget: e.target.value })}
                    placeholder="e.g. 30000"
                  />
                  <p className="text-xs text-muted-foreground">
                    Optional cap — compared to debits logged on this card in the ledger.
                  </p>
                </div>
              ) : null}

              {(showBankFields || showCardFields) && (
                <p className="bg-muted px-3 py-2.5 text-xs text-muted-foreground">
                  Card and account numbers are encrypted in the database. Tap the eye icon on the
                  Cards or Bank sections to reveal and copy when needed.
                </p>
              )}

              <div className="space-y-2">
                <Label htmlFor={`acc-notes-${account?.id ?? "new"}`}>
                  Notes
                  <span className="ml-1 font-normal text-muted-foreground">(optional)</span>
                </Label>
                <Textarea
                  id={`acc-notes-${account?.id ?? "new"}`}
                  value={formValues.notes}
                  onChange={(e) => patchForm({ notes: e.target.value })}
                  placeholder="Branch name, relationship manager, locker number, reminders…"
                  maxLength={500}
                  rows={3}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Extra details that don&apos;t fit elsewhere — up to 500 characters.
                </p>
              </div>

              <div className="flex items-center justify-between gap-3 border border-border px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Favourite</p>
                  <p className="text-xs text-muted-foreground">Show at top of lists</p>
                </div>
                <Switch
                  checked={formValues.isFavorite}
                  onCheckedChange={(checked) => patchForm({ isFavorite: checked })}
                />
              </div>

              <div className="flex items-center justify-between gap-3 border border-border px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Default</p>
                  <p className="text-xs text-muted-foreground">Use for new transactions</p>
                </div>
                <Switch
                  checked={formValues.isDefault}
                  onCheckedChange={(checked) => patchForm({ isDefault: checked })}
                />
              </div>
            </div>

            <SheetFooter className="shrink-0 border-t border-border bg-muted/25 px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <Button type="submit" variant="default" size="lg" className="w-full" disabled={pending}>
                {pending ? "Saving..." : isEdit ? "Update account" : "Save account"}
              </Button>
            </SheetFooter>
          </form>
      </SheetContent>
    </Sheet>
  );
}
