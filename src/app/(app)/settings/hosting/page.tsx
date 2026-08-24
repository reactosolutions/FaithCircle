import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient, getCachedUser } from "@/lib/supabase/server";
import { listOwnBlackoutDates } from "@/features/settings/hosting/queries";
import { HostingForm } from "@/features/settings/hosting/components/hosting-form";
import { BlackoutDates } from "@/features/settings/hosting/components/blackout-dates";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/app-shell/page-header";

export default async function HostingSettingsPage() {
  const supabase = await createClient();
  const user = await getCachedUser();
  if (!user) {
    redirect("/sign-in");
  }

  // Independent of each other (blackout dates are scoped to the signed-in
  // user internally, not to `profile`) — one parallel round trip instead
  // of two sequential ones.
  const [{ data: profile }, blackoutDates, t] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    listOwnBlackoutDates(),
    getTranslations("Settings"),
  ]);
  if (!profile) {
    redirect("/sign-in");
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("hostingTitle")} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("availabilityTitle")}</CardTitle>
          <CardDescription>{t("availabilityDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <HostingForm profile={profile} />
        </CardContent>
      </Card>

      {profile.can_host && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("blackoutTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <BlackoutDates ranges={blackoutDates} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
