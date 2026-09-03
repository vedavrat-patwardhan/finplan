"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Banknote,
  ChevronDown,
  CreditCard,
  Landmark,
  Smartphone,
} from "lucide-react";
import type { ComponentType } from "react";
import { formatINR } from "@/lib/format";
import { AccountFormSheet } from "@/components/ledger/account-form-sheet";
import { FavoriteAccountButton } from "@/components/ledger/favorite-account-button";
import { sortPaymentAccounts } from "@/lib/finance/ledger";
import { DeleteAccountButton } from "@/components/ledger/delete-account-button";
import { CopyField } from "@/components/ledger/copy-field";
import { CardExpandedDetails } from "@/components/ledger/card-expanded-details";
import { SensitiveField } from "@/components/ledger/sensitive-field";
import { PaymentCardFlip } from "@/components/ledger/payment-card-flip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PaymentAccountDTO } from "@/lib/db/queries/ledger";
import type { PaymentAccountType } from "@/lib/finance/constants";
import {
  formatMaskedAccountFromLastFour,
  formatMaskedCardFromLastFour,
  formatExpiry,
  isCardType,
} from "@/lib/finance/account-details";
import { cn } from "@/lib/utils";

function progressTone(pct: number, over = false) {
  if (over || pct >= 90) return "bg-destructive";
  if (pct >= 70) return "bg-warning";
  return "bg-success";
}

function AccountNotesDisplay({ notes }: { notes: string }) {
  if (!notes.trim()) return null;

  return (
    <div className="bg-muted px-3 py-2.5">
      <p className="np-caps text-muted-foreground">Notes</p>
      <p className="mt-0.5 whitespace-pre-wrap text-sm">{notes}</p>
    </div>
  );
}

const typeIcons: Record<PaymentAccountType, ComponentType<{ className?: string }>> = {
  bank: Landmark,
  debit_card: CreditCard,
  credit_card: CreditCard,
  cash: Banknote,
  wallet: Smartphone,
};

function ExpandToggle({
  expanded,
  onToggle,
  label,
}: {
  expanded: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <button
        type="button"
        onClick={onToggle}
        className="np-caps flex-1 text-left text-muted-foreground transition-colors hover:text-foreground"
      >
        {expanded ? "Hide" : "View"} {label}
      </button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onToggle}
        aria-label={expanded ? `Hide ${label}` : `View ${label}`}
      >
        <ChevronDown className={cn("size-4 transition-transform", expanded && "rotate-180")} />
      </Button>
    </div>
  );
}

