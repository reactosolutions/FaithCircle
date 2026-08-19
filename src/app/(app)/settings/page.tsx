import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient, getCachedUser } from "@/lib/supabase/server";
import { Icon } from "@/components/ui/icon";
import { settingsSectionsForRole } from "@/features/settings/sections";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/app-shell/page-header";

export default async function SettingsIndexPage() {
  const supabase = await createClient();
  const user = await getCachedUser();
  const t = await getTranslations("Settings");
  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null };
  const role = profile?.role ?? "student";
  const sections = settingsSectionsForRole(role);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} />
      <Card>
        <CardContent className="flex flex-col divide-y divide-border p-0">
          {sections.map((section) => (
            <Link
              key={section.slug}
              href={`/settings/${section.slug}`}
              className="flex min-h-11 items-center justify-between gap-3 px-6 py-4 hover:bg-muted/50"
            >
              <span className="flex items-center gap-3">
                <Icon name={section.icon} size={20} className="text-muted-foreground" />
                <span className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">{t(section.labelKey)}</span>
                  <span className="text-xs text-muted-foreground">{t(section.descriptionKey)}</span>
                </span>
              </span>
              <Icon name="chevron_right" size={20} className="shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
