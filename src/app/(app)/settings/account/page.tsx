import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient, getCachedUser } from "@/lib/supabase/server";
import { AccountDetails } from "@/features/settings/account/components/account-details";
import { AccountForm } from "@/features/settings/account/components/account-form";
import { PasswordForm } from "@/features/settings/account/components/password-form";
import { SecuritySection } from "@/features/settings/account/components/security-section";
import { DangerZone } from "@/features/settings/account/components/danger-zone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/app-shell/page-header";

export default async function AccountSettingsPage() {
  const supabase = await createClient();
  const user = await getCachedUser();
  const t = await getTranslations("Settings");
  if (!user) {
    redirect("/sign-in");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone, role, status, created_at")
    .eq("id", user.id)
    .single();

  const hasPassword = user.identities?.some((identity) => identity.provider === "email") ?? false;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("accountTitle")} />

      <Card>
        <CardContent>
          <AccountDetails
            fullName={profile?.full_name ?? null}
            email={user.email ?? null}
            phone={profile?.phone ?? null}
            role={profile?.role ?? "student"}
            status={profile?.status ?? "active"}
            memberSince={profile?.created_at ?? user.created_at}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("editProfileTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <AccountForm fullName={profile?.full_name ?? null} phone={profile?.phone ?? null} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{hasPassword ? t("passwordTitle") : t("setPasswordTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <PasswordForm hasPassword={hasPassword} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("securityTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <SecuritySection />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-destructive">{t("dangerZoneTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <DangerZone />
        </CardContent>
      </Card>
    </div>
  );
}
