import { createClient } from "@/lib/supabase/server";

// Events across circles the viewer can see, most recent first — RLS scopes
// this to circles they lead (or all, for admin) the same way it scopes
// everything else; a plain member sees this list too, but the /attendance
// pages themselves stay gated to leader/admin at the route level.
export async function listAttendanceEvents() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("id, title, starts_at, circle_id")
    .order("starts_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getAttendanceSheet(eventId: string) {
  const supabase = await createClient();
  const { data: event, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();
  if (error || !event) return null;

  // Resolved membership, same shape as public.is_event_member(): the
  // owning circle ∪ every circle in event_circles ∪ individual
  // event_invitees — not just the owning circle's roster, now that a
  // meeting can be opened to other circles or specific people.
  const [{ data: invitedCircleRows }, { data: inviteeRows }] = await Promise.all([
    supabase.from("event_circles").select("circle_id").eq("event_id", eventId),
    supabase.from("event_invitees").select("profile_id").eq("event_id", eventId),
  ]);
  const circleIds = Array.from(
    new Set([event.circle_id, ...(invitedCircleRows ?? []).map((r) => r.circle_id)]),
  );

  const { data: memberRows, error: memberError } = await supabase
    .from("circle_members")
    .select("profile_id")
    .in("circle_id", circleIds);
  if (memberError) throw memberError;

  const memberIds = Array.from(
    new Set([
      ...(memberRows ?? []).map((row) => row.profile_id),
      ...(inviteeRows ?? []).map((row) => row.profile_id),
    ]),
  );

  const [{ data: profiles }, { data: attendance }, { data: rsvps }] = await Promise.all([
    memberIds.length > 0
      ? supabase.from("profiles").select("id, full_name").in("id", memberIds)
      : Promise.resolve({ data: [] }),
    supabase.from("attendance").select("*").eq("event_id", eventId),
    supabase
      .from("event_rsvps")
      .select("profile_id, response, attend_mode")
      .eq("event_id", eventId),
  ]);

  const attendanceByProfileId = new Map((attendance ?? []).map((row) => [row.profile_id, row]));
  const rsvpByProfileId = new Map((rsvps ?? []).map((row) => [row.profile_id, row]));

  const members = (profiles ?? [])
    .map((profile) => {
      const rsvp = rsvpByProfileId.get(profile.id) ?? null;
      return {
        id: profile.id,
        fullName: profile.full_name,
        attendance: attendanceByProfileId.get(profile.id) ?? null,
        rsvpResponse: rsvp?.response ?? "no_response",
        rsvpAttendMode: rsvp?.attend_mode ?? null,
      };
    })
    .sort((a, b) => (a.fullName ?? "").localeCompare(b.fullName ?? ""));

  return { event, members };
}

export async function getMemberAttendanceHistory(profileId: string) {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("attendance")
    .select("event_id, status, marked_at")
    .eq("profile_id", profileId);
  if (error) throw error;
  if (!rows || rows.length === 0) return [];

  const eventIds = rows.map((row) => row.event_id);
  const { data: events, error: eventsError } = await supabase
    .from("events")
    .select("id, title, starts_at")
    .in("id", eventIds);
  if (eventsError) throw eventsError;

  const eventsById = new Map((events ?? []).map((event) => [event.id, event]));

  return rows
    .map((row) => {
      const event = eventsById.get(row.event_id);
      if (!event) return null;
      return { status: row.status, eventTitle: event.title, startsAt: event.starts_at };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}
