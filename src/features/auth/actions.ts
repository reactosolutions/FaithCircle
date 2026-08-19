"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient, getCachedUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  completeProfileSchema,
  forgotPasswordSchema,
  requestSignInCodeSchema,
  signInSchema,
  signupSchema,
  verifySignInCodeSchema,
} from "./schema";
import type { ActionResult } from "@/lib/action-result";

async function siteOrigin() {
  const headersList = await headers();
  const host = headersList.get("host");
  const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
  return `${protocol}://${host}`;
}

async function requestIp() {
  const headersList = await headers();
  // x-forwarded-for is set by every hosting platform this app is likely to
  // run behind (Vercel included); falls back to a shared bucket if it's
  // ever missing rather than skipping the rate limit entirely.
  return headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function signInWithPassword(
  _prevState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { ok: false, error: "Incorrect email or password." };
  }

  redirect("/dashboard");
}

export async function signInWithGoogle(): Promise<void> {
  const supabase = await createClient();
  const origin = await siteOrigin();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback` },
  });

  if (error || !data.url) {
    redirect("/sign-in?error=oauth");
  }

  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}

// Always returns { ok: true } for a well-formed email, whether or not an
// account exists for it — revealing that would let someone enumerate real
// member emails just by watching which addresses get a different response.
export async function requestPasswordReset(
  _prevState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const origin = await siteOrigin();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/reset-password`,
  });

  return { ok: true };
}

// A code-based alternative to the invite/confirmation email's link — for an
// account that already exists (admin-invited, or self-service /signup still
// awaiting confirmation). shouldCreateUser: false is load-bearing: this can
// only ever authenticate an existing account, never conjure one up from an
// email address alone.
export async function requestSignInCode(
  _prevState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = requestSignInCodeSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const ip = await requestIp();
  if (!checkRateLimit(`otp:${ip}:${parsed.data.email}`, 5, 15 * 60 * 1000)) {
    return { ok: false, error: "Too many attempts. Please try again later." };
  }

  const supabase = await createClient();
  await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { shouldCreateUser: false },
  });

  // Same generic response whether the email is real or not, matching
  // requestPasswordReset and signUp above.
  return { ok: true };
}

export async function verifySignInCode(
  _prevState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = verifySignInCodeSchema.safeParse({
    email: formData.get("email"),
    code: formData.get("code"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const ip = await requestIp();
  if (!checkRateLimit(`otp-verify:${ip}:${parsed.data.email}`, 8, 15 * 60 * 1000)) {
    return { ok: false, error: "Too many attempts. Please try again later." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email: parsed.data.email,
    token: parsed.data.code,
    type: "email",
  });

  if (error) {
    return { ok: false, error: "That code is invalid or has expired." };
  }

  redirect("/dashboard");
}

export async function signUp(
  _prevState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = signupSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    phone: formData.get("phone"),
    inviteCode: formData.get("inviteCode"),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const ip = await requestIp();
  if (!checkRateLimit(`signup:${ip}`, 5, 60 * 60 * 1000)) {
    return { ok: false, error: "Too many attempts. Please try again later." };
  }

  const supabase = await createClient();
  const origin = await siteOrigin();

  // The role is never sent here — handle_new_user() hardcodes 'student' on
  // every new profiles row, regardless of what (if anything) is in this
  // metadata blob. invite_code rides along for completeProfile() to check
  // against a circle's join_policy once the intake step is done.
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: {
        full_name: parsed.data.fullName,
        phone: parsed.data.phone,
        invite_code: parsed.data.inviteCode,
      },
    },
  });

  // Same generic response whether the email was new or already registered.
  // Supabase itself already avoids revealing which — with email
  // confirmations on, signUp() against an existing confirmed address
  // returns a "success" user with no new identity rather than an error —
  // this just makes sure nothing on top of that leaks the distinction for
  // the cases that DO error (rate limiting, transient failures).
  if (error) {
    // Temporary: surfaces the real Supabase error in the server console
    // while debugging signup failures, without changing the generic
    // anti-enumeration message shown to the user. Remove once resolved.
    console.error("[signUp] Supabase error:", error.status, error.code, error.message);
    return { ok: false, error: "Something went wrong. Please try again." };
  }

  if (data.user) {
    const adminClient = createAdminClient();
    await adminClient.from("audit_log").insert({
      table_name: "auth.users",
      record_id: data.user.id,
      action: "signup",
      actor_id: data.user.id,
      actor_role: "student",
      actor_email: parsed.data.email,
      context: { source: "app", ip },
    });
  }

  return { ok: true };
}

export async function resendConfirmationEmail(email: string): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse({ email });
  if (!parsed.success) {
    return { ok: false, error: "Invalid input." };
  }

  const ip = await requestIp();
  if (!checkRateLimit(`resend:${ip}:${parsed.data.email}`, 3, 10 * 60 * 1000)) {
    return { ok: false, error: "Please wait before requesting another email." };
  }

  const supabase = await createClient();
  const origin = await siteOrigin();
  await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });

  return { ok: true };
}

export async function completeProfile(
  _prevState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = completeProfileSchema.safeParse({
    phone: formData.get("phone"),
    canHost: formData.get("canHost"),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const user = await getCachedUser();
  if (!user) {
    return { ok: false, error: "You need to sign in again." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .single();

  // An admin invite already vouches for them — completing this step
  // activates immediately. A self-service /signup stays 'pending' here; it
  // only auto-activates below if a valid open-invite circle code was given
  // at signup, otherwise an admin approves it from the pending queue.
  let nextStatus: "active" | "pending" = profile?.status === "invited" ? "active" : "pending";
  let joinedCircleId: string | null = null;

  const inviteCode =
    typeof user.user_metadata?.invite_code === "string" ? user.user_metadata.invite_code : null;
  if (nextStatus === "pending" && inviteCode) {
    // A not-yet-a-member user can't read circles via the normal RLS path
    // (circles.view's 'circle' scope requires membership, which is exactly
    // what they're trying to get) — the admin client is the same "trusted
    // server-side lookup RLS genuinely can't allow" case the org-wide
    // /join/[token] flow already uses.
    const adminClient = createAdminClient();
    const { data: circle } = await adminClient
      .from("circles")
      .select("id, join_policy")
      .eq("invite_code", inviteCode)
      .maybeSingle();
    if (circle?.join_policy === "open_invite") {
      nextStatus = "active";
      joinedCircleId = circle.id;
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      phone: parsed.data.phone ?? null,
      can_host: parsed.data.canHost,
      status: nextStatus,
      profile_completed_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return { ok: false, error: "Could not save your profile." };
  }

  if (joinedCircleId) {
    const adminClient = createAdminClient();
    await adminClient
      .from("circle_members")
      .upsert(
        { circle_id: joinedCircleId, profile_id: user.id },
        { onConflict: "circle_id,profile_id" },
      );
  }

  redirect("/dashboard");
}
