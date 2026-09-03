import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { AppLogo } from "@/components/brand/app-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plunk } from "@/components/ui/plunk";

const features = [
  {
    kicker: "surplus",
    title: "know your surplus",
    body: "see monthly income minus commitments in one confident number.",
  },
  {
    kicker: "goals",
    title: "timeline your goals",
    body: "marriage, baby, house — track feasibility, not just balances.",
  },
  {
    kicker: "tools",
    title: "built-in calculators",
    body: "sip, emi, retirement, and inflation tools pre-filled from your data.",
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border">
        <div className="page-container flex items-center justify-between py-4">
          <AppLogo variant="header" showTagline={false} />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="outline" size="sm" render={<Link href="/login" />}>
              sign in
            </Button>
            <Button variant="brand" size="sm" render={<Link href="/register" />}>
              get started
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="page-container grid gap-10 py-20 md:py-28 lg:grid-cols-[1fr_340px] lg:items-center">
          <div>
            <p className="np-caps text-xs text-brand-text">personal finance planner</p>
            <h1 className="font-display mt-4 max-w-3xl text-5xl leading-[1.02] tracking-tight md:text-7xl">
              plan marriage, a home, and every milestone with clarity.
            </h1>
            <p className="prose-width mt-6 max-w-xl text-lg text-muted-foreground">
              track salary, budgets, SIPs and insurance — then see exactly when each goal
              becomes real. built for INR.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Button variant="brand" size="lg" render={<Link href="/register" />}>
                start planning free
              </Button>
              <Button variant="outline" size="lg" render={<Link href="/login" />}>
                sign in
              </Button>
            </div>
          </div>

          <Plunk edge="brand" className="bg-brand text-brand-foreground p-6">
            <p className="np-caps">monthly surplus</p>
            <p className="mt-2 text-4xl font-extrabold tabular-nums tracking-tight">₹1,62,000</p>
            <div className="mt-5 space-y-2 text-sm text-brand-foreground/70">
              <div className="flex items-center justify-between">
                <span>income</span>
                <span className="font-semibold tabular-nums">₹2,40,000</span>
              </div>
              <div className="flex items-center justify-between">
                <span>budgets</span>
                <span className="font-semibold tabular-nums">₹58,000</span>
              </div>
              <div className="flex items-center justify-between">
                <span>committed</span>
                <span className="font-semibold tabular-nums">₹20,000</span>
              </div>
            </div>
          </Plunk>
        </section>

        <section className="page-container pb-20 md:pb-28">
          <div className="grid gap-6 sm:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title} elevated>
                <CardHeader>
                  <p className="np-caps text-brand-text">{feature.kicker}</p>
                  <CardTitle className="text-lg font-bold">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.body}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="page-container flex flex-wrap gap-6">
          <Link href="/playground" className="np-caps text-faint hover:text-foreground">
            design system
          </Link>
          <Link href="/login" className="np-caps text-faint hover:text-foreground">
            sign in
          </Link>
          <Link href="/register" className="np-caps text-faint hover:text-foreground">
            get started
          </Link>
        </div>
      </footer>
    </div>
  );
}
