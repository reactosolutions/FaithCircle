import { formatInTimeZone } from "date-fns-tz";
import { useTranslations } from "next-intl";
import type { EventFormat, MeetProvider } from "@/lib/database.types";

// Per CLAUDE.md: timestamps are stored as timestamptz in UTC, but always
// rendered in the circle's actual meeting timezone — not the viewer's
// browser timezone, which could be anywhere.
export const CIRCLE_TIME_ZONE = "Asia/Riyadh";

export function formatEventDateTime(iso: string) {
  return formatInTimeZone(new Date(iso), CIRCLE_TIME_ZONE, "EEE, MMM d 'at' h:mm a");
}

export function formatEventDate(iso: string) {
  return formatInTimeZone(new Date(iso), CIRCLE_TIME_ZONE, "MMM d, yyyy");
}

export function formatEventTime(iso: string) {
  return formatInTimeZone(new Date(iso), CIRCLE_TIME_ZONE, "h:mm a");
}

// yyyy-MM-dd in the circle's timezone — the key used to bucket events into
// calendar day cells, so a 11pm Riyadh event doesn't land on the wrong
// server-local day.
export function eventDayKey(iso: string) {
  return formatInTimeZone(new Date(iso), CIRCLE_TIME_ZONE, "yyyy-MM-dd");
}

// "yyyy-MM-ddTHH:mm" in the circle's timezone — pre-fills a <input
// type="datetime-local"> with an existing event's stored instant (edit
// forms), the counterpart to ScheduleEventDialog's create-side
// `fromZonedTime(value, CIRCLE_TIME_ZONE)`.
export function toDateTimeLocalValue(iso: string) {
  return formatInTimeZone(new Date(iso), CIRCLE_TIME_ZONE, "yyyy-MM-dd'T'HH:mm");
}

// The calendar grid's "which month/week am I looking at" anchor is a pure
// calendar date with no instant/timezone attached — it's not an event
// timestamp. Parsed via the local Date constructor (not `new Date(string)`,
// which parses as UTC) so grid math stays self-consistent regardless of the
// server's runtime timezone.
export function parseAnchorDate(value?: string): Date {
  if (value) {
    const [y, m, d] = value.split("-").map(Number);
    if (y && m && d) return new Date(y, m - 1, d);
  }
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function useFormatLabel(): Record<EventFormat, string> {
  const t = useTranslations("Events");
  return {
    in_person: t("formatInPerson"),
    online: t("formatOnline"),
    hybrid: t("formatHybrid"),
  };
}

export function useMeetProviderLabel(): Record<MeetProvider, string> {
  const t = useTranslations("Events");
  return {
    google_meet: t("meetProviderGoogleMeet"),
    zoom: t("meetProviderZoom"),
    teams: t("meetProviderTeams"),
    other: t("meetProviderOther"),
  };
}

// Best-effort, host-based — good enough to auto-fill the provider field and
// label the join button; never trusted for anything security-relevant.
export function detectMeetProvider(url: string): MeetProvider {
  try {
    const host = new URL(url).hostname;
    if (host.includes("meet.google.com")) return "google_meet";
    if (host.includes("zoom.us")) return "zoom";
    if (host.includes("teams.microsoft.com") || host.includes("teams.live.com")) return "teams";
  } catch {
    // Not a parseable URL yet (user is still typing) — fall through.
  }
  return "other";
}

const JOIN_WINDOW_LEAD_MINUTES = 15;

// The meeting link opens 15 minutes before start and stays open through the
// scheduled end (or +2h if the event has no ends_at).
export function canJoinMeeting(startsAt: string, endsAt: string | null, now = new Date()) {
  const start = new Date(startsAt);
  const end = endsAt ? new Date(endsAt) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const opensAt = new Date(start.getTime() - JOIN_WINDOW_LEAD_MINUTES * 60 * 1000);
  return now >= opensAt && now <= end;
}

export function minutesUntilJoinOpens(startsAt: string, now = new Date()) {
  const start = new Date(startsAt);
  const opensAt = new Date(start.getTime() - JOIN_WINDOW_LEAD_MINUTES * 60 * 1000);
  return Math.max(0, Math.ceil((opensAt.getTime() - now.getTime()) / 60_000));
}

// Attendance (leader-recorded or self-check-in) only opens once the
// meeting's own day has arrived, in the circle's timezone — comparing day
// keys rather than instants so it flips at Riyadh midnight, not whenever
// the marker's browser happens to think "today" is. No future-dated
// attendance, deliberately: the whole point is a record of who actually
// showed up, not a prediction.
export function isAttendanceOpen(startsAt: string, now = new Date()) {
  return eventDayKey(now.toISOString()) >= eventDayKey(startsAt);
}
