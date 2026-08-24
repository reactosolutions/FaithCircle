import { createClient } from "@/lib/supabase/server";

export async function getAdminDashboardData() {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const in14Days = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  // One profiles fetch (status only) tallied in memory, instead of four
  // separate per-status HEAD requests to the same table — this app's whole
  // membership is a single community, not a multi-tenant SaaS, so pulling
  // every row once is fewer round trips than four HEAD counts. This was
  // the dashboard's main source of redundant round trips (profiles was
  // queried 8 times total across this file before consolidating here and
  // in getAdminChartsData below).
  const [
    { data: profiles },
    { count: circleCount },
    { count: upcomingEventCount },
    { count: pendingJoinRequestCount },
    { count: recentAuditCount },
  ] = await Promise.all([
    supabase.from("profiles").select("status"),
    supabase.from("circles").select("id", { count: "exact", head: true }),
    supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .gte("starts_at", now)
      .lt("starts_at", in14Days),
    supabase
      .from("join_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("audit_log")
      .select("id", { count: "exact", head: true })
      .gte("occurred_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
  ]);

  const memberCounts = { active: 0, invited: 0, inactive: 0, pending: 0 };
  for (const profile of profiles ?? []) {
    if (profile.status in memberCounts) {
      memberCounts[profile.status as keyof typeof memberCounts] += 1;
    }
  }

  return {
    memberCounts,
    circleCount: circleCount ?? 0,
    upcomingEventCount: upcomingEventCount ?? 0,
    pendingJoinRequestCount: pendingJoinRequestCount ?? 0,
    recentAuditCount: recentAuditCount ?? 0,
  };
}

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
// dashboard — the next few meetings across every circle, and the most
// recently submitted homework across every circle, each capped to `limit`.
// Admin already sees every row here unfiltered (submissions.view and
// events.view are both 'all' scope for admin), unlike the leader/student
// dashboards which scope to circles the viewer is actually in.
export async function getAdminRecentActivity(limit = 6) {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const [{ data: upcomingEvents }, { data: recentSubmissions }] = await Promise.all([
    supabase
      .from("events")
      .select("id, title, starts_at, format")
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
  ]);

  const assignmentIds = Array.from(new Set((recentSubmissions ?? []).map((s) => s.assignment_id)));
  const profileIds = Array.from(new Set((recentSubmissions ?? []).map((s) => s.profile_id)));

  const [{ data: assignments }, { data: profiles }] = await Promise.all([
    assignmentIds.length > 0
      ? supabase.from("assignments").select("id, title, circle_id").in("id", assignmentIds)
      : Promise.resolve({ data: [] as { id: string; title: string; circle_id: string }[] }),
    profileIds.length > 0
      ? supabase.from("profiles").select("id, full_name").in("id", profileIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
  ]);

  const assignmentById = new Map((assignments ?? []).map((a) => [a.id, a]));
  const nameByProfile = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  const circleIds = Array.from(new Set((assignments ?? []).map((a) => a.circle_id)));
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

  return {
    upcomingEvents: upcomingEvents ?? [],
    recentSubmissions: recentSubmissionRows,
  };
}

// Chart-specific data for the admin dashboard: signup growth over the last
// 6 months, per-circle attendance comparison, role distribution, and
// meeting-format mix over the same period.
export async function getAdminChartsData() {
  const supabase = await createClient();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);

  const [{ data: profiles }, { data: circles }, { data: events }] = await Promise.all([
    // created_at for the growth chart and role for the distribution donut,
    // fetched together — replaces three separate role HEAD-count round
    // trips with tallying this one result in memory.
    supabase.from("profiles").select("created_at, role"),
    supabase.from("circles").select("id, name"),
    supabase.from("events").select("starts_at, format").gte("starts_at", sixMonthsAgo.toISOString()),
  ]);

  // Growth — cumulative signups by month. Approximated from profiles.created_at
  // since the app doesn't keep a historical snapshot of active/inactive
  // status over time; this reads as "accounts created", not strictly
  // "active members", for months before any status changes happened.
  const months: { key: string; label: string }[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(sixMonthsAgo);
    d.setMonth(d.getMonth() + i);
    months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleDateString("en-US", { month: "short" }),
    });
  }
  const growth = months.map((month, i) => {
    const cutoff = new Date(sixMonthsAgo);
    cutoff.setMonth(cutoff.getMonth() + i + 1);
    const count = (profiles ?? []).filter((p) => new Date(p.created_at).getTime() < cutoff.getTime()).length;
    return { label: month.label, value: count };
  });

  const roleCounts = { admin: 0, administrative: 0, student: 0 };
  for (const profile of profiles ?? []) {
    if (profile.role in roleCounts) {
      roleCounts[profile.role as keyof typeof roleCounts] += 1;
    }
  }

  // Circle comparison — attendance % per circle, batched (not one round
  // trip per circle) since this loop was the dashboard's biggest N+1. Bounded
  // to the same 6-month window as the rest of this page's charts — an
  // org running for a couple of years would otherwise pull its entire
  // attendance history on every dashboard load for a chart that only ever
  // shows one number per circle.
  const circleIds = (circles ?? []).map((c) => c.id);
  const { data: allCircleEvents } =
    circleIds.length > 0
      ? await supabase
          .from("events")
          .select("id, circle_id")
          .in("circle_id", circleIds)
          .gte("starts_at", sixMonthsAgo.toISOString())
      : { data: [] };
  const eventIdsByCircle = new Map<string, string[]>();
  for (const event of allCircleEvents ?? []) {
    const list = eventIdsByCircle.get(event.circle_id) ?? [];
    list.push(event.id);
    eventIdsByCircle.set(event.circle_id, list);
  }
  const allComparisonEventIds = (allCircleEvents ?? []).map((e) => e.id);
  const { data: allComparisonAttendance } =
    allComparisonEventIds.length > 0
      ? await supabase.from("attendance").select("event_id, status").in("event_id", allComparisonEventIds)
      : { data: [] };
  const comparisonAttendanceByEvent = new Map<string, { present: number; total: number }>();
  for (const row of allComparisonAttendance ?? []) {
    const bucket = comparisonAttendanceByEvent.get(row.event_id) ?? { present: 0, total: 0 };
    bucket.total += 1;
    if (row.status === "present") bucket.present += 1;
    comparisonAttendanceByEvent.set(row.event_id, bucket);
  }
  const circleComparison = (circles ?? []).map((circle) => {
    const eventIds = eventIdsByCircle.get(circle.id) ?? [];
    let present = 0;
    let total = 0;
    for (const eventId of eventIds) {
      const bucket = comparisonAttendanceByEvent.get(eventId);
      if (bucket) {
        present += bucket.present;
        total += bucket.total;
      }
    }
    return { label: circle.name, value: total > 0 ? Math.round((present / total) * 100) : 0 };
  });

  // Format mix over time — stacked area, one series per format
  const formatByMonth = new Map<string, { in_person: number; online: number; hybrid: number }>();
  for (const month of months) {
    formatByMonth.set(month.key, { in_person: 0, online: 0, hybrid: 0 });
  }
  for (const event of events ?? []) {
    const d = new Date(event.starts_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const bucket = formatByMonth.get(key);
    if (bucket && event.format in bucket) {
      bucket[event.format as keyof typeof bucket] += 1;
    }
  }
  const formatMixOverTime = months.map((month) => ({
    label: month.label,
    ...formatByMonth.get(month.key)!,
  }));

  return { growth, roleCounts, circleComparison, formatMixOverTime };
}
