"use server";

import { randomBytes } from "crypto";
import { refresh } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission } from "@/lib/permissions";
import type { ActionResult } from "@/lib/action-result";

const joinPolicySchema = z.object({ joinPolicy: z.enum(["open_invite", "approval_required"]) });

export async function updateJoinPolicy(input: unknown): Promise<ActionResult> {
  const parsed = joinPolicySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid input." };
  }

  const actor = await requirePermission("settings.organization");
  if (!actor.ok) return actor;

  const { error } = await actor.supabase
    .from("org_settings")
    .update({ join_policy: parsed.data.joinPolicy })
    .eq("id", true);

  if (error) {
    return { ok: false, error: "Could not save." };
  }

  refresh();
  return { ok: true };
}

export async function regenerateInviteLink(): Promise<ActionResult> {
  const actor = await requirePermission("settings.organization");
  if (!actor.ok) return actor;

  const token = randomBytes(16).toString("hex");
  const { error } = await actor.supabase
    .from("org_settings")
    .update({ invite_link_token: token })
    .eq("id", true);

  if (error) {
    return { ok: false, error: "Could not generate a link." };
  }

  refresh();
  return { ok: true };
}

export async function approveJoinRequest(id: string): Promise<ActionResult> {
  const actor = await requirePermission("settings.organization");
  if (!actor.ok) return actor;

  const { data: request } = await actor.supabase
    .from("join_requests")
    .select("*")
    .eq("id", id)
    .single();
  if (!request) {
    return { ok: false, error: "Request not found." };
  }

  const adminClient = createAdminClient();
  const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(request.email, {
    data: { full_name: request.full_name },
  });
  if (inviteError) {
    return { ok: false, error: "Could not send the invite." };
  }

  const { error } = await actor.supabase
    .from("join_requests")
    .update({ status: "approved", reviewed_by: actor.userId, reviewed_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return { ok: false, error: "Invite was sent, but the request could not be updated." };
  }

  refresh();
  return { ok: true };
}

export async function rejectJoinRequest(id: string): Promise<ActionResult> {
  const actor = await requirePermission("settings.organization");
  if (!actor.ok) return actor;

  const { error } = await actor.supabase
    .from("join_requests")
    .update({ status: "rejected", reviewed_by: actor.userId, reviewed_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return { ok: false, error: "Could not update the request." };
  }

  refresh();
  return { ok: true };
}

// Approves a self-service /signup sitting at status 'pending' (see
// (app)/layout.tsx and the Signup section of CLAUDE.md) — distinct from
// approveJoinRequest above, which is for the anonymous pre-account
// /join/[token] flow. circleId is optional: an admin can approve someone
// into the org without assigning a circle yet.
export async function approveSignup(profileId: string, circleId?: string): Promise<ActionResult> {
  const actor = await requirePermission("settings.organization");
  if (!actor.ok) return actor;

  const { error } = await actor.supabase
    .from("profiles")
    .update({ status: "active" })
    .eq("id", profileId)
    .eq("status", "pending");

  if (error) {
    return { ok: false, error: "Could not approve this account." };
  }

  if (circleId) {
    await actor.supabase
      .from("circle_members")
      .upsert({ circle_id: circleId, profile_id: profileId }, { onConflict: "circle_id,profile_id" });
  }

  refresh();
  return { ok: true };
}

export async function rejectSignup(profileId: string): Promise<ActionResult> {
  const actor = await requirePermission("settings.organization");
  if (!actor.ok) return actor;

  const { error } = await actor.supabase
    .from("profiles")
    .update({ status: "inactive" })
    .eq("id", profileId)
    .eq("status", "pending");

  if (error) {
    return { ok: false, error: "Could not reject this account." };
  }

  refresh();
  return { ok: true };
}
