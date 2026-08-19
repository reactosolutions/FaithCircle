"use server";

import { refresh } from "next/cache";
import { createClient, getCachedUser } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/action-result";

export async function markNotificationRead(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const user = await getCachedUser();
  if (!user) {
    return { ok: false, error: "You need to sign in again." };
  }

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("profile_id", user.id);

  if (error) {
    return { ok: false, error: "Could not update that notification." };
  }

  refresh();
  return { ok: true };
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  const supabase = await createClient();
  const user = await getCachedUser();
  if (!user) {
    return { ok: false, error: "You need to sign in again." };
  }

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("profile_id", user.id)
    .is("read_at", null);

  if (error) {
    return { ok: false, error: "Could not update your notifications." };
  }

  refresh();
  return { ok: true };
}
