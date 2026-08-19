import Link from "next/link";
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { eventDayKey, formatEventTime } from "../format";
import { FORMAT_BG_CLASS, FORMAT_BORDER_CLASS, FORMAT_ICON_NAME, FORMAT_TEXT_CLASS } from "./format-badge";
import { Icon } from "@/components/ui/icon";
import { hijri } from "@/lib/format";
import { ScheduleEventDialog } from "./schedule-event-dialog";
import type { HostCandidate, InviteCandidate, OtherCircle } from "./schedule-event-dialog/constants";
import type { Database, LanguagePreference } from "@/lib/database.types";

type EventRow = Database["public"]["Tables"]["events"]["Row"];

// Scheduling props are all optional and only provided together (see
// EventsPage) — when present and the viewer has schedule permission,
// clicking a day box opens the same schedule-meeting dialog used by the
// page header's "Schedule" button, pre-filled with that day's date.
interface SchedulingProps {
  canSchedule?: boolean;
  circleId?: string;
  hosts?: HostCandidate[];
  otherCircles?: OtherCircle[];
  inviteCandidates?: InviteCandidate[];
  ownCircleMemberCount?: number;
}

export function MonthView({
  anchor,
  events,
  basePath,
  selectedKey,
  weekStartsOn = 0,
  showHijri = false,
  locale = "en",
  canSchedule = false,
  circleId,
  hosts = [],
  otherCircles = [],
  inviteCandidates = [],
  ownCircleMemberCount = 0,
}: {
  anchor: Date;
  events: EventRow[];
  // Current page URL (path + existing query string) without `selected` —
  // this is a Server Component, so day-tap navigation is a plain Link to a
  // new URL rather than client-side state.
  basePath: string;
  selectedKey: string;
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  showHijri?: boolean;
  locale?: LanguagePreference;
} & SchedulingProps) {
  const t = useTranslations("Events");
  const ALL_WEEKDAY_LABELS = [
    t("weekdaySun"),
    t("weekdayMon"),
    t("weekdayTue"),
    t("weekdayWed"),
    t("weekdayThu"),
    t("weekdayFri"),
    t("weekdaySat"),
  ];
  const monthStart = startOfMonth(anchor);
  const monthEnd = endOfMonth(anchor);
  const days = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn }),
    end: endOfWeek(monthEnd, { weekStartsOn }),
  });
  const weekdayLabels = [
    ...ALL_WEEKDAY_LABELS.slice(weekStartsOn),
    ...ALL_WEEKDAY_LABELS.slice(0, weekStartsOn),
  ];

  const eventsByDay = new Map<string, EventRow[]>();
  for (const event of events) {
    const key = eventDayKey(event.starts_at);
    const list = eventsByDay.get(key) ?? [];
    list.push(event);
    eventsByDay.set(key, list);
  }

  const todayKey = format(new Date(), "yyyy-MM-dd");
  const selectedEvents = (eventsByDay.get(selectedKey) ?? [])
    .slice()
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const joinChar = basePath.includes("?") ? "&" : "?";

  return (
    <div className="flex flex-col gap-4">
      {/* Desktop: full grid with event pills inline */}
      <div className="hidden grid-cols-7 gap-px overflow-hidden rounded-lg border border-border bg-border text-sm md:grid">
        {weekdayLabels.map((label) => (
          <div
            key={label}
            className="bg-muted px-2 py-1.5 text-center text-xs font-medium text-muted-foreground"
          >
            {label}
          </div>
        ))}
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayEvents = eventsByDay.get(key) ?? [];
          return (
            <div
              key={key}
              className={cn(
                "min-h-24 bg-card p-1.5",
                !isSameMonth(day, anchor) && "bg-muted/40 text-muted-foreground",
              )}
            >
              <div className="flex items-center justify-between gap-1">
                <span
                  className={cn(
                    "text-xs",
                    key === todayKey
                      ? "flex size-5 items-center justify-center rounded-full bg-warning font-medium text-warning-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {format(day, "d")}
                </span>
                {canSchedule && circleId && (
                  <ScheduleEventDialog
                    circleId={circleId}
                    hosts={hosts}
                    otherCircles={otherCircles}
                    inviteCandidates={inviteCandidates}
                    ownCircleMemberCount={ownCircleMemberCount}
                    defaultStartsAt={`${key}T18:00`}
                    triggerIcon="add"
                    triggerVariant="ghost"
                    triggerClassName="size-5! text-muted-foreground"
                  />
                )}
              </div>
              <div className="mt-1 flex flex-col gap-1">
                {dayEvents.map((event) => {
                  return (
                    <Link
                      key={event.id}
                      href={`/events/${event.id}`}
                      className={cn(
                        "flex items-center gap-1 truncate rounded-md border-s-2 px-1.5 py-0.5 text-xs font-medium",
                        FORMAT_BORDER_CLASS[event.format],
                        FORMAT_BG_CLASS[event.format],
                        FORMAT_TEXT_CLASS[event.format],
                      )}
                    >
                      <Icon name={FORMAT_ICON_NAME[event.format]} size={12} />
                      <span className="truncate">
                        {formatEventTime(event.starts_at)} {event.title}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile: date + dot indicator grid; tap a day for its agenda below */}
      <div className="md:hidden">
        <div className="grid grid-cols-7 gap-0.5">
          {weekdayLabels.map((label) => (
            <div
              key={label}
              className="pb-1 text-center text-[11px] font-medium text-muted-foreground"
            >
              {label[0]}
            </div>
          ))}
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const hasEvents = (eventsByDay.get(key) ?? []).length > 0;
            const isSelected = key === selectedKey;
            const inMonth = isSameMonth(day, anchor);
            return (
              <Link
                key={key}
                href={`${basePath}${joinChar}selected=${key}`}
                className={cn(
                  "flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-lg text-sm",
                  !inMonth && "text-muted-foreground/50",
                  isSelected && "bg-primary text-primary-foreground",
                  !isSelected && key === todayKey && "font-semibold text-warning",
                )}
              >
                {format(day, "d")}
                <span
                  className={cn(
                    "size-1 rounded-full",
                    hasEvents ? (isSelected ? "bg-primary-foreground" : "bg-primary") : "bg-transparent",
                  )}
                />
              </Link>
            );
          })}
        </div>

        <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-baseline gap-2">
              <h2 className="text-sm font-semibold text-foreground">
                {format(new Date(`${selectedKey}T00:00:00`), "EEEE, MMM d")}
              </h2>
              {showHijri && (
                <span className="text-xs text-muted-foreground">
                  {hijri(new Date(`${selectedKey}T00:00:00`), locale)}
                </span>
              )}
            </div>
            {canSchedule && circleId && (
              <ScheduleEventDialog
                circleId={circleId}
                hosts={hosts}
                otherCircles={otherCircles}
                inviteCandidates={inviteCandidates}
                ownCircleMemberCount={ownCircleMemberCount}
                defaultStartsAt={`${selectedKey}T18:00`}
                triggerIcon="add"
                triggerVariant="outline"
              />
            )}
          </div>
          {selectedEvents.length === 0 && (
            <p className="text-sm text-muted-foreground">{t("noMeetingsThisDay")}</p>
          )}
          <div className="flex flex-col divide-y divide-border">
            {selectedEvents.map((event) => {
              return (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className={cn(
                    "flex min-h-11 items-center justify-between gap-3 border-s-2 py-3 ps-2 text-sm hover:text-primary",
                    FORMAT_BORDER_CLASS[event.format],
                  )}
                >
                  <span className="flex min-w-0 items-center gap-1.5 font-medium text-foreground">
                    <Icon name={FORMAT_ICON_NAME[event.format]} size={14} className={cn("shrink-0", FORMAT_TEXT_CLASS[event.format])} />
                    <span className="truncate">{event.title}</span>
                  </span>
                  <span className="shrink-0 text-muted-foreground">
                    {formatEventTime(event.starts_at)}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
