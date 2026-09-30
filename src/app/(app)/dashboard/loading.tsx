import { PageShell } from "@/components/layout/page-chrome";

export default function DashboardLoading() {
  return (
    <PageShell>
      <div className="animate-pulse space-y-5" role="status" aria-label="Loading dashboard">
        <div className="h-3 w-28 bg-brand" />
        <div className="h-10 w-56 bg-muted" />
        <div className="h-5 w-full max-w-xl bg-muted" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <div className="h-40 border border-border bg-muted" />
          <div className="h-40 border border-border bg-muted" />
          <div className="h-40 border border-border bg-muted" />
        </div>
        <div className="h-52 border border-border bg-muted" />
      </div>
      <span className="sr-only">Switching dashboard view…</span>
    </PageShell>
  );
}
