import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getUserProfile } from "@/lib/db/queries/finance";
import { AppShell } from "@/components/layout/app-shell";
import { LedgerProvider } from "@/components/ledger/ledger-provider";
import { getPaymentAccounts } from "@/lib/db/queries/ledger";
import { Skeleton } from "@/components/ui/skeleton";

async function AppLayoutContent({ children }: { children: React.ReactNode }) {
  await connection();
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const [profile, accounts] = await Promise.all([
    getUserProfile(session.userId),
    getPaymentAccounts(session.userId),
  ]);

  return (
    <LedgerProvider accounts={accounts}>
      <AppShell userName={profile?.name}>{children}</AppShell>
    </LedgerProvider>
  );
}

function AppLayoutFallback() {
  return (
    <div className="flex min-h-screen">
      <Skeleton className="hidden w-60 md:block" />
      <div className="flex-1 p-8">
        <Skeleton className="h-48 w-full" />
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<AppLayoutFallback />}>
      <AppLayoutContent>{children}</AppLayoutContent>
    </Suspense>
  );
}
