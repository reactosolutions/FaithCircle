import { createClient } from "@/lib/supabase/server";
import { suggestNextHost } from "@/features/settings/circle/queries";

// Consecutive-absence streak from a member's most recent marked attendance
// in a circle, stopping at the first present/excused row — matches the
// "flag after this many consecutive absences" wording on the Circle
// settings form. Computed in-memory from batched queries rather than
// per-circle round trips, since that was the dashboard's main N+1 offender.
function flagMembers(
  circleId: string,
  threshold: number,
  memberIds: string[],
  pastEvents: { id: string; starts_at: string }[],
  attendanceByEvent: Map<string, { profile_id: string; status: string }[]>,
) {
  const sortedEvents = pastEvents.slice().sort((a, b) => b.starts_at.localeCompare(a.starts_at));
  const eventOrder = new Map(sortedEvents.map((e) => [e.id, e.starts_at]));

  const byMember = new Map<string, { event_id: string; status: string }[]>();
  for (const event of sortedEvents) {
    for (const row of attendanceByEvent.get(event.id) ?? []) {
      const list = byMember.get(row.profile_id) ?? [];
      list.push({ event_id: event.id, status: row.status });
      byMember.set(row.profile_id, list);
    }
  }

  const flaggedIds: string[] = [];
  for (const memberId of memberIds) {
    const rows = (byMember.get(memberId) ?? [])
      .slice()
      .sort((a, b) => (eventOrder.get(b.event_id) ?? "").localeCompare(eventOrder.get(a.event_id) ?? ""));
    let streak = 0;
    for (const row of rows) {
      if (row.status !== "absent") break;
      streak += 1;
    }
    if (streak >= threshold) flaggedIds.push(memberId);
  }
  return flaggedIds;
}

export async function getLeaderDashboardData(profileId: string) {
  const supabase = await createClient();
  // circle_leaders, not circles.leader_id — the permission-scope source of
  // truth since an administrative can lead a circle without being its
  // single "primary" leader_id (see the Permissions section of CLAUDE.md).
  const { data: ledRows } = await supabase
    .from("circle_leaders")
    .select("circle_id")
    .eq("profile_id", profileId);
  const ledCircleIds = (ledRows ?? []).map((r) => r.circle_id);
  if (ledCircleIds.length === 0) return { circleStats: [] };

  const now = new Date().toISOString();
  const [{ data: circles }, { data: memberRows }, { data: futureEvents }, { data: pastEvents }, { data: assignments }] =
    await Promise.all([
      supabase.from("circles").select("id, name, attendance_flag_threshold").in("id", ledCircleIds),
      supabase.from("circle_members").select("circle_id, profile_id").in("circle_id", ledCircleIds),
      supabase
        .from("events")
        .select("id, circle_id, title, starts_at")
        .in("circle_id", ledCircleIds)
        .gte("starts_at", now)
        .order("starts_at"),
      supabase.from("events").select("id, circle_id, starts_at").in("circle_id", ledCircleIds).lte("starts_at", now),
      supabase.from("assignments").select("id, circle_id").in("circle_id", ledCircleIds),
    ]);

  const assignmentIds = (assignments ?? []).map((a) => a.id);
  const pastEventIds = (pastEvents ?? []).map((e) => e.id);
  const [{ data: submissions }, { data: attendanceRows }] = await Promise.all([
    assignmentIds.length > 0
      ? supabase.from("submissions").select("assignment_id, status").in("assignment_id", assignmentIds)
      : Promise.resolve({ data: [] as { assignment_id: string; status: string }[] }),
    pastEventIds.length > 0
      ? supabase.from("attendance").select("event_id, profile_id, status").in("event_id", pastEventIds)
      : Promise.resolve({ data: [] as { event_id: string; profile_id: string; status: string }[] }),
  ]);

  const membersByCircle = new Map<string, string[]>();
  for (const row of memberRows ?? []) {
    const list = membersByCircle.get(row.circle_id) ?? [];
    list.push(row.profile_id);
    membersByCircle.set(row.circle_id, list);
  }
  const nextEventByCircle = new Map<string, { id: string; title: string; starts_at: string }>();
  for (const event of futureEvents ?? []) {
    if (!nextEventByCircle.has(event.circle_id)) nextEventByCircle.set(event.circle_id, event);
  }
  const pastEventsByCircle = new Map<string, { id: string; starts_at: string }[]>();
  for (const event of pastEvents ?? []) {
    const list = pastEventsByCircle.get(event.circle_id) ?? [];
    list.push(event);
    pastEventsByCircle.set(event.circle_id, list);
  }
  const circleByAssignment = new Map<string, string>();
  for (const a of assignments ?? []) {
    circleByAssignment.set(a.id, a.circle_id);
  }
  const pendingReviewByCircle = new Map<string, number>();
  for (const s of submissions ?? []) {
    if (s.status !== "submitted") continue;
    const circleId = circleByAssignment.get(s.assignment_id);
    if (!circleId) continue;
    pendingReviewByCircle.set(circleId, (pendingReviewByCircle.get(circleId) ?? 0) + 1);
  }
  const attendanceByEvent = new Map<string, { profile_id: string; status: string }[]>();
  for (const row of attendanceRows ?? []) {
    const list = attendanceByEvent.get(row.event_id) ?? [];
    list.push(row);
    attendanceByEvent.set(row.event_id, list);
  }

  const flaggedIdsByCircle = new Map<string, string[]>();
  const allFlaggedIds = new Set<string>();
  for (const circle of circles ?? []) {
    const flagged = flagMembers(
      circle.id,
      circle.attendance_flag_threshold,
      membersByCircle.get(circle.id) ?? [],
      pastEventsByCircle.get(circle.id) ?? [],
      attendanceByEvent,
    );
    flaggedIdsByCircle.set(circle.id, flagged);
    for (const id of flagged) allFlaggedIds.add(id);
  }

  const { data: flaggedProfiles } =
    allFlaggedIds.size > 0
      ? await supabase.from("profiles").select("id, full_name").in("id", Array.from(allFlaggedIds))
      : { data: [] };
  const profileById = new Map((flaggedProfiles ?? []).map((p) => [p.id, p]));

  const circleStats = (circles ?? []).map((circle) => ({
    circle,
    memberCount: (membersByCircle.get(circle.id) ?? []).length,
    nextEvent: nextEventByCircle.get(circle.id) ?? null,
    pendingReviewCount: pendingReviewByCircle.get(circle.id) ?? 0,
    flaggedMembers: (flaggedIdsByCircle.get(circle.id) ?? [])
      .map((id) => profileById.get(id))
      .filter((p): p is { id: string; full_name: string } => !!p),
  }));

  return { circleStats };
}

