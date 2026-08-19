import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatTile } from "./stat-tile";
import { GrowthLineChart } from "@/components/charts/growth-line-chart";
import { BarWithAverage } from "@/components/charts/bar-with-average";
import { DonutChart } from "@/components/charts/donut-chart";
import { StackedAreaChart } from "@/components/charts/stacked-area-chart";
import type { getAdminChartsData, getAdminDashboardData } from "../queries";

export function AdminDashboardSection({
  stats,
  charts,
}: {
  stats: Awaited<ReturnType<typeof getAdminDashboardData>>;
  charts: Awaited<ReturnType<typeof getAdminChartsData>>;
}) {
  const t = useTranslations("Dashboard");
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile label={t("statActiveMembers")} value={stats.memberCounts.active} href="/members" />
        <StatTile label={t("statInvited")} value={stats.memberCounts.invited} href="/members" />
        <StatTile label={t("statCircles")} value={stats.circleCount} />
        <StatTile label={t("statUpcomingMeetings")} value={stats.upcomingEventCount} href="/events" />
        <StatTile
          label={t("statPendingJoinRequests")}
          value={stats.pendingJoinRequestCount + stats.memberCounts.pending}
          href="/settings/organization"
        />
      </div>
      <StatTile
        label={t("statAuditEvents")}
        value={stats.recentAuditCount}
        href="/settings/organization/audit"
      />

      {/* The one dominant hero element this page needs (CLAUDE.md hierarchy
          pass rule 1) — growth is the single most load-bearing admin metric,
          so it gets a taller, full-width card instead of sharing equal
          weight with the other three charts below. */}
      <Card className="border-accent/30 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">{t("growth")}</CardTitle>
        </CardHeader>
        <CardContent>
          <GrowthLineChart data={charts.growth} height={260} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("roleDistribution")}</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart
              data={[
                { label: t("roleAdmin"), value: charts.roleCounts.admin, color: "var(--color-primary)" },
                { label: t("roleLeader"), value: charts.roleCounts.administrative, color: "var(--color-accent)" },
                { label: t("roleStudent"), value: charts.roleCounts.student, color: "var(--color-info)" },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("attendanceByCircle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <BarWithAverage
              data={charts.circleComparison}
              unit="%"
              showAverage={false}
              emptyMessage={t("noCirclesYet")}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("meetingFormatMix")}</CardTitle>
          </CardHeader>
          <CardContent>
            <StackedAreaChart
              data={charts.formatMixOverTime}
              series={[
                { key: "in_person", label: t("inPerson"), color: "var(--color-primary)" },
                { key: "online", label: t("online"), color: "var(--color-info)" },
                { key: "hybrid", label: t("hybrid"), color: "var(--color-accent)" },
              ]}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
