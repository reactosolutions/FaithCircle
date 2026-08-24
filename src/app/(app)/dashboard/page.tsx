import { getTranslations } from "next-intl/server";
import { createClient, getCachedUser } from "@/lib/supabase/server";
import {
  getAdminChartsData,
  getAdminDashboardData,
  getAdminRecentActivity,
  getCircleChartsData,
  getLeaderDashboardData,
  getMemberDashboardData,
  getPendingApprovals,
  getStudentChartsData,
} from "@/features/dashboard/queries";
import { MemberDashboardSection } from "@/features/dashboard/components/member-dashboard-section";
import { LeaderCircleCard } from "@/features/dashboard/components/leader-circle-card";
import { AdminDashboardSection } from "@/features/dashboard/components/admin-dashboard-section";
import { PageHeader } from "@/components/app-shell/page-header";

export default async function DashboardPage() {
  const supabase = await createClient();
  const user = await getCachedUser();
  const t = await getTranslations("Dashboard");
  const { data: profile } = user
    ? await supabase.from("profiles").select("role, full_name").eq("id", user.id).single()
    : { data: null };

  if (!user || !profile) {
    return null;
  }

  if (profile.role === "admin") {
    const [stats, charts, approvals, activity] = await Promise.all([
      getAdminDashboardData(),
      getAdminChartsData(),
      getPendingApprovals(),
      getAdminRecentActivity(),
    ]);
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t("title")} />
        <AdminDashboardSection stats={stats} charts={charts} approvals={approvals} activity={activity} />
      </div>
    );
  }

  if (profile.role === "administrative") {
    const [leaderData, memberData, studentCharts] = await Promise.all([
      getLeaderDashboardData(user.id),
      getMemberDashboardData(user.id),
      getStudentChartsData(user.id),
    ]);
    const circleCharts = await Promise.all(
      leaderData.circleStats.map((stat) => getCircleChartsData(stat.circle.id)),
    );

    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t("title")} />

        {leaderData.circleStats.length > 0 && (
          <div className="flex flex-col gap-3">
            <h2 className="border-s-2 border-accent ps-2 text-sm font-semibold text-muted-foreground">
              {t("circlesYouLead")}
            </h2>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {leaderData.circleStats.map((stat, index) => (
                <LeaderCircleCard key={stat.circle.id} stat={stat} charts={circleCharts[index]} />
              ))}
            </div>
          </div>
        )}

        <h2 className="border-s-2 border-accent ps-2 text-sm font-semibold text-muted-foreground">
          {t("yourHomeworkAndMeetings")}
        </h2>
        <MemberDashboardSection data={memberData} charts={studentCharts} />
      </div>
    );
  }

  const [memberData, studentCharts] = await Promise.all([
    getMemberDashboardData(user.id),
    getStudentChartsData(user.id),
  ]);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("welcomeBack", {
          namePart: profile.full_name ? `, ${profile.full_name.split(" ")[0]}` : "",
        })}
      />
      <MemberDashboardSection data={memberData} charts={studentCharts} />
    </div>
  );
}
