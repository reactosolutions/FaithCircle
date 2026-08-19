import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

type EventRow = Database["public"]["Tables"]["events"]["Row"];

// Called from the events/circle-settings pages, the circle selector, and
// the app shell within the same render — cache() so that's one query per
// request instead of one per call site (RLS already scopes the rows to
// what the viewer can see, so the result is identical across call sites).
export const listViewerCircles = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("circles")
    .select("id, name, leader_id")
    .order("name");
  if (error) throw error;
  return data;
});

// Events for a circle's calendar = events it owns ∪ events it's been
// invited to via event_circles. RLS already scopes both queries to circles
// the viewer belongs to, so no separate membership check is needed here —
// this just widens *which* events show up on a given circle's calendar
// beyond the ones it organizes itself.
export async function listEvents({
  circleId,
  from,
  to,
}: {
  circleId: string;
  from?: string;
  to?: string;
}) {
  const supabase = await createClient();

  let ownQuery = supabase.from("events").select("*").eq("circle_id", circleId).order("starts_at");
  if (from) ownQuery = ownQuery.gte("starts_at", from);
  if (to) ownQuery = ownQuery.lt("starts_at", to);

  const { data: invitedRows, error: invitedError } = await supabase
    .from("event_circles")
    .select("event_id")
    .eq("circle_id", circleId);
  if (invitedError) throw invitedError;
  const invitedIds = (invitedRows ?? []).map((row) => row.event_id);

  const [ownResult, invitedEvents] = await Promise.all([
    ownQuery,
    invitedIds.length > 0
      ? (async () => {
          let q = supabase.from("events").select("*").in("id", invitedIds).order("starts_at");
          if (from) q = q.gte("starts_at", from);
          if (to) q = q.lt("starts_at", to);
          const { data, error } = await q;
          if (error) throw error;
          return data ?? [];
        })()
      : Promise.resolve([] as EventRow[]),
  ]);
  if (ownResult.error) throw ownResult.error;

  const merged = new Map<string, EventRow>();
  for (const event of ownResult.data ?? []) merged.set(event.id, event);
  for (const event of invitedEvents) merged.set(event.id, event);
  return Array.from(merged.values()).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}

export async function getEvent(id: string) {
  const supabase = await createClient();
  const { data: event, error } = await supabase.from("events").select("*").eq("id", id).single();
  if (error || !event) return null;

  const [
    { data: circle },
    hostResult,
    { data: rsvpRows },
    { data: invitedCircleRows },
    { data: inviteeRows },
    { data: attendanceRows },
  ] = await Promise.all([
    supabase.from("circles").select("id, name, leader_id").eq("id", event.circle_id).single(),
    event.host_id
      ? supabase.from("profiles").select("id, full_name").eq("id", event.host_id).single()
      : Promise.resolve({ data: null }),
    // event_rsvps_visible, not the base table — reason/reason_category are
    // admin-only (see schema.sql's event_rsvps_visible comment); the view
    // nulls them out for anyone else's row, including a leader who can
    // otherwise see this event fine via events.edit.
    supabase
      .from("event_rsvps_visible")
      .select("profile_id, response, attend_mode, reason, reason_category")
      .eq("event_id", id),
    supabase.from("event_circles").select("circle_id").eq("event_id", id),
    supabase.from("event_invitees").select("profile_id").eq("event_id", id),
    // attendance_select's RLS only ever returns rows the caller is allowed
    // to see — for a student that's their own row alone (attendance.view's
    // 'own' scope), so no extra filtering by viewer id is needed here.
    supabase.from("attendance").select("profile_id, status, mode").eq("event_id", id),
  ]);

  // Names for RSVPs/invitees and labels for invited circles are joined here
  // in JS rather than via a PostgREST embedded select — this hand-written
  // Database type declares `Relationships: []` on every table, so an
  // embedded `profiles(full_name)` select wouldn't type-check.
  const rsvpProfileIds = (rsvpRows ?? []).map((r) => r.profile_id);
  const inviteeProfileIds = (inviteeRows ?? []).map((r) => r.profile_id);
  const allProfileIds = Array.from(new Set([...rsvpProfileIds, ...inviteeProfileIds]));
  const invitedCircleIds = (invitedCircleRows ?? []).map((r) => r.circle_id);

  const [{ data: profileRows }, { data: circleRows }] = await Promise.all([
    allProfileIds.length > 0
      ? supabase.from("profiles").select("id, full_name").in("id", allProfileIds)
      : Promise.resolve({ data: [] }),
    invitedCircleIds.length > 0
      ? supabase.from("circles").select("id, name").in("id", invitedCircleIds)
      : Promise.resolve({ data: [] }),
  ]);

  const nameById = new Map((profileRows ?? []).map((p) => [p.id, p.full_name]));
  const circleNameById = new Map((circleRows ?? []).map((c) => [c.id, c.name]));

  return {
    event,
    circle: circle ?? null,
    host: hostResult.data ?? null,
    rsvps: (rsvpRows ?? []).map((row) => ({
      ...row,
      fullName: nameById.get(row.profile_id) ?? null,
    })),
    invitedCircles: invitedCircleIds.map((circleId) => ({
      circleId,
      name: circleNameById.get(circleId) ?? "Unknown circle",
    })),
    invitees: (inviteeRows ?? []).map((row) => ({
      profileId: row.profile_id,
      fullName: nameById.get(row.profile_id) ?? null,
    })),
    attendance: attendanceRows ?? [],
  };
}

