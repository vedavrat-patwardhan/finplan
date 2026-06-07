"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wallet,
  Receipt,
  TrendingUp,
  Shield,
  Target,
  Calculator,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  ListOrdered,
  Landmark,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { logoutAction } from "@/actions/auth";
import { QuickAddNavButton } from "@/components/ledger/quick-add-button";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Ledger", icon: ListOrdered },
  { href: "/accounts", label: "Accounts", icon: Landmark },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/income", label: "Income", icon: Wallet },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/investments", label: "Investments", icon: TrendingUp },
  { href: "/insurance", label: "Insurance", icon: Shield },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/calculators", label: "Calculators", icon: Calculator },
  { href: "/cashflow", label: "Cashflow", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

const moreNavItems = navItems.slice(3);

function NavLink({
  href,
  label,
  icon: Icon,
  onClick,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
        active
          ? "border-l-2 border-chart-1 bg-chart-1/10 font-medium text-chart-1"
          : "border-l-2 border-transparent text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
      )}
    >
      <Icon className={cn("size-4 shrink-0", active && "text-chart-1")} />
      {label}
    </Link>
  );
}

function MobileBottomNav() {
  const pathname = usePathname();
  const accountsActive =
    pathname === "/accounts" || pathname.startsWith("/accounts/");
  const moreActive = moreNavItems.some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-end border-t border-border bg-background/95 pb-safe backdrop-blur md:hidden">
      <Link
        href="/dashboard"
        className={cn(
          "flex flex-1 cursor-pointer flex-col items-center gap-0.5 py-2.5 text-[10px]",
          pathname === "/dashboard" || pathname.startsWith("/dashboard/")
            ? "text-primary"
            : "text-muted-foreground"
        )}
      >
        <LayoutDashboard className="size-4" />
        Home
      </Link>

      <Link
        href="/transactions"
        className={cn(
          "flex flex-1 cursor-pointer flex-col items-center gap-0.5 py-2.5 text-[10px]",
          pathname === "/transactions" || pathname.startsWith("/transactions/")
            ? "text-primary"
            : "text-muted-foreground"
        )}
      >
        <ListOrdered className="size-4" />
        Ledger
      </Link>

      <QuickAddNavButton />

      <Link
        href="/accounts"
        className={cn(
          "flex flex-1 cursor-pointer flex-col items-center gap-0.5 py-2.5 text-[10px]",
          accountsActive ? "text-primary" : "text-muted-foreground"
        )}
      >
        <Landmark className="size-4" />
        Accounts
      </Link>

      <Sheet>
        <SheetTrigger
          render={
            <button
              type="button"
              className={cn(
                "flex flex-1 cursor-pointer flex-col items-center gap-0.5 py-2.5 text-[10px] outline-none",
                moreActive ? "text-primary" : "text-muted-foreground"
              )}
            />
          }
        >
          <Menu className="size-4" />
          More
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-safe pt-3">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
          <p className="mb-3 px-1 font-heading text-base font-semibold">More</p>
          <nav className="grid grid-cols-2 gap-2 pb-2">
            {moreNavItems.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 py-3 text-sm",
                    active
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
    </nav>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-sidebar-border px-5 py-6">
        <Link href="/dashboard" className="block" onClick={onNavigate}>
          <p className="font-heading text-xl font-semibold tracking-tight">
            <span className="text-chart-1">Fin</span>
            <span className="text-sidebar-foreground">Plan</span>
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Plan with clarity
          </p>
        </Link>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {navItems.map((item) => (
          <NavLink key={item.href} {...item} onClick={onNavigate} />
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <form action={logoutAction}>
          <Button
            type="submit"
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground"
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        </form>
      </div>
    </div>
  );
}

export function AppShell({
  children,
  userName,
}: {
  children: React.ReactNode;
  userName?: string;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-60 shrink-0 border-r border-border bg-sidebar md:block">
        <SidebarContent />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background/90 px-4 py-3 backdrop-blur md:hidden">
          <div>
            <p className="font-heading text-lg font-semibold">FinPlan</p>
            {userName ? (
              <p className="text-xs text-muted-foreground">Hello, {userName}</p>
            ) : null}
          </div>
          <Sheet>
            <SheetTrigger render={<Button variant="outline" size="icon" />}>
              <Menu className="size-4" />
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SidebarContent />
            </SheetContent>
          </Sheet>
        </header>

        <main className="flex-1 pb-24 md:pb-0">{children}</main>
        <MobileBottomNav />
      </div>
    </div>
  );
}
