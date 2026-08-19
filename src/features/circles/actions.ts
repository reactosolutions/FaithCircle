"use server";

import { randomBytes } from "crypto";
import { refresh } from "next/cache";
import { requirePermission } from "@/lib/permissions";
import type { ActionResult } from "@/lib/action-result";
import type { createClient } from "@/lib/supabase/server";
import {
  addCircleMembersSchema,
  createCircleSchema,
  removeCircleMemberSchema,
  updateCircleAdvisorsSchema,
} from "./schema";

// Defense in depth: advisor pickers only ever list administrative profiles,
// but a manipulated submission could name anyone. A stray circle_leaders
// row for a non-administrative profile can't itself grant elevated access
// (has_permission()'s 'circle' scope only consults circle_leaders for an
// administrative actor — see CLAUDE.md's Permissions section), but it's
// still bad data worth rejecting outright.
async function advisorIdsAreValid(
  supabase: Awaited<ReturnType<typeof createClient>>,
  advisorIds: string[],
) {
  if (advisorIds.length === 0) return true;
  const { data: advisorProfiles } = await supabase
    .from("profiles")
    .select("id, role")
    .in("id", advisorIds);
  return (
    (advisorProfiles ?? []).every((p) => p.role === "administrative") &&
    (advisorProfiles ?? []).length === advisorIds.length
  );
}

export async function createCircle(
  _prevState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = createCircleSchema.safeParse({
    name: formData.get("name"),
    advisorIds: formData.get("advisorIds"),
    membershipMode: formData.get("membershipMode"),
    memberIds: formData.get("memberIds"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const actor = await requirePermission("circles.create");
  if (!actor.ok) return actor;

  if (!(await advisorIdsAreValid(actor.supabase, parsed.data.advisorIds))) {
    return { ok: false, error: "One or more selected advisors are invalid." };
  }

  const inviteCode = parsed.data.generateInviteCode ? randomBytes(6).toString("hex") : null;

  const { data: circle, error } = await actor.supabase
    .from("circles")
    .insert({
      name: parsed.data.name,
      leader_id: parsed.data.advisorIds[0] ?? null,
      invite_code: inviteCode,
      join_policy: parsed.data.generateInviteCode ? "open_invite" : "approval_required",
    })
    .select("id")
    .single();

  if (error || !circle) {
    return { ok: false, error: "Could not create the circle." };
  }

  if (parsed.data.advisorIds.length > 0) {
    await actor.supabase
      .from("circle_leaders")
      .upsert(
        parsed.data.advisorIds.map((profileId) => ({ circle_id: circle.id, profile_id: profileId })),
        { onConflict: "circle_id,profile_id" },
      );
  }

  if (parsed.data.membershipMode === "students" && parsed.data.memberIds.length > 0) {
    await actor.supabase
      .from("circle_members")
      .upsert(
        parsed.data.memberIds.map((profileId) => ({ circle_id: circle.id, profile_id: profileId })),
        { onConflict: "circle_id,profile_id" },
      );
  }

  refresh();
  return { ok: true };
}

// Advisor reassignment writes circle_leaders, which RLS locks to
// is_admin() directly (see circle_leaders_write_admin in schema.sql) —
// admin-only regardless of scope, same as updateMemberRole's own
// circle_leaders writes, so this uses the same permission key rather than
// circles.edit_settings (which an administrative can also hold).
export async function updateCircleAdvisors(input: unknown): Promise<ActionResult> {
  const parsed = updateCircleAdvisorsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const actor = await requirePermission("roles.assign_administrative");
  if (!actor.ok) return actor;

  if (!(await advisorIdsAreValid(actor.supabase, parsed.data.advisorIds))) {
    return { ok: false, error: "One or more selected advisors are invalid." };
  }

  const { data: currentRows } = await actor.supabase
    .from("circle_leaders")
    .select("profile_id")
    .eq("circle_id", parsed.data.circleId);
  const currentIds = new Set((currentRows ?? []).map((r) => r.profile_id));
  const nextIds = new Set(parsed.data.advisorIds);

  const toAdd = parsed.data.advisorIds.filter((id) => !currentIds.has(id));
  const toRemove = Array.from(currentIds).filter((id) => !nextIds.has(id));

  if (toAdd.length > 0) {
    await actor.supabase
      .from("circle_leaders")
      .upsert(
        toAdd.map((profileId) => ({ circle_id: parsed.data.circleId, profile_id: profileId })),
        { onConflict: "circle_id,profile_id" },
      );
  }
  if (toRemove.length > 0) {
    await actor.supabase
      .from("circle_leaders")
      .delete()
      .eq("circle_id", parsed.data.circleId)
      .in("profile_id", toRemove);
  }

  // circles.leader_id is the circle's single primary/organizing leader used
  // for defaults elsewhere — keep it pointed at an actual advisor (or null)
  // rather than left dangling at someone just removed.
  const { data: circle } = await actor.supabase
    .from("circles")
    .select("leader_id")
    .eq("id", parsed.data.circleId)
    .single();
  if (circle && (!circle.leader_id || !nextIds.has(circle.leader_id))) {
    await actor.supabase
      .from("circles")
      .update({ leader_id: parsed.data.advisorIds[0] ?? null })
      .eq("id", parsed.data.circleId);
  }

  refresh();
  return { ok: true };
}

// Adding existing members writes circle_members, gated the same way
// inviteMember's circle_members write is — members.invite's 'circle' scope
// (administrative = leadership of this circle required, matching
// circle_members_write's RLS policy exactly).
export async function addCircleMembers(input: unknown): Promise<ActionResult> {
  const parsed = addCircleMembersSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const actor = await requirePermission("members.invite", { circleId: parsed.data.circleId });
  if (!actor.ok) return actor;

  const { error } = await actor.supabase
    .from("circle_members")
    .upsert(
      parsed.data.memberIds.map((profileId) => ({ circle_id: parsed.data.circleId, profile_id: profileId })),
      { onConflict: "circle_id,profile_id" },
    );
  if (error) {
    return { ok: false, error: "Could not add members." };
  }

  refresh();
  return { ok: true };
}

export async function removeCircleMember(input: unknown): Promise<ActionResult> {
  const parsed = removeCircleMemberSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid input." };
  }

  const actor = await requirePermission("members.invite", { circleId: parsed.data.circleId });
  if (!actor.ok) return actor;

  const { error } = await actor.supabase
    .from("circle_members")
    .delete()
    .eq("circle_id", parsed.data.circleId)
    .eq("profile_id", parsed.data.profileId);
  if (error) {
    return { ok: false, error: "Could not remove this member." };
  }

  refresh();
  return { ok: true };
}
