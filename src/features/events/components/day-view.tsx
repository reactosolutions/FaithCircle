import Link from "next/link";
import { format } from "date-fns";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { eventDayKey, formatEventTime } from "../format";
import { FORMAT_BORDER_CLASS, FORMAT_ICON_NAME, FORMAT_TEXT_CLASS } from "./format-badge";
import { Icon } from "@/components/ui/icon";
import type { Database } from "@/lib/database.types";

type EventRow = Database["public"]["Tables"]["events"]["Row"];

export function DayView({ anchor, events }: { anchor: Date; events: EventRow[] }) {
  const t = useTranslations("Events");
  const dayKey = format(anchor, "yyyy-MM-dd");
  const dayEvents = events
    .filter((event) => eventDayKey(event.starts_at) === dayKey)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <h2 className="text-sm font-semibold text-foreground">{format(anchor, "EEEE, MMM d")}</h2>
      {dayEvents.length === 0 && (
        <p className="text-sm text-muted-foreground">{t("noMeetingsThisDay")}</p>
      )}
      <div className="flex flex-col divide-y divide-border">
        {dayEvents.map((event) => {
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
              <span className="shrink-0 text-muted-foreground">{formatEventTime(event.starts_at)}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
