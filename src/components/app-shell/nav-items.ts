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
  // Available to every role — admin gets the org-wide management view,
  // everyone else a read-only "my circles" view (see circles/page.tsx).
  // Not `primary`: the bottom tab bar's 5-slot budget (Home/Calendar/
  // Homework/Attendance/More per CLAUDE.md) is already full for
  // admin/administrative once Attendance is in it, so this lives under
  // "More" for everyone rather than only for some roles.
  { href: "/circles", labelKey: "circles", icon: "group_work" },
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
