"use client";

import type { ReactElement } from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";

const ResponsiveContainer = dynamic(
  () => import("recharts").then((m) => m.ResponsiveContainer),
  { ssr: false }
);

const DEFAULT_INITIAL_DIMENSION = { width: 320, height: 256 } as const;

type ChartAreaProps = {
  children: ReactElement;
  className?: string;
  heightClass?: string;
  initialDimension?: { width: number; height: number };
};

export function ChartArea({
  children,
  className,
  heightClass = "h-64",
  initialDimension = DEFAULT_INITIAL_DIMENSION,
}: ChartAreaProps) {
  return (
    <div className={cn("w-full min-h-0 min-w-0", heightClass, className)}>
      <ResponsiveContainer
        width="100%"
        height="100%"
        minWidth={0}
        initialDimension={initialDimension}
      >
        {children}
      </ResponsiveContainer>
    </div>
  );
}
