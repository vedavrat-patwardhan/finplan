import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/format";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Plunk } from "@/components/ui/plunk";
import type { PlunkEdge } from "@/components/ui/plunk";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

import { MetaStat, InsightPanel } from "@/components/layout/page-chrome";
import { EmptyState } from "@/components/finance/empty-state";
import { ThemeToggle, ThemeSelector } from "@/components/theme-toggle";
import { AppLogo } from "@/components/brand/app-logo";

import { PlaygroundNav } from "@/components/playground/playground-nav";
import { ColorSwatches } from "@/components/playground/color-swatches";
import { FormControlsDemo } from "@/components/playground/form-controls-demo";
import { CheckboxSwitchDemo } from "@/components/playground/checkbox-switch-demo";
import { TabsDemo } from "@/components/playground/tabs-demo";
import { OverlayDemo } from "@/components/playground/overlay-demo";
import { ToastDemo } from "@/components/playground/toast-demo";

export const metadata: Metadata = {
  title: "Playground",
  description: "the finplan design system — neopop, in code.",
};

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-1.5">
      <h2 className="np-kicker np-caps text-xs text-subtle">{title}</h2>
      <p className="max-w-xl text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

const BUTTON_VARIANTS = [
  "default",
  "secondary",
  "brand",
  "destructive",
  "outline",
  "ghost",
] as const;

const BADGE_VARIANTS = [
  "default",
  "secondary",
  "outline",
  "brand",
  "success",
  "warning",
  "destructive",
  "info",
  "ghost",
  "link",
] as const;

const TYPE_SPECIMENS: { label: string; cls: string; sample: string }[] = [
  {
    label: "Display XL · 44–64px · serif 400 · -0.01em",
    cls: "font-display text-5xl md:text-6xl leading-none",
    sample: "plan with clarity",
  },
  {
    label: "Display L · 32–36px · serif 400",
    cls: "font-display text-3xl md:text-4xl leading-tight",
    sample: "page heading",
  },
  {
    label: "Heading 22 · 800 · 0.2px tracking",
    cls: "text-[22px] font-extrabold leading-tight",
    sample: "Section heading",
  },
  {
    label: "Heading 18 · 700 · 0.2px tracking",
    cls: "text-lg font-bold leading-tight",
    sample: "Card title",
  },
  {
    label: "Heading 16 · 700 · 0.2px tracking",
    cls: "text-base font-bold",
    sample: "List heading",
  },
  {
    label: "Heading 14 · 700 · 0.2px tracking",
    cls: "text-sm font-bold",
    sample: "Small heading",
  },
  {
    label: "Body 14 · 500 · 0.4px (default body)",
    cls: "text-sm font-medium",
    sample: "Body copy at the default weight.",
  },
  {
    label: "Body 13 · 500 · 0.4px",
    cls: "text-[13px] font-medium",
    sample: "Secondary body copy.",
  },
  {
    label: "Body 12 · 400–500 · 0.4px",
    cls: "text-xs",
    sample: "Fine print copy.",
  },
  {
    label: "Caps 12 · 700 · 2px tracking",
    cls: "np-caps text-xs",
    sample: "Section label",
  },
  {
    label: "Caps 10 · 700 · 2px tracking (default)",
    cls: "np-caps",
    sample: "Metadata label",
  },
  {
    label: "Caps 8 · 700 · 1px tracking (tags)",
    cls: "np-caps text-[8px] tracking-[1px]",
    sample: "Tag label",
  },
  {
    label: "Money L · 28–34px · 800 · tabular",
    cls: "text-3xl font-extrabold tabular-nums tracking-tight",
    sample: formatINR(162000),
  },
  {
    label: "Money M · 20–22px · 800 · tabular",
    cls: "text-xl font-extrabold tabular-nums",
    sample: formatINR(42500),
  },
  {
    label: "Mono — card numbers, codes",
    cls: "font-mono text-sm",
    sample: "TXN-2026-0912",
  },
];

const PLUNK_EDGE_DEMOS: { edge: PlunkEdge; face: string }[] = [
  { edge: "light", face: "bg-primary text-primary-foreground" },
  { edge: "dark", face: "bg-secondary text-secondary-foreground border border-input" },
  { edge: "brand", face: "bg-brand text-brand-foreground" },
  { edge: "danger", face: "bg-destructive text-destructive-foreground" },
  { edge: "success", face: "bg-success text-success-foreground" },
  { edge: "muted", face: "bg-muted text-foreground border border-border" },
];

