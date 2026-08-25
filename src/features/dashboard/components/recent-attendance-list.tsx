import Link from "next/link";
import { useTranslations } from "next-intl";
import { formatDistanceToNow } from "date-fns";
import { StaggerItem } from "@/components/ui/stagger-item";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { useAttendanceStatusMeta } from "@/features/attendance/status-meta";
import type { AttendanceStatus } from "@/lib/database.types";

interface AttendanceLike {
  id: string;
  eventId: string;
  eventTitle: string;
  circleName: string | null;
  memberName: string | null;
  status: AttendanceStatus;
  markedAt: string;
}

// The admin dashboard's third "what just happened" list, alongside
// UpcomingEventsList and RecentSubmissionsList — the most recently marked
// attendance rows org-wide. Links to the meeting's own detail page (there's
// no standalone per-attendance-row page, same reasoning as
// RecentSubmissionsList linking to the assignment rather than one submission).
export function RecentAttendanceList({ entries }: { entries: AttendanceLike[] }) {
  const t = useTranslations("Dashboard");
  const STATUS_META = useAttendanceStatusMeta();

  if (entries.length === 0) {
    return <p className="p-4 text-sm text-muted-foreground">{t("noRecentAttendance")}</p>;
  }

  return (
    <div className="flex flex-col divide-y divide-border">
      {entries.map((row, index) => {
        const meta = STATUS_META[row.status];
        return (
          <StaggerItem key={row.id} index={index}>
            <Link
              href={`/events/${row.eventId}`}
              className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted/50"
            >
              <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full", meta.solidClass)}>
                <Icon name={meta.iconName} size={14} />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate font-medium text-foreground">
                    {row.memberName ?? t("unnamedMember")}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(row.markedAt), { addSuffix: true })}
                  </span>
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {row.circleName
                    ? t("submissionCirclePrefix", { title: row.eventTitle, circle: row.circleName })
                    : row.eventTitle}
                </span>
              </div>
            </Link>
          </StaggerItem>
        );
      })}
    </div>
  );
}
