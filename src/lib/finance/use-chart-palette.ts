"use client";

import { useTheme } from "next-themes";

import {
  DARK_CHART_PALETTE,
  LIGHT_CHART_PALETTE,
  chartColorAtFor,
} from "@/lib/finance/chart-colors";

/**
 * Theme-aware chart palette for client Recharts components. Falls back to
 * the dark palette before the theme provider has mounted (matches the app's
 * dark-by-default theme, and avoids a colour flash on first paint).
 */
export function useChartPalette() {
  const { resolvedTheme } = useTheme();
  const theme: "light" | "dark" = resolvedTheme === "light" ? "light" : "dark";

  return {
    palette: theme === "light" ? LIGHT_CHART_PALETTE : DARK_CHART_PALETTE,
    colorAt: (index: number) => chartColorAtFor(index, theme),
    theme,
  };
}
