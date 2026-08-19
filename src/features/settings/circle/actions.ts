"use server";

import { randomBytes } from "crypto";
import { refresh } from "next/cache";
import { requirePermission } from "@/lib/permissions";
import type { ActionResult } from "@/lib/action-result";
import { updateCircleJoinPolicySchema, updateCircleSettingsSchema } from "./schema";

export async function updateCircleSettings(
  _prevState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = updateCircleSettingsSchema.safeParse({
    circleId: formData.get("circleId"),
    name: formData.get("name"),
    description: formData.get("description"),
    defaultMeetingWeekday: formData.get("defaultMeetingWeekday"),
    defaultMeetingTime: formData.get("defaultMeetingTime"),
    defaultMeetingDurationMinutes: formData.get("defaultMeetingDurationMinutes"),
    defaultRecurrence: formData.get("defaultRecurrence"),
    homeworkDueOffsetDays: formData.get("homeworkDueOffsetDays"),
    attendanceFlagThreshold: formData.get("attendanceFlagThreshold"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const actor = await requirePermission("circles.edit_settings", { circleId: parsed.data.circleId });
  if (!actor.ok) return actor;

  const { error } = await actor.supabase
    .from("circles")
    .update({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      default_meeting_weekday: parsed.data.defaultMeetingWeekday ?? null,
      default_meeting_time: parsed.data.defaultMeetingTime ?? null,
      default_meeting_duration_minutes: parsed.data.defaultMeetingDurationMinutes,
      default_recurrence: parsed.data.defaultRecurrence,
      homework_due_offset_days: parsed.data.homeworkDueOffsetDays ?? null,
      attendance_flag_threshold: parsed.data.attendanceFlagThreshold,
    })
    .eq("id", parsed.data.circleId);

  if (error) {
    return { ok: false, error: "Could not save circle settings." };
  }

  refresh();
  return { ok: true };
}

// Distinct from updateCircleSettings above — a circle's join policy is
// what /signup's optional invite code checks (see the Signup section of
// CLAUDE.md), separate from the org-wide invite link in org_settings,
// which is for when no circle is named.
export async function updateCircleJoinPolicy(input: unknown): Promise<ActionResult> {
  const parsed = updateCircleJoinPolicySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid input." };
  }

  const actor = await requirePermission("circles.edit_settings", { circleId: parsed.data.circleId });
  if (!actor.ok) return actor;

  const { error } = await actor.supabase
    .from("circles")
    .update({ join_policy: parsed.data.joinPolicy })
    .eq("id", parsed.data.circleId);

  if (error) {
    return { ok: false, error: "Could not save." };
  }

  refresh();
  return { ok: true };
}

export async function regenerateCircleInviteCode(circleId: string): Promise<ActionResult> {
  const actor = await requirePermission("circles.edit_settings", { circleId });
  if (!actor.ok) return actor;

  const code = randomBytes(6).toString("hex");
  const { error } = await actor.supabase
    .from("circles")
    .update({ invite_code: code })
    .eq("id", circleId);

  if (error) {
    return { ok: false, error: "Could not generate a code." };
  }

  refresh();
  return { ok: true };
}
