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

export function ColoredPieSector(
  props: ComponentProps<typeof Sector> & {
    index?: number;
    payload?: ColoredPayload;
  }
) {
  const index = props.index ?? 0;
  return <Sector {...props} fill={resolveFill(props, index)} />;
}

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
      fill={props.fill ?? payloadFill}
      fillOpacity={fillKey === "targetFill" ? 0.35 : props.fillOpacity}
    />
  );
}
