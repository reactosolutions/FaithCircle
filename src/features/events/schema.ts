import { z } from "zod";

export const EVENT_RECURRENCES = ["none", "weekly", "biweekly", "monthly"] as const;
export const EVENT_EDIT_SCOPES = ["this", "upcoming", "series"] as const;
export const RSVP_RESPONSES = ["going", "not_going", "tentative", "no_response"] as const;
export const EVENT_FORMATS = ["in_person", "online", "hybrid"] as const;
export const MEET_PROVIDERS = ["google_meet", "zoom", "teams", "other"] as const;
export const EVENT_AUDIENCES = ["circle", "multi_circle", "custom"] as const;
export const ATTEND_MODES = ["in_person", "online"] as const;
export const REASON_CATEGORIES = [
  "travel",
  "illness",
  "work",
  "family",
  "distance",
  "other",
] as const;

// FormData.get() returns null (not "") for a field with no matching input in
// the DOM at all — both mean "no value".
const emptyToUndefined = (value: unknown) => (value === "" || value === null ? undefined : value);

// Comma-separated hidden-input value (same pattern as hostId/recurrence in
// ScheduleEventDialog) split into a uuid array, dropping blanks.
const idList = z.preprocess((value) => {
  if (typeof value !== "string" || value.trim() === "") return [];
  return value.split(",").map((v) => v.trim()).filter(Boolean);
}, z.array(z.uuid()));

// Shared by createEventSchema and editEventSchema — same three
// cross-field rules apply whether the meeting is brand new or being
// edited.
function refineEventFields(
  data: {
    format: (typeof EVENT_FORMATS)[number];
    meetUrl?: string;
    audience: (typeof EVENT_AUDIENCES)[number];
    extraCircleIds: string[];
    inviteeIds: string[];
  },
  ctx: z.RefinementCtx,
) {
  if (data.format !== "in_person" && !data.meetUrl) {
    ctx.addIssue({
      code: "custom",
      path: ["meetUrl"],
      message: "Online and hybrid meetings need a meeting link.",
    });
  }
  if (data.audience === "multi_circle" && data.extraCircleIds.length === 0) {
    ctx.addIssue({
      code: "custom",
      path: ["extraCircleIds"],
      message: "Pick at least one other circle to invite.",
    });
  }
  if (data.audience === "custom" && data.inviteeIds.length === 0) {
    ctx.addIssue({
      code: "custom",
      path: ["inviteeIds"],
      message: "Pick at least one person to invite.",
    });
  }
}

export const createEventSchema = z
  .object({
    circleId: z.uuid(),
    title: z.string().trim().min(1, { error: "Give the meeting a title." }),
    description: z.preprocess(emptyToUndefined, z.string().trim().optional()),
    startsAt: z.string().min(1, { error: "Pick a date and time." }),
    durationMinutes: z.coerce.number().int().positive(),
    recurrence: z.enum(EVENT_RECURRENCES),
    format: z.enum(EVENT_FORMATS),
    hostId: z.preprocess(emptyToUndefined, z.uuid().optional()),
    address: z.preprocess(emptyToUndefined, z.string().trim().optional()),
    inPersonCapacity: z.preprocess(
      emptyToUndefined,
      z.coerce.number().int().positive().optional(),
    ),
    meetUrl: z.preprocess(emptyToUndefined, z.url().optional()),
    meetProvider: z.preprocess(emptyToUndefined, z.enum(MEET_PROVIDERS).optional()),
    meetNotes: z.preprocess(emptyToUndefined, z.string().trim().optional()),
    audience: z.enum(EVENT_AUDIENCES),
    extraCircleIds: idList,
    inviteeIds: idList,
  })
  .superRefine(refineEventFields);

// Editing never changes the recurrence pattern itself (that's what
// scheduling a new series is for) — scope decides which existing rows this
// edit's field values get applied to instead. See updateEvent() in
// actions.ts for what each scope actually does.
export const editEventSchema = z
  .object({
    eventId: z.uuid(),
    scope: z.enum(EVENT_EDIT_SCOPES),
    title: z.string().trim().min(1, { error: "Give the meeting a title." }),
    description: z.preprocess(emptyToUndefined, z.string().trim().optional()),
    startsAt: z.string().min(1, { error: "Pick a date and time." }),
    durationMinutes: z.coerce.number().int().positive(),
    format: z.enum(EVENT_FORMATS),
    hostId: z.preprocess(emptyToUndefined, z.uuid().optional()),
    address: z.preprocess(emptyToUndefined, z.string().trim().optional()),
    inPersonCapacity: z.preprocess(
      emptyToUndefined,
      z.coerce.number().int().positive().optional(),
    ),
    meetUrl: z.preprocess(emptyToUndefined, z.url().optional()),
    meetProvider: z.preprocess(emptyToUndefined, z.enum(MEET_PROVIDERS).optional()),
    meetNotes: z.preprocess(emptyToUndefined, z.string().trim().optional()),
    audience: z.enum(EVENT_AUDIENCES),
    extraCircleIds: idList,
    inviteeIds: idList,
  })
  .superRefine(refineEventFields);

// attendMode is only required from the client on a hybrid event — the
// action forces it to the event's only valid mode on a single-format event,
// which needs a DB lookup this schema can't do, so that check lives there.
// The other reason-required case — going online instead of in person on a
// hybrid meeting — depends on the event's format, which isn't part of this
// input either, so it's checked in the action right alongside the
// attendMode forcing, not here.
export const rsvpSchema = z
  .object({
    eventId: z.uuid(),
    response: z.enum(RSVP_RESPONSES),
    attendMode: z.preprocess(emptyToUndefined, z.enum(ATTEND_MODES).optional()),
    reason: z.preprocess(emptyToUndefined, z.string().trim().max(500).optional()),
    reasonCategory: z.preprocess(emptyToUndefined, z.enum(REASON_CATEGORIES).optional()),
  })
  .refine((data) => data.response !== "not_going" || data.reason || data.reasonCategory, {
    error: "Let them know why you can't make it.",
    path: ["reason"],
  });
