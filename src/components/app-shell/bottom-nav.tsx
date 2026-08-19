"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";
import { primaryNavItemsForRole, secondaryNavItemsForRole } from "./nav-items";
import type { UserRole } from "@/lib/database.types";

export function BottomNav({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const t = useTranslations("Nav");
  const primaryItems = primaryNavItemsForRole(role);
  const hasMore = secondaryNavItemsForRole(role).length > 0;

  return (
    <nav
      aria-label={t("primaryAriaLabel")}
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-sidebar-border bg-sidebar pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {primaryItems.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium",
              active ? "text-sidebar-primary" : "text-sidebar-foreground/70",
            )}
          >
            <Icon name={item.icon} size={22} filled={active} />
            {t(item.mobileLabelKey ?? item.labelKey)}
          </Link>
        );
      })}
      {hasMore && (
        <Link
          href="/more"
          className={cn(
            "flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium",
            pathname === "/more" ? "text-sidebar-primary" : "text-sidebar-foreground/70",
          )}
        >
          <Icon name="more_horiz" size={22} filled={pathname === "/more"} />
          {t("more")}
        </Link>
      )}
    </nav>
  );
}
