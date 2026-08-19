import { createClient, getCachedUser } from "@/lib/supabase/server";

export async function listLedCircles() {
  const supabase = await createClient();
  const user = await getCachedUser();
  if (!user) return [];

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  let query = supabase.from("circles").select("id, name").order("name");
  if (profile?.role !== "admin") {
    query = query.eq("leader_id", user.id);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getCircleSettings(circleId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("circles").select("*").eq("id", circleId).single();
  if (error || !data) return null;
  return data;
}

// Who hasn't hosted in the longest time (or ever) among members who can
// host — a suggestion, not an assignment. Computed from event history
// rather than stored, so it's always current.
export async function suggestNextHost(circleId: string) {
  const supabase = await createClient();

  const { data: memberRows } = await supabase
    .from("circle_members")
    .select("profile_id")
    .eq("circle_id", circleId);
  const memberIds = (memberRows ?? []).map((row) => row.profile_id);
  if (memberIds.length === 0) return [];

  const { data: hostCandidates } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", memberIds)
    .eq("can_host", true);
  if (!hostCandidates || hostCandidates.length === 0) return [];

  const { data: pastEvents } = await supabase
    .from("events")
    .select("host_id, starts_at")
    .eq("circle_id", circleId)
    .not("host_id", "is", null)
    .order("starts_at", { ascending: false });

  const lastHostedAt = new Map<string, string>();
  for (const event of pastEvents ?? []) {
    if (event.host_id && !lastHostedAt.has(event.host_id)) {
      lastHostedAt.set(event.host_id, event.starts_at);
    }
  }

  return hostCandidates
    .map((candidate) => ({
      id: candidate.id,
      fullName: candidate.full_name,
      lastHostedAt: lastHostedAt.get(candidate.id) ?? null,
    }))
    .sort((a, b) => {
      if (!a.lastHostedAt && !b.lastHostedAt) return 0;
      if (!a.lastHostedAt) return -1;
      if (!b.lastHostedAt) return 1;
      return a.lastHostedAt.localeCompare(b.lastHostedAt);
    });
}
