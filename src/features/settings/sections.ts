import type { UserRole } from "@/lib/database.types";

export interface SettingsSection {
  slug: string;
  labelKey: string;
  descriptionKey: string;
  // Material Symbols ligature name (see src/components/ui/icon.tsx).
  icon: string;
  roles?: UserRole[];
}

export const SETTINGS_SECTIONS: SettingsSection[] = [
  { slug: "account", labelKey: "sectionAccountLabel", descriptionKey: "sectionAccountDescription", icon: "person" },
  { slug: "hosting", labelKey: "sectionHostingLabel", descriptionKey: "sectionHostingDescription", icon: "home" },
  {
    slug: "notifications",
    labelKey: "sectionNotificationsLabel",
    descriptionKey: "sectionNotificationsDescription",
    icon: "notifications",
  },
  { slug: "preferences", labelKey: "sectionPreferencesLabel", descriptionKey: "sectionPreferencesDescription", icon: "tune" },
  { slug: "privacy", labelKey: "sectionPrivacyLabel", descriptionKey: "sectionPrivacyDescription", icon: "lock" },
  {
    slug: "circle",
    labelKey: "sectionCircleLabel",
    descriptionKey: "sectionCircleDescription",
    icon: "shield",
    roles: ["admin", "administrative"],
  },
  {
    slug: "organization",
    labelKey: "sectionOrganizationLabel",
    descriptionKey: "sectionOrganizationDescription",
    icon: "apartment",
    roles: ["admin"],
  },
];

export function settingsSectionsForRole(role: UserRole) {
  return SETTINGS_SECTIONS.filter((section) => !section.roles || section.roles.includes(role));
}
