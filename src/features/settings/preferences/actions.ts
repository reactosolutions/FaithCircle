"use server";

import { refresh } from "next/cache";
import { cookies } from "next/headers";
import { createClient, getCachedUser } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/action-result";
import { updatePreferencesSchema } from "./schema";

export async function updatePreferences(
  _prevState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = updatePreferencesSchema.safeParse({
    language: formData.get("language"),
    theme: formData.get("theme"),
    timezone: formData.get("timezone"),
    dateFormat: formData.get("dateFormat"),
    weekStartsOn: formData.get("weekStartsOn"),
    showHijriDates: formData.get("showHijriDates"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const user = await getCachedUser();
  if (!user) {
    return { ok: false, error: "You need to sign in again." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      language: parsed.data.language,
      theme: parsed.data.theme,
      timezone: parsed.data.timezone,
      date_format: parsed.data.dateFormat,
      week_starts_on: parsed.data.weekStartsOn,
      show_hijri_dates: parsed.data.showHijriDates,
    })
    .eq("id", user.id);

  if (error) {
    return { ok: false, error: "Could not save your preferences." };
  }

  // next-intl (no path-based routing here) reads locale from this cookie —
  // see src/i18n/request.ts. Keeps the UI language in sync with the
  // preference that just got saved, without a page reload doing it for us.
  const cookieStore = await cookies();
  cookieStore.set("NEXT_LOCALE", parsed.data.language, { path: "/", maxAge: 60 * 60 * 24 * 365 });

  refresh();
  return { ok: true };
}
