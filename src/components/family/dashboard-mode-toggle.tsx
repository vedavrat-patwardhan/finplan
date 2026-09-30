"use client";

import Link, { useLinkStatus } from "next/link";
import { cn } from "@/lib/utils";

const VIEW_COOKIE = "finplan_dashboard_mode";

function ModeLabel({ view }: { view: "personal" | "family" }) {
  const { pending } = useLinkStatus();
  return (
    <span className="inline-flex items-center gap-2">
      {view}
      <span aria-hidden className={cn("size-1.5 rounded-full", pending && "animate-pulse bg-current")} />
      <span className="sr-only" aria-live="polite">{pending ? `Opening ${view} dashboard` : ""}</span>
    </span>
  );
}

export function DashboardModeToggle({ mode }: { mode: "personal" | "family" }) {
  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-3">
      <div className="inline-flex border border-border bg-muted p-1" aria-label="Dashboard view">
        {(["personal", "family"] as const).map((view) => (
          <Link
            key={view}
            href={`/dashboard?view=${view}`}
            prefetch
            scroll={false}
            aria-current={mode === view ? "page" : undefined}
            onClick={() => {
              document.cookie = `${VIEW_COOKIE}=${view}; Max-Age=31536000; Path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
            }}
            className={cn(
              "min-w-24 px-4 py-2 text-center text-xs font-extrabold uppercase tracking-wider transition-colors",
              mode === view ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <ModeLabel view={view} />
          </Link>
        ))}
      </div>
      <Link href="/family" className="np-caps text-brand-text underline underline-offset-4">
        Manage family
      </Link>
    </div>
  );
}
