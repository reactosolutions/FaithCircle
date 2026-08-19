import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/supabase/server";

// proxy.ts already redirects "/" based on auth state; this is a fallback
// in case a request ever reaches here without going through it.
export default async function RootPage() {
  const user = await getCachedUser();

  redirect(user ? "/dashboard" : "/sign-in");
}
