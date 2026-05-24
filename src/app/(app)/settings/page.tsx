import { getSession } from "@/lib/auth/session";
import { getUserProfile } from "@/lib/db/queries/finance";
import { ProfileForm } from "@/components/settings/profile-form";
import { ExportButton } from "@/components/finance/export-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScenarioModeler } from "@/components/finance/scenario-modeler";
import { getMonthlySnapshot } from "@/lib/db/queries/finance";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) return null;

  const [profile, snapshot] = await Promise.all([
    getUserProfile(session.userId),
    getMonthlySnapshot(session.userId),
  ]);

  if (!profile) return null;

  return (
    <div className="page-container space-y-8 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Settings</h1>
          <p className="mt-1 text-muted-foreground">
            Profile, assumptions, scenarios, and export
          </p>
        </div>
        <ExportButton />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Profile & assumptions</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm profile={profile} />
        </CardContent>
      </Card>

      <ScenarioModeler baseSurplus={snapshot.netSurplus} />
    </div>
  );
}
