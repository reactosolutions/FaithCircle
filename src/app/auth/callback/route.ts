import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error");

  // The user declined the Google consent screen — Supabase redirects back
  // here with an OAuth error instead of a code, no exchange to attempt.
  if (oauthError === "access_denied") {
    return NextResponse.redirect(`${origin}/sign-in?error=cancelled`);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Onboarding routing (status 'invited' -> /complete-profile) lives
      // entirely in the (app) layout's check, not duplicated here, so
      // there's exactly one place that decides who needs it.
      return NextResponse.redirect(`${origin}/dashboard`);
    }

    if (
      error.code === "identity_already_exists" ||
      error.message?.toLowerCase().includes("already registered")
    ) {
      return NextResponse.redirect(`${origin}/sign-in?error=account_exists`);
    }
  }

  return NextResponse.redirect(`${origin}/sign-in?error=oauth`);
}
