import { endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from "date-fns";
import { getTranslations } from "next-intl/server";
import {
  getCircleMemberCount,
  listEvents,
  listHostCandidates,
  listInviteCandidates,
  listOtherCirclesWithCounts,
  listViewerCircles,
} from "@/features/events/queries";
import { getViewerProfile } from "@/features/members/queries";
import { parseAnchorDate } from "@/features/events/format";
import { hijriMonthYear } from "@/lib/format";
import { ViewSwitcher } from "@/features/events/components/view-switcher";
import { CalendarNav } from "@/features/events/components/calendar-nav";
import { CircleSelect } from "@/features/events/components/circle-select";
import { FormatFilterChips } from "@/features/events/components/format-filter-chips";
import { MonthView } from "@/features/events/components/month-view";
import { WeekView } from "@/features/events/components/week-view";
import { DayView } from "@/features/events/components/day-view";
import { ListView } from "@/features/events/components/list-view";
import { ScheduleEventDialog } from "@/features/events/components/schedule-event-dialog";
import { PageHeader } from "@/components/app-shell/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import type { EventFormat } from "@/lib/database.types";

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
    circleId?: string;
    view?: string;
    date?: string;
    selected?: string;
    format?: string;
  }>;
}) {
  const params = await searchParams;
  const t = await getTranslations("Events");
  const circles = await listViewerCircles();

  if (circles.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t("title")} />
        <EmptyState icon="group" title={t("noCircleYet")} />
      </div>
    );
  }

  const circleId =
    params.circleId && circles.some((c) => c.id === params.circleId)
      ? params.circleId
      : circles[0].id;
  const circle = circles.find((c) => c.id === circleId)!;

  const view: View =
    params.view === "week" || params.view === "day" || params.view === "list"
      ? params.view
      : "month";
  const anchor = parseAnchorDate(params.date);

  const viewer = await getViewerProfile();
  const canSchedule = viewer?.role === "admin" || circle.leader_id === viewer?.id;
  // Saudi convention (Sunday) by default, overridable in Preferences — never
  // left to date-fns's own Monday-first default.
  const weekStartsOn = (viewer?.week_starts_on ?? 0) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
  const showHijri = viewer?.show_hijri_dates ?? false;
  const locale = viewer?.language ?? "en";

  let events;
  if (view === "list") {
    events = await listEvents({ circleId });
  } else {
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
    events = await listEvents({
      circleId,
      from: new Date(rangeStart.getTime() - BOUNDARY_PAD_MS).toISOString(),
      to: new Date(rangeEnd.getTime() + BOUNDARY_PAD_MS).toISOString(),
    });
  }

  const [hosts, otherCircles, inviteCandidates, ownCircleMemberCount] = canSchedule
    ? await Promise.all([
        listHostCandidates(circleId),
        listOtherCirclesWithCounts(circleId),
        listInviteCandidates(circleId),
        getCircleMemberCount(circleId),
      ])
    : [[], [], [], 0];

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
  monthBaseParams.set("circleId", circleId);
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
              circleId={circleId}
              hosts={hosts}
              otherCircles={otherCircles}
              inviteCandidates={inviteCandidates}
              ownCircleMemberCount={ownCircleMemberCount}
            />
          )
        }
      >
        {circles.length > 1 && <CircleSelect circles={circles} value={circleId} />}
      </PageHeader>

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
        />
      )}
      {view === "week" && (
        <WeekView anchor={anchor} events={filteredEvents} weekStartsOn={weekStartsOn} />
      )}
      {view === "day" && <DayView anchor={anchor} events={filteredEvents} />}
      {view === "list" && <ListView events={filteredEvents} />}
    </div>
  );
}
