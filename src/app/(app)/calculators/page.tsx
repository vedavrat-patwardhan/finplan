import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { getCalculatorPrefill, getMonthlySnapshot } from "@/lib/db/queries/finance";
import { formatINR } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScenarioModeler } from "@/components/finance/scenario-modeler";
import { ArrowUpRight } from "lucide-react";

const calculators = [
  {
    href: "/calculators/sip",
    title: "SIP & Lumpsum",
    description: "Future value with step-up SIP and growth projection",
  },
  {
    href: "/calculators/emi",
    title: "EMI / Home Loan",
    description: "Monthly EMI, total interest, and affordability check",
  },
  {
    href: "/calculators/goal-planner",
    title: "Goal Planner",
    description: "Inflation-adjusted targets and required monthly savings",
  },
  {
    href: "/calculators/retirement",
    title: "Retirement & Insurance",
    description: "FIRE corpus and term insurance gap estimate",
  },
];

export default async function CalculatorsPage() {
  const session = await getSession();
  if (!session) return null;

  const [prefill, snapshot] = await Promise.all([
    getCalculatorPrefill(session.userId),
    getMonthlySnapshot(session.userId),
  ]);

  return (
    <div className="page-container space-y-8 pb-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Calculators</h1>
        <p className="mt-1 text-muted-foreground">
          Pre-filled from your profile where possible
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {calculators.map((calc) => (
          <Link
            key={calc.href}
            href={calc.href}
            className="group flex items-start justify-between gap-4 rounded-xl border border-border bg-card px-5 py-4 transition-colors hover:bg-muted/25"
          >
            <div className="min-w-0">
              <p className="font-heading text-lg font-semibold">{calc.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {calc.description}
              </p>
            </div>
            <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
          </Link>
        ))}
      </div>

      <ScenarioModeler baseSurplus={snapshot.netSurplus} />

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Your pre-fill data</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <p>
            <span className="text-muted-foreground">Monthly income</span>
            <span className="mt-0.5 block font-medium tabular-nums">
              {formatINR(prefill.monthlyIncome)}
            </span>
          </p>
          <p>
            <span className="text-muted-foreground">Monthly surplus</span>
            <span className="mt-0.5 block font-medium tabular-nums">
              {formatINR(prefill.monthlySurplus)}
            </span>
          </p>
          <p>
            <span className="text-muted-foreground">Total SIP</span>
            <span className="mt-0.5 block font-medium tabular-nums">
              {formatINR(prefill.totalSIP)}/mo
            </span>
          </p>
          <p>
            <span className="text-muted-foreground">Insurance coverage</span>
            <span className="mt-0.5 block font-medium tabular-nums">
              {formatINR(prefill.totalCoverage)}
            </span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
