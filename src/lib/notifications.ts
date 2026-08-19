import { createAdminClient } from "@/lib/supabase/admin";
import type { NotificationPrefs } from "@/lib/database.types";

type NotificationType = keyof NotificationPrefs;

// Server-side only — called from Server Actions after a write succeeds, not
// exposed as a Server Action itself. Uses the admin client because RLS only
// allows admins to insert notification rows directly (schema.sql's
// notifications_insert_admin policy exists for that direct-client case);
// this is the "trusted server-side code" its own comment anticipates.
// Respects each recipient's Settings > Notifications in-app toggle for the
// given type — never bypasses it.
export async function notifyUsers(
  profileIds: string[],
  type: NotificationType,
  payload: Record<string, unknown>,
  excludeProfileId?: string,
) {
  const targets = Array.from(new Set(profileIds)).filter((id) => id !== excludeProfileId);
  if (targets.length === 0) return;

  const admin = createAdminClient();
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, notification_prefs")
    .in("id", targets);

  const rows = (profiles ?? [])
    .filter((profile) => profile.notification_prefs?.[type]?.in_app)
    .map((profile) => ({
      profile_id: profile.id,
      type,
      payload,
    }));

  if (rows.length === 0) return;
  await admin.from("notifications").insert(rows);
}
