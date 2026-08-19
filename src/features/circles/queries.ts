import { createClient } from "@/lib/supabase/server";

// One row per circle with its advisors (circle_leaders, not just the single
// circles.leader_id — an administrative may lead more than one circle, and a
// circle may have more than one advisor) and current member count.
export async function listCirclesWithDetails() {
  const supabase = await createClient();

  const { data: circles, error } = await supabase
    .from("circles")
    .select("id, name, invite_code, join_policy, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!circles || circles.length === 0) return [];

  const circleIds = circles.map((c) => c.id);

  const [{ data: leaderRows }, { data: memberRows }] = await Promise.all([
    supabase.from("circle_leaders").select("circle_id, profile_id").in("circle_id", circleIds),
    supabase.from("circle_members").select("circle_id, profile_id").in("circle_id", circleIds),
  ]);

  const leaderIds = Array.from(new Set((leaderRows ?? []).map((r) => r.profile_id)));
  const { data: leaderProfiles } =
    leaderIds.length > 0
      ? await supabase.from("profiles").select("id, full_name").in("id", leaderIds)
      : { data: [] };
  const nameById = new Map((leaderProfiles ?? []).map((p) => [p.id, p.full_name]));

  const advisorsByCircle = new Map<string, string[]>();
  for (const row of leaderRows ?? []) {
    const list = advisorsByCircle.get(row.circle_id) ?? [];
    list.push(nameById.get(row.profile_id) ?? "Unnamed");
    advisorsByCircle.set(row.circle_id, list);
  }

  const memberCountByCircle = new Map<string, number>();
  for (const row of memberRows ?? []) {
    memberCountByCircle.set(row.circle_id, (memberCountByCircle.get(row.circle_id) ?? 0) + 1);
  }

  return circles.map((circle) => ({
    ...circle,
    advisorNames: advisorsByCircle.get(circle.id) ?? [],
    memberCount: memberCountByCircle.get(circle.id) ?? 0,
  }));
}

// Candidates for the "advisors" picker on the create-circle form — every
// administrative, regardless of status, matching the same unfiltered
// precedent as members/page.tsx's administrativeCandidates (used for the
// reassign-leader picker on demotion).
export async function listAdvisorCandidates() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "administrative")
    .order("full_name");
  if (error) throw error;
  return data;
}

// Candidates for the "add students now" picker — active students only,
// since inviting a pending/inactive one into a circle isn't a meaningful
// action from this form.
export async function listStudentCandidates() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("role", "student")
    .eq("status", "active")
    .order("full_name");
  if (error) throw error;
  return data;
}

// Full detail for the circle page: the circle row, its advisors (id + name,
// so the editor can pre-select them), and its complete roster (id, name,
// email, status) for the searchable member list.
export async function getCircleDetail(circleId: string) {
  const supabase = await createClient();

  const { data: circle } = await supabase
    .from("circles")
    .select("id, name, invite_code, join_policy, created_at")
    .eq("id", circleId)
    .maybeSingle();
  if (!circle) return null;

  const [{ data: leaderRows }, { data: memberRows }] = await Promise.all([
    supabase.from("circle_leaders").select("profile_id").eq("circle_id", circleId),
    supabase.from("circle_members").select("profile_id").eq("circle_id", circleId),
  ]);

  const leaderIds = (leaderRows ?? []).map((r) => r.profile_id);
  const memberIds = (memberRows ?? []).map((r) => r.profile_id);
  const allIds = Array.from(new Set([...leaderIds, ...memberIds]));

  const { data: profiles } =
    allIds.length > 0
      ? await supabase.from("profiles").select("id, full_name, email, status").in("id", allIds)
      : { data: [] };
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  return {
    circle,
    advisors: leaderIds.map((id) => profileById.get(id)).filter((p): p is NonNullable<typeof p> => !!p),
    members: memberIds.map((id) => profileById.get(id)).filter((p): p is NonNullable<typeof p> => !!p),
  };
}

// Candidates for the member-detail page's "Assign to circle" picker — every
// circle, regardless of membership (the dialog itself filters out circles
// the profile already belongs to, since that set is per-profile and this
// query isn't).
export async function listAllCircles() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("circles").select("id, name").order("name");
  if (error) throw error;
  return data;
}

// For the member detail page — every circle this profile is a member of
// and/or leads (a person can be both, and an administrative can lead more
// than one circle).
export async function listCirclesForProfile(profileId: string) {
  const supabase = await createClient();
  const [{ data: leaderRows }, { data: memberRows }] = await Promise.all([
    supabase.from("circle_leaders").select("circle_id").eq("profile_id", profileId),
    supabase.from("circle_members").select("circle_id").eq("profile_id", profileId),
  ]);
  const leaderCircleIds = new Set((leaderRows ?? []).map((r) => r.circle_id));
  const memberCircleIds = new Set((memberRows ?? []).map((r) => r.circle_id));
  const allIds = Array.from(new Set([...leaderCircleIds, ...memberCircleIds]));
  if (allIds.length === 0) return [];

  const { data: circles } = await supabase.from("circles").select("id, name").in("id", allIds);
  return (circles ?? []).map((circle) => ({
    ...circle,
    isAdvisor: leaderCircleIds.has(circle.id),
    isMember: memberCircleIds.has(circle.id),
  }));
}
