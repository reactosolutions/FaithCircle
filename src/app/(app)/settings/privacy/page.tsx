import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient, getCachedUser } from "@/lib/supabase/server";
import { PrivacyForm } from "@/features/settings/privacy/components/privacy-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/app-shell/page-header";

export default async function PrivacySettingsPage() {
  const supabase = await createClient();
  const user = await getCachedUser();
  if (!user) {
    redirect("/sign-in");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("phone_visibility, hide_address_until_rsvp")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/sign-in");
  }

  const t = await getTranslations("Settings");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("privacyTitle")} />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("whoCanSeeDetailsTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <PrivacyForm
            phoneVisibility={profile.phone_visibility}
            hideAddressUntilRsvp={profile.hide_address_until_rsvp}
          />
        </CardContent>
      </Card>
    </div>
  );
}
