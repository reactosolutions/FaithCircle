import { useTranslations } from "next-intl";
import type { MonthlyAttendance } from "../monthly";

// Compact month-by-month attendance list — one row per month with a mini
// meter and its own percentage. Sits under the overall number, never
// replaces it.
export function MonthlyAttendanceBars({ months }: { months: MonthlyAttendance[] }) {
  const t = useTranslations("Attendance");
  if (months.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-xs font-semibold text-muted-foreground">{t("byMonthTitle")}</h4>
      <div className="flex flex-col gap-2">
        {months.map((month) => (
          <div key={month.key} className="flex items-center gap-3 text-xs">
            <span className="w-16 shrink-0 text-muted-foreground">{month.label}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-success" style={{ width: `${month.pct}%` }} />
            </div>
            <span className="w-24 shrink-0 text-end text-muted-foreground">
              {t("byMonthCount", { present: month.present, total: month.total, pct: month.pct })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
