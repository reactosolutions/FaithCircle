import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient, getCachedUser } from "@/lib/supabase/server";
import { Icon } from "@/components/ui/icon";
import { secondaryNavItemsForRole } from "@/components/app-shell/nav-items";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/app-shell/page-header";

export default async function MorePage() {
  const supabase = await createClient();
  const user = await getCachedUser();
  const t = await getTranslations("Nav");
  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null };
  const role = profile?.role ?? "student";
  const items = secondaryNavItemsForRole(role);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("more")} />
      <Card>
        <CardContent className="flex flex-col divide-y divide-border p-0">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-h-11 items-center justify-between gap-3 px-6 py-4 hover:bg-muted/50"
            >
              <span className="flex items-center gap-3 text-sm font-medium text-foreground">
                <Icon name={item.icon} size={20} className="text-muted-foreground" />
                {t(item.labelKey)}
              </span>
              <Icon name="chevron_right" size={20} className="text-muted-foreground" />
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
