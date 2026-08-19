"use server";

import { cookies } from "next/headers";
import { refresh } from "next/cache";
import { createClient, getCachedUser } from "@/lib/supabase/server";
import { SUPPORTED_LOCALES, type Locale } from "@/i18n/request";

// Works both pre-auth (sign-in/signup, no profile row yet) and post-auth —
// the cookie is next-intl's sole source of truth for locale (see
// src/i18n/request.ts), so it's always set. profiles.language is also kept
// in sync when a session exists, purely so the stored preference (shown in
// Settings > Preferences) doesn't silently drift from what's actually
// rendering.
export async function setLocale(locale: Locale): Promise<void> {
  if (!SUPPORTED_LOCALES.includes(locale)) return;

  const cookieStore = await cookies();
  cookieStore.set("NEXT_LOCALE", locale, { path: "/", maxAge: 60 * 60 * 24 * 365 });

  const user = await getCachedUser();
  if (user) {
    const supabase = await createClient();
    await supabase.from("profiles").update({ language: locale }).eq("id", user.id);
  }

  refresh();
}
