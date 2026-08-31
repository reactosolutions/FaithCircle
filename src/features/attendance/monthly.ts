import { formatInTimeZone } from "date-fns-tz";
import { CIRCLE_TIME_ZONE } from "@/features/events/format";

export interface MonthlyAttendance {
  key: string; // "2026-08" — sortable
  label: string; // "Aug 2026"
  present: number;
  total: number;
  pct: number;
}

// Groups attendance/participation entries into calendar months (in the
// circle's timezone) and computes present / total per month. Newest month
// first, capped at `maxMonths`. Each month stands on its own — the rate is
// never diluted across months.
export function monthlyAttendance(
  entries: { startsAt: string; present: boolean }[],
  maxMonths = 6,
): MonthlyAttendance[] {
  const byMonth = new Map<string, { label: string; present: number; total: number }>();

  for (const entry of entries) {
    if (!entry.startsAt) continue;
    const at = new Date(entry.startsAt);
    const key = formatInTimeZone(at, CIRCLE_TIME_ZONE, "yyyy-MM");
    const bucket = byMonth.get(key) ?? {
      label: formatInTimeZone(at, CIRCLE_TIME_ZONE, "MMM yyyy"),
      present: 0,
      total: 0,
    };
    bucket.total += 1;
    if (entry.present) bucket.present += 1;
    byMonth.set(key, bucket);
  }

  return Array.from(byMonth.entries())
    .map(([key, b]) => ({
      key,
      label: b.label,
      present: b.present,
      total: b.total,
      pct: b.total > 0 ? Math.round((b.present / b.total) * 100) : 0,
    }))
    .sort((a, b) => b.key.localeCompare(a.key))
    .slice(0, maxMonths);
}
