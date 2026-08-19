import { createClient, getCachedUser } from "@/lib/supabase/server";

export async function listNotifications(limit = 50) {
  const supabase = await createClient();
  const user = await getCachedUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function getUnreadNotificationCount() {
  const supabase = await createClient();
  const user = await getCachedUser();
  if (!user) return 0;

  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", user.id)
    .is("read_at", null);
  if (error) throw error;
  return count ?? 0;
}
