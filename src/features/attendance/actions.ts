"use server";

import { refresh } from "next/cache";
import { createClient, getCachedUser } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/permissions";
import { notifyUsers } from "@/lib/notifications";
import { isAttendanceOpen } from "@/features/events/format";
import type { ActionResult } from "@/lib/action-result";
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
    .select("circle_id, starts_at")
    .eq("id", parsed.data.eventId)
    .single();
  if (!event) {
    return { ok: false, error: "That meeting no longer exists." };
  }

  const actor = await requirePermission("attendance.record", { circleId: event.circle_id });
  if (!actor.ok) return actor;

  // No future-dated attendance — see isAttendanceOpen's own comment. Checked
  // here (not just hidden in the UI) since this is the actual write path.
  if (!isAttendanceOpen(event.starts_at)) {
    return { ok: false, error: "Attendance can't be recorded before the day of the meeting." };
  }

  const rows = parsed.data.entries.map((entry) => ({
    event_id: parsed.data.eventId,
    profile_id: entry.profileId,
    status: entry.status,
    note: entry.note ?? null,
    // How they ACTUALLY attended — never copied in from the RSVP's
    // attend_mode by this action; the caller decides whether to keep the
    // expected mode or override it.
    mode: entry.mode ?? null,
    marked_by: actor.userId,
    marked_at: new Date().toISOString(),
  }));

  const { error } = await actor.supabase
    .from("attendance")
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
    .select("title, circle_id, starts_at")
    .eq("id", parsed.data.eventId)
    .single();
  if (!event) {
    return { ok: false, error: "That meeting no longer exists." };
  }

  // No future-dated attendance — see isAttendanceOpen's own comment. Checked
  // here (not just hidden in the UI) since this is the actual write path.
  if (!isAttendanceOpen(event.starts_at)) {
    return { ok: false, error: "You can mark your attendance starting the day of the meeting." };
  }

  const { error } = await actor.supabase.from("attendance").upsert(
    {
      event_id: parsed.data.eventId,
      profile_id: user.id,
      status: parsed.data.status,
      mode: parsed.data.mode ?? null,
      marked_by: user.id,
      marked_at: new Date().toISOString(),
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
