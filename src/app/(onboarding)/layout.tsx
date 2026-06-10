import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getSession } from "@/lib/auth/session";
import { Skeleton } from "@/components/ui/skeleton";
import { AppLogo } from "@/components/brand/app-logo";

async function OnboardingLayoutContent({ children }: { children: React.ReactNode }) {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-4">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-0.5">
          <AppLogo variant="header" showTagline={false} />
          <p className="text-xs text-muted-foreground">Setup your financial plan</p>
        </div>
      </header>
      {children}
    </div>
  );
}

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<Skeleton className="mx-auto mt-20 h-64 w-full max-w-2xl" />}>
      <OnboardingLayoutContent>{children}</OnboardingLayoutContent>
    </Suspense>
  );
}
