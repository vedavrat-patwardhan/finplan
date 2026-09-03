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
      <div className="min-w-0 flex-1">
        {backHref ? (
          <Link
            href={backHref}
            className="np-caps mb-4 inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="size-3.5" />
            {backLabel}
          </Link>
        ) : null}
        <h1 className="font-display text-3xl leading-tight md:text-4xl">{title}</h1>
        {description ? (
          <p className="prose-width mt-2 text-muted-foreground">{description}</p>
        ) : null}
        {meta ? <div className="mt-3 flex w-full flex-wrap gap-2">{meta}</div> : null}
      </div>
      {children ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>
      ) : null}
    </header>
  );
}

const metaStatTones = {
  default: { border: "", value: "text-foreground" },
  positive: { border: "border-l-[3px] border-l-success", value: "text-success-text" },
  accent: { border: "border-l-[3px] border-l-brand", value: "text-brand-text" },
  info: { border: "border-l-[3px] border-l-info", value: "text-info-text" },
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
        "inline-flex min-w-32 flex-col gap-1 border border-border bg-card px-3 py-2",
        metaStatTones[tone].border
      )}
    >
      <span className="np-caps text-muted-foreground">{label}</span>
      <span className={cn("text-base font-extrabold tabular-nums", metaStatTones[tone].value)}>
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
          <h2 className="np-kicker np-caps text-xs text-subtle">{title}</h2>
          {description ? (
            <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
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
        "border border-border border-l-[3px] border-l-brand bg-brand/5 px-5 py-4 text-sm leading-relaxed",
        className
      )}
    >
      {children}
    </div>
  );
}
