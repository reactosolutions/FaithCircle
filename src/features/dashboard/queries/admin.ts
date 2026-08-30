import { createClient } from "@/lib/supabase/server";

// Preview rows for the admin dashboard's "Needs your approval" card: the
// oldest few self-service/org-invite-link signups (profiles.status =
// 'pending') and org-wide join requests, combined into one feed. The
// Members page (status=pending filter) and Settings > Organization remain
// the actual places to act — this is a read-only preview so the count on
// the dashboard isn't just a number with nowhere obvious to look.
export async function getPendingApprovals(limit = 5) {
  const supabase = await createClient();
  const [{ data: pendingProfiles }, { data: joinRequests }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(limit),
    supabase
      .from("join_requests")
      .select("id, full_name, email, requested_at")
      .eq("status", "pending")
      .order("requested_at", { ascending: true })
      .limit(limit),
  ]);

  const combined = [
    ...(pendingProfiles ?? []).map((row) => ({
      kind: "signup" as const,
      id: row.id,
      fullName: row.full_name,
      email: row.email,
      at: row.created_at,
    })),
    ...(joinRequests ?? []).map((row) => ({
      kind: "join_request" as const,
      id: row.id,
      fullName: row.full_name,
      email: row.email,
      at: row.requested_at,
    })),
  ].sort((a, b) => a.at.localeCompare(b.at));

  return combined.slice(0, limit);
}

// Org-wide "what's coming up / what just came in" preview for the admin
// dashboard — the next few meetings across every circle, the most recently
// submitted homework, and the most recently marked attendance, each capped
// to `limit`. Admin already sees every row here unfiltered (submissions.view,
// events.view, and attendance.view are all 'all' scope for admin), unlike
// the leader/student dashboards which scope to circles the viewer is
// actually in.
export async function getAdminRecentActivity(limit = 6) {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const [{ data: upcomingEvents }, { data: recentSubmissions }, { data: recentAttendance }] =
    await Promise.all([
      supabase
        .from("events")
        .select("id, title, starts_at, format, host_id")
        .gte("starts_at", now)
        .order("starts_at", { ascending: true })
        .limit(limit),
      // submitted_at is null for drafts — never actually submitted, so not
      // "recent activity" in the sense this list means.
      supabase
        .from("submissions")
        .select("id, assignment_id, profile_id, submitted_at")
        .not("submitted_at", "is", null)
        .order("submitted_at", { ascending: false })
        .limit(limit),
      // marked_by is null for a plain self-RSVP; non-null once someone
      // actually recorded attendance (RSVP + attendance are one record
      // now), which is what "recent attendance" means here.
      supabase
        .from("attendance")
        .select("id, event_id, profile_id, status, marked_at")
        .not("marked_by", "is", null)
        .order("marked_at", { ascending: false })
        .limit(limit),
    ]);

  const assignmentIds = Array.from(new Set((recentSubmissions ?? []).map((s) => s.assignment_id)));
  const attendanceEventIds = Array.from(new Set((recentAttendance ?? []).map((a) => a.event_id)));
  const profileIds = Array.from(
    new Set([
      ...(recentSubmissions ?? []).map((s) => s.profile_id),
      ...(recentAttendance ?? []).map((a) => a.profile_id),
    ]),
  );

  const [{ data: assignments }, { data: attendanceEvents }, { data: profiles }] = await Promise.all([
    assignmentIds.length > 0
      ? supabase.from("assignments").select("id, title, circle_id").in("id", assignmentIds)
      : Promise.resolve({ data: [] as { id: string; title: string; circle_id: string }[] }),
    attendanceEventIds.length > 0
      ? supabase.from("events").select("id, title, circle_id").in("id", attendanceEventIds)
      : Promise.resolve({ data: [] as { id: string; title: string; circle_id: string }[] }),
    profileIds.length > 0
      ? supabase.from("profiles").select("id, full_name").in("id", profileIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
  ]);

  const assignmentById = new Map((assignments ?? []).map((a) => [a.id, a]));
  const eventById = new Map((attendanceEvents ?? []).map((e) => [e.id, e]));
  const nameByProfile = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  const circleIds = Array.from(
    new Set([
      ...(assignments ?? []).map((a) => a.circle_id),
      ...(attendanceEvents ?? []).map((e) => e.circle_id),
    ]),
  );
  const { data: circles } =
    circleIds.length > 0
      ? await supabase.from("circles").select("id, name").in("id", circleIds)
      : { data: [] as { id: string; name: string }[] };
  const circleNameById = new Map((circles ?? []).map((c) => [c.id, c.name]));

  const recentSubmissionRows = (recentSubmissions ?? []).flatMap((row) => {
    const assignment = assignmentById.get(row.assignment_id);
    // Guards a race, not a real case: the assignment/circle couldn't have
    // been deleted between the two queries above under normal use, but
    // dropping an orphaned row here is cheap insurance either way.
    if (!assignment || !row.submitted_at) return [];
    return [
      {
        id: row.id,
        assignmentId: row.assignment_id,
        assignmentTitle: assignment.title,
        circleName: circleNameById.get(assignment.circle_id) ?? null,
        memberName: nameByProfile.get(row.profile_id) ?? null,
        submittedAt: row.submitted_at,
      },
    ];
  });

  const recentAttendanceRows = (recentAttendance ?? []).flatMap((row) => {
    const event = eventById.get(row.event_id);
    if (!event || !row.marked_at) return [];
    return [
      {
        id: row.id,
        eventId: row.event_id,
        eventTitle: event.title,
        circleName: circleNameById.get(event.circle_id) ?? null,
        memberName: nameByProfile.get(row.profile_id) ?? null,
        status: row.status,
        markedAt: row.marked_at,
      },
    ];
  });

  return {
    upcomingEvents: upcomingEvents ?? [],
    recentSubmissions: recentSubmissionRows,
    recentAttendance: recentAttendanceRows,
  };
}
