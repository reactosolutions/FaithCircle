"use server";

import { refresh } from "next/cache";
import { createClient, getCachedUser } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/action-result";
import type { NotificationPrefs } from "@/lib/database.types";
import { NOTIFICATION_TYPES, updateNotificationsSchema } from "./schema";

export async function updateNotifications(
  _prevState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = updateNotificationsSchema.safeParse({
    notificationPrefs: formData.get("notificationPrefs"),
    reminderLeadTime: formData.get("reminderLeadTime"),
    quietHoursStart: formData.get("quietHoursStart"),
    quietHoursEnd: formData.get("quietHoursEnd"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const user = await getCachedUser();
  if (!user) {
    return { ok: false, error: "You need to sign in again." };
  }

  // The schema already validated that every NOTIFICATION_TYPES key is
  // present with the right shape (see schema.ts) — this just re-assembles
  // that into the exact named-keys type TS wants, since a validated
  // Record<string, ...> isn't structurally the same as the named interface.
  const notificationPrefs = Object.fromEntries(
    NOTIFICATION_TYPES.map((type) => [type, parsed.data.notificationPrefs[type]]),
  ) as unknown as NotificationPrefs;

  const { error } = await supabase
    .from("profiles")
    .update({
      notification_prefs: notificationPrefs,
      reminder_lead_time: parsed.data.reminderLeadTime,
      quiet_hours_start: parsed.data.quietHoursStart ?? null,
      quiet_hours_end: parsed.data.quietHoursEnd ?? null,
    })
    .eq("id", user.id);

  if (error) {
    return { ok: false, error: "Could not save your notification settings." };
  }

  refresh();
  return { ok: true };
}
