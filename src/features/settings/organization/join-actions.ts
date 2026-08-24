"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { notifyUsers, listAdminProfileIds } from "@/lib/notifications";
import type { ActionResult } from "@/lib/action-result";
import { submitJoinRequestSchema } from "./join-schema";

// Public and unauthenticated by design — there's no session to check RLS
// against, so both the token check and the insert use the service-role
// client deliberately, scoped to exactly these two operations.
export async function validateInviteToken(token: string): Promise<boolean> {
  const adminClient = createAdminClient();
  const { data } = await adminClient
    .from("org_settings")
    .select("invite_link_token")
    .eq("id", true)
    .single();
  return Boolean(data?.invite_link_token) && data?.invite_link_token === token;
}

export async function submitJoinRequest(
  token: string,
  _prevState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = submitJoinRequestSchema.safeParse({
    email: formData.get("email"),
    fullName: formData.get("fullName"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const valid = await validateInviteToken(token);
  if (!valid) {
    return { ok: false, error: "This invite link is no longer valid." };
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient.from("join_requests").insert({
    email: parsed.data.email,
    full_name: parsed.data.fullName,
  });

  if (error) {
    return { ok: false, error: "Could not submit your request." };
  }

  const adminIds = await listAdminProfileIds();
  await notifyUsers(adminIds, "new_signup", {
    kind: "join_request",
    fullName: parsed.data.fullName,
    email: parsed.data.email,
  });

  return { ok: true };
}
