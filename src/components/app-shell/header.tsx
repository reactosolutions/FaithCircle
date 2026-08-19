import { Suspense } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { NotificationBell, NotificationBellFallback } from "./notification-bell";
import { UserMenu } from "./user-menu";
import { LanguageSwitcher } from "@/features/i18n/components/language-switcher";
import type { Locale } from "@/i18n/request";
import type { UserRole } from "@/lib/database.types";

export async function AppHeader({ name, role }: { name: string; role: UserRole }) {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("Nav")]);
  const ROLE_LABEL: Record<UserRole, string> = {
    admin: t("roleAdmin"),
    administrative: t("roleAdministrative"),
    student: t("roleStudent"),
  };
  return (
    <header className="flex items-center justify-between border-b border-border px-6 py-4">
      <UserMenu name={name} roleLabel={ROLE_LABEL[role]} />
      <div className="flex items-center gap-1">
        <LanguageSwitcher locale={locale as Locale} />
        <Suspense fallback={<NotificationBellFallback label={t("notifications")} />}>
          <NotificationBell />
        </Suspense>
      </div>
    </header>
  );
}
