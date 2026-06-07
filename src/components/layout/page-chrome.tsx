import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("page-container page-stack pb-8", className)}>{children}</div>
  );
}

export function PageHeader({
  title,
  description,
  meta,
  backHref,
  backLabel = "Back",
  children,
}: {
  title: string;
  description?: string;
  meta?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {backHref ? (
          <Link
            href={backHref}
            className="mb-3 inline-flex min-h-11 cursor-pointer items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
            {backLabel}
          </Link>
        ) : null}
        <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-[1.75rem]">
          {title}
        </h1>
        {description ? (
          <p className="prose-width mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
        {meta ? <div className="mt-3 flex flex-wrap gap-2">{meta}</div> : null}
      </div>
      {children ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>
      ) : null}
    </header>
  );
}

export function MetaStat({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-muted/50 px-3 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums text-foreground">{value}</span>
    </span>
  );
}

export function PageSection({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-4", className)}>
      {title ? (
        <div>
          <h2 className="font-heading text-lg font-semibold">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function InsightPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-muted/25 px-5 py-4 text-sm leading-relaxed",
        className
      )}
    >
      {children}
    </div>
  );
}
