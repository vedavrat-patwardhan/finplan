import Link from "next/link";
import { Button } from "@/components/ui/button";

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  children,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/15 px-6 py-12 text-center sm:py-14">
      <h3 className="font-heading text-lg font-semibold">{title}</h3>
      <p className="prose-width mx-auto mt-2 text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      {children}
      {actionLabel && actionHref ? (
        <Button render={<Link href={actionHref} />} className="mt-6 min-h-11">
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
