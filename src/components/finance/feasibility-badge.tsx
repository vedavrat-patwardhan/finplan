import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type FeasibilityStatus = "on_track" | "at_risk" | "unreachable";

const config: Record<
  FeasibilityStatus,
  { label: string; className: string }
> = {
  on_track: {
    label: "On track",
    className: "bg-success/15 text-success border-success/25 hover:bg-success/20",
  },
  at_risk: {
    label: "At risk",
    className: "bg-warning/15 text-warning-foreground border-warning/30 hover:bg-warning/20",
  },
  unreachable: {
    label: "Needs attention",
    className: "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/15",
  },
};

export function FeasibilityBadge({
  status,
  className,
}: {
  status: FeasibilityStatus;
  className?: string;
}) {
  const { label, className: statusClass } = config[status];

  return (
    <Badge variant="outline" className={cn(statusClass, className)}>
      {label}
    </Badge>
  );
}
