import { z } from "zod";

// FormData.get() returns null (not "") for a field with no matching input in
// the DOM at all — both mean "no value".
const emptyToUndefined = (value: unknown) => (value === "" || value === null ? undefined : value);

export const updateCircleSettingsSchema = z.object({
  circleId: z.uuid(),
  name: z.string().trim().min(1, { error: "Name is required." }),
  description: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  defaultMeetingWeekday: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).max(6).optional()),
  defaultMeetingTime: z.preprocess(emptyToUndefined, z.string().optional()),
  defaultMeetingDurationMinutes: z.coerce.number().int().positive(),
  defaultRecurrence: z.enum(["none", "weekly", "biweekly", "monthly"]),
  homeworkDueOffsetDays: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).optional()),
  attendanceFlagThreshold: z.coerce.number().int().positive(),
});

export const updateCircleJoinPolicySchema = z.object({
  circleId: z.uuid(),
  joinPolicy: z.enum(["open_invite", "approval_required"]),
});
