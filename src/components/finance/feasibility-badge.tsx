import { Badge } from "@/components/ui/badge";

type FeasibilityStatus = "on_track" | "at_risk" | "unreachable";

const config: Record<
  FeasibilityStatus,
  { label: string; variant: "success" | "warning" | "destructive" }
> = {
  on_track: { label: "On track", variant: "success" },
  at_risk: { label: "At risk", variant: "warning" },
  unreachable: { label: "Needs attention", variant: "destructive" },
};

export function FeasibilityBadge({
  status,
  className,
}: {
  status: FeasibilityStatus;
  className?: string;
}) {
  const { label, variant } = config[status];

  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}
