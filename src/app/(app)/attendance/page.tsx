import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCachedUser } from "@/lib/supabase/server";
import { getViewerProfile } from "@/features/members/queries";
import { listAttendanceEvents } from "@/features/attendance/queries";
import { listViewerCircles } from "@/features/events/queries";
import { formatEventDate, formatEventTime } from "@/features/events/format";
import { AttendanceFilters } from "@/features/attendance/components/attendance-filters";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/app-shell/page-header";

export default async function AttendanceIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ circleId?: string }>;
}) {
  const params = await searchParams;
  const t = await getTranslations("Attendance");
  const user = await getCachedUser();
  if (!user) {
    redirect("/sign-in");
  }

  const [profile, events, circles] = await Promise.all([
    getViewerProfile(),
    listAttendanceEvents(),
    listViewerCircles(),
  ]);

  if (profile?.role !== "admin" && profile?.role !== "administrative") {
    notFound();
  }
  const circlesById = new Map(circles.map((circle) => [circle.id, circle]));

  const ledEvents =
    profile.role === "admin"
      ? events
      : events.filter((event) => circlesById.get(event.circle_id)?.leader_id === user.id);

  const ledCircleIds = new Set(ledEvents.map((event) => event.circle_id));
  const circleOptions = circles
    .filter((circle) => ledCircleIds.has(circle.id))
    .map((circle) => ({ id: circle.id, name: circle.name }));

  const circleFilter =
    params.circleId && circleOptions.some((c) => c.id === params.circleId) ? params.circleId : null;
  const visibleEvents = circleFilter
    ? ledEvents.filter((event) => event.circle_id === circleFilter)
    : ledEvents;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        action={circleOptions.length > 1 && <AttendanceFilters circles={circleOptions} />}
      />

      <Card>
        <CardContent className="flex flex-col divide-y divide-border p-0">
          {visibleEvents.length === 0 && (
            <EmptyState icon="fact_check" title={t("noMeetingsYet")} />
          )}
          {visibleEvents.map((event) => (
            <Link
              key={event.id}
              href={`/attendance/${event.id}`}
              className="flex flex-col gap-1 px-6 py-4 hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            >
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium text-foreground">{event.title}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {circlesById.get(event.circle_id)?.name}
                </span>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatEventDate(event.starts_at)} · {formatEventTime(event.starts_at)}
              </span>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
