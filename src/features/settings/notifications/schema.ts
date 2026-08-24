import { z } from "zod";
import { useTranslations } from "next-intl";

export const NOTIFICATION_TYPES = [
  "meeting_scheduled",
  "meeting_reminder",
  "host_assigned",
  "new_assignment",
  "assignment_due_soon",
  "feedback_received",
  "attendance_recorded",
  "role_changed",
  "new_signup",
] as const;

export function useNotificationTypeLabel(): Record<(typeof NOTIFICATION_TYPES)[number], string> {
  const t = useTranslations("Settings");
  return {
    meeting_scheduled: t("notifyMeetingScheduled"),
    meeting_reminder: t("notifyMeetingReminder"),
    host_assigned: t("notifyHostAssigned"),
    new_assignment: t("notifyNewAssignment"),
    assignment_due_soon: t("notifyAssignmentDueSoon"),
    feedback_received: t("notifyFeedbackReceived"),
    attendance_recorded: t("notifyAttendanceRecorded"),
    role_changed: t("notifyRoleChanged"),
    new_signup: t("notifyNewSignup"),
  };
}

export const REMINDER_LEAD_TIMES = ["1h", "3h", "1d", "2d"] as const;
export function useReminderLeadTimeLabel(): Record<(typeof REMINDER_LEAD_TIMES)[number], string> {
  const t = useTranslations("Settings");
  return {
    "1h": t("reminderLeadTime1h"),
    "3h": t("reminderLeadTime3h"),
    "1d": t("reminderLeadTime1d"),
    "2d": t("reminderLeadTime2d"),
  };
}

const channelPrefSchema = z.object({ in_app: z.boolean(), email: z.boolean() });

// FormData.get() returns null (not "") for a field with no matching input in
// the DOM at all — both mean "no value".
const emptyToUndefined = (value: unknown) => (value === "" || value === null ? undefined : value);

export const updateNotificationsSchema = z.object({
  notificationPrefs: z.string().transform((value, ctx) => {
    try {
      const parsed = JSON.parse(value) as Record<string, unknown>;
      const result: Record<string, { in_app: boolean; email: boolean }> = {};
      for (const type of NOTIFICATION_TYPES) {
        const entry = channelPrefSchema.safeParse(parsed[type]);
        if (!entry.success) {
          ctx.addIssue({ code: "custom", message: "Invalid notification preferences." });
          return z.NEVER;
        }
        result[type] = entry.data;
      }
      return result;
    } catch {
      ctx.addIssue({ code: "custom", message: "Invalid notification preferences." });
      return z.NEVER;
    }
  }),
  reminderLeadTime: z.enum(REMINDER_LEAD_TIMES),
  quietHoursStart: z.preprocess(emptyToUndefined, z.string().optional()),
  quietHoursEnd: z.preprocess(emptyToUndefined, z.string().optional()),
});
