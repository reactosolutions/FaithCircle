import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { CIRCLE_TIME_ZONE, formatEventDate, formatEventTime } from "../format";
import { FORMAT_BORDER_CLASS, FORMAT_ICON_NAME, FORMAT_TEXT_CLASS } from "./format-badge";
import { Icon } from "@/components/ui/icon";
import { EmptyState } from "@/components/ui/empty-state";
import type { Database } from "@/lib/database.types";

type EventRow = Database["public"]["Tables"]["events"]["Row"];

export function ListView({
  events,
  circles,
}: {
  events: EventRow[];
  circles: { id: string; name: string }[];
}) {
  const t = useTranslations("Events");
  const circleNameById = new Map(circles.map((c) => [c.id, c.name]));
  const showCircleLabel = circles.length > 1;
  if (events.length === 0) {
    return <EmptyState icon="event_busy" title={t("noMeetingsScheduled")} />;
  }

  const groups = new Map<string, EventRow[]>();
  for (const event of events) {
    const key = formatInTimeZone(new Date(event.starts_at), CIRCLE_TIME_ZONE, "MMMM yyyy");
    const list = groups.get(key) ?? [];
    list.push(event);
    groups.set(key, list);
  }

  return (
    <div className="flex flex-col gap-6">
      {Array.from(groups.entries()).map(([label, groupEvents]) => (
        <div key={label} className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-muted-foreground">{label}</h3>
          <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
            {groupEvents.map((event) => {
              return (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className={cn(
                    "flex items-center justify-between gap-4 border-s-2 px-4 py-3 hover:bg-muted/50",
                    FORMAT_BORDER_CLASS[event.format],
                  )}
                >
                  <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-foreground">
                    <Icon name={FORMAT_ICON_NAME[event.format]} size={14} className={cn("shrink-0", FORMAT_TEXT_CLASS[event.format])} />
                    <span className="truncate">
                      {event.title}
                      {showCircleLabel && (
                        <span className="font-normal text-muted-foreground">
                          {" · "}
                          {circleNameById.get(event.circle_id) ?? ""}
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatEventDate(event.starts_at)} · {formatEventTime(event.starts_at)}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
