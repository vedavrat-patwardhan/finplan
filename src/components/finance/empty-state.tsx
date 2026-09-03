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
    <div className="border border-dashed border-input px-6 py-12 text-center sm:py-14">
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="prose-width mx-auto mt-2 text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      {children}
      {actionLabel && actionHref ? (
        <Button variant="brand" size="lg" render={<Link href={actionHref} />} className="mt-6">
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
