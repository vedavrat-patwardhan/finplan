"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function CopyField({
  label,
  value,
  displayValue,
  mono = true,
  className,
}: {
  label: string;
  value: string;
  displayValue?: string;
  mono?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  if (!value) return null;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
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
        "flex items-center justify-between gap-3 border border-input bg-input-bg px-3 py-2",
        className
      )}
    >
      <div className="min-w-0">
        <p className="np-caps text-muted-foreground">{label}</p>
        <p className={cn("truncate text-sm font-medium", mono && "font-mono tracking-wide")}>
          {displayValue ?? value}
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="shrink-0"
        onClick={handleCopy}
        aria-label={`Copy ${label}`}
      >
        {copied ? <Check className="size-4 text-success-text" /> : <Copy className="size-4" />}
      </Button>
    </div>
  );
}
