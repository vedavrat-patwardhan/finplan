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
        "flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-4 sm:px-5",
        className
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{title}</p>
          {badges}
        </div>
        {subtitle ? (
          <div className="mt-1 text-sm text-muted-foreground">{subtitle}</div>
        ) : null}
      </div>
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="text-right">
          <div className="font-medium tabular-nums">{amount}</div>
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
