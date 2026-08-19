import { createClient } from "@/lib/supabase/server";

export async function getAdminDashboardData() {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const in14Days = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: profileStatuses },
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
  for (const row of profileStatuses ?? []) {
    if (row.status in memberCounts) memberCounts[row.status as keyof typeof memberCounts] += 1;
  }

  return {
    memberCounts,
    circleCount: circleCount ?? 0,
    upcomingEventCount: upcomingEventCount ?? 0,
    pendingJoinRequestCount: pendingJoinRequestCount ?? 0,
    recentAuditCount: recentAuditCount ?? 0,
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

  // Role distribution
  const roleCounts = { admin: 0, administrative: 0, student: 0 };
  for (const p of profiles ?? []) {
    if (p.role in roleCounts) roleCounts[p.role as keyof typeof roleCounts] += 1;
  }

  // Circle comparison — attendance % per circle, batched (not one round
  // trip per circle) since this loop was the dashboard's biggest N+1.
  const circleIds = (circles ?? []).map((c) => c.id);
  const { data: allCircleEvents } =
    circleIds.length > 0
      ? await supabase.from("events").select("id, circle_id").in("circle_id", circleIds)
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