const TABLE_ROWS = [
  { date: "3 Sep", category: "Groceries", account: "Savings", amount: -3450 },
  { date: "2 Sep", category: "Salary", account: "Salary a/c", amount: 185000 },
  { date: "1 Sep", category: "SIP — Index fund", account: "Savings", amount: -25000 },
  { date: "30 Aug", category: "Insurance premium", account: "Credit card", amount: -18400 },
];

export default function PlaygroundPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 h-14 border-b border-border bg-background">
        <div className="flex h-full items-center justify-between gap-4 px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" className="shrink-0">
              <AppLogo variant="header" showTagline={false} />
            </Link>
            <span className="np-caps hidden text-muted-foreground sm:inline">
              playground
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <Button variant="outline" size="sm" render={<Link href="/" />}>
              back to app
            </Button>
          </div>
        </div>
      </header>

      <div className="md:flex">
        <PlaygroundNav />

        <main className="min-w-0 flex-1 px-4 py-10 md:px-10">
          <div className="mx-auto max-w-4xl space-y-20">
            {/* Hero */}
            <section className="space-y-6">
              <p className="np-caps text-brand-text">meet</p>
              <h1 className="font-display text-6xl leading-[1.02] md:text-7xl">
                the finplan design system
              </h1>
              <p className="max-w-xl text-lg text-muted-foreground">
                behind every number there is a framework. here is ours — cred&apos;s
                neopop, rebuilt for planning in inr.
              </p>
              <Plunk edge="brand" className="inline-block bg-brand p-6 text-brand-foreground">
                <p className="np-caps">monthly surplus</p>
                <p className="text-4xl font-extrabold tabular-nums">
                  {formatINR(162000)}
                </p>
              </Plunk>
            </section>

            {/* 1. Colors */}
            <section id="colors" className="space-y-4">
              <SectionHeading
                title="colors"
                description="Surfaces stay monochrome. Colour signals meaning — brand, status, and chart series only."
              />
              <div className="border border-border bg-card p-6">
                <ColorSwatches />
              </div>
            </section>

            {/* 2. Typography */}
            <section id="typography" className="space-y-4">
              <SectionHeading
                title="typography"
                description="A heavy geometric sans for UI, a high-contrast serif for hero moments, uppercase tracked caps for metadata."
              />
              <div className="space-y-6 border border-border bg-card p-6">
                {TYPE_SPECIMENS.map((spec) => (
                  <div
                    key={spec.label}
                    className="space-y-1.5 border-b border-border pb-6 last:border-0 last:pb-0"
                  >
                    <p className={spec.cls}>{spec.sample}</p>
                    <p className="np-caps text-[9px] text-faint">{spec.label}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* 3. Plunk */}
            <section id="plunk" className="space-y-4">
              <SectionHeading
                title="plunk"
                description="The only elevation is the plunk — a 3px extruded edge, skewed 45°, on the bottom and right. Pressable elements translate 3px into the extrusion in 120ms. No shadows, no blur."
              />
              <div className="space-y-6 border border-border bg-card p-6">
                <div className="flex flex-wrap items-start gap-6">
                  <Card elevated className="w-56">
                    <CardContent>
                      <p className="text-sm font-bold">Elevated card</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        np-plunk, no press.
                      </p>
                    </CardContent>
                  </Card>

                  <div className="space-y-2">
                    <Button variant="brand">press me</Button>
                    <p className="np-caps text-[9px] text-faint">
                      np-plunk + np-plunk-press
                    </p>
                  </div>

                  <Plunk size="lg" edge="dark" className="max-w-56 bg-card p-6">
                    <p className="np-caps text-muted-foreground">np-plunk-lg</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      6px edges — dialogs, sheets, hero cards.
                    </p>
                  </Plunk>
                </div>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {PLUNK_EDGE_DEMOS.map((demo) => (
                    <Plunk
                      key={demo.edge}
                      edge={demo.edge}
                      className={cn(
                        "flex h-20 items-center justify-center",
                        demo.face
                      )}
                    >
                      <span className="np-caps">{demo.edge}</span>
                    </Plunk>
                  ))}
                </div>
              </div>
            </section>

            {/* 4. Buttons */}
            <section id="buttons" className="space-y-4">
              <SectionHeading
                title="buttons"
                description="Solid faces plunk and press. Outline and ghost translate 1px flat."
              />
              <div className="space-y-6 border border-border bg-card p-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {BUTTON_VARIANTS.map((variant) => (
                    <div key={variant} className="space-y-2">
                      <p className="np-caps text-[9px] text-muted-foreground">
                        {variant}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button variant={variant} size="xs">
                          xs
                        </Button>
                        <Button variant={variant} size="sm">
                          sm
                        </Button>
                        <Button variant={variant}>default</Button>
                        <Button variant={variant} size="lg">
                          lg
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-3 border-t border-border pt-6">
                  <Button size="icon" aria-label="Add">
                    <Plus />
                  </Button>
                  <Button size="icon-sm" aria-label="Add">
                    <Plus />
                  </Button>
                  <Button size="icon-lg" aria-label="Add">
                    <Plus />
                  </Button>
                  <Button size="icon-xs" aria-label="Add">
                    <Plus />
                  </Button>
                  <Button variant="brand">
                    <Plus data-icon="inline-start" />
                    with icon
                  </Button>
                  <Button disabled>disabled</Button>
                  <Button variant="outline" disabled>
                    disabled outline
                  </Button>
                  <Button variant="link">link button</Button>
                </div>

                <Button className="w-full" variant="brand">
                  full width
                </Button>
              </div>
            </section>

            {/* 5. Tags */}
            <section id="tags" className="space-y-4">
              <SectionHeading
                title="tags"
                description="Square, uppercase, tracked. Colour tags use a tint face in light mode and a solid face in dark."
              />
              <div className="flex flex-wrap gap-2 border border-border bg-card p-6">
                {BADGE_VARIANTS.map((variant) => (
                  <Badge key={variant} variant={variant}>
                    {variant}
                  </Badge>
                ))}
              </div>
            </section>

            {/* 6. Inputs */}
            <section id="inputs" className="space-y-4">
              <SectionHeading
                title="inputs"
                description="Square fields, bold 15px text, foreground border on focus — no ring, no glow."
              />
              <div className="border border-border bg-card p-6">
                <FormControlsDemo />
              </div>
            </section>

            {/* 7. Checkbox & switch */}
            <section id="checkbox-switch" className="space-y-4">
              <SectionHeading
                title="checkbox & switch"
                description="Checkbox is a square with plunk edges on press. Switch is a square track with a square knob — no pills, no circles."
              />
              <div className="border border-border bg-card p-6">
                <CheckboxSwitchDemo />
              </div>
            </section>

            {/* 8. Tabs */}
            <section id="tabs" className="space-y-4">
              <SectionHeading
                title="tabs"
                description="Default inverts the active tab to a solid block. Line keeps a transparent list with a brand underline."
              />
              <div className="border border-border bg-card p-6">
                <TabsDemo />
              </div>
            </section>

            {/* 9. Cards */}
            <section id="cards" className="space-y-4">
              <SectionHeading
                title="cards"
                description="Plain cards are flat squares. elevated adds the plunk. size='sm' tightens padding."
              />
              <div className="grid gap-6 sm:grid-cols-2">
                <Card>
                  <CardContent>
                    <p className="text-sm font-bold">Plain card</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      border border-border bg-card.
                    </p>
                  </CardContent>
                </Card>

                <Card elevated>
                  <CardContent>
                    <p className="text-sm font-bold">Elevated card</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Adds np-plunk, no press.
                    </p>
                  </CardContent>
                </Card>

                <Card className="sm:col-span-2">
                  <CardHeader>
                    <CardTitle>Monthly SIP</CardTitle>
                    <CardDescription>Auto-debited on the 5th</CardDescription>
                    <CardAction>
                      <Badge variant="success">on track</Badge>
                    </CardAction>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-extrabold tabular-nums">
                      {formatINR(25000)}
                    </p>
                  </CardContent>
                  <CardFooter>
                    <p className="text-xs text-muted-foreground">
                      Next debit in 4 days
                    </p>
                  </CardFooter>
                </Card>

                <Card size="sm">
                  <CardContent>
                    <p className="text-sm font-bold">Small card</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      size=&quot;sm&quot; — tighter padding.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* 10. Overlays */}
            <section id="overlays" className="space-y-4">
              <SectionHeading
                title="overlays"
                description="Dialog and Sheet panels use np-plunk-lg. Overlay is a flat black wash — no blur."
              />
              <div className="border border-border bg-card p-6">
                <OverlayDemo />
              </div>
            </section>

            {/* 11. Progress & skeleton */}
            <section id="progress-skeleton" className="space-y-4">
              <SectionHeading
                title="progress & skeleton"
                description="Square track, square indicator, no rounded ends. Skeletons pulse a flat muted fill."
              />
              <div className="space-y-6 border border-border bg-card p-6">
                <div className="space-y-4">
                  {[35, 70, 100].map((value) => (
                    <div key={value} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="np-caps text-[9px] text-muted-foreground">
                          progress
                        </span>
                        <span className="text-xs font-bold tabular-nums">
                          {value}%
                        </span>
                      </div>
                      <Progress value={value} />
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-3 border-t border-border pt-6">
                  <Skeleton className="size-10" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-1/3" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              </div>
            </section>

            {/* 12. Table */}
            <section id="table" className="space-y-4">
              <SectionHeading
                title="table"
                description="Caps headers, tabular figures, a hover wash on rows."
              />
              <div className="border border-border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {TABLE_ROWS.map((row) => (
                      <TableRow key={`${row.date}-${row.category}`}>
                        <TableCell>{row.date}</TableCell>
                        <TableCell>{row.category}</TableCell>
                        <TableCell>{row.account}</TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-bold",
                            row.amount < 0 ? "text-destructive" : "text-success"
                          )}
                        >
                          {formatINR(row.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>

            {/* 13. Toasts */}
            <section id="toasts" className="space-y-4">
              <SectionHeading
                title="toasts"
                description="Square toasts. Success/error/warning/info use a solid NeoPop colour face."
              />
              <div className="border border-border bg-card p-6">
                <ToastDemo />
              </div>
            </section>

            {/* 14. Stats & panels */}
            <section id="stats-panels" className="space-y-4">
              <SectionHeading
                title="stats & panels"
                description="MetaStat blocks, the InsightPanel callout, EmptyState, and the theme selector."
              />
              <div className="space-y-6 border border-border bg-card p-6">
                <div className="flex flex-wrap gap-2">
                  <MetaStat label="surplus" value={formatINR(162000)} tone="default" />
                  <MetaStat label="on track" value="+12%" tone="positive" />
                  <MetaStat label="goal eta" value="14 months" tone="accent" />
                  <MetaStat label="sip active" value={formatINR(25000)} tone="info" />
                </div>

                <InsightPanel>
                  Your fixed expenses dropped 8% this month — redirect the difference
                  into your house-down-payment goal to close the gap 3 months sooner.
                </InsightPanel>

                <EmptyState
                  title="No automations yet"
                  description="Automate recurring transfers, SIPs, and bill reminders."
                  actionLabel="Create automation"
                  actionHref="/playground#stats-panels"
                />

                <div className="max-w-sm">
                  <ThemeSelector />
                </div>
              </div>
            </section>

            {/* 15. Avatar & separator */}
            <section id="avatar-separator" className="space-y-4">
              <SectionHeading
                title="avatar & separator"
                description="Avatars are square — no circular crops. Separators are 1px hairlines."
              />
              <div className="space-y-6 border border-border bg-card p-6">
                <div className="flex items-center gap-6">
                  <Avatar size="sm">
                    <AvatarFallback>VK</AvatarFallback>
                  </Avatar>
                  <Avatar>
                    <AvatarFallback>FP</AvatarFallback>
                  </Avatar>
                  <Avatar size="lg">
                    <AvatarFallback>NP</AvatarFallback>
                  </Avatar>
                </div>

                <div className="space-y-4">
                  <Separator />
                  <div className="flex h-8 items-center gap-4">
                    <span className="text-sm font-medium">Income</span>
                    <Separator orientation="vertical" />
                    <span className="text-sm font-medium">Expenses</span>
                    <Separator orientation="vertical" />
                    <span className="text-sm font-medium">Investments</span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>

      <footer className="border-t border-border px-4 py-8 text-center">
        <p className="np-caps text-faint">
          finplan · neopop design system · built with base-ui + tailwind v4
        </p>
      </footer>
    </div>
  );
}
