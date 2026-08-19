import Link from "next/link";
import { eachDayOfInterval, endOfWeek, format, startOfWeek } from "date-fns";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { eventDayKey, formatEventTime } from "../format";
import { FORMAT_ICON_NAME } from "./format-badge";
import { Icon } from "@/components/ui/icon";
import type { Database } from "@/lib/database.types";

type EventRow = Database["public"]["Tables"]["events"]["Row"];

export function WeekView({
  anchor,
  events,
  weekStartsOn = 0,
}: {
  anchor: Date;
  events: EventRow[];
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
}) {
  const t = useTranslations("Events");
  const days = eachDayOfInterval({
    start: startOfWeek(anchor, { weekStartsOn }),
    end: endOfWeek(anchor, { weekStartsOn }),
  });

  const eventsByDay = new Map<string, EventRow[]>();
  for (const event of events) {
    const key = eventDayKey(event.starts_at);
    const list = eventsByDay.get(key) ?? [];
    list.push(event);
    eventsByDay.set(key, list);
  }

  const todayKey = format(new Date(), "yyyy-MM-dd");

  return (
    <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
      {days.map((day) => {
        const key = format(day, "yyyy-MM-dd");
        const dayEvents = eventsByDay.get(key) ?? [];
        return (
          <div key={key} className="flex gap-4 px-4 py-3">
            <div
              className={cn(
                "w-16 shrink-0 text-sm",
                key === todayKey ? "font-semibold text-warning" : "text-muted-foreground",
              )}
            >
              <div>{format(day, "EEE")}</div>
              <div>{format(day, "MMM d")}</div>
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              {dayEvents.length === 0 && (
                <span className="text-sm text-muted-foreground">{t("noMeetings")}</span>
              )}
              {dayEvents.map((event) => {
                return (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    className="flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-primary"
                  >
                    <Icon name={FORMAT_ICON_NAME[event.format]} size={14} className="shrink-0 text-muted-foreground" />
                    {formatEventTime(event.starts_at)} — {event.title}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
