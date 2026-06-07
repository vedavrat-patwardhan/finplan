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
  onClick,
}: {
  loading: boolean;
  revealed: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        "absolute right-5 top-5 z-20 size-9 rounded-full",
        "bg-white/12 text-white shadow-sm ring-1 ring-white/20",
        "transition-[background-color,box-shadow,transform] duration-200 ease-out",
        "hover:bg-white/22 hover:text-white hover:ring-white/30",
        "active:scale-95",
        revealed && "bg-white/20 ring-white/35"
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
}: {
  label: string;
  value: string;
  mono?: boolean;
  prominent?: boolean;
  copyable?: boolean;
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
        "group flex items-start justify-between gap-3 rounded-lg px-2.5 py-2",
        "transition-colors duration-200 hover:bg-white/8"
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/55">
          {label}
        </p>
        <p
          className={cn(
            "mt-0.5 text-white",
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
          size="icon"
          className="size-8 shrink-0 text-white/50 opacity-0 transition-opacity duration-200 group-hover:opacity-100 hover:bg-white/12 hover:text-white"
          onClick={handleCopy}
          aria-label={`Copy ${label}`}
        >
          {copied ? <Check className="size-3.5 text-white" /> : <Copy className="size-3.5" />}
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

  const frontGradient = isCredit
    ? "bg-[linear-gradient(145deg,oklch(0.40_0.085_168),oklch(0.33_0.065_188))]"
    : "bg-[linear-gradient(145deg,oklch(0.44_0.075_162),oklch(0.37_0.055_182))]";

  const backGradient = isCredit
    ? "bg-[linear-gradient(145deg,oklch(0.36_0.08_168),oklch(0.30_0.06_188))]"
    : "bg-[linear-gradient(145deg,oklch(0.40_0.07_162),oklch(0.34_0.05_182))]";

  return (
    <div className="payment-card-scene">
      <div className={cn("payment-card-inner", flipped && "is-flipped")}>
        {/* Front */}
        <div
          className={cn("payment-card-face px-5 py-5 pr-14 text-primary-foreground", frontGradient)}
          aria-hidden={flipped}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 88% 12%, oklch(1 0 0 / 0.14), transparent 42%), radial-gradient(circle at 8% 92%, oklch(1 0 0 / 0.06), transparent 38%)",
            }}
            aria-hidden
          />

          <CardRevealButton loading={loading} revealed={flipped} onClick={revealAndFlip} />

          <div className="relative">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/75">
                {isCredit ? "Credit card" : "Debit card"}
              </p>
              {account.isDefault ? (
                <Badge className="h-5 border-0 bg-white/14 px-2 text-[10px] text-white hover:bg-white/14">
                  Default
                </Badge>
              ) : null}
            </div>
            <p className="font-heading mt-1.5 text-lg font-semibold leading-tight">{account.name}</p>
            <p className="text-sm text-white/80">{account.institution}</p>
          </div>

          <p className="relative mt-7 font-mono text-[1.05rem] tracking-[0.22em] text-white/95">
            {formatMaskedCardFromLastFour(account.lastFour)}
          </p>

          <div className="relative mt-5 flex items-end justify-between gap-4 border-t border-white/12 pt-4 text-sm">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-[0.14em] text-white/55">Cardholder</p>
              <p className="mt-0.5 truncate font-medium leading-snug">{account.holderName || "—"}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[10px] uppercase tracking-[0.14em] text-white/55">Expires</p>
              <p className="mt-0.5 font-mono font-medium">{expiry || "—"}</p>
            </div>
          </div>

          {!canReveal ? (
            <p className="relative mt-3 text-[11px] leading-relaxed text-white/65">
              Add the full card number via Edit to enable reveal.
            </p>
          ) : null}
        </div>

        {/* Back */}
        <div
          className={cn(
            "payment-card-face payment-card-back flex flex-col px-5 py-5 pr-14 text-primary-foreground",
            backGradient
          )}
          aria-hidden={!flipped}
        >
          <CardRevealButton loading={loading} revealed={flipped} onClick={revealAndFlip} />

          <div
            className={cn(
              "relative flex flex-1 flex-col transition-opacity duration-300 ease-out",
              flipped ? "opacity-100" : "opacity-0"
            )}
          >
            <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.16em] text-white/50">
              Sensitive details
            </p>

            {details?.cardNumber ? (
              <DetailRow
                label="Card number"
                value={formatCardNumberDisplay(details.cardNumber, false)}
                prominent
              />
            ) : null}

            <div className="mt-1 grid grid-cols-2 gap-1">
              {details?.holderName ? (
                <DetailRow label="Cardholder" value={details.holderName} mono={false} />
              ) : null}
              {expiry ? <DetailRow label="Valid thru" value={expiry} /> : null}
              {isCredit ? (
                details?.cardCvv ? (
                  <DetailRow label="CVV" value={details.cardCvv} />
                ) : (
                  <DetailRow
                    label="CVV"
                    value={account.hasCardCvv ? "—" : "Add via Edit"}
                    copyable={false}
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
