import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

// No path-based i18n routing (no /en, /ar prefixes) — language is a
// per-profile preference (profiles.language), not part of the URL. The
// NEXT_LOCALE cookie is next-intl's own documented mechanism for this case;
// it's set whenever Settings > Preferences saves a language choice (see
// features/settings/preferences/actions.ts) and defaults to 'en' the first
// time, before that cookie has ever been set.
export const SUPPORTED_LOCALES = ["en", "ar"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "ar";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;
  const locale = (SUPPORTED_LOCALES as readonly string[]).includes(cookieLocale ?? "")
    ? (cookieLocale as Locale)
    : DEFAULT_LOCALE;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
