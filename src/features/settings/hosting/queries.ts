import { createClient, getCachedUser } from "@/lib/supabase/server";

export async function listOwnBlackoutDates() {
  const supabase = await createClient();
  const user = await getCachedUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("host_blackout_dates")
    .select("*")
    .eq("profile_id", user.id)
    .order("starts_on", { ascending: true });
  if (error) throw error;
  return data;
}
