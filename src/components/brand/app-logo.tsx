import { cn } from "@/lib/utils";

type AppLogoVariant = "sidebar" | "header" | "compact" | "hero";

const MARK_SIZE: Record<AppLogoVariant, number> = {
  sidebar: 32,
  header: 28,
  compact: 24,
  hero: 56,
};

const WORDMARK_CLASS: Record<AppLogoVariant, string> = {
  sidebar: "text-xl",
  header: "text-lg",
  compact: "text-base",
  hero: "text-4xl",
};

/**
 * The FinPlan mark: a black square tile with a lime NeoPop plunk edge on the
 * bottom and right, containing three ascending white steps (milestones).
 * ViewBox and shapes are kept in sync with public/brand/finplan-mark.svg —
 * see BRAND.md and scripts/generate-brand-assets.ts for the source recipe.
 *
 * `mono` swaps the coloured face/edge/steps for a single `currentColor`
 * silhouette (face + edges unioned, steps cut out as negative space) so the
 * mark can be tinted to match surrounding text on unusual surfaces.
 */
function AppMark({ size, mono }: { size: number; mono?: boolean }) {
  if (mono) {
    const maskId = "finplan-mark-steps-cutout";
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 512 512"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <mask id={maskId}>
          <rect x="0" y="0" width="512" height="512" fill="#fff" />
          <rect x="72" y="256" width="80" height="96" fill="#000" />
          <rect x="176" y="176" width="80" height="176" fill="#000" />
          <rect x="280" y="96" width="80" height="256" fill="#000" />
        </mask>
        <polygon
          points="0,0 432,0 512,80 512,512 80,512 0,432"
          fill="currentColor"
          mask={`url(#${maskId})`}
        />
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 512 512" fill="none" aria-hidden="true" className="shrink-0">
      <polygon points="432,0 512,80 512,512 432,432" fill="#A0B22D" />
      <polygon points="0,432 432,432 512,512 80,512" fill="#E5FE40" />
      <rect x="0" y="0" width="432" height="432" fill="#0d0d0d" />
      <rect x="72" y="256" width="80" height="96" fill="#ffffff" />
      <rect x="176" y="176" width="80" height="176" fill="#ffffff" />
      <rect x="280" y="96" width="80" height="256" fill="#ffffff" />
    </svg>
  );
}

export function AppLogo({
  variant = "sidebar",
  showTagline = true,
  mono = false,
  className,
}: {
  variant?: AppLogoVariant;
  showTagline?: boolean;
  mono?: boolean;
  className?: string;
}) {
  const showsTagline = showTagline && (variant === "sidebar" || variant === "hero");
  const wordmarkColor = mono
    ? "text-current"
    : variant === "sidebar"
      ? "text-sidebar-foreground"
      : "text-foreground";

  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex min-w-0 items-center gap-2">
        <AppMark size={MARK_SIZE[variant]} mono={mono} />
        <span
          className={cn(
            "truncate font-sans font-extrabold tracking-[-0.02em]",
            WORDMARK_CLASS[variant],
            wordmarkColor,
          )}
        >
          FinPlan
        </span>
      </div>
      {showsTagline ? <p className="np-caps mt-1 text-muted-foreground">plan with clarity.</p> : null}
    </div>
  );
}
