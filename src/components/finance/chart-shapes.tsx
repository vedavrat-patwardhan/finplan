import type { ComponentProps } from "react";
import { Rectangle, Sector } from "recharts";
import { chartColorAt } from "@/lib/finance/chart-colors";

type ColoredPayload = {
  fill?: string;
  color?: string;
  targetFill?: string;
};

function resolveFill(
  props: { fill?: string; color?: string; payload?: ColoredPayload },
  index = 0
): string {
  return (
    props.fill ??
    props.color ??
    props.payload?.fill ??
    props.payload?.color ??
    chartColorAt(index)
  );
}

/**
 * Square pie/donut sector. NeoPop's seam between slices (paddingAngle={0},
 * stroke="var(--background)", strokeWidth={2}) is set on the owning <Pie>
 * element — Recharts merges those shared props into what this shape
 * receives, so this only needs to resolve the per-slice fill.
 */
export function ColoredPieSector(
  props: ComponentProps<typeof Sector> & {
    index?: number;
    payload?: ColoredPayload;
  }
) {
  const index = props.index ?? 0;
  return <Sector {...props} fill={resolveFill(props, index)} />;
}

/** Square bar rectangle — radius is always forced to 0, no rounded corners. */
export function ColoredBarRectangle(
  props: ComponentProps<typeof Rectangle> & {
    index?: number;
    payload?: ColoredPayload;
    fillKey?: "fill" | "targetFill";
  }
) {
  const index = props.index ?? 0;
  const fillKey = props.fillKey ?? "fill";
  const payloadFill =
    fillKey === "targetFill"
      ? props.payload?.targetFill ?? chartColorAt(index + 3)
      : resolveFill(props, index);

  return (
    <Rectangle
      {...props}
      radius={0}
      fill={props.fill ?? payloadFill}
      fillOpacity={fillKey === "targetFill" ? 0.35 : props.fillOpacity}
    />
  );
}
