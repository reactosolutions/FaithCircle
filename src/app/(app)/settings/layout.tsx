import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getViewerProfile } from "@/features/members/queries";
import { Icon } from "@/components/ui/icon";
import { settingsSectionsForRole } from "@/features/settings/sections";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("Settings");
  const profile = await getViewerProfile();
  const role = profile?.role ?? "student";
  const sections = settingsSectionsForRole(role);

  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
      {/* Secondary sidebar: desktop only. Mobile gets the same list as
          content on /settings itself (see page.tsx) — one list, not two
          implementations to keep in sync. */}
      <nav className="hidden w-52 shrink-0 flex-col gap-1 md:flex">
        {sections.map((section) => (
          <Link
            key={section.slug}
            href={`/settings/${section.slug}`}
            className="flex min-h-11 items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted"
          >
            <Icon name={section.icon} size={20} className="text-muted-foreground" />
            {t(section.labelKey)}
          </Link>
        ))}
      </nav>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
