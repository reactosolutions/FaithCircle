import Link from "next/link";
import { useTranslations } from "next-intl";
import { formatEventDate, formatEventTime } from "@/features/events/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { BarWithAverage } from "@/components/charts/bar-with-average";
import { DonutChart } from "@/components/charts/donut-chart";
import { HorizontalBarChart } from "@/components/charts/horizontal-bar-chart";
import { ChartEmptyState } from "@/components/charts/chart-empty-state";
import { MonthlyAttendanceBars } from "@/features/attendance/components/monthly-attendance-bars";
import type { getCircleChartsData, getLeaderDashboardData } from "../queries";

type CircleStat = Awaited<ReturnType<typeof getLeaderDashboardData>>["circleStats"][number];
type CircleCharts = Awaited<ReturnType<typeof getCircleChartsData>>;

export function LeaderCircleCard({
  stat,
  charts,
}: {
  stat: CircleStat;
  charts: CircleCharts;
}) {
  const t = useTranslations("Dashboard");
  const REASON_LABEL: Record<string, string> = {
    travel: t("reasonTravel"),
    illness: t("reasonIllness"),
    work: t("reasonWork"),
    family: t("reasonFamily"),
    distance: t("reasonDistance"),
    other: t("reasonOther"),
  };
  const { circle, memberCount, nextEvent, pendingReviewCount, flaggedMembers } = stat;
  const funnelData = [
    { label: t("assigned"), value: charts.funnel.assigned },
    { label: t("submitted"), value: charts.funnel.submitted },
    { label: t("reviewed"), value: charts.funnel.reviewed },
  ];
  const absenceReasonData = charts.absenceReasons.map((r) => ({
    label: REASON_LABEL[r.label] ?? r.label,
    value: r.value,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{circle.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{t("members", { count: memberCount })}</Badge>
          {pendingReviewCount > 0 && (
            <Link href="/homework">
              <Badge variant="secondary">{t("reviewCount", { count: pendingReviewCount })}</Badge>
            </Link>
          )}
          {flaggedMembers.length > 0 && (
            <Link href="/members">
              <Badge variant="destructive">{t("attendanceFlags", { count: flaggedMembers.length })}</Badge>
            </Link>
          )}
        </div>

        {nextEvent ? (
          <Link
            href={`/events/${nextEvent.id}`}
            className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted/50"
          >
            <span className="min-w-0 truncate font-medium text-foreground">{nextEvent.title}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatEventDate(nextEvent.starts_at)} · {formatEventTime(nextEvent.starts_at)}
            </span>
          </Link>
        ) : (
          <p className="text-sm text-muted-foreground">{t("noUpcomingMeeting")}</p>
        )}

        {flaggedMembers.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {t("flaggedPrefix", { names: flaggedMembers.map((m) => m.full_name ?? "Unnamed").join(", ") })}
          </p>
        )}

        {/* Desktop (md+): the six-section deep dive stays always expanded —
            this is the level of detail leaders actually manage circles at
            day to day. */}
        <div className="hidden border-t border-border pt-4 md:block">
          <CircleDeepDive charts={charts} funnelData={funnelData} absenceReasonData={absenceReasonData} />
        </div>

        {/* Phone (<md): collapsed by default. Six chart sections plus two
            member lists per circle is a lot of scroll before reaching the
            next circle (a leader can lead more than one) or the homework
            section below it — a glance at the phone usually just wants the
            headline badges and next meeting above. Native <details> needs
            no client JS for the toggle. */}
        <details className="group border-t border-border pt-4 md:hidden">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden">
            {t("circleDetailsToggle")}
            <Icon
              name="expand_more"
              size={18}
              className="text-muted-foreground transition-transform group-open:rotate-180"
            />
          </summary>
          <div className="pt-4">
            <CircleDeepDive charts={charts} funnelData={funnelData} absenceReasonData={absenceReasonData} />
          </div>
        </details>
      </CardContent>
    </Card>
  );
}

function CircleDeepDive({
  charts,
  funnelData,
  absenceReasonData,
}: {
  charts: CircleCharts;
  funnelData: { label: string; value: number }[];
  absenceReasonData: { label: string; value: number }[];
}) {
  const t = useTranslations("Dashboard");

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <h3 className="text-xs font-semibold text-muted-foreground">{t("attendanceTrend")}</h3>
          <BarWithAverage data={charts.attendanceTrend} unit="%" />
        </div>
        <div className="flex flex-col gap-1.5">
          <h3 className="text-xs font-semibold text-muted-foreground">{t("inPersonVsOnline")}</h3>
          <DonutChart
            data={[
              { label: t("inPerson"), value: charts.formatMix.in_person, color: "var(--color-primary)" },
              { label: t("online"), value: charts.formatMix.online, color: "var(--color-info)" },
            ]}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <h3 className="text-xs font-semibold text-muted-foreground">{t("submissionFunnel")}</h3>
          <HorizontalBarChart data={funnelData} color="var(--color-primary)" emptyMessage={t("noHomeworkYet")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <h3 className="text-xs font-semibold text-muted-foreground">{t("absenceReasons")}</h3>
          <HorizontalBarChart
            data={absenceReasonData}
            color="var(--color-accent)"
            emptyMessage={t("noReasonsYet")}
          />
        </div>
      </div>

      {charts.attendanceByMonth.length > 0 && (
        <div className="border-t border-border pt-4">
          <MonthlyAttendanceBars months={charts.attendanceByMonth} />
        </div>
      )}

      <div className="flex flex-col gap-1.5 border-t border-border pt-4">
        <h3 className="text-xs font-semibold text-muted-foreground">{t("memberEngagement")}</h3>
        {charts.memberEngagement.length === 0 ? (
          <ChartEmptyState icon="groups" message={t("noMembersYet")} />
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {charts.memberEngagement.map((member) => (
              <div key={member.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0 truncate text-foreground">{member.fullName ?? "Unnamed"}</span>
                <span className="flex shrink-0 gap-3 text-xs text-muted-foreground">
                  <span>{t("attendancePct", { pct: member.attendancePct ?? "—" })}</span>
                  <span>{t("homeworkPct", { pct: member.homeworkPct ?? "—" })}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5 border-t border-border pt-4">
        <h3 className="text-xs font-semibold text-muted-foreground">{t("hostRotation")}</h3>
        {charts.hostRotation.length === 0 ? (
          <ChartEmptyState icon="door_open" message={t("noHostsYet")} />
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {charts.hostRotation.slice(0, 5).map((candidate) => (
              <div key={candidate.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0 truncate text-foreground">{candidate.fullName ?? "Unnamed"}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {candidate.lastHostedAt ? formatEventDate(candidate.lastHostedAt) : t("neverHosted")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
