"use client";

import { useState } from "react";
import { Check, Copy, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { revealCardDetailsAction } from "@/actions/ledger";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PaymentAccountDTO } from "@/lib/db/queries/ledger";
import {
  formatCardNumberDisplay,
  formatExpiry,
  formatMaskedCardFromLastFour,
} from "@/lib/finance/account-details";
import { cn } from "@/lib/utils";

type CardDetails = {
  cardNumber: string;
  holderName?: string;
  cardCvv?: string;
};

interface PaymentCardFlipProps {
  account: PaymentAccountDTO;
  isCredit: boolean;
}

function CardRevealButton({
  loading,
  revealed,
  isCredit,
  onClick,
}: {
  loading: boolean;
  revealed: boolean;
  isCredit: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      className={cn(
        "absolute right-4 top-4 z-20",
        isCredit && "border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
      )}
      onClick={onClick}
      disabled={loading}
      aria-label={revealed ? "Hide card details" : "Reveal full card"}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : revealed ? (
        <EyeOff className="size-4" />
      ) : (
        <Eye className="size-4" />
      )}
    </Button>
  );
}

function DetailRow({
  label,
  value,
  mono = true,
  prominent = false,
  copyable = true,
  isCredit,
}: {
  label: string;
  value: string;
  mono?: boolean;
  prominent?: boolean;
  copyable?: boolean;
  isCredit: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value.replace(/\s/g, ""));
      setCopied(true);
      toast.success(`${label} copied`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  }

  return (
    <div
      className={cn(
        "group flex items-start justify-between gap-3 px-2.5 py-2 transition-colors duration-200",
        isCredit ? "hover:bg-primary-foreground/8" : "hover:bg-accent"
      )}
    >
      <div className="min-w-0 flex-1">
        <p className={cn("np-caps", isCredit ? "text-primary-foreground/55" : "text-muted-foreground")}>
          {label}
        </p>
        <p
          className={cn(
            "mt-0.5",
            isCredit ? "text-primary-foreground" : "text-foreground",
            mono && "font-mono tracking-wide",
            prominent ? "text-base font-medium tracking-[0.12em]" : "text-sm font-medium"
          )}
        >
          {value}
        </p>
      </div>
      {copyable ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={cn(
            "shrink-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100",
            isCredit
              ? "text-primary-foreground/50 hover:bg-primary-foreground/12 hover:text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
          onClick={handleCopy}
          aria-label={`Copy ${label}`}
        >
          {copied ? <Check className="size-3.5 text-success-text" /> : <Copy className="size-3.5" />}
        </Button>
      ) : null}
    </div>
  );
}

export function PaymentCardFlip({ account, isCredit }: PaymentCardFlipProps) {
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<CardDetails | null>(null);

  const canReveal = account.hasCardNumber;
  const expiry = formatExpiry(account.expiryMonth, account.expiryYear);

  async function revealAndFlip() {
    if (flipped) {
      setFlipped(false);
      setDetails(null);
      return;
    }

    if (!canReveal) {
      toast.error("Full card number not on file. Edit this card to add it.");
      return;
    }

    setLoading(true);
    const result = await revealCardDetailsAction(account.id);
    setLoading(false);

    if (!result.success || !result.cardNumber) {
      toast.error(result.error ?? "Could not reveal card details");
      return;
    }

    setDetails({
      cardNumber: result.cardNumber,
      holderName: result.holderName,
      cardCvv: result.cardCvv,
    });
    setFlipped(true);
  }

  const faceTone = isCredit
    ? "bg-primary text-primary-foreground"
    : "bg-card text-foreground border border-border";
  const labelTone = isCredit ? "text-primary-foreground/55" : "text-muted-foreground";
  const subTone = isCredit ? "text-primary-foreground/70" : "text-muted-foreground";
  const dividerTone = isCredit ? "border-primary-foreground/15" : "border-border";
  const badgeToneClass = isCredit ? "bg-primary-foreground/15 text-primary-foreground" : undefined;

  return (
    <div className="payment-card-scene">
      <div className={cn("payment-card-inner", flipped && "is-flipped")}>
        {/* Front */}
        <div
          className={cn("payment-card-face px-5 py-5 pr-14", faceTone)}
          aria-hidden={flipped}
        >
          <CardRevealButton
            loading={loading}
            revealed={flipped}
            isCredit={isCredit}
            onClick={revealAndFlip}
          />

          <div className="relative">
            <div className="flex flex-wrap items-center gap-2">
              <span
                aria-hidden
                className={cn("size-6", isCredit ? "bg-brand" : "bg-foreground")}
              />
              <p className={cn("np-caps", labelTone)}>
                {isCredit ? "Credit card" : "Debit card"}
              </p>
              {account.isFavorite ? (
                <Badge variant="secondary" className={badgeToneClass}>
                  Favourite
                </Badge>
              ) : null}
              {account.isDefault ? (
                <Badge variant="secondary" className={badgeToneClass}>
                  Default
                </Badge>
              ) : null}
            </div>
            <p className="mt-1.5 text-lg font-extrabold leading-tight">{account.name}</p>
            <p className={cn("text-sm", subTone)}>{account.institution}</p>
          </div>

          <p className="relative mt-7 font-mono text-[1.05rem] tracking-[0.22em]">
            {formatMaskedCardFromLastFour(account.lastFour)}
          </p>

          <div className={cn("relative mt-5 flex items-end justify-between gap-4 border-t pt-4 text-sm", dividerTone)}>
            <div className="min-w-0 flex-1">
              <p className={cn("np-caps", labelTone)}>Cardholder</p>
              <p className="mt-0.5 truncate font-medium leading-snug">{account.holderName || "—"}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className={cn("np-caps", labelTone)}>Expires</p>
              <p className="mt-0.5 font-mono font-medium">{expiry || "—"}</p>
            </div>
          </div>

          {!canReveal ? (
            <p className={cn("relative mt-3 text-[11px] leading-relaxed", labelTone)}>
              Add the full card number via Edit to enable reveal.
            </p>
          ) : null}
        </div>

        {/* Back */}
        <div
          className={cn("payment-card-face payment-card-back flex flex-col px-5 py-5 pr-14", faceTone)}
          aria-hidden={!flipped}
        >
          <CardRevealButton
            loading={loading}
            revealed={flipped}
            isCredit={isCredit}
            onClick={revealAndFlip}
          />

          <div
            className={cn(
              "relative flex flex-1 flex-col transition-opacity duration-300 ease-out",
              flipped ? "opacity-100" : "opacity-0"
            )}
          >
            <p className={cn("np-caps mb-3", labelTone)}>Sensitive details</p>

            {details?.cardNumber ? (
              <DetailRow
                label="Card number"
                value={formatCardNumberDisplay(details.cardNumber, false)}
                prominent
                isCredit={isCredit}
              />
            ) : null}

            <div className="mt-1 grid grid-cols-2 gap-1">
              {details?.holderName ? (
                <DetailRow label="Cardholder" value={details.holderName} mono={false} isCredit={isCredit} />
              ) : null}
              {expiry ? <DetailRow label="Valid thru" value={expiry} isCredit={isCredit} /> : null}
              {isCredit ? (
                details?.cardCvv ? (
                  <DetailRow label="CVV" value={details.cardCvv} isCredit={isCredit} />
                ) : (
                  <DetailRow
                    label="CVV"
                    value={account.hasCardCvv ? "—" : "Add via Edit"}
                    copyable={false}
                    isCredit={isCredit}
                  />
                )
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
