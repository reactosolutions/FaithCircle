import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient, getCachedUser } from "@/lib/supabase/server";
import { NotificationsForm } from "@/features/settings/notifications/components/notifications-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/app-shell/page-header";

export default async function NotificationsSettingsPage() {
  const supabase = await createClient();
  const user = await getCachedUser();
  if (!user) {
    redirect("/sign-in");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("notification_prefs, reminder_lead_time, quiet_hours_start, quiet_hours_end")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/sign-in");
  }

  const t = await getTranslations("Settings");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("notificationsTitle")} />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("preferencesCardTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <NotificationsForm
            prefs={profile.notification_prefs}
            reminderLeadTime={profile.reminder_lead_time}
            quietHoursStart={profile.quiet_hours_start}
            quietHoursEnd={profile.quiet_hours_end}
          />
        </CardContent>
      </Card>
    </div>
  );
}
