import Link from "next/link";
import { setDashboardViewAction } from "@/actions/family";
import { cn } from "@/lib/utils";

export function DashboardModeToggle({ mode }: { mode: "personal" | "family" }) {
  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-3">
      <div className="inline-flex border border-border bg-muted p-1" aria-label="Dashboard view">
        {(["personal", "family"] as const).map((view) => (
          <form key={view} action={setDashboardViewAction}>
            <input type="hidden" name="view" value={view} />
            <button
              type="submit"
              aria-pressed={mode === view}
              className={cn(
                "min-w-24 px-4 py-2 text-xs font-extrabold uppercase tracking-wider transition-colors",
                mode === view ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {view}
            </button>
          </form>
        ))}
      </div>
      <Link href="/family" className="np-caps text-brand-text underline underline-offset-4">
        Manage family
      </Link>
    </div>
  );
}
