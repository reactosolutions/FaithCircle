import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (pairs) => {
          try {
            pairs.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component render (layout/page), which
            // can't set cookies — safe to ignore because proxy.ts's
            // updateSession() already refreshes the session cookie on
            // every request. Only Server Actions/Route Handlers actually
            // need this to succeed, and there it will (no render in progress).
          }
        },
      },
    },
  );
}

// supabase.auth.getUser() always round-trips to the Auth server to revalidate
// the JWT — correct for security, but every layout/page/query/action in the
// (app) shell used to call it independently, so a single navigation could
// pay that round trip 3-4x over (proxy, layout, page, and again inside a
// query helper). React's cache() memoizes this per request, so no matter how
// many places call getCachedUser() during one render (or one Server Action
// invocation), the actual getUser() network call happens once.
export const getCachedUser = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
});
