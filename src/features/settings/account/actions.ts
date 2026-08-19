"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { createClient, getCachedUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/lib/action-result";
import { changePasswordSchema, updateAccountSchema } from "./schema";

export async function updateAccount(
  _prevState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = updateAccountSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const user = await getCachedUser();
  if (!user) {
    return { ok: false, error: "You need to sign in again." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName, phone: parsed.data.phone ?? null })
    .eq("id", user.id);

  if (error) {
    return { ok: false, error: "Could not save your profile." };
  }

  refresh();
  return { ok: true };
}

export async function changePassword(
  _prevState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword") || undefined,
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const user = await getCachedUser();
  if (!user?.email) {
    return { ok: false, error: "You need to sign in again." };
  }

  const hasPasswordIdentity = user.identities?.some((identity) => identity.provider === "email");

  if (hasPasswordIdentity) {
    if (!parsed.data.currentPassword) {
      return { ok: false, error: "Enter your current password." };
    }
    // Supabase's updateUser() doesn't itself re-check the current password —
    // verify it explicitly by attempting a fresh sign-in before applying
    // the change, so this can't be used to hijack a session left open on a
    // shared device.
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: parsed.data.currentPassword,
    });
    if (verifyError) {
      return { ok: false, error: "Current password is incorrect." };
    }
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return { ok: false, error: "Could not update your password." };
  }

  return { ok: true };
}

export async function signOutEverywhere() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "global" });
  redirect("/sign-in");
}

// "Deactivate account" doesn't flip status directly — profiles.status is
// protected by the prevent_self_role_escalation trigger (schema.sql), which
// silently reverts role/status changes from anyone but an admin. That's
// deliberate: this is a REQUEST an admin has to act on, not a self-service
// toggle, so it goes through notifications the same way any other
// admin-facing alert would.
export async function requestDeactivation(): Promise<ActionResult> {
  const supabase = await createClient();
  const user = await getCachedUser();
  if (!user) {
    return { ok: false, error: "You need to sign in again." };
  }

  const { data: requester } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .single();

  const { data: admins } = await supabase.from("profiles").select("id").eq("role", "admin");
  if (!admins || admins.length === 0) {
    return { ok: false, error: "No admin found to review this request." };
  }

  // notifications' insert policy requires is_admin() — the requester isn't
  // one, so this has to go through the service-role client, same as the
  // member-invite flow.
  const adminClient = createAdminClient();
  const { error } = await adminClient.from("notifications").insert(
    admins.map((admin) => ({
      profile_id: admin.id,
      type: "deactivation_request",
      payload: {
        requester_id: user.id,
        requester_name: requester?.full_name ?? requester?.email ?? "A member",
      },
    })),
  );

  if (error) {
    return { ok: false, error: "Could not send the request." };
  }

  return { ok: true };
}
