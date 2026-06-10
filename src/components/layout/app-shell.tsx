"use client";

import { useState } from "react";
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
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { ThemeToggle } from "@/components/theme-toggle";
import { AppLogo } from "@/components/brand/app-logo";

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
      prefetch={true}
      onClick={onClick}
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
        active
          ? "bg-chart-1/10 font-medium text-chart-1"
          : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
      )}
    >
      <Icon className={cn("size-4 shrink-0", active && "text-chart-1")} />
      {label}
    </Link>
  );
}

function MobileBottomNav({
  moreOpen,
  onMoreOpenChange,
}: {
  moreOpen: boolean;
  onMoreOpenChange: (open: boolean) => void;
}) {
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
        prefetch={true}
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
        prefetch={true}
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
        prefetch={true}
        className={cn(
          "flex flex-1 cursor-pointer flex-col items-center gap-0.5 py-2.5 text-[10px]",
          accountsActive ? "text-primary" : "text-muted-foreground"
        )}
      >
        <Landmark className="size-4" />
        Accounts
      </Link>

      <Sheet open={moreOpen} onOpenChange={onMoreOpenChange}>
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
                  prefetch={true}
                  onClick={() => onMoreOpenChange(false)}
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
        <Link href="/dashboard" prefetch={true} className="block" onClick={onNavigate}>
          <AppLogo variant="sidebar" />
        </Link>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {navItems.map((item) => (
          <NavLink key={item.href} {...item} onClick={onNavigate} />
        ))}
      </nav>

      <div className="sticky bottom-0 z-10 shrink-0 space-y-2 border-t border-sidebar-border bg-sidebar p-3">
        <div className="flex items-center justify-between gap-2 px-1">
          <span className="text-xs text-muted-foreground">Appearance</span>
          <ThemeToggle />
        </div>
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden h-dvh w-60 border-r border-border bg-sidebar md:block">
        <SidebarContent />
      </aside>

      <div className="flex min-h-screen min-w-0 flex-col md:ml-60">
        <header className="sticky top-0 z-40 flex items-center gap-2 border-b border-border bg-background/90 px-3 py-3 backdrop-blur md:hidden">
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger render={<Button variant="outline" size="icon" className="shrink-0" />}>
              <Menu className="size-4" />
              <span className="sr-only">Open navigation</span>
            </SheetTrigger>
            <SheetContent side="left" className="flex h-full w-72 flex-col p-0">
              <SidebarContent onNavigate={() => setSidebarOpen(false)} />
            </SheetContent>
          </Sheet>

          <div className="min-w-0 flex-1">
            <AppLogo variant="header" showTagline={false} />
            {userName ? (
              <p className="truncate text-xs text-muted-foreground">Hello, {userName}</p>
            ) : null}
          </div>

          <ThemeToggle />
        </header>

        <main className="flex-1 pb-24 md:pb-0">{children}</main>
        <InstallPrompt />
        <MobileBottomNav moreOpen={moreOpen} onMoreOpenChange={setMoreOpen} />
      </div>
    </div>
  );
}
