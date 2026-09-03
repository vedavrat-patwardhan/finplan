import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export function ResourceRow({
  title,
  subtitle,
  badges,
  amount,
  amountSub,
  actions,
  className,
}: {
  title: string;
  subtitle?: React.ReactNode;
  badges?: React.ReactNode;
  amount: React.ReactNode;
  amountSub?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "flex flex-col gap-3 border border-border bg-card px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4",
        className
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3 sm:block">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-bold leading-snug">{title}</p>
              {badges}
            </div>
          </div>
          <div className="shrink-0 text-right sm:hidden">
            <div className="font-extrabold tabular-nums">{amount}</div>
            {amountSub ? (
              <div className="text-xs text-muted-foreground">{amountSub}</div>
            ) : null}
          </div>
        </div>
        {subtitle ? (
          <div className="mt-1 text-sm text-muted-foreground">{subtitle}</div>
        ) : null}
      </div>
      <div className="flex items-center justify-end gap-2 sm:gap-4">
        <div className="hidden text-right sm:block">
          <div className="font-extrabold tabular-nums">{amount}</div>
          {amountSub ? (
            <div className="text-xs text-muted-foreground">{amountSub}</div>
          ) : null}
        </div>
        {actions}
      </div>
    </article>
  );
}

export function ResourceBadge({ children }: { children: React.ReactNode }) {
  return (
    <Badge variant="secondary" className="capitalize">
      {children}
    </Badge>
  );
}

export function ResourceList({ children }: { children: React.ReactNode }) {
  return <div className="list-stack">{children}</div>;
}
