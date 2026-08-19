import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient, getCachedUser } from "@/lib/supabase/server";
import { PreferencesForm } from "@/features/settings/preferences/components/preferences-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/app-shell/page-header";

export default async function PreferencesSettingsPage() {
  const supabase = await createClient();
  const user = await getCachedUser();
  if (!user) {
    redirect("/sign-in");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("language, theme, timezone, date_format, week_starts_on, show_hijri_dates")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/sign-in");
  }

  const t = await getTranslations("Settings");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("preferencesTitle")} />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("displayTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <PreferencesForm
            language={profile.language}
            theme={profile.theme}
            timezone={profile.timezone}
            dateFormat={profile.date_format}
            weekStartsOn={profile.week_starts_on}
            showHijriDates={profile.show_hijri_dates}
          />
        </CardContent>
      </Card>
    </div>
  );
}
