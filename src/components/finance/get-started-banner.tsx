import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function GetStartedBanner() {
  return (
    <div className="rounded-xl border border-chart-1/25 bg-chart-1/5 px-5 py-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-medium text-chart-1">
            <Sparkles className="size-4" />
            Get started
          </div>
          <p className="font-heading text-base font-semibold">
            Finish setting up your financial plan
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Add expense budgets, investments, and goals you skipped during initial setup.
          </p>
        </div>
        <Button render={<Link href="/onboarding?revisit=1" />} className="min-h-11 shrink-0 gap-2">
          Continue setup
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
