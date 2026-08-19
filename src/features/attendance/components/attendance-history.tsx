import { useTranslations } from "next-intl";
import { formatEventDate } from "@/features/events/format";
import { Icon } from "@/components/ui/icon";
import { useAttendanceStatusMeta } from "../status-meta";
import type { AttendanceStatus } from "@/lib/database.types";

interface HistoryEntry {
  status: AttendanceStatus;
  eventTitle: string;
  startsAt: string;
}

const LEGEND_ORDER: AttendanceStatus[] = ["present", "excused", "absent"];

export function AttendanceHistory({ entries }: { entries: HistoryEntry[] }) {
  const t = useTranslations("Attendance");
  const ATTENDANCE_STATUS_META = useAttendanceStatusMeta();
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("noAttendanceRecorded")}</p>;
  }

  const presentCount = entries.filter((entry) => entry.status === "present").length;
  const rate = Math.round((presentCount / entries.length) * 100);
  const statusesPresent = new Set(entries.map((entry) => entry.status));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-medium text-foreground">
            {t("meetingsAttended", { present: presentCount, total: entries.length })}
          </span>
          <span className="text-muted-foreground">{rate}%</span>
        </div>
        {/* Meter: fill = attendance rate, track = a neutral, lighter step */}
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-success" style={{ width: `${rate}%` }} />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {entries.map((entry, index) => {
          const meta = ATTENDANCE_STATUS_META[entry.status];
          const label = `${entry.eventTitle} — ${formatEventDate(entry.startsAt)}: ${meta.label}`;
          return (
            <span
              key={index}
              title={label}
              aria-label={label}
              className={`flex size-6 items-center justify-center rounded-full ${meta.solidClass}`}
            >
              <Icon name={meta.iconName} size={14} />
            </span>
          );
        })}
      </div>

      {statusesPresent.size > 1 && (
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {LEGEND_ORDER.filter((status) => statusesPresent.has(status)).map((status) => {
            const meta = ATTENDANCE_STATUS_META[status];
            return (
              <span key={status} className="flex items-center gap-1.5">
                <span
                  className={`flex size-4 items-center justify-center rounded-full ${meta.solidClass}`}
                >
                  <Icon name={meta.iconName} size={10} />
                </span>
                {meta.label}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
