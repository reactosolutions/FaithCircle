import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApprovalsNeededCard } from "./approvals-needed-card";
import { UpcomingEventsList } from "./upcoming-events-list";
import { RecentSubmissionsList } from "./recent-submissions-list";
import { RecentAttendanceList } from "./recent-attendance-list";
import type { getAdminRecentActivity, getPendingApprovals } from "../queries";

export function AdminDashboardSection({
  approvals,
  activity,
}: {
  approvals: Awaited<ReturnType<typeof getPendingApprovals>>;
  activity: Awaited<ReturnType<typeof getAdminRecentActivity>>;
}) {
  const t = useTranslations("Dashboard");
  return (
    <div className="flex flex-col gap-6">
      <ApprovalsNeededCard approvals={approvals} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("upcomingMeetingsTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <UpcomingEventsList events={activity.upcomingEvents} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("recentSubmissionsTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <RecentSubmissionsList submissions={activity.recentSubmissions} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("recentAttendanceTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <RecentAttendanceList entries={activity.recentAttendance} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
