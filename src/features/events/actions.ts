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
import { createEventSchema, rsvpSchema } from "./schema";

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
