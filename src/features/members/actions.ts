"use server";

import { randomBytes } from "crypto";
import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission } from "@/lib/permissions";
import { notifyUsers } from "@/lib/notifications";
import type { ActionResult } from "@/lib/action-result";
import {
  updateMemberRoleSchema,
  updateMemberStatusSchema,
  inviteMemberSchema,
  updateMemberProfileSchema,
  resetMemberPasswordSchema,
  cancelInvitationSchema,
} from "./schema";

// No email system relied on for onboarding (see inviteMember/resetMemberPassword
// below) — a temp password an admin reads aloud or pastes into a message
// needs to be typeable without ambiguity, so the easily-confused characters
// (0/O, 1/l/I) are left out.
const TEMP_PASSWORD_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
function generateTempPassword(length = 12): string {
  return Array.from(randomBytes(length), (b) => TEMP_PASSWORD_CHARS[b % TEMP_PASSWORD_CHARS.length]).join("");
}

export async function updateMemberRole(input: unknown): Promise<ActionResult> {
  const parsed = updateMemberRoleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const lookupClient = await createClient();
  const { data: target } = await lookupClient
    .from("profiles")
    .select("role, status")
    .eq("id", parsed.data.profileId)
    .single();
  if (!target) {
    return { ok: false, error: "That member no longer exists." };
  }

  // Either side of the transition touching the admin tier needs the
  // stronger permission — today only 'admin' ever holds either key, but
  // this keeps the check meaningful if that changes.
  const guardKey =
    target.role === "admin" || parsed.data.role === "admin"
      ? "roles.assign_admin"
      : "roles.assign_administrative";
  const actor = await requirePermission(guardKey);
  if (!actor.ok) return actor;

  if (target.role === "administrative" && parsed.data.role !== "administrative") {
    if (!parsed.data.reassignLeaderId && !parsed.data.leaveLeaderless) {
      return { ok: false, error: "Choose what happens to the circles they lead." };
    }
  }

  if (target.role === "admin" && parsed.data.role !== "admin") {
    const { count } = await actor.supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin")
      .eq("status", "active");
    if ((count ?? 0) <= 1) {
      return { ok: false, error: "You can't demote the last remaining admin." };
    }
  }

  // change_member_role() checks admin-only and no-self-change itself (at
  // the database layer, not just here) and threads `reason` through to the
  // audit_row() trigger via a transaction-scoped set_config — a normal
  // .update() has no column for that, since the trigger has to be able to
  // read it without the caller passing it as row data.
  const { error } = await actor.supabase.rpc("change_member_role", {
    target_profile: parsed.data.profileId,
    new_role: parsed.data.role,
    reason: parsed.data.reason,
  });

  if (error) {
    return { ok: false, error: error.message || "Could not update role." };
  }

  // Circle leadership follows the role change: promotion picks up the
  // named circle, demotion resolves whatever the caller chose above. Not
  // atomic with the role change itself (two separate requests) — if this
  // part fails after the RPC succeeded, the role has changed but
  // leadership hasn't caught up yet, which is recoverable by retrying.
  if (parsed.data.role === "administrative" && parsed.data.circleId) {
    await actor.supabase
      .from("circle_leaders")
      .upsert(
        { circle_id: parsed.data.circleId, profile_id: parsed.data.profileId },
        { onConflict: "circle_id,profile_id" },
      );
  }

  if (target.role === "administrative" && parsed.data.role !== "administrative") {
    const { data: ledCircles } = await actor.supabase
      .from("circle_leaders")
      .select("circle_id")
      .eq("profile_id", parsed.data.profileId);

    if (parsed.data.reassignLeaderId && ledCircles && ledCircles.length > 0) {
      await actor.supabase.from("circle_leaders").upsert(
        ledCircles.map((row) => ({
          circle_id: row.circle_id,
          profile_id: parsed.data.reassignLeaderId as string,
        })),
        { onConflict: "circle_id,profile_id" },
      );
    }

    await actor.supabase.from("circle_leaders").delete().eq("profile_id", parsed.data.profileId);
  }

  await notifyUsers([parsed.data.profileId], "role_changed", { newRole: parsed.data.role });

  refresh();
  return { ok: true };
}

export async function updateMemberStatus(input: unknown): Promise<ActionResult> {
  const parsed = updateMemberStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const actor = await requirePermission("members.deactivate");
  if (!actor.ok) return actor;

  if (parsed.data.profileId === actor.userId) {
    return { ok: false, error: "You can't deactivate your own account." };
  }

  if (parsed.data.status !== "active") {
    const { data: target } = await actor.supabase
      .from("profiles")
      .select("role")
      .eq("id", parsed.data.profileId)
      .single();
    if (target?.role === "admin") {
      const { count } = await actor.supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin")
        .eq("status", "active");
      if ((count ?? 0) <= 1) {
        return { ok: false, error: "You can't deactivate the last remaining admin." };
      }
    }
  }

  const { error } = await actor.supabase
    .from("profiles")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.profileId);

  if (error) {
    return { ok: false, error: "Could not update status." };
  }

  refresh();
  return { ok: true };
}

