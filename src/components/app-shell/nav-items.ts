import type { UserRole } from "@/lib/database.types";

export interface NavItem {
  href: string;
  // Translation key under the "Nav" namespace (messages/{locale}.json).
  labelKey: string;
  // Shorter label key for the bottom tab bar; falls back to `labelKey` when absent.
  mobileLabelKey?: string;
  // Material Symbols ligature name (see src/components/ui/icon.tsx).
  icon: string;
  roles?: UserRole[];
  // Gets its own slot in the mobile bottom tab bar; everything else lives
  // under the "More" tab.
  primary?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", labelKey: "dashboard", mobileLabelKey: "home", icon: "home", primary: true },
  { href: "/events", labelKey: "events", mobileLabelKey: "calendar", icon: "calendar_month", primary: true },
  { href: "/homework", labelKey: "homework", icon: "menu_book", primary: true },
  {
    href: "/attendance",
    labelKey: "attendance",
    icon: "person_check",
    roles: ["admin", "administrative"],
    primary: true,
  },
  { href: "/circles", labelKey: "circles", icon: "group_work", roles: ["admin"], primary: true },
  { href: "/members", labelKey: "members", icon: "group" },
  { href: "/settings", labelKey: "settings", icon: "settings" },
];

export function navItemsForRole(role: UserRole) {
  return NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));
}

export function primaryNavItemsForRole(role: UserRole) {
  return navItemsForRole(role).filter((item) => item.primary);
}

export function secondaryNavItemsForRole(role: UserRole) {
  return navItemsForRole(role).filter((item) => !item.primary);
}
