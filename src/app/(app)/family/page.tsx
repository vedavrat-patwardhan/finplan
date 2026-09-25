import { getSession } from "@/lib/auth/session";
import { getFamilyForUser } from "@/lib/db/queries/family";
import { FamilySetup } from "@/components/family/family-setup";
import { PageHeader, PageShell } from "@/components/layout/page-chrome";

export default async function FamilyPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const [family, params] = await Promise.all([getFamilyForUser(session.userId), searchParams]);
  const inviteCode = typeof params.invite === "string" && /^[A-Za-z0-9_-]{16}$/.test(params.invite)
    ? params.invite : undefined;

  return (
    <PageShell>
      <PageHeader
        title="Family"
        description="Plan together without merging accounts or transaction histories."
      />
      <FamilySetup family={family} inviteCode={inviteCode} />
    </PageShell>
  );
}
