"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import type { PortfolioChartData } from "@/components/finance/portfolio-charts";

const PortfolioCharts = dynamic(
  () =>
    import("@/components/finance/portfolio-charts").then((m) => ({
      default: m.PortfolioCharts,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="grid gap-6 lg:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-80 w-full" />
        ))}
      </div>
    ),
  }
);

export function PortfolioChartsSection({ data }: { data: PortfolioChartData }) {
  return <PortfolioCharts data={data} />;
}
