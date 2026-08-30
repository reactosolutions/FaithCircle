"use server";

import { addMonths, addWeeks } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, getCachedUser } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/permissions";
import { notifyUsers } from "@/lib/notifications";
import type { ActionResult } from "@/lib/action-result";
import type { AttendMode, EventFormat, EventRecurrence } from "@/lib/database.types";
import { CIRCLE_TIME_ZONE } from "./format";
import { createEventSchema, editEventSchema, eventHostSelfSchema, rsvpSchema } from "./schema";

// claim_event_host() / release_event_host() raise these exact strings for
// the cases a member can actually hit; anything else is an unexpected
// Postgres error and gets a generic message (never surfaced raw, per
// CLAUDE.md).
const HOST_RPC_MESSAGES = new Set([
  "Not signed in.",
  "That meeting no longer exists.",
  "An online meeting has no host.",
  "You are not on this meeting's guest list.",
  "You are not the host of this meeting.",
]);

function hostRpcError(message: string | undefined): string {
  return message && HOST_RPC_MESSAGES.has(message)
    ? message
    : "Could not update the host. Please try again.";
}

function nextOccurrenceStarts(startsAt: Date, recurrence: EventRecurrence, count: number) {
  const step = (date: Date) => {
    switch (recurrence) {
      case "weekly":
        return addWeeks(date, 1);
      case "biweekly":
        return addWeeks(date, 2);
      case "monthly":
        return addMonths(date, 1);
      default:
        return date;
    }
  };

  const dates: Date[] = [];
  let current = startsAt;
  for (let i = 0; i < count; i++) {
    current = step(current);
    dates.push(current);
  }
  return dates;
}

