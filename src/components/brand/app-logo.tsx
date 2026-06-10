import { cn } from "@/lib/utils";

type AppLogoVariant = "sidebar" | "header" | "compact";

export function AppLogo({
  variant = "sidebar",
  showTagline = true,
  className,
}: {
  variant?: AppLogoVariant;
  showTagline?: boolean;
  className?: string;
}) {
  const titleClass =
    variant === "sidebar"
      ? "font-heading text-xl font-semibold tracking-tight"
      : variant === "header"
        ? "font-heading text-lg font-semibold leading-tight tracking-tight"
        : "font-heading text-base font-semibold tracking-tight";

  return (
    <div className={cn("min-w-0", className)}>
      <p className={titleClass}>
        <span className="text-chart-1">Fin</span>
        <span className={variant === "sidebar" ? "text-sidebar-foreground" : "text-foreground"}>
          Plan
        </span>
      </p>
      {showTagline && variant === "sidebar" ? (
        <p className="mt-0.5 text-xs text-muted-foreground">Plan with clarity</p>
      ) : null}
    </div>
  );
}
