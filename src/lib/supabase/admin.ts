import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Server-only. Uses the service role key, which bypasses RLS entirely.
// Never import this from a Client Component and never expose the key via
// a NEXT_PUBLIC_ variable. Only for operations that genuinely need to act
// outside RLS, like sending an auth invite for a user who doesn't exist
// yet — every call site must do its own permission check first, since RLS
// isn't there to do it for you.
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
