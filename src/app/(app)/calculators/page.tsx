import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { getCalculatorPrefill, getMonthlySnapshot } from "@/lib/db/queries/finance";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScenarioModeler } from "@/components/finance/scenario-modeler";
import { Calculator, Home, Target, TrendingUp, Wallet } from "lucide-react";

const calculators = [
  {
    href: "/calculators/sip",
    title: "SIP & Lumpsum",
    description: "Future value with step-up SIP and growth projection",
    icon: TrendingUp,
  },
  {
    href: "/calculators/emi",
    title: "EMI / Home Loan",
    description: "Monthly EMI, total interest, and affordability check",
    icon: Home,
  },
  {
    href: "/calculators/goal-planner",
    title: "Goal Planner",
    description: "Inflation-adjusted targets and required monthly savings",
    icon: Target,
  },
  {
    href: "/calculators/retirement",
    title: "Retirement & Insurance",
    description: "FIRE corpus and term insurance gap estimate",
    icon: Wallet,
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

      <div className="grid gap-4 sm:grid-cols-2">
        {calculators.map((calc) => {
          const Icon = calc.icon;
          return (
            <Link key={calc.href} href={calc.href}>
              <Card className="h-full transition-colors hover:bg-muted/30">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2 text-primary">
                      <Icon className="size-5" />
                    </div>
                    <CardTitle className="font-heading text-lg">{calc.title}</CardTitle>
                  </div>
                  <CardDescription>{calc.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>

      <ScenarioModeler baseSurplus={snapshot.netSurplus} />

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <Calculator className="size-5" />
            Your pre-fill data
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <p>Monthly income: ₹{Math.round(prefill.monthlyIncome).toLocaleString("en-IN")}</p>
          <p>Monthly surplus: ₹{Math.round(prefill.monthlySurplus).toLocaleString("en-IN")}</p>
          <p>Total SIP: ₹{Math.round(prefill.totalSIP).toLocaleString("en-IN")}/mo</p>
          <p>Insurance coverage: ₹{Math.round(prefill.totalCoverage).toLocaleString("en-IN")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
