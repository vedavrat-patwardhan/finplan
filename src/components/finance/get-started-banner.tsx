import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function GetStartedBanner() {
  return (
    <div className="border border-border border-l-[3px] border-l-brand bg-brand/5 px-5 py-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="np-caps flex items-center gap-2 text-brand-text">
            <Sparkles className="size-4" />
            Get started
          </div>
          <p className="text-base font-bold">Finish setting up your financial plan</p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Add expense budgets, investments, and goals you skipped during initial setup.
          </p>
        </div>
        <Button variant="brand" render={<Link href="/onboarding?revisit=1" />} className="shrink-0 gap-2">
          Continue setup
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
