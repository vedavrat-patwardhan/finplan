"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { revealCardDetailsAction } from "@/actions/ledger";
import { CopyField } from "@/components/ledger/copy-field";
import { Button } from "@/components/ui/button";
import type { PaymentAccountDTO } from "@/lib/db/queries/ledger";
import {
  formatCardNumberDisplay,
  formatExpiry,
} from "@/lib/finance/account-details";

export function CardExpandedDetails({
  account,
  isCredit,
  notes,
}: {
  account: PaymentAccountDTO;
  isCredit: boolean;
  notes: React.ReactNode;
}) {
  const [loading, setLoading] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [details, setDetails] = useState<{ cardNumber: string; cardCvv?: string } | null>(
    null
  );

  const expiry =
    account.expiryMonth && account.expiryYear
      ? formatExpiry(account.expiryMonth, account.expiryYear)
      : null;

  async function handleReveal() {
    if (revealed) {
      setRevealed(false);
      setDetails(null);
      return;
    }

    if (!account.hasCardNumber) {
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

    setDetails({ cardNumber: result.cardNumber, cardCvv: result.cardCvv });
    setRevealed(true);
  }

  return (
    <div className="space-y-2">
      {account.holderName ? (
        <CopyField label="Name on card" value={account.holderName} mono={false} />
      ) : null}
      {expiry ? <CopyField label="Expiry" value={expiry} /> : null}

      {account.hasCardNumber ? (
        revealed && details ? (
          <>
            <CopyField
              label="Card number"
              value={formatCardNumberDisplay(details.cardNumber, false)}
            />
            {isCredit ? (
              details.cardCvv ? (
                <CopyField label="CVV" value={details.cardCvv} />
              ) : account.hasCardCvv ? (
                <div className="rounded-lg bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
                  <p className="text-[11px] uppercase tracking-wider">CVV</p>
                  <p className="mt-0.5 text-xs">Could not decrypt CVV. Edit this card to re-save it.</p>
                </div>
              ) : (
                <div className="rounded-lg bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
                  <p className="text-[11px] uppercase tracking-wider">CVV</p>
                  <p className="mt-0.5 text-xs">Not saved. Edit this card to add your CVV.</p>
                </div>
              )
            ) : null}
          </>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full"
            onClick={handleReveal}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Revealing…
              </>
            ) : (
              `Reveal card number${isCredit ? " & CVV" : ""}`
            )}
          </Button>
        )
      ) : (
        <div className="rounded-lg bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
          <p className="text-[11px] uppercase tracking-wider">Card number</p>
          <p className="mt-0.5 text-xs">
            Full number not on file. Edit this card and enter the complete number to save and
            reveal it later.
          </p>
        </div>
      )}

      {revealed ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 w-full text-muted-foreground"
          onClick={handleReveal}
        >
          Hide sensitive details
        </Button>
      ) : null}

      {notes}
    </div>
  );
}
