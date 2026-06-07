import { getSession } from "@/lib/auth/session";
import { getUserProfile, getMonthlySnapshot } from "@/lib/db/queries/finance";
import { ProfileForm } from "@/components/settings/profile-form";
import { ExportButton } from "@/components/finance/export-button";
import { TaxEstimator } from "@/components/finance/tax-estimator";
import { ScenarioModeler } from "@/components/finance/scenario-modeler";
import { PageShell, PageHeader, PageSection } from "@/components/layout/page-chrome";
import { Card, CardContent } from "@/components/ui/card";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) return null;

  const [profile, snapshot] = await Promise.all([
    getUserProfile(session.userId),
    getMonthlySnapshot(session.userId),
  ]);

  if (!profile) return null;

  return (
    <PageShell>
      <PageHeader
        title="Settings"
        description="Profile, tax assumptions, what-if scenarios, and data export."
      >
        <ExportButton />
      </PageHeader>

      <PageSection title="Tax estimate" description="Based on your in-hand salary and chosen regime">
        <TaxEstimator
          defaultSalary={profile.annualInHandSalary || profile.monthlyTakeHome * 12}
          defaultBonus={profile.annualInHandBonus}
          defaultRegime={profile.taxRegime}
          bonusSpreadMonthly={profile.bonusSpreadMonthly}
        />
      </PageSection>

      <PageSection title="Profile & assumptions">
        <Card>
          <CardContent className="pt-6">
            <ProfileForm profile={profile} />
          </CardContent>
        </Card>
      </PageSection>

      <PageSection
        title="What-if scenarios"
        description="See how changes to income or expenses affect surplus"
      >
        <ScenarioModeler baseSurplus={snapshot.netSurplus} />
      </PageSection>
    </PageShell>
  );
}
