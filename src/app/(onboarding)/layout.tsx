import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getUserProfile } from "@/lib/db/queries/finance";
import { Skeleton } from "@/components/ui/skeleton";

async function OnboardingLayoutContent({ children }: { children: React.ReactNode }) {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");

  const profile = await getUserProfile(session.userId);
  if (profile?.onboardingCompleted) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-4">
        <p className="font-heading text-center text-xl font-semibold">FinPlan setup</p>
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
