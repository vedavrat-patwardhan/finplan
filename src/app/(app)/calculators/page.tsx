import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { getCalculatorPrefill, getMonthlySnapshot } from "@/lib/db/queries/finance";
import { formatINR } from "@/lib/format";
import { ScenarioModeler } from "@/components/finance/scenario-modeler";
import { PageShell, PageHeader, PageSection, MetaStat } from "@/components/layout/page-chrome";
import { ArrowUpRight } from "lucide-react";

const calculators = [
  {
    href: "/calculators/portfolio-outlook",
    title: "Portfolio outlook",
    description: "Future value breakdown — invested capital vs interest from your plan",
  },
  {
    href: "/calculators/sip",
    title: "SIP & lumpsum",
    description: "Project growth or see corpus you can build from your surplus",
  },
  {
    href: "/calculators/emi",
    title: "EMI & home loan",
    description: "Calculate EMI or find max loan budget at your interest rate & tenure",
  },
  {
    href: "/calculators/goal-planner",
    title: "Goal planner",
    description: "Required savings for a target, or achievable goals from your surplus",
  },
  {
    href: "/calculators/temp-planner",
    title: "Temp planner",
    description: "Scratch-pad with custom A/B/C/D formulas — nothing saved to your plan",
  },
  {
    href: "/calculators/retirement",
    title: "Retirement & insurance",
    description: "Corpus needed for FIRE, or lifestyle you can afford from surplus",
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
    <PageShell>
      <PageHeader
        title="Calculators"
        description="Standalone tools pre-filled from your profile where possible."
        meta={
          <MetaStat
            label="Your surplus"
            value={formatINR(prefill.monthlySurplus, { compact: true })}
          />
        }
      />

      <PageSection title="Tools">
        <div className="grid gap-3 sm:grid-cols-2">
          {calculators.map((calc) => (
            <Link
              key={calc.href}
              href={calc.href}
              className="group np-plunk np-plunk-press flex min-h-11 items-start justify-between gap-4 border border-border bg-card px-5 py-4 transition-colors hover:bg-accent"
            >
              <div className="min-w-0">
                <p className="text-base font-bold">{calc.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {calc.description}
                </p>
              </div>
              <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-text" />
            </Link>
          ))}
        </div>
      </PageSection>

      <ScenarioModeler baseSurplus={snapshot.netSurplus} />

      <PageSection title="Pre-fill data" description="Pulled from your income, expenses, and investments">
        <div className="grid gap-4 border border-border bg-card px-5 py-4 sm:grid-cols-2">
          <div>
            <p className="np-caps text-muted-foreground">Monthly income</p>
            <p className="mt-1 font-bold tabular-nums">{formatINR(prefill.monthlyIncome)}</p>
          </div>
          <div>
            <p className="np-caps text-muted-foreground">Monthly surplus</p>
            <p className="mt-1 font-bold tabular-nums">{formatINR(prefill.monthlySurplus)}</p>
          </div>
          <div>
            <p className="np-caps text-muted-foreground">Total SIP</p>
            <p className="mt-1 font-bold tabular-nums">{formatINR(prefill.totalSIP)}/mo</p>
          </div>
          <div>
            <p className="np-caps text-muted-foreground">Insurance coverage</p>
            <p className="mt-1 font-bold tabular-nums">
              {formatINR(prefill.totalCoverage)}
            </p>
          </div>
        </div>
      </PageSection>
    </PageShell>
  );
}
