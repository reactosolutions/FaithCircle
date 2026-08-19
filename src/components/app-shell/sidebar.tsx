"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";
import { navItemsForRole } from "./nav-items";
import logo from "@/images/logo.png";
import type { UserRole } from "@/lib/database.types";

export function AppSidebar({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const t = useTranslations("Nav");
  const tApp = useTranslations("App");
  const items = navItemsForRole(role);

  return (
    <aside className="hidden w-60 shrink-0 flex-col gap-1 border-e border-sidebar-border bg-sidebar px-4 py-8 md:flex">
      <span className="mb-6 flex items-center gap-2 px-2">
        <Image
          src={logo}
          alt=""
          className="size-8 shrink-0 rounded-full object-cover"
        />
        <span className="font-heading text-lg font-semibold text-sidebar-primary">
          {tApp("name")}
        </span>
      </span>
      <nav className="flex flex-col gap-1">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg border-s-4 border-transparent px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                active && "border-accent bg-sidebar-primary/10 font-semibold text-sidebar-primary",
              )}
            >
              <Icon name={item.icon} size={22} filled={active} />
              {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