function CardWalletItem({
  account,
  monthlySpend = 0,
}: {
  account: PaymentAccountDTO;
  monthlySpend?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const isCredit = account.type === "credit_card";
  const limitUsedPct =
    isCredit && account.creditLimit
      ? Math.min(100, Math.round((account.currentBalance / account.creditLimit) * 100))
      : 0;
  const spendTarget = account.monthlySpendTarget;
  const spendUsedPct =
    spendTarget && spendTarget > 0
      ? Math.min(100, Math.round((monthlySpend / spendTarget) * 100))
      : 0;
  const overSpendTarget = spendTarget != null && spendTarget > 0 && monthlySpend > spendTarget;

  return (
    <article className="border border-border bg-card">
      <PaymentCardFlip account={account} isCredit={isCredit} />

      <div className="space-y-3 px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="np-caps text-muted-foreground">
              {isCredit ? "Outstanding" : "Balance tracked"}
            </p>
            <p className="text-xl font-extrabold tabular-nums">
              {formatINR(Math.abs(account.currentBalance), { compact: true })}
            </p>
            {isCredit && account.creditLimit ? (
              <p className="text-xs text-muted-foreground">
                of {formatINR(account.creditLimit, { compact: true })} limit
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-1">
            <FavoriteAccountButton accountId={account.id} isFavorite={account.isFavorite} />
            <AccountFormSheet account={account} triggerLabel="Edit" />
            <DeleteAccountButton id={account.id} name={account.name} />
          </div>
        </div>

        {isCredit && account.creditLimit ? (
          <div>
            <div className="h-2 bg-muted">
              <div
                className={cn("h-full", progressTone(limitUsedPct))}
                style={{ width: `${limitUsedPct}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{limitUsedPct}% of limit used</p>
          </div>
        ) : null}

        {spendTarget != null && spendTarget > 0 ? (
          <div>
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-muted-foreground">Spend this month</span>
              <span
                className={cn(
                  "font-medium tabular-nums",
                  overSpendTarget ? "text-destructive" : "text-foreground"
                )}
              >
                {formatINR(monthlySpend, { compact: true })}
                <span className="font-normal text-muted-foreground">
                  {" "}
                  / {formatINR(spendTarget, { compact: true })}
                </span>
              </span>
            </div>
            <div className="mt-1.5 h-2 bg-muted">
              <div
                className={cn("h-full transition-all", progressTone(spendUsedPct, overSpendTarget))}
                style={{ width: `${spendUsedPct}%` }}
              />
            </div>
          </div>
        ) : null}

        <ExpandToggle
          expanded={expanded}
          onToggle={() => setExpanded((v) => !v)}
          label="card details"
        />

        {expanded ? (
          <div className="border-t border-border pt-3">
            <CardExpandedDetails
              account={account}
              isCredit={isCredit}
              notes={<AccountNotesDisplay notes={account.notes} />}
            />
          </div>
        ) : null}

        <Link
          href={`/transactions?account=${account.id}`}
          className="inline-block text-sm text-brand-text underline-offset-4 hover:underline"
        >
          View transactions
        </Link>
      </div>
    </article>
  );
}

function BankAccountItem({ account }: { account: PaymentAccountDTO }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article className="border border-border bg-card px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center bg-muted">
            <Landmark className="size-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-bold">{account.name}</p>
              {account.isFavorite ? <Badge variant="brand">Favourite</Badge> : null}
              {account.isDefault ? <Badge variant="outline">Default</Badge> : null}
            </div>
            <p className="text-sm text-muted-foreground">
              {account.institution}
              {account.accountSubtype
                ? ` · ${account.accountSubtype === "savings" ? "Savings" : "Current"}`
                : ""}
            </p>
            <p
              className={cn(
                "mt-2 text-xl font-extrabold tabular-nums",
                account.currentBalance < 0 && "text-destructive"
              )}
            >
              {formatINR(account.currentBalance, { compact: true })}
            </p>
            <p className="font-mono text-xs text-muted-foreground">
              {formatMaskedAccountFromLastFour(account.lastFour)}
            </p>
            {account.cardLastFour ? (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <CreditCard className="size-3.5" />
                Debit card {formatMaskedCardFromLastFour(account.cardLastFour)}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <FavoriteAccountButton accountId={account.id} isFavorite={account.isFavorite} />
          <AccountFormSheet account={account} triggerLabel="Edit" />
          <DeleteAccountButton id={account.id} name={account.name} />
        </div>
      </div>

      <div className="mt-3">
        <ExpandToggle
          expanded={expanded}
          onToggle={() => setExpanded((v) => !v)}
          label="account details"
        />
      </div>

      {expanded ? (
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          {account.hasAccountNumber ? (
            <SensitiveField
              accountId={account.id}
              field="accountNumber"
              label="Account number"
              maskedDisplay={formatMaskedAccountFromLastFour(account.lastFour)}
            />
          ) : account.lastFour ? (
            <div className="bg-muted px-3 py-2.5 text-sm text-muted-foreground">
              <p className="np-caps">Account number</p>
              <p className="mt-0.5 font-mono">•••• {account.lastFour}</p>
              <p className="mt-1 text-xs">
                Full number not on file. Edit this account and enter the complete number to save and
                reveal it later.
              </p>
            </div>
          ) : null}
          {account.ifscCode ? (
            <SensitiveField
              accountId={account.id}
              field="ifscCode"
              label="IFSC"
              maskedDisplay="••••••"
            />
          ) : null}
          {account.holderName ? (
            <SensitiveField
              accountId={account.id}
              field="holderName"
              label="Account holder"
              maskedDisplay="••••••"
              mono={false}
            />
          ) : null}
          {account.crn ? <CopyField label="CRN" value={account.crn} /> : null}
          {account.hasCardNumber ? (
            <SensitiveField
              accountId={account.id}
              field="cardNumber"
              label="Linked debit card"
              maskedDisplay={formatMaskedCardFromLastFour(account.cardLastFour)}
            />
          ) : account.cardLastFour ? (
            <div className="bg-muted px-3 py-2.5 text-sm text-muted-foreground">
              <p className="np-caps">Linked debit card</p>
              <p className="mt-0.5 font-mono">
                {formatMaskedCardFromLastFour(account.cardLastFour)}
              </p>
            </div>
          ) : null}
          {account.expiryMonth && account.expiryYear && account.cardLastFour ? (
            <CopyField
              label="Debit card expiry"
              value={formatExpiry(account.expiryMonth, account.expiryYear)}
            />
          ) : null}
          <AccountNotesDisplay notes={account.notes} />
        </div>
      ) : null}

      <Link
        href={`/transactions?account=${account.id}`}
        className="mt-3 inline-block text-sm text-brand-text underline-offset-4 hover:underline"
      >
        View transactions
      </Link>
    </article>
  );
}

function SimpleAccountItem({ account }: { account: PaymentAccountDTO }) {
  const Icon = typeIcons[account.type];

  return (
    <article className="border border-border bg-card px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center bg-muted">
            <Icon className="size-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-bold">{account.name}</p>
              {account.isFavorite ? <Badge variant="brand">Favourite</Badge> : null}
              {account.isDefault ? <Badge variant="outline">Default</Badge> : null}
            </div>
            {account.upiId ? (
              <SensitiveField
                accountId={account.id}
                field="upiId"
                label="UPI ID"
                maskedDisplay="••••@••••"
                mono={false}
                className="mt-2"
              />
            ) : null}
            <p
              className={cn(
                "mt-2 text-xl font-extrabold tabular-nums",
                account.currentBalance < 0 && "text-destructive"
              )}
            >
              {formatINR(account.currentBalance, { compact: true })}
            </p>
            {account.notes.trim() ? (
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{account.notes}</p>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <FavoriteAccountButton accountId={account.id} isFavorite={account.isFavorite} />
          <AccountFormSheet account={account} triggerLabel="Edit" />
          <DeleteAccountButton id={account.id} name={account.name} />
        </div>
      </div>
      <Link
        href={`/transactions?account=${account.id}`}
        className="mt-3 inline-block text-sm text-brand-text underline-offset-4 hover:underline"
      >
        View transactions
      </Link>
    </article>
  );
}

function AccountSection({
  title,
  description,
  accounts,
  addActions,
  emptyMessage,
  children,
}: {
  title: string;
  description: string;
  accounts: PaymentAccountDTO[];
  addActions?: Array<{ label: string; type: string }>;
  emptyMessage: string;
  children: (account: PaymentAccountDTO) => React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="np-kicker np-caps text-xs text-subtle">{title}</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {addActions?.map((action) => (
            <AccountFormSheet
              key={action.type}
              triggerLabel={action.label}
              defaultType={action.type}
            />
          ))}
        </div>
      </div>
      {accounts.length === 0 ? (
        <div className="border border-dashed border-border bg-muted/15 px-5 py-8 text-center">
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-3">{accounts.map((acc) => children(acc))}</div>
      )}
    </section>
  );
}

export function AccountsClient({
  accounts,
  cardSpend = {},
}: {
  accounts: PaymentAccountDTO[];
  cardSpend?: Record<string, number>;
}) {
  const cards = sortPaymentAccounts(accounts.filter((a) => isCardType(a.type)));
  const banks = sortPaymentAccounts(accounts.filter((a) => a.type === "bank"));
  const others = sortPaymentAccounts(
    accounts.filter((a) => a.type === "cash" || a.type === "wallet")
  );

  if (accounts.length === 0) {
    return (
      <div className="space-y-8">
        <div className="border border-dashed border-border bg-muted/15 px-6 py-14 text-center">
          <p className="text-lg font-bold">Set up how you pay</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Add your cards and bank accounts once. Reveal details only when you need to copy them.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <AccountFormSheet triggerLabel="Add debit card" defaultType="debit_card" />
            <AccountFormSheet triggerLabel="Add credit card" defaultType="credit_card" />
            <AccountFormSheet triggerLabel="Add bank account" defaultType="bank" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <AccountSection
        title="Cards"
        description="Debit and credit cards — tap the eye to flip and reveal full details"
        accounts={cards}
        addActions={[
          { label: "Add debit card", type: "debit_card" },
          { label: "Add credit card", type: "credit_card" },
        ]}
        emptyMessage="No cards added yet. Add a debit or credit card to keep numbers handy."
      >
        {(acc) => (
          <CardWalletItem
            key={acc.id}
            account={acc}
            monthlySpend={cardSpend[acc.id] ?? 0}
          />
        )}
      </AccountSection>

      <AccountSection
        title="Bank accounts"
        description="Savings and current accounts with IFSC for transfers"
        accounts={banks}
        addActions={[{ label: "Add bank account", type: "bank" }]}
        emptyMessage="No bank accounts yet. Add one to track balances and copy account details."
      >
        {(acc) => <BankAccountItem key={acc.id} account={acc} />}
      </AccountSection>

      <AccountSection
        title="Cash & UPI"
        description="Physical cash and digital wallets"
        accounts={others}
        addActions={[
          { label: "Add UPI wallet", type: "wallet" },
          { label: "Add cash", type: "cash" },
        ]}
        emptyMessage="No cash or UPI wallets yet."
      >
        {(acc) => <SimpleAccountItem key={acc.id} account={acc} />}
      </AccountSection>
    </div>
  );
}
