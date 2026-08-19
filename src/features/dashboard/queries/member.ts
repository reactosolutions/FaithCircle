import { createClient } from "@/lib/supabase/server";

// Shared by the student view and the leader view — an administrative user
// answers homework and has upcoming meetings just like a student, per
// CLAUDE.md's rule that the two roles are never mutually exclusive states.
export async function getMemberDashboardData(profileId: string) {
  const supabase = await createClient();

  const { data: circleRows } = await supabase
    .from("circle_members")
    .select("circle_id")
    .eq("profile_id", profileId);
  const circleIds = (circleRows ?? []).map((row) => row.circle_id);

  if (circleIds.length === 0) {
    return { upcomingEvents: [], pendingHomework: [], attendanceRate: null };
  }

  const now = new Date().toISOString();
  const [{ data: upcomingEvents }, { data: assignments }, { data: attendanceRows }] = await Promise.all([
    supabase
      .from("events")
      .select("id, title, starts_at, format, circle_id")
      .in("circle_id", circleIds)
      .gte("starts_at", now)
      .order("starts_at")
      .limit(5),
    supabase
      .from("assignments")
      .select("id, title, due_at, circle_id")
      .in("circle_id", circleIds)
      .eq("published", true)
      .order("due_at", { ascending: true, nullsFirst: false }),
    supabase.from("attendance").select("status").eq("profile_id", profileId),
  ]);

  const assignmentIds = (assignments ?? []).map((a) => a.id);
  const { data: mySubmissions } =
    assignmentIds.length > 0
      ? await supabase
          .from("submissions")
          .select("assignment_id, status")
          .eq("profile_id", profileId)
          .in("assignment_id", assignmentIds)
      : { data: [] };
  const statusByAssignment = new Map((mySubmissions ?? []).map((s) => [s.assignment_id, s.status]));

  const pendingHomework = (assignments ?? [])
    .filter((a) => {
      const status = statusByAssignment.get(a.id);
      return status !== "submitted" && status !== "reviewed";
    })
    .slice(0, 5);

  const total = attendanceRows?.length ?? 0;
  const present = (attendanceRows ?? []).filter((r) => r.status === "present").length;
  const attendanceRate = total > 0 ? Math.round((present / total) * 100) : null;

  return { upcomingEvents: upcomingEvents ?? [], pendingHomework, attendanceRate };
}

// Chart-specific data for the student (and administrative-as-answerer)
// dashboard section: the last-12 attendance timeline, a homework
// completion breakdown, and the current consecutive-present streak.
export async function getStudentChartsData(profileId: string) {
  const supabase = await createClient();

  const { data: attendanceRows } = await supabase
    .from("attendance")
    .select("status, event_id")
    .eq("profile_id", profileId);

  const eventIds = (attendanceRows ?? []).map((r) => r.event_id);
  const { data: eventRows } =
    eventIds.length > 0
      ? await supabase.from("events").select("id, title, starts_at").in("id", eventIds)
      : { data: [] };
  const eventById = new Map((eventRows ?? []).map((e) => [e.id, e]));

  const sorted = (attendanceRows ?? [])
    .map((row) => ({ ...row, startsAt: eventById.get(row.event_id)?.starts_at ?? "" }))
    .filter((row) => row.startsAt)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  const attendanceTimeline = sorted.slice(-12).map((row) => ({
    status: row.status,
    eventTitle: eventById.get(row.event_id)?.title ?? "",
    startsAt: row.startsAt,
  }));

  let streak = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].status !== "present") break;
    streak += 1;
  }

  const { data: circleRows } = await supabase
    .from("circle_members")
    .select("circle_id")
    .eq("profile_id", profileId);
  const circleIds = (circleRows ?? []).map((r) => r.circle_id);

  const homeworkBreakdown = { reviewed: 0, submitted: 0, pending: 0, late: 0 };
  if (circleIds.length > 0) {
    const { data: assignments } = await supabase
      .from("assignments")
      .select("id, due_at")
      .in("circle_id", circleIds)
      .eq("published", true);
    const assignmentIds = (assignments ?? []).map((a) => a.id);
    const { data: submissions } =
      assignmentIds.length > 0
        ? await supabase
            .from("submissions")
            .select("assignment_id, status")
            .eq("profile_id", profileId)
            .in("assignment_id", assignmentIds)
        : { data: [] };
    const submissionByAssignment = new Map((submissions ?? []).map((s) => [s.assignment_id, s.status]));

    const now = Date.now();
    for (const assignment of assignments ?? []) {
      const status = submissionByAssignment.get(assignment.id);
      if (status === "reviewed") homeworkBreakdown.reviewed += 1;
      else if (status === "submitted") homeworkBreakdown.submitted += 1;
      else if (assignment.due_at && new Date(assignment.due_at).getTime() < now) homeworkBreakdown.late += 1;
      else homeworkBreakdown.pending += 1;
    }
  }

  return { attendanceTimeline, streak, homeworkBreakdown };
}