// Members of the circle who've marked themselves available to host —
// candidates for the host picker on the schedule-a-meeting form.
export async function listHostCandidates(circleId: string) {
  const supabase = await createClient();
  const { data: memberRows, error: memberError } = await supabase
    .from("circle_members")
    .select("profile_id")
    .eq("circle_id", circleId);
  if (memberError) throw memberError;

  const memberIds = (memberRows ?? []).map((row) => row.profile_id);
  if (memberIds.length === 0) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, home_address, host_capacity")
    .eq("can_host", true)
    .in("id", memberIds);
  if (error) throw error;
  return data;
}

// Every other circle, with a live member count, for the "invite another
// circle" audience picker — excludes the organizing circle itself, which is
// always invited implicitly.
export async function listOtherCirclesWithCounts(excludeCircleId: string) {
  const supabase = await createClient();
  const { data: circles, error } = await supabase
    .from("circles")
    .select("id, name")
    .neq("id", excludeCircleId)
    .order("name");
  if (error) throw error;
  if (!circles || circles.length === 0) return [];

  const { data: memberRows, error: memberError } = await supabase
    .from("circle_members")
    .select("circle_id")
    .in(
      "circle_id",
      circles.map((c) => c.id),
    );
  if (memberError) throw memberError;

  const counts = new Map<string, number>();
  for (const row of memberRows ?? []) {
    counts.set(row.circle_id, (counts.get(row.circle_id) ?? 0) + 1);
  }

  return circles.map((c) => ({ ...c, memberCount: counts.get(c.id) ?? 0 }));
}

export async function getCircleMemberCount(circleId: string) {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("circle_members")
    .select("profile_id", { count: "exact", head: true })
    .eq("circle_id", circleId);
  if (error) throw error;
  return count ?? 0;
}

// Active org members outside the organizing circle, for the "invite
// specific people" audience picker.
export async function listInviteCandidates(circleId: string) {
  const supabase = await createClient();
  const { data: memberRows, error: memberError } = await supabase
    .from("circle_members")
    .select("profile_id")
    .eq("circle_id", circleId);
  if (memberError) throw memberError;
  const memberIds = new Set((memberRows ?? []).map((row) => row.profile_id));

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("status", "active")
    .order("full_name");
  if (error) throw error;
  return (data ?? []).filter((profile) => !memberIds.has(profile.id));
}
