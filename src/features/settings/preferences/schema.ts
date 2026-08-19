import { z } from "zod";
import { useTranslations } from "next-intl";

export const LANGUAGES = ["en", "ar"] as const;
export const LANGUAGE_LABEL: Record<(typeof LANGUAGES)[number], string> = {
  en: "English",
  ar: "العربية",
};

export const THEMES = ["light", "dark", "system"] as const;
export function useThemeLabel(): Record<(typeof THEMES)[number], string> {
  const t = useTranslations("Settings");
  return {
    light: t("themeLight"),
    dark: t("themeDark"),
    system: t("themeSystem"),
  };
}

export function useWeekdays(): { value: string; label: string }[] {
  const t = useTranslations("Settings");
  return [
    { value: "0", label: t("weekdaySunday") },
    { value: "1", label: t("weekdayMonday") },
    { value: "2", label: t("weekdayTuesday") },
    { value: "3", label: t("weekdayWednesday") },
    { value: "4", label: t("weekdayThursday") },
    { value: "5", label: t("weekdayFriday") },
    { value: "6", label: t("weekdaySaturday") },
  ];
}

export const DATE_FORMATS = ["MMM d, yyyy", "d MMM yyyy", "yyyy-MM-dd", "MM/dd/yyyy"] as const;

export const updatePreferencesSchema = z.object({
  language: z.enum(LANGUAGES),
  theme: z.enum(THEMES),
  timezone: z.string().trim().min(1, { error: "Enter a timezone." }),
  dateFormat: z.string().trim().min(1),
  weekStartsOn: z.coerce.number().int().min(0).max(6),
  showHijriDates: z.preprocess((value) => value === "on" || value === "true", z.boolean()),
});
