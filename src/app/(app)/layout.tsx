import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getSession } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/app-shell";
import { LedgerProvider } from "@/components/ledger/ledger-provider";
import { getPaymentAccounts } from "@/lib/db/queries/ledger";
import { Skeleton } from "@/components/ui/skeleton";
import { PageLoadingSkeleton } from "@/components/layout/page-loading-skeleton";

async function LedgerShell({
  userId,
  children,
}: {
  userId: string;
  children: React.ReactNode;
}) {
  const accounts = await getPaymentAccounts(userId);
  return <LedgerProvider accounts={accounts}>{children}</LedgerProvider>;
}

async function AppLayoutContent({ children }: { children: React.ReactNode }) {
  await connection();
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <Suspense fallback={<AppLayoutFallback />}>
      <LedgerShell userId={session.userId}>
        <AppShell userName={session.username}>
          <Suspense fallback={<PageLoadingSkeleton />}>{children}</Suspense>
        </AppShell>
      </LedgerShell>
    </Suspense>
  );
}

function AppLayoutFallback() {
  return (
    <div className="flex min-h-screen">
      <Skeleton className="hidden w-60 md:block" />
      <div className="flex-1">
        <PageLoadingSkeleton />
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
