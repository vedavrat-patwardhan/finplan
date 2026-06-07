"use client";

import { useState } from "react";
import { Check, Copy, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { revealAccountFieldAction } from "@/actions/ledger";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type RevealableField =
  | "cardNumber"
  | "cardCvv"
  | "accountNumber"
  | "ifscCode"
  | "holderName"
  | "upiId";

export function SensitiveField({
  accountId,
  field,
  label,
  maskedDisplay,
  formatRevealed,
  mono = true,
  className,
}: {
  accountId: string;
  field: RevealableField;
  label: string;
  maskedDisplay: string;
  formatRevealed?: (value: string) => string;
  mono?: boolean;
  className?: string;
}) {
  const [revealed, setRevealed] = useState(false);
  const [value, setValue] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function toggleReveal() {
    if (revealed) {
      setRevealed(false);
      setValue(null);
      return;
    }

    setLoading(true);
    const result = await revealAccountFieldAction(accountId, field);
    setLoading(false);

    if (!result.success || !result.value) {
      toast.error(result.error ?? "Could not reveal value");
      return;
    }

    setValue(result.value);
    setRevealed(true);
  }

  async function handleCopy() {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`${label} copied`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  }

  const display = revealed && value ? (formatRevealed?.(value) ?? value) : maskedDisplay;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2.5",
        className
      )}
    >
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={cn("truncate text-sm font-medium", mono && "font-mono tracking-wide")}>
          {display}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9"
          onClick={toggleReveal}
          disabled={loading}
          aria-label={revealed ? `Hide ${label}` : `Reveal ${label}`}
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : revealed ? (
            <EyeOff className="size-4" />
          ) : (
            <Eye className="size-4" />
          )}
        </Button>
        {revealed && value ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9"
            onClick={handleCopy}
            aria-label={`Copy ${label}`}
          >
            {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
