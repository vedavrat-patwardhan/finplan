import { getSession } from "@/lib/auth/session";
import { getUserProfile, getMonthlySnapshot } from "@/lib/db/queries/finance";
import { PersonalProfileForm } from "@/components/settings/personal-profile-form";
import { HouseholdForm } from "@/components/settings/household-form";
import { ProfileForm } from "@/components/settings/profile-form";
import { AccountSecurity } from "@/components/settings/account-security";
import { SettingsFooter } from "@/components/settings/settings-footer";
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
    <PageShell className="pb-4">
      <PageHeader
        title="Settings"
        description="Account, tax assumptions, what-if scenarios, and data export."
      >
        <ExportButton />
      </PageHeader>

      <PageSection
        title="Profile"
        description="Personal details from onboarding — name and in-hand income"
      >
        <Card>
          <CardContent className="pt-6">
            <PersonalProfileForm
              profile={{
                name: profile.name,
                username: profile.username,
                annualInHandSalary: profile.annualInHandSalary,
                annualInHandBonus: profile.annualInHandBonus,
                taxRegime: profile.taxRegime,
              }}
            />
          </CardContent>
        </Card>
      </PageSection>

      <PageSection
        title="Household"
        description="Plan together with a partner — combined income and expenses in one account"
      >
        <Card>
          <CardContent className="pt-6">
            <HouseholdForm
              household={{
                householdEnabled: profile.householdEnabled,
                spouseName: profile.spouseName,
                spouseAnnualInHandSalary: profile.spouseAnnualInHandSalary,
                spouseAnnualInHandBonus: profile.spouseAnnualInHandBonus,
                spouseTaxRegime: profile.spouseTaxRegime,
              }}
            />
          </CardContent>
        </Card>
      </PageSection>

      <PageSection title="Account" description="Sign-in email and password">
        <AccountSecurity email={profile.email} />
      </PageSection>

      <PageSection title="Tax estimate" description="Based on your in-hand salary and chosen regime">
        <TaxEstimator
          defaultMonthlySalary={
            profile.monthlyTakeHome ||
            (profile.annualInHandSalary > 0 ? profile.annualInHandSalary / 12 : 0)
          }
          defaultBonus={profile.annualInHandBonus}
          defaultRegime={profile.taxRegime}
          bonusSpreadMonthly={profile.bonusSpreadMonthly}
        />
      </PageSection>

      <PageSection
        title="Planning assumptions"
        description="Inflation, retirement, and display preferences for projections"
      >
        <Card>
          <CardContent className="pt-6">
            <ProfileForm
              profile={{
                inflationRate: profile.inflationRate,
                bonusSpreadMonthly: profile.bonusSpreadMonthly,
                retirementMultiplier: profile.retirementMultiplier,
                useCompactNumbers: profile.useCompactNumbers,
              }}
            />
          </CardContent>
        </Card>
      </PageSection>

      <PageSection
        title="What-if scenarios"
        description="See how changes to income or expenses affect surplus"
      >
        <ScenarioModeler baseSurplus={snapshot.netSurplus} />
      </PageSection>

      <SettingsFooter />
    </PageShell>
  );
}