// Chart-specific data for one led circle: attendance trend (last 8 past
// meetings), format mix (actual attendance.mode, not RSVP), a
// submission funnel, per-member engagement, absence-reason counts, and
// host rotation (reusing the same suggestion Settings > Circle already
// shows, rather than a second implementation).
export async function getCircleChartsData(circleId: string) {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const [{ data: circleEventRows }, { data: memberRows }, { data: assignments }, { data: rsvpRows }, hostRotation] =
    await Promise.all([
      // Every event for this circle, once — the three charts below each
      // need a different slice (recent-8 past, all past, all-time), derived
      // in memory rather than as three separate round trips.
      supabase
        .from("events")
        .select("id, title, starts_at")
        .eq("circle_id", circleId)
        .order("starts_at", { ascending: false }),
      supabase.from("circle_members").select("profile_id").eq("circle_id", circleId),
      supabase.from("assignments").select("id").eq("circle_id", circleId).eq("published", true),
      // event_rsvps_visible, not the base table — reason_category is
      // admin-only (see schema.sql's event_rsvps_visible comment); a leader
      // querying this gets null back for every row but their own, same as
      // AttendeeList. That does mean this chart is effectively empty for
      // administrative viewers now — an accepted consequence of that choice,
      // not a bug.
      supabase
        .from("event_rsvps_visible")
        .select("reason_category, event_id")
        .not("reason_category", "is", null),
      suggestNextHost(circleId),
    ]);

  const allCircleEvents = circleEventRows ?? [];
  const pastCircleEvents = allCircleEvents.filter((e) => e.starts_at <= now);
  const pastEvents = pastCircleEvents.slice(0, 8); // already sorted starts_at desc
  const pastEventIds = pastEvents.map((e) => e.id);
  const pastCircleEventIds = new Set(pastCircleEvents.map((e) => e.id));
  const memberIds = (memberRows ?? []).map((r) => r.profile_id);

  const { data: attendanceRows } =
    pastEventIds.length > 0
      ? await supabase.from("attendance").select("event_id, status, mode, profile_id").in("event_id", pastEventIds)
      : { data: [] };

  // attendance trend, oldest of the 8 first so the chart reads left-to-right chronologically
  const attendanceByEvent = new Map<string, { present: number; total: number }>();
  for (const row of attendanceRows ?? []) {
    const bucket = attendanceByEvent.get(row.event_id) ?? { present: 0, total: 0 };
    bucket.total += 1;
    if (row.status === "present") bucket.present += 1;
    attendanceByEvent.set(row.event_id, bucket);
  }
  const attendanceTrend = (pastEvents ?? [])
    .slice()
    .reverse()
    .map((event) => {
      const bucket = attendanceByEvent.get(event.id);
      const pct = bucket && bucket.total > 0 ? Math.round((bucket.present / bucket.total) * 100) : 0;
      return { label: new Date(event.starts_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }), value: pct };
    });

  // Attendance for the whole membership across every past meeting in this
  // circle — shared by the format-mix donut and the per-member engagement
  // chart below. Scoped to past events since RSVP and attendance are one
  // record now; a future "going" RSVP isn't attendance.
  const { data: allMemberAttendanceRowsRaw } =
    memberIds.length > 0 && pastCircleEventIds.size > 0
      ? await supabase
          .from("attendance")
          .select("profile_id, status, mode, event_id")
          .in("profile_id", memberIds)
          .in("event_id", Array.from(pastCircleEventIds))
      : { data: [] };
  const allMemberAttendanceRows = allMemberAttendanceRowsRaw ?? [];
  const formatMix = {
    in_person: allMemberAttendanceRows.filter((r) => r.mode === "in_person").length,
    online: allMemberAttendanceRows.filter((r) => r.mode === "online").length,
  };

  // submission funnel
  const assignmentIds = (assignments ?? []).map((a) => a.id);
  let funnel = { assigned: 0, submitted: 0, reviewed: 0 };
  if (assignmentIds.length > 0 && memberIds.length > 0) {
    const { data: submissions } = await supabase
      .from("submissions")
      .select("status")
      .in("assignment_id", assignmentIds);
    funnel = {
      assigned: assignmentIds.length * memberIds.length,
      submitted: (submissions ?? []).filter((s) => s.status === "submitted" || s.status === "reviewed").length,
      reviewed: (submissions ?? []).filter((s) => s.status === "reviewed").length,
    };
  }

  // per-member engagement: attendance % and homework %
  const [{ data: memberProfiles }, { data: memberSubmissions }] = await Promise.all([
    memberIds.length > 0
      ? supabase.from("profiles").select("id, full_name").in("id", memberIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
    assignmentIds.length > 0 && memberIds.length > 0
      ? supabase.from("submissions").select("profile_id, status").in("assignment_id", assignmentIds)
      : Promise.resolve({ data: [] as { profile_id: string; status: string }[] }),
  ]);

  // Reuses allMemberAttendanceRows fetched above for the format-mix donut,
  // rather than issuing a second attendance query for the same member set.
  const attendanceByMember = new Map<string, { present: number; total: number }>();
  for (const row of allMemberAttendanceRows ?? []) {
    const bucket = attendanceByMember.get(row.profile_id) ?? { present: 0, total: 0 };
    bucket.total += 1;
    if (row.status === "present") bucket.present += 1;
    attendanceByMember.set(row.profile_id, bucket);
  }
  const reviewedByMember = new Map<string, number>();
  for (const row of memberSubmissions ?? []) {
    if (row.status === "reviewed" || row.status === "submitted") {
      reviewedByMember.set(row.profile_id, (reviewedByMember.get(row.profile_id) ?? 0) + 1);
    }
  }
  const memberEngagement = (memberProfiles ?? []).map((profile) => {
    const attendance = attendanceByMember.get(profile.id);
    return {
      id: profile.id,
      fullName: profile.full_name,
      attendancePct: attendance && attendance.total > 0 ? Math.round((attendance.present / attendance.total) * 100) : null,
      homeworkPct:
        assignmentIds.length > 0
          ? Math.round(((reviewedByMember.get(profile.id) ?? 0) / assignmentIds.length) * 100)
          : null,
    };
  });

  // absence reasons — reason_category applies in both directions (declining
  // outright, or going online instead of in person on a hybrid meeting)
  const circleEventIds = new Set(allCircleEvents.map((e) => e.id));
  const reasonCounts = new Map<string, number>();
  for (const row of rsvpRows ?? []) {
    if (!circleEventIds.has(row.event_id) || !row.reason_category) continue;
    reasonCounts.set(row.reason_category, (reasonCounts.get(row.reason_category) ?? 0) + 1);
  }
  const absenceReasons = Array.from(reasonCounts.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  return { attendanceTrend, formatMix, funnel, memberEngagement, absenceReasons, hostRotation };
}
