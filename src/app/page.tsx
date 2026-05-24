import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border">
        <div className="page-container flex items-center justify-between py-4">
          <p className="font-heading text-xl font-semibold">FinPlan</p>
          <div className="flex gap-2">
          <Link href="/login" className="inline-flex h-8 items-center justify-center rounded-lg px-2.5 text-sm font-medium hover:bg-muted">
            Sign in
          </Link>
          <Link href="/register" className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/80">
            Get started
          </Link>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <p className="text-sm uppercase tracking-widest text-muted-foreground">
          Personal finance planner
        </p>
        <h1 className="font-heading mt-4 max-w-2xl text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
          Plan marriage, a home, and every milestone with clarity
        </h1>
        <p className="prose-width mt-6 text-lg text-muted-foreground">
          Track salary, bonuses, fixed and optional expenses, SIPs, and insurance —
          then see exactly when your goals become achievable.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link href="/register" className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/80">
            Start planning free
          </Link>
          <Link href="/login" className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium hover:bg-muted">
            Sign in
          </Link>
        </div>

        <div className="mt-20 grid w-full max-w-3xl gap-6 text-left sm:grid-cols-3">
          {[
            {
              title: "Know your surplus",
              body: "See monthly income minus commitments in one confident number.",
            },
            {
              title: "Timeline your goals",
              body: "Marriage, baby, house — track feasibility, not just balances.",
            },
            {
              title: "Built-in calculators",
              body: "SIP, EMI, retirement, and inflation tools pre-filled from your data.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border border-border bg-card p-5">
              <h2 className="font-heading font-semibold">{item.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
