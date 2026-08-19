import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UpcomingEventsList } from "./upcoming-events-list";
import { PendingHomeworkList } from "./pending-homework-list";
import { NextGatheringHero } from "./next-gathering-hero";
import { ProgressRing } from "@/components/charts/progress-ring";
import { ProportionalBar } from "@/components/charts/proportional-bar";
import { AttendanceHistory } from "@/features/attendance/components/attendance-history";
import { Icon } from "@/components/ui/icon";
import { IconCircle } from "@/components/ui/icon-circle";
import type { getMemberDashboardData, getStudentChartsData } from "../queries";

// Shared by the student dashboard and (nested inside) the leader dashboard —
// an administrative user answers homework and RSVPs to meetings just like a
// student, per CLAUDE.md's rule against modeling the two as mutually
// exclusive states.
export function MemberDashboardSection({
  data,
  charts,
}: {
  data: Awaited<ReturnType<typeof getMemberDashboardData>>;
  charts: Awaited<ReturnType<typeof getStudentChartsData>>;
}) {
  const t = useTranslations("Dashboard");
  const [heroEvent, ...restEvents] = data.upcomingEvents;

  return (
    <div className="flex flex-col gap-4">
      <NextGatheringHero event={heroEvent ?? null} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {data.attendanceRate !== null && (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
              <ProgressRing value={data.attendanceRate} />
              <span className="text-xs text-muted-foreground">{t("attendanceLabel")}</span>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
            <IconCircle tone="accent" className="size-11">
              <Icon name="local_fire_department" size={22} filled />
            </IconCircle>
            <span className="font-heading text-lg font-semibold text-foreground">
              {t("streak", { count: charts.streak })}
            </span>
            <span className="text-xs text-muted-foreground">{t("currentStreak")}</span>
          </CardContent>
        </Card>
      </div>

      {charts.attendanceTimeline.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("myAttendanceTimeline")}</CardTitle>
          </CardHeader>
          <CardContent>
            <AttendanceHistory entries={charts.attendanceTimeline} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("homeworkCompletion")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ProportionalBar
            segments={[
              { label: t("reviewed"), value: charts.homeworkBreakdown.reviewed, color: "var(--color-success)" },
              { label: t("submitted"), value: charts.homeworkBreakdown.submitted, color: "var(--color-info)" },
              { label: t("pendingLabel"), value: charts.homeworkBreakdown.pending, color: "var(--color-accent)" },
              { label: t("lateLabel"), value: charts.homeworkBreakdown.late, color: "var(--color-destructive)" },
            ]}
          />
        </CardContent>
      </Card>

      {restEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("moreUpcomingMeetings")}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <UpcomingEventsList events={restEvents} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("homeworkDueTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <PendingHomeworkList assignments={data.pendingHomework} />
        </CardContent>
      </Card>
    </div>
  );
}
