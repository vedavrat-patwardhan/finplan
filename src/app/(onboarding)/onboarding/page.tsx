import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getUserProfile } from "@/lib/db/queries/finance";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ revisit?: string }>;
}) {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");

  const params = await searchParams;
  const revisit = params.revisit === "1";
  const profile = await getUserProfile(session.userId);

  if (profile?.onboardingCompleted && !revisit) {
    redirect("/dashboard");
  }

  return (
    <OnboardingWizard
      initialName={profile?.name ?? ""}
      revisit={revisit}
    />
  );
}
