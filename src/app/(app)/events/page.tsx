import { endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from "date-fns";
import { getTranslations } from "next-intl/server";
import {
  getCircleMemberCount,
  listAllCirclesWithCounts,
  listEvents,
  listHostCandidates,
  listInviteCandidates,
  listViewerCircles,
} from "@/features/events/queries";
import { getViewerProfile } from "@/features/members/queries";
import { parseAnchorDate } from "@/features/events/format";
import { hijriMonthYear } from "@/lib/format";
import { ViewSwitcher } from "@/features/events/components/view-switcher";
import { CalendarNav } from "@/features/events/components/calendar-nav";
import { FormatFilterChips } from "@/features/events/components/format-filter-chips";
import { MonthView } from "@/features/events/components/month-view";
import { WeekView } from "@/features/events/components/week-view";
import { DayView } from "@/features/events/components/day-view";
import { ListView } from "@/features/events/components/list-view";
import { ScheduleEventDialog } from "@/features/events/components/schedule-event-dialog";
import { PageHeader } from "@/components/app-shell/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import type { EventFormat } from "@/lib/database.types";
import type {
  HostCandidate,
  InviteCandidate,
} from "@/features/events/components/schedule-event-dialog/constants";

type View = "month" | "week" | "day" | "list";

// Query bounds from local calendar math are padded a day on each side so a
// Riyadh-local event near midnight is never excluded by a server-timezone
// off-by-one — the views themselves bucket by the real Riyadh day via
// eventDayKey(), so an extra fetched event just won't match any cell.
const BOUNDARY_PAD_MS = 24 * 60 * 60 * 1000;

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string;
    date?: string;
    selected?: string;
    format?: string;
  }>;
}) {
  const params = await searchParams;
  const t = await getTranslations("Events");
  // Independent of each other — one parallel round trip instead of two
  // sequential ones.
  const [circles, viewer] = await Promise.all([listViewerCircles(), getViewerProfile()]);

  if (circles.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t("title")} />
        <EmptyState icon="group" title={t("noCircleYet")} />
      </div>
    );
  }

  const view: View =
    params.view === "week" || params.view === "day" || params.view === "list"
      ? params.view
      : "month";
  const anchor = parseAnchorDate(params.date);

  // Every circle this calendar shows — always combined, no per-circle
  // filter (see the schedule-event-dialog's own owning-circle dropdown for
  // where "which circle" now lives instead). Scheduling mirrors
  // has_permission's events.create scope: every circle for admin, only led
  // circles for administrative, and — since events.create is 'circle' for
  // students too — every circle a student belongs to (listViewerCircles
  // already returns exactly the viewer's circles under RLS).
  const schedulableCircles = !viewer
    ? []
    : viewer.role === "administrative"
      ? circles.filter((c) => c.leader_id === viewer.id)
      : circles; // admin and student both schedule into every circle they can see
  const canSchedule = schedulableCircles.length > 0;
  // Saudi convention (Sunday) by default, overridable in Preferences — never
  // left to date-fns's own Monday-first default.
  const weekStartsOn = (viewer?.week_starts_on ?? 0) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
  const showHijri = viewer?.show_hijri_dates ?? false;
  const locale = viewer?.language ?? "en";

  const circleIds = circles.map((c) => c.id);

  const eventsPromise =
    view === "list"
      ? listEvents({ circleIds })
      : (() => {
          const rangeStart =
            view === "month"
              ? startOfWeek(startOfMonth(anchor), { weekStartsOn })
              : view === "week"
                ? startOfWeek(anchor, { weekStartsOn })
                : anchor;
          const rangeEnd =
            view === "month"
              ? endOfWeek(endOfMonth(anchor), { weekStartsOn })
              : view === "week"
                ? endOfWeek(anchor, { weekStartsOn })
                : anchor;
          return listEvents({
            circleIds,
            from: new Date(rangeStart.getTime() - BOUNDARY_PAD_MS).toISOString(),
            to: new Date(rangeEnd.getTime() + BOUNDARY_PAD_MS).toISOString(),
          });
        })();

  // Per-schedulable-circle host/invite/member data, only needed for the
  // schedule dialog — independent of `events` above and of each other, so
  // all of it (events, every circle's scheduling data, and the org-wide
  // circle list) runs as one parallel batch rather than three sequential
  // round-trip stages.
  const schedulingPromise = canSchedule
    ? Promise.all(
        schedulableCircles.map(async (circle) => {
          const [hosts, inviteCandidates, memberCount] = await Promise.all([
            listHostCandidates(circle.id),
            listInviteCandidates(circle.id),
            getCircleMemberCount(circle.id),
          ]);
          return { circleId: circle.id, hosts, inviteCandidates, memberCount };
        }),
      )
    : Promise.resolve([]);
  const allCirclesWithCountsPromise = canSchedule ? listAllCirclesWithCounts() : Promise.resolve([]);

  const [events, schedulingResults, allCirclesWithCounts] = await Promise.all([
    eventsPromise,
    schedulingPromise,
    allCirclesWithCountsPromise,
  ]);

  const hostsByCircle: Record<string, HostCandidate[]> = {};
  const inviteCandidatesByCircle: Record<string, InviteCandidate[]> = {};
  const memberCountByCircle: Record<string, number> = {};
  for (const row of schedulingResults) {
    hostsByCircle[row.circleId] = row.hosts;
    inviteCandidatesByCircle[row.circleId] = row.inviteCandidates;
    memberCountByCircle[row.circleId] = row.memberCount;
  }

  const formatFilter: EventFormat | null =
    params.format === "in_person" || params.format === "online" || params.format === "hybrid"
      ? params.format
      : null;
  const filteredEvents = formatFilter ? events.filter((e) => e.format === formatFilter) : events;

  const label =
    view === "month"
      ? format(anchor, "MMMM yyyy")
      : view === "week"
        ? t("weekOf", { date: format(startOfWeek(anchor, { weekStartsOn }), "MMM d") })
        : format(anchor, "EEEE, MMM d");
  const hijriLabel = view === "month" && showHijri ? hijriMonthYear(anchor, locale) : null;

  const monthBaseParams = new URLSearchParams();
  monthBaseParams.set("view", "month");
  monthBaseParams.set("date", format(anchor, "yyyy-MM-dd"));
  const monthBasePath = `/events?${monthBaseParams.toString()}`;
  const selectedKey =
    params.selected && /^\d{4}-\d{2}-\d{2}$/.test(params.selected)
      ? params.selected
      : format(anchor, "yyyy-MM-dd");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        action={
          canSchedule && (
            <ScheduleEventDialog
              circles={schedulableCircles}
              allCirclesWithCounts={allCirclesWithCounts}
              hostsByCircle={hostsByCircle}
              inviteCandidatesByCircle={inviteCandidatesByCircle}
              memberCountByCircle={memberCountByCircle}
            />
          )
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ViewSwitcher current={view} />
        {view !== "list" && (
          <CalendarNav anchor={anchor} view={view} label={label} hijriLabel={hijriLabel} />
        )}
      </div>

      <FormatFilterChips current={formatFilter} />

      {view === "month" && (
        <MonthView
          anchor={anchor}
          events={filteredEvents}
          basePath={monthBasePath}
          selectedKey={selectedKey}
          weekStartsOn={weekStartsOn}
          showHijri={showHijri}
          locale={locale}
          circles={circles}
          canSchedule={canSchedule}
          schedulableCircles={schedulableCircles}
          allCirclesWithCounts={allCirclesWithCounts}
          hostsByCircle={hostsByCircle}
          inviteCandidatesByCircle={inviteCandidatesByCircle}
          memberCountByCircle={memberCountByCircle}
        />
      )}
      {view === "week" && (
        <WeekView anchor={anchor} events={filteredEvents} weekStartsOn={weekStartsOn} circles={circles} />
      )}
      {view === "day" && <DayView anchor={anchor} events={filteredEvents} circles={circles} />}
      {view === "list" && <ListView events={filteredEvents} circles={circles} />}
    </div>
  );
}