export async function createEvent(
  _prevState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = createEventSchema.safeParse({
    circleId: formData.get("circleId"),
    title: formData.get("title"),
    description: formData.get("description"),
    startsAt: formData.get("startsAt"),
    durationMinutes: formData.get("durationMinutes"),
    recurrence: formData.get("recurrence"),
    format: formData.get("format"),
    hostId: formData.get("hostId"),
    address: formData.get("address"),
    inPersonCapacity: formData.get("inPersonCapacity"),
    meetUrl: formData.get("meetUrl"),
    meetProvider: formData.get("meetProvider"),
    meetNotes: formData.get("meetNotes"),
    audience: formData.get("audience"),
    extraCircleIds: formData.get("extraCircleIds"),
    inviteeIds: formData.get("inviteeIds"),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const actor = await requirePermission("events.create", { circleId: parsed.data.circleId });
  if (!actor.ok) return actor;

  // The form's datetime-local input is timezone-naive; treat it as wall-clock
  // time at the circle's meeting location (Asia/Riyadh), not the server's or
  // the leader's browser timezone — those meetings happen at a fixed place.
  const startsAt = fromZonedTime(parsed.data.startsAt, CIRCLE_TIME_ZONE);
  if (Number.isNaN(startsAt.getTime())) {
    return { ok: false, error: "That date and time isn't valid." };
  }
  const durationMs = parsed.data.durationMinutes * 60_000;
  const endsAt = new Date(startsAt.getTime() + durationMs);

  const basePayload = {
    circle_id: parsed.data.circleId,
    // The organizer of record — drives events.edit's 'own' scope, so a
    // student who scheduled this can keep managing it (and only it).
    created_by: actor.userId,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    recurrence: parsed.data.recurrence,
    format: parsed.data.format,
    host_id: parsed.data.format === "online" ? null : (parsed.data.hostId ?? null),
    address: parsed.data.format === "online" ? null : (parsed.data.address ?? null),
    in_person_capacity: parsed.data.format === "online" ? null : (parsed.data.inPersonCapacity ?? null),
    meet_url: parsed.data.format === "in_person" ? null : (parsed.data.meetUrl ?? null),
    meet_provider: parsed.data.format === "in_person" ? null : (parsed.data.meetProvider ?? null),
    meet_notes: parsed.data.format === "in_person" ? null : (parsed.data.meetNotes ?? null),
    audience: parsed.data.audience,
  };

  const { data: created, error } = await actor.supabase
    .from("events")
    .insert({
      ...basePayload,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
    })
    .select("id")
    .single();

  if (error || !created) {
    return { ok: false, error: "Could not create the event." };
  }

  const eventIds = [created.id];

  if (parsed.data.recurrence !== "none") {
    const occurrences = nextOccurrenceStarts(startsAt, parsed.data.recurrence, 7);
    const rows = occurrences.map((date) => ({
      ...basePayload,
      starts_at: date.toISOString(),
      ends_at: new Date(date.getTime() + durationMs).toISOString(),
      parent_event_id: created.id,
    }));

    const { data: seriesCreated, error: seriesError } = await actor.supabase
      .from("events")
      .insert(rows)
      .select("id");
    if (seriesError) {
      return { ok: false, error: "Event created, but future occurrences could not be scheduled." };
    }
    eventIds.push(...(seriesCreated ?? []).map((row) => row.id));
  }

  // Every occurrence gets the same owning-circle event_circles row (kept in
  // sync with events.circle_id so audience queries don't special-case it)
  // plus whatever extra circles/individuals this meeting was opened to.
  const circleInviteRows = eventIds.flatMap((eventId) => [
    { event_id: eventId, circle_id: parsed.data.circleId },
    ...parsed.data.extraCircleIds.map((circleId) => ({ event_id: eventId, circle_id: circleId })),
  ]);
  if (circleInviteRows.length > 0) {
    const { error: circleInviteError } = await actor.supabase
      .from("event_circles")
      .upsert(circleInviteRows, { onConflict: "event_id,circle_id" });
    if (circleInviteError) {
      return { ok: false, error: "Event created, but its invited circles could not be saved." };
    }
  }

  if (parsed.data.inviteeIds.length > 0) {
    const inviteeRows = eventIds.flatMap((eventId) =>
      parsed.data.inviteeIds.map((profileId) => ({
        event_id: eventId,
        profile_id: profileId,
        added_by: actor.userId,
      })),
    );
    const { error: inviteeError } = await actor.supabase
      .from("event_invitees")
      .upsert(inviteeRows, { onConflict: "event_id,profile_id" });
    if (inviteeError) {
      return { ok: false, error: "Event created, but its invitees could not be saved." };
    }
  }

  // In-app notifications for the first occurrence only — a 7-occurrence
  // recurring series would otherwise fire 7 separate "new meeting" alerts
  // for what a member experiences as one scheduling action.
  const { data: memberRows } = await actor.supabase
    .from("circle_members")
    .select("profile_id")
    .in("circle_id", [parsed.data.circleId, ...parsed.data.extraCircleIds]);
  const notifyIds = Array.from(
    new Set([...(memberRows ?? []).map((row) => row.profile_id), ...parsed.data.inviteeIds]),
  );
  await notifyUsers(
    notifyIds,
    "meeting_scheduled",
    { eventId: created.id, eventTitle: parsed.data.title },
    actor.userId,
  );
  if (basePayload.host_id && basePayload.host_id !== actor.userId) {
    await notifyUsers(
      [basePayload.host_id],
      "host_assigned",
      { eventId: created.id, eventTitle: parsed.data.title },
      actor.userId,
    );
  }

  refresh();
  redirect(`/events/${created.id}`);
}

// Edits an existing event. `scope` decides which rows in a recurring
// series get the submitted field values (see editEventSchema's own
// comment) — mirrors the familiar "this event / this and following /
// all events" choice from mainstream calendar apps:
//   - "this": only the edited row.
//   - "upcoming": every row in the series (root + parent_event_id
//     children) whose starts_at is on/after the edited row's original
//     starts_at, this row included.
//   - "series": every row in the series, past occurrences included.
// Every affected row is shifted by the same starts_at delta the edit
// applied to the one being edited, so each occurrence keeps its own
// date/time relationship to the others (moving a weekly meeting an hour
// later shifts every occurrence an hour later, not onto one shared
// instant) — and gets the same non-time field values (title, location,
// meeting link, audience, ...).
export async function updateEvent(
  _prevState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = editEventSchema.safeParse({
    eventId: formData.get("eventId"),
    scope: formData.get("scope"),
    title: formData.get("title"),
    description: formData.get("description"),
    startsAt: formData.get("startsAt"),
    durationMinutes: formData.get("durationMinutes"),
    format: formData.get("format"),
    hostId: formData.get("hostId"),
    address: formData.get("address"),
    inPersonCapacity: formData.get("inPersonCapacity"),
    meetUrl: formData.get("meetUrl"),
    meetProvider: formData.get("meetProvider"),
    meetNotes: formData.get("meetNotes"),
    audience: formData.get("audience"),
    extraCircleIds: formData.get("extraCircleIds"),
    inviteeIds: formData.get("inviteeIds"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  // Same two-step lookup-then-gate as saveAttendance/createEvent: resolve
  // the event's circle before requirePermission() can evaluate the
  // circle-scoped permission, then let that call be the real gate.
  const lookupClient = await createClient();
  const { data: current } = await lookupClient
    .from("events")
    .select("id, circle_id, starts_at, parent_event_id, created_by")
    .eq("id", parsed.data.eventId)
    .single();
  if (!current) {
    return { ok: false, error: "That meeting no longer exists." };
  }

  // profileId feeds events.edit's 'own' scope (a student may only edit a
  // meeting they created); admin 'all' and administrative 'circle' ignore it.
  const actor = await requirePermission("events.edit", {
    circleId: current.circle_id,
    profileId: current.created_by,
  });
  if (!actor.ok) return actor;

  const newStartsAt = fromZonedTime(parsed.data.startsAt, CIRCLE_TIME_ZONE);
  if (Number.isNaN(newStartsAt.getTime())) {
    return { ok: false, error: "That date and time isn't valid." };
  }
  const durationMs = parsed.data.durationMinutes * 60_000;
  const deltaMs = newStartsAt.getTime() - new Date(current.starts_at).getTime();

  let targets: { id: string; starts_at: string }[];
  if (parsed.data.scope === "this") {
    targets = [{ id: current.id, starts_at: current.starts_at }];
  } else {
    const rootId = current.parent_event_id ?? current.id;
    const { data: seriesRows, error: seriesError } = await actor.supabase
      .from("events")
      .select("id, starts_at")
      .or(`id.eq.${rootId},parent_event_id.eq.${rootId}`);
    if (seriesError) {
      return { ok: false, error: "Could not look up this meeting's series." };
    }
    targets =
      parsed.data.scope === "upcoming"
        ? (seriesRows ?? []).filter((row) => row.starts_at >= current.starts_at)
        : (seriesRows ?? []);
  }

  const fieldPayload = {
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    format: parsed.data.format,
    host_id: parsed.data.format === "online" ? null : (parsed.data.hostId ?? null),
    address: parsed.data.format === "online" ? null : (parsed.data.address ?? null),
    in_person_capacity: parsed.data.format === "online" ? null : (parsed.data.inPersonCapacity ?? null),
    meet_url: parsed.data.format === "in_person" ? null : (parsed.data.meetUrl ?? null),
    meet_provider: parsed.data.format === "in_person" ? null : (parsed.data.meetProvider ?? null),
    meet_notes: parsed.data.format === "in_person" ? null : (parsed.data.meetNotes ?? null),
    audience: parsed.data.audience,
  };

  // Individual per-row updates, not a bulk upsert — each occurrence needs
  // its own delta-shifted starts_at/ends_at, and update() (unlike upsert)
  // never risks tripping a NOT NULL check on a column this payload doesn't
  // touch (circle_id, recurrence, ...).
  const updateResults = await Promise.all(
    targets.map((target) => {
      const start = new Date(new Date(target.starts_at).getTime() + deltaMs);
      return actor.supabase
        .from("events")
        .update({
          ...fieldPayload,
          starts_at: start.toISOString(),
          ends_at: new Date(start.getTime() + durationMs).toISOString(),
        })
        .eq("id", target.id);
    }),
  );
  if (updateResults.some((result) => result.error)) {
    return { ok: false, error: "Could not save changes." };
  }

  // Audience replace, not merge — the form always submits the complete
  // intended set of extra circles/invitees, so every affected occurrence's
  // event_circles/event_invitees rows are swapped to match exactly. The
  // owning circle's own event_circles row (circle_id = current.circle_id)
  // is never touched — that one isn't part of the "extra" set being edited.
  const targetIds = targets.map((t) => t.id);
  const { error: deleteCirclesError } = await actor.supabase
    .from("event_circles")
    .delete()
    .in("event_id", targetIds)
    .neq("circle_id", current.circle_id);
  if (deleteCirclesError) {
    return { ok: false, error: "Meeting saved, but its invited circles could not be updated." };
  }
  if (parsed.data.extraCircleIds.length > 0) {
    const circleRows = targetIds.flatMap((eventId) =>
      parsed.data.extraCircleIds.map((circleId) => ({ event_id: eventId, circle_id: circleId })),
    );
    const { error: circleInviteError } = await actor.supabase
      .from("event_circles")
      .upsert(circleRows, { onConflict: "event_id,circle_id" });
    if (circleInviteError) {
      return { ok: false, error: "Meeting saved, but its invited circles could not be updated." };
    }
  }

  const { error: deleteInviteesError } = await actor.supabase
    .from("event_invitees")
    .delete()
    .in("event_id", targetIds);
  if (deleteInviteesError) {
    return { ok: false, error: "Meeting saved, but its invitees could not be updated." };
  }
  if (parsed.data.inviteeIds.length > 0) {
    const inviteeRows = targetIds.flatMap((eventId) =>
      parsed.data.inviteeIds.map((profileId) => ({
        event_id: eventId,
        profile_id: profileId,
        added_by: actor.userId,
      })),
    );
    const { error: inviteeError } = await actor.supabase
      .from("event_invitees")
      .upsert(inviteeRows, { onConflict: "event_id,profile_id" });
    if (inviteeError) {
      return { ok: false, error: "Meeting saved, but its invitees could not be updated." };
    }
  }

  refresh();
  return { ok: true };
}

// A single-format event only has one valid attend_mode — force it rather
// than trust the client, since the form only surfaces the choice on hybrid
// events.
function forcedAttendMode(format: EventFormat): AttendMode | null {
  if (format === "in_person") return "in_person";
  if (format === "online") return "online";
  return null;
}

export async function rsvpToEvent(
  eventId: string,
  input: {
    response: string;
    attendMode?: string;
    reason?: string;
    reasonCategory?: string;
  },
): Promise<ActionResult> {
  const parsed = rsvpSchema.safeParse({
    eventId,
    response: input.response,
    attendMode: input.attendMode,
    reason: input.reason,
    reasonCategory: input.reasonCategory,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid RSVP." };
  }

  const supabase = await createClient();
  const user = await getCachedUser();
  if (!user) {
    return { ok: false, error: "You need to sign in again." };
  }

  const actor = await requirePermission("events.rsvp", { profileId: user.id });
  if (!actor.ok) return actor;

  const { data: event } = await supabase
    .from("events")
    .select("format")
    .eq("id", parsed.data.eventId)
    .single();
  if (!event) {
    return { ok: false, error: "That meeting no longer exists." };
  }

  let attendMode: AttendMode | null = null;
  if (parsed.data.response === "going") {
    const forced = forcedAttendMode(event.format);
    if (forced) {
      attendMode = forced;
    } else if (parsed.data.attendMode) {
      attendMode = parsed.data.attendMode;
    } else {
      return { ok: false, error: "Choose how you're attending." };
    }
  }

  // Going online instead of in person on a hybrid meeting needs a reason
  // too — same as declining outright — but this depends on event.format,
  // which rsvpSchema doesn't have, so it's checked here rather than there.
  if (event.format === "hybrid" && attendMode === "online" && !parsed.data.reason && !parsed.data.reasonCategory) {
    return { ok: false, error: "Let them know why you're joining online instead of in person." };
  }

  const { error } = await supabase.from("event_rsvps").upsert(
    {
      event_id: parsed.data.eventId,
      profile_id: user.id,
      response: parsed.data.response,
      responded_at: new Date().toISOString(),
      attend_mode: attendMode,
      reason: parsed.data.reason ?? null,
      reason_category: parsed.data.reasonCategory ?? null,
    },
    { onConflict: "event_id,profile_id" },
  );

  if (error) {
    return { ok: false, error: "Could not save your RSVP." };
  }

  refresh();
  return { ok: true };
}

// Put yourself forward as host of a meeting you're invited to. The
// SECURITY DEFINER RPC is the real gate (resolved membership, format,
// self-only); this guard just confirms there's a signed-in caller and the
// events.host_self key resolves for their role.
export async function claimEventHost(input: unknown): Promise<ActionResult> {
  const parsed = eventHostSelfSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid input." };
  }
  const user = await getCachedUser();
  if (!user) {
    return { ok: false, error: "You need to sign in again." };
  }
  const actor = await requirePermission("events.host_self", { profileId: user.id });
  if (!actor.ok) return actor;

  const { error } = await actor.supabase.rpc("claim_event_host", {
    target_event_id: parsed.data.eventId,
  });
  if (error) {
    return { ok: false, error: hostRpcError(error.message) };
  }

  refresh();
  return { ok: true };
}

export async function releaseEventHost(input: unknown): Promise<ActionResult> {
  const parsed = eventHostSelfSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid input." };
  }
  const user = await getCachedUser();
  if (!user) {
    return { ok: false, error: "You need to sign in again." };
  }
  const actor = await requirePermission("events.host_self", { profileId: user.id });
  if (!actor.ok) return actor;

  const { error } = await actor.supabase.rpc("release_event_host", {
    target_event_id: parsed.data.eventId,
  });
  if (error) {
    return { ok: false, error: hostRpcError(error.message) };
  }

  refresh();
  return { ok: true };
}
