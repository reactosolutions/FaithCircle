import { z } from "zod";

export const ATTENDANCE_STATUSES = ["present", "absent", "excused"] as const;
export const ATTEND_MODES = ["in_person", "online"] as const;

// FormData.get() returns null (not "") for a field with no matching input in
// the DOM at all — both mean "no value".
const emptyToUndefined = (value: unknown) => (value === "" || value === null ? undefined : value);

export const attendanceEntrySchema = z.object({
  profileId: z.uuid(),
  status: z.enum(ATTENDANCE_STATUSES),
  note: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  mode: z.preprocess(emptyToUndefined, z.enum(ATTEND_MODES).optional()),
});

export const saveAttendanceSchema = z.object({
  eventId: z.uuid(),
  entries: z.array(attendanceEntrySchema).min(1),
});

export const recordOwnAttendanceSchema = z.object({
  eventId: z.uuid(),
  status: z.enum(ATTENDANCE_STATUSES),
  mode: z.preprocess(emptyToUndefined, z.enum(ATTEND_MODES).optional()),
});
