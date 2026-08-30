"use server";

import { refresh } from "next/cache";
import { createClient, getCachedUser } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/permissions";
import { notifyUsers } from "@/lib/notifications";
import type { ActionResult } from "@/lib/action-result";
import { responseFromStatus } from "./mapping";
import { recordOwnAttendanceSchema, saveAttendanceSchema } from "./schema";

export async function saveAttendance(input: unknown): Promise<ActionResult> {
  const parsed = saveAttendanceSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  // attendance.record's scope is circle-relative, so the event's circle_id
  // has to be resolved before requirePermission() can evaluate it — this
  // uses the plain (unauthenticated-for-permission-purposes) client just to
  // look that up; the real gate is the requirePermission() call right after.
  const lookupClient = await createClient();
  const { data: event } = await lookupClient
    .from("events")
    .select("circle_id")
    .eq("id", parsed.data.eventId)
    .single();
  if (!event) {
    return { ok: false, error: "That meeting no longer exists." };
  }

  const actor = await requirePermission("attendance.record", { circleId: event.circle_id });
  if (!actor.ok) return actor;

  // RSVP and attendance are one record — this writes event_rsvps directly
  // (present -> going, absent/excused -> not_going + reason). No date lock:
  // the merged record is editable any time, last write wins.
  const now = new Date().toISOString();
  const rows = parsed.data.entries.map((entry) => {
    const { response, reasonCategory } = responseFromStatus(entry.status);
    return {
      event_id: parsed.data.eventId,
      profile_id: entry.profileId,
      response,
      reason_category: reasonCategory,
      // Cleared explicitly so a stale free-text reason from an earlier
      // "can't make it" RSVP doesn't make statusFromResponse read "absent"
      // back as "excused".
      reason: null,
      note: entry.note ?? null,
      // How they ACTUALLY attended — the caller decides whether to keep the
      // expected mode or override it; not auto-copied from anything.
      attend_mode: entry.mode ?? null,
      marked_by: actor.userId,
      responded_at: now,
    };
  });

  const { error } = await actor.supabase
    .from("event_rsvps")
    .upsert(rows, { onConflict: "event_id,profile_id" });

  if (error) {
    return { ok: false, error: "Could not save attendance." };
  }

  const { data: eventTitleRow } = await actor.supabase
    .from("events")
    .select("title")
    .eq("id", parsed.data.eventId)
    .single();
  await notifyUsers(
    parsed.data.entries.map((entry) => entry.profileId),
    "attendance_recorded",
    { eventId: parsed.data.eventId, eventTitle: eventTitleRow?.title ?? "a meeting" },
  );

  refresh();
  return { ok: true };
}

// Self-check-in: a student (or anyone) marking their OWN attendance, not a
// leader taking attendance for the room. attendance.record's 'own' scope
// (see CLAUDE.md's Permissions section) only ever lets this touch the
// caller's own row — RLS's attendance_write policy independently enforces
// the same own-row-only, event-membership-required rule, so this can't be
// bypassed even if the check here were ever removed.
export async function recordOwnAttendance(input: unknown): Promise<ActionResult> {
  const parsed = recordOwnAttendanceSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const user = await getCachedUser();
  if (!user) {
    return { ok: false, error: "You need to sign in again." };
  }

  const actor = await requirePermission("attendance.record", { profileId: user.id });
  if (!actor.ok) return actor;

  const { data: event } = await actor.supabase
    .from("events")
    .select("title, circle_id")
    .eq("id", parsed.data.eventId)
    .single();
  if (!event) {
    return { ok: false, error: "That meeting no longer exists." };
  }

  // Writes the one participation record (event_rsvps). No date lock — the
  // merged record is editable any time; last write wins.
  const { response, reasonCategory } = responseFromStatus(parsed.data.status);
  const { error } = await actor.supabase.from("event_rsvps").upsert(
    {
      event_id: parsed.data.eventId,
      profile_id: user.id,
      response,
      reason_category: reasonCategory,
      reason: null,
      attend_mode: parsed.data.mode ?? null,
      marked_by: user.id,
      responded_at: new Date().toISOString(),
    },
    { onConflict: "event_id,profile_id" },
  );

  if (error) {
    return { ok: false, error: "Could not save your attendance." };
  }

  // Let the circle's leaders know a student self-checked in — the same
  // notification type saveAttendance already sends the other direction
  // (leader marks a student's attendance), just reversed.
  if (event.circle_id) {
    const { data: circleLeaderRows } = await actor.supabase
      .from("circle_leaders")
      .select("profile_id")
      .eq("circle_id", event.circle_id);
    await notifyUsers(
      (circleLeaderRows ?? []).map((row) => row.profile_id),
      "attendance_recorded",
      { eventId: parsed.data.eventId, eventTitle: event.title },
      user.id,
    );
  }

  refresh();
  return { ok: true };
}
