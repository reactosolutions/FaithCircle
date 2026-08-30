import type { AttendanceStatus, ReasonCategory, RsvpResponse } from "@/lib/database.types";

// RSVP and attendance are one record (event_rsvps). The attendance UI still
// speaks present / absent / excused; these translate to and from the stored
// `response` (+ reason) so the write paths land on the same row a plain RSVP
// would.
//   going                -> present
//   not_going, no reason  -> absent
//   not_going, has reason -> excused
export function statusFromResponse(
  response: RsvpResponse | null,
  reason: string | null,
  reasonCategory: ReasonCategory | null,
): AttendanceStatus | null {
  if (response === "going") return "present";
  if (response === "not_going") return reason || reasonCategory ? "excused" : "absent";
  return null;
}

export function responseFromStatus(status: AttendanceStatus): {
  response: RsvpResponse;
  reasonCategory: ReasonCategory | null;
} {
  if (status === "present") return { response: "going", reasonCategory: null };
  // "excused" carries an explicit reason_category so statusFromResponse can
  // tell it back apart from a plain "absent".
  if (status === "excused") return { response: "not_going", reasonCategory: "other" };
  return { response: "not_going", reasonCategory: null };
}