export async function inviteMember(
  _prevState: ActionResult<{ tempPassword: string }> | undefined,
  formData: FormData,
): Promise<ActionResult<{ tempPassword: string }>> {
  const parsed = inviteMemberSchema.safeParse({
    email: formData.get("email"),
    fullName: formData.get("fullName"),
    role: formData.get("role"),
    circleId: formData.get("circleId"),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  // members.invite's 'circle' scope (administrative) only covers the named
  // circle, not an org-wide invite — passing circleId here is what lets
  // has_permission() reject an administrative inviting into a circle they
  // don't lead, the same way every other 'circle'-scoped write is checked.
  const actor = await requirePermission("members.invite", { circleId: parsed.data.circleId });
  if (!actor.ok) return actor;

  // members.invite only ever grants inviting as a peer-or-below — assigning
  // 'administrative' or 'admin' through this form needs the same stronger
  // permission updateMemberRole requires for those tiers, so an
  // administrative can't hand out a leadership or admin seat just because
  // they're allowed to invite into their own circle.
  if (parsed.data.role !== "student") {
    const roleGuard = await requirePermission(
      parsed.data.role === "admin" ? "roles.assign_admin" : "roles.assign_administrative",
    );
    if (!roleGuard.ok) {
      return { ok: false, error: "You can only add members as student." };
    }
  }

  // No email system relied on for onboarding — createUser() with a
  // generated password and email_confirm: true makes the account usable
  // immediately; the admin shares the password with the invitee directly
  // (see InviteDialog) instead of them clicking an emailed link. This is
  // also why status is force-set to 'invited' below rather than left to
  // handle_new_user()'s trigger: that trigger only sees 'invited' when
  // auth.users.invited_at is set, which only inviteUserByEmail() does —
  // createUser() leaves it null, so without the explicit override every
  // admin-created account would default to 'pending' like a self-signup.
  const tempPassword = generateTempPassword();
  const adminClient = createAdminClient();
  const { data, error } = await adminClient.auth.admin.createUser({
    email: parsed.data.email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.fullName },
  });

  if (error || !data.user) {
    return { ok: false, error: error?.message ?? "Could not create the account." };
  }

  // handle_new_user() already created a default 'student' profile row for
  // the new auth user (see schema.sql) — apply the chosen name/role here.
  // must_change_password forces them off this temp password on first sign-in
  // (see the (app) layout's gate and changeRequiredPassword).
  const { error: profileError } = await adminClient
    .from("profiles")
    .update({
      role: parsed.data.role,
      full_name: parsed.data.fullName,
      status: "invited",
      must_change_password: true,
    })
    .eq("id", data.user.id);

  if (profileError) {
    return { ok: false, error: "Invite was sent, but the role could not be set." };
  }

  if (parsed.data.circleId) {
    if (parsed.data.role === "administrative") {
      await adminClient
        .from("circle_leaders")
        .upsert(
          { circle_id: parsed.data.circleId, profile_id: data.user.id },
          { onConflict: "circle_id,profile_id" },
        );
    } else {
      await adminClient
        .from("circle_members")
        .upsert(
          { circle_id: parsed.data.circleId, profile_id: data.user.id },
          { onConflict: "circle_id,profile_id" },
        );
    }
  }

  refresh();
  return { ok: true, data: { tempPassword } };
}

// members.edit is 'admin'-only for someone else's row (see the Permissions
// matrix — administrative doesn't hold this permission at all), which is
// what makes this admin-only too: an administrative can invite into their
// own circle, but can't reset a password after the fact, the same
// asymmetry updateMemberProfile already has.
export async function resetMemberPassword(input: unknown): Promise<ActionResult<{ tempPassword: string }>> {
  const parsed = resetMemberPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const actor = await requirePermission("members.edit", { profileId: parsed.data.profileId });
  if (!actor.ok) return actor;

  const tempPassword = generateTempPassword();
  const adminClient = createAdminClient();
  const { error } = await adminClient.auth.admin.updateUserById(parsed.data.profileId, {
    password: tempPassword,
  });

  if (error) {
    return { ok: false, error: "Could not reset the password." };
  }

  // Same forced-change gate inviteMember sets — this is a temp password
  // too, just generated later instead of at account creation.
  await adminClient
    .from("profiles")
    .update({ must_change_password: true })
    .eq("id", parsed.data.profileId);

  return { ok: true, data: { tempPassword } };
}

// members.deactivate is admin-only (see the Permissions matrix —
// administrative never holds it), matching the request this cancel action
// is for: only an admin can undo an invitation before the person ever
// signs in. Restricted to status = 'invited' so this can never be used to
// delete a real active/inactive member's account by mistake — that's what
// updateMemberStatus's deactivate path is for, and it only ever flips a
// status flag rather than deleting anything.
export async function cancelInvitation(input: unknown): Promise<ActionResult> {
  const parsed = cancelInvitationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const actor = await requirePermission("members.deactivate");
  if (!actor.ok) return actor;

  const { data: target } = await actor.supabase
    .from("profiles")
    .select("status")
    .eq("id", parsed.data.profileId)
    .single();
  if (target?.status !== "invited") {
    return { ok: false, error: "This account is no longer just an invitation." };
  }

  // Deleting the auth.users row cascades to profiles (and from there to
  // circle_members/circle_leaders) per their `on delete cascade` foreign
  // keys — nothing else to clean up separately.
  const adminClient = createAdminClient();
  const { error } = await adminClient.auth.admin.deleteUser(parsed.data.profileId);
  if (error) {
    return { ok: false, error: "Could not cancel the invitation." };
  }

  refresh();
  return { ok: true };
}

// members.edit is 'own' for student and unavailable to administrative (see
// the Permissions matrix) — only admin can edit someone else's basic info,
// which is what makes this a distinct action from the account-settings
// AccountForm (which only ever edits the caller's own row).
export async function updateMemberProfile(
  _prevState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = updateMemberProfileSchema.safeParse({
    profileId: formData.get("profileId"),
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const actor = await requirePermission("members.edit", { profileId: parsed.data.profileId });
  if (!actor.ok) return actor;

  const { error } = await actor.supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName, phone: parsed.data.phone ?? null })
    .eq("id", parsed.data.profileId);

  if (error) {
    return { ok: false, error: "Could not save changes." };
  }

  refresh();
  return { ok: true };
}
