import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/database.types";

// Reachable without a session. /join is the public join-request page for
// people who aren't members yet; /signup is the self-service equivalent
// that creates its own account instead of requesting one.
const PUBLIC_ROUTES = ["/sign-in", "/signup", "/forgot-password", "/reset-password", "/join"];
// Of those, the ones an already-signed-in visitor should be bounced away
// from. /reset-password is deliberately excluded: its recovery token lives
// only in the URL fragment, which never reaches this proxy, so auth state
// here says nothing about whether the visitor has a legitimate reason to be
// on that page — it must stay reachable regardless of session state.
const REDIRECT_IF_AUTHED_ROUTES = ["/sign-in", "/signup", "/forgot-password", "/join"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (pairs) => {
          pairs.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          pairs.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: do not add logic between createServerClient and this call.
  // A dropped call here can randomly log users out.
  //
  // getClaims() verifies the JWT locally against the project's cached JWKS
  // instead of round-tripping to the Auth server on every navigation, the
  // way getUser() always does — this runs on nearly every request via the
  // proxy matcher below, so it's the single biggest routing-speed lever in
  // the app. It only skips the network call if the Supabase project has
  // asymmetric (ECC/RSA) JWT signing keys enabled (Dashboard > Authentication
  // > JWT Keys); on a project still using the legacy shared secret it falls
  // back to the same server round trip getUser() made, so this is a no-op
  // speed-wise until that migration is done, but never slower or less secure.
  const { data, error } = await supabase.auth.getClaims();
  const user = data?.claims ?? null;

  // A transient failure verifying the JWT (network hiccup on the round
  // trip getClaims() falls back to) is not the same as "no session" —
  // treating it as logged-out here forces a redirect to /sign-in, and if
  // the *next* request's round trip happens to succeed, that page's own
  // redirect-if-authed check bounces straight back to /dashboard —
  // alternating forever under a flaky connection, each hop paying the
  // full timeout. On error, let the request through unredirected and
  // leave the real check to (app)/layout.tsx's getCachedUser(), which is
  // authoritative anyway and will redirect correctly once resolved.
  if (error) {
    return response;
  }

  const { pathname } = request.nextUrl;
  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
  const redirectIfAuthed = REDIRECT_IF_AUTHED_ROUTES.some((route) => pathname.startsWith(route));

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    return NextResponse.redirect(url);
  }

  if (user && (redirectIfAuthed || pathname === "/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}
