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

const metaStatTones = {
  default: "border-border/60 bg-muted/40",
  positive: "border-success/25 bg-success/10",
  accent: "border-chart-1/30 bg-chart-1/10",
  info: "border-chart-4/30 bg-chart-4/10",
} as const;

export function MetaStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: keyof typeof metaStatTones;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 py-1.5 text-sm",
        metaStatTones[tone]
      )}
    >
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "font-medium tabular-nums",
          tone === "positive" && "text-success",
          tone === "accent" && "text-chart-1",
          tone === "info" && "text-chart-4",
          tone === "default" && "text-foreground"
        )}
      >
        {value}
      </span>
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
          <h2 className="font-heading text-lg font-semibold">
            <span className="border-l-[3px] border-chart-1 pl-3">{title}</span>
          </h2>
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
        "rounded-xl border border-chart-1/20 border-l-[3px] border-l-chart-1 bg-chart-1/5 px-5 py-4 text-sm leading-relaxed",
        className
      )}
    >
      {children}
    </div>
  );
}
