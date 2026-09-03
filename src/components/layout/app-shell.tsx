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
  RadioTower,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { logoutAction } from "@/actions/auth";
import { QuickAddNavButton } from "@/components/ledger/quick-add-button";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { ThemeToggle } from "@/components/theme-toggle";
import { AppLogo } from "@/components/brand/app-logo";

const baseNavItems = [
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
  { href: "/automations", label: "Automations", icon: RadioTower },
  { href: "/settings", label: "Settings", icon: Settings },
];

type NavItem = (typeof baseNavItems)[number];

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
        "flex items-center gap-3 border-l-[3px] border-transparent px-4 py-2.5 text-[13px] font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
        active && "border-brand bg-accent text-foreground"
      )}
    >
      <Icon className="size-4 shrink-0" />
      {label}
    </Link>
  );
}

function MobileBottomNav({
  moreOpen,
  onMoreOpenChange,
  navItems,
}: {
  moreOpen: boolean;
  onMoreOpenChange: (open: boolean) => void;
  navItems: NavItem[];
}) {
  const pathname = usePathname();
  const moreNavItems = navItems.slice(3);
  const accountsActive =
    pathname === "/accounts" || pathname.startsWith("/accounts/");
  const moreActive = moreNavItems.some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-end border-t border-border bg-background pb-safe md:hidden">
      <Link
        href="/dashboard"
        prefetch={true}
        className={cn(
          "np-caps flex flex-1 flex-col items-center gap-0.5 border-t-2 border-transparent py-2.5 text-[9px] tracking-[1px]",
          pathname === "/dashboard" || pathname.startsWith("/dashboard/")
            ? "border-brand text-foreground"
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
          "np-caps flex flex-1 flex-col items-center gap-0.5 border-t-2 border-transparent py-2.5 text-[9px] tracking-[1px]",
          pathname === "/transactions" || pathname.startsWith("/transactions/")
            ? "border-brand text-foreground"
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
          "np-caps flex flex-1 flex-col items-center gap-0.5 border-t-2 border-transparent py-2.5 text-[9px] tracking-[1px]",
          accountsActive ? "border-brand text-foreground" : "text-muted-foreground"
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
                "np-caps flex flex-1 flex-col items-center gap-0.5 border-t-2 border-transparent py-2.5 text-[9px] tracking-[1px] outline-none",
                moreActive ? "border-brand text-foreground" : "text-muted-foreground"
              )}
            />
          }
        >
          <Menu className="size-4" />
          More
        </SheetTrigger>
        <SheetContent side="bottom" className="px-4 pb-safe pt-3">
          <div className="mx-auto mb-4 h-[3px] w-10 bg-input" />
          <p className="np-caps mb-3 px-1 text-subtle">More</p>
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
                    "flex items-center gap-3 border border-border px-3 py-3 text-sm font-semibold",
                    active
                      ? "border-l-[3px] border-l-brand bg-accent text-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
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

function SidebarContent({ onNavigate, navItems }: { onNavigate?: () => void; navItems: NavItem[] }) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-5 py-5">
        <Link href="/dashboard" prefetch={true} className="block" onClick={onNavigate}>
          <AppLogo variant="sidebar" />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {navItems.map((item) => (
          <NavLink key={item.href} {...item} onClick={onNavigate} />
        ))}
      </nav>

      <div className="sticky bottom-0 z-10 shrink-0 space-y-2 border-t border-border bg-sidebar p-3">
        <div className="flex items-center justify-between gap-2 px-1">
          <span className="np-caps text-muted-foreground">Appearance</span>
          <ThemeToggle />
        </div>
        <form action={logoutAction}>
          <Button type="submit" variant="ghost" className="w-full justify-start">
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
  const [moreOpen, setMoreOpen] = useState(false);
  const navItems: NavItem[] = userName?.trim().toLowerCase() === "vedavrat"
    ? [
        ...baseNavItems.slice(0, 3),
        { href: "/assistant", label: "AI Assistant", icon: Sparkles },
        ...baseNavItems.slice(3),
      ]
    : baseNavItems;

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden h-dvh w-60 border-r border-border bg-sidebar md:block">
        <SidebarContent navItems={navItems} />
      </aside>

      <div className="flex min-h-screen min-w-0 flex-col md:ml-60">
        {/* Mobile navigation lives in the bottom bar; the header only carries brand and theme. */}
        <header className="sticky top-0 z-40 flex items-center gap-2 border-b border-border bg-background px-4 py-3 md:hidden">
          <div className="min-w-0 flex-1">
            <AppLogo variant="header" showTagline={false} />
            {userName ? (
              <p className="np-caps truncate text-muted-foreground">Hello, {userName}</p>
            ) : null}
          </div>

          <ThemeToggle />
        </header>

        <main className="flex-1 pb-24 md:pb-0">{children}</main>
        <InstallPrompt />
        <MobileBottomNav moreOpen={moreOpen} onMoreOpenChange={setMoreOpen} navItems={navItems} />
      </div>
    </div>
  );
}
